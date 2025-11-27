import { chromium } from 'playwright';
import fs from 'fs/promises';

const DASHBOARD_URL = 'https://mend-2.vercel.app/dashboard';
const TEST_DURATION_MS = 120000; // 2 minutes initial test
const SAMPLE_INTERVAL_MS = 5000; // Sample every 5 seconds

class DashboardDiagnostics {
  constructor() {
    this.browser = null;
    this.page = null;
    this.context = null;
    this.metrics = {
      memory: [],
      network: [],
      console: [],
      errors: [],
      performanceMetrics: [],
      rerenders: 0,
      timestamps: []
    };
    this.networkRequestCount = 0;
    this.activeRequests = new Set();
  }

  async initialize() {
    console.log('🚀 Starting Dashboard Diagnostics...\n');
    
    // Launch browser with debugging enabled
    this.browser = await chromium.launch({
      headless: false, // Set to true for automated testing
      devtools: true,
      args: [
        '--enable-logging',
        '--v=1',
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox'
      ]
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });

    this.page = await this.context.newPage();
    
    // Enable CDP for memory profiling
    const client = await this.page.context().newCDPSession(this.page);
    await client.send('Performance.enable');
    await client.send('HeapProfiler.enable');
    
    this.setupListeners();
  }

  setupListeners() {
    // Monitor console messages
    this.page.on('console', msg => {
      const logEntry = {
        time: new Date().toISOString(),
        type: msg.type(),
        text: msg.text()
      };
      
      this.metrics.console.push(logEntry);
      
      // Check for specific patterns
      if (msg.text().includes('SLOW QUERY DETECTED')) {
        console.log(`⚠️  SLOW QUERY: ${msg.text()}`);
      }
      if (msg.text().includes('Warning: Maximum update depth exceeded')) {
        this.metrics.rerenders++;
        console.log(`🔴 INFINITE RE-RENDER DETECTED!`);
      }
    });

    // Monitor errors
    this.page.on('pageerror', error => {
      const errorEntry = {
        time: new Date().toISOString(),
        message: error.message,
        stack: error.stack
      };
      this.metrics.errors.push(errorEntry);
      console.log(`❌ Page Error: ${error.message}`);
    });

    // Monitor network requests
    this.page.on('request', request => {
      this.networkRequestCount++;
      this.activeRequests.add(request.url());
      
      const requestInfo = {
        time: new Date().toISOString(),
        url: request.url(),
        method: request.method(),
        type: request.resourceType()
      };
      
      // Track RPC calls specifically
      if (request.url().includes('/rpc/')) {
        requestInfo.isRPC = true;
        console.log(`📡 RPC Call: ${request.url().split('/rpc/')[1]}`);
      }
      
      this.metrics.network.push(requestInfo);
    });

    this.page.on('response', response => {
      this.activeRequests.delete(response.url());
      
      // Log slow responses
      const timing = response.timing();
      if (timing && timing.responseEnd > 1000) {
        console.log(`🐌 Slow Response (${Math.round(timing.responseEnd)}ms): ${response.url()}`);
      }
    });

    // Monitor WebSocket connections
    this.page.on('websocket', ws => {
      console.log(`🔌 WebSocket opened: ${ws.url()}`);
      
      ws.on('framereceived', frame => {
        console.log(`📥 WS Frame: ${frame.payload?.substring(0, 100)}...`);
      });
      
      ws.on('close', () => {
        console.log(`🔌 WebSocket closed: ${ws.url()}`);
      });
    });
  }

  async collectMemoryMetrics() {
    try {
      // Get browser memory metrics
      const metrics = await this.page.evaluate(() => {
        if (!performance.memory) return null;
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        };
      });

      // Get performance metrics
      const perfMetrics = await this.page.metrics();
      
      const memoryEntry = {
        time: new Date().toISOString(),
        heap: metrics,
        performance: perfMetrics,
        activeRequests: this.activeRequests.size,
        totalRequests: this.networkRequestCount
      };
      
      this.metrics.memory.push(memoryEntry);
      
      // Calculate memory in MB
      if (metrics) {
        const usedMB = (metrics.usedJSHeapSize / 1024 / 1024).toFixed(2);
        const totalMB = (metrics.totalJSHeapSize / 1024 / 1024).toFixed(2);
        console.log(`💾 Memory: ${usedMB}MB / ${totalMB}MB | Active Requests: ${this.activeRequests.size}`);
      }
      
      return memoryEntry;
    } catch (error) {
      console.error('Error collecting metrics:', error);
      return null;
    }
  }

  async analyzeDashboard() {
    console.log(`📊 Navigating to dashboard: ${DASHBOARD_URL}\n`);
    
    // Navigate to dashboard
    await this.page.goto(DASHBOARD_URL, { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });

    console.log('✅ Page loaded, starting monitoring...\n');
    
    // Check for React DevTools
    const hasReactDevTools = await this.page.evaluate(() => {
      return window.__REACT_DEVTOOLS_GLOBAL_HOOK__ !== undefined;
    });
    
    if (hasReactDevTools) {
      console.log('🔧 React DevTools detected - can monitor component updates\n');
    }

    // Start periodic sampling
    const startTime = Date.now();
    const sampleInterval = setInterval(async () => {
      await this.collectMemoryMetrics();
      
      // Check for specific issues
      await this.checkForIssues();
      
      // Stop if memory is growing too fast
      const lastMetric = this.metrics.memory[this.metrics.memory.length - 1];
      if (lastMetric?.heap?.usedJSHeapSize > 500 * 1024 * 1024) { // 500MB
        console.log('⚠️  Memory usage exceeds 500MB - stopping test');
        clearInterval(sampleInterval);
      }
    }, SAMPLE_INTERVAL_MS);

    // Wait for test duration
    await new Promise(resolve => setTimeout(resolve, TEST_DURATION_MS));
    clearInterval(sampleInterval);
    
    console.log('\n📈 Test complete, analyzing results...\n');
  }

  async checkForIssues() {
    // Check for infinite loops in React Query
    const reactQueryStats = await this.page.evaluate(() => {
      const queryClient = window.__REACT_QUERY_DEVTOOLS__?.queryClient;
      if (!queryClient) return null;
      
      const queries = queryClient.getQueryCache().getAll();
      return {
        totalQueries: queries.length,
        fetchingQueries: queries.filter(q => q.state.fetchStatus === 'fetching').length,
        staleQueries: queries.filter(q => q.isStale()).length
      };
    });
    
    if (reactQueryStats?.fetchingQueries > 5) {
      console.log(`⚠️  Multiple queries fetching simultaneously: ${reactQueryStats.fetchingQueries}`);
    }

    // Check for memory leaks in event listeners
    const listenerCount = await this.page.evaluate(() => {
      const getEventListeners = (element) => {
        const listeners = [];
        const events = ['click', 'scroll', 'resize', 'keydown', 'keyup'];
        events.forEach(event => {
          // This is a simplified check
          if (element[`on${event}`]) listeners.push(event);
        });
        return listeners.length;
      };
      
      return {
        window: getEventListeners(window),
        document: getEventListeners(document),
        body: getEventListeners(document.body)
      };
    });
    
    if (Object.values(listenerCount).reduce((a, b) => a + b) > 20) {
      console.log('⚠️  High number of event listeners detected');
    }
  }

  analyzeResults() {
    console.log('=' * 50);
    console.log('DIAGNOSTIC SUMMARY');
    console.log('=' * 50);
    
    // Memory growth analysis
    if (this.metrics.memory.length > 1) {
      const firstHeap = this.metrics.memory[0]?.heap?.usedJSHeapSize || 0;
      const lastHeap = this.metrics.memory[this.metrics.memory.length - 1]?.heap?.usedJSHeapSize || 0;
      const growthMB = ((lastHeap - firstHeap) / 1024 / 1024).toFixed(2);
      const growthRate = ((lastHeap - firstHeap) / firstHeap * 100).toFixed(1);
      
      console.log(`\n📊 Memory Analysis:`);
      console.log(`   Initial: ${(firstHeap / 1024 / 1024).toFixed(2)}MB`);
      console.log(`   Final: ${(lastHeap / 1024 / 1024).toFixed(2)}MB`);
      console.log(`   Growth: ${growthMB}MB (${growthRate}%)`);
      
      if (growthRate > 50) {
        console.log(`   ⚠️  MEMORY LEAK DETECTED - Growth > 50%`);
      }
    }
    
    // Network analysis
    console.log(`\n🌐 Network Analysis:`);
    console.log(`   Total Requests: ${this.networkRequestCount}`);
    console.log(`   Active Requests: ${this.activeRequests.size}`);
    
    const rpcCalls = this.metrics.network.filter(r => r.isRPC);
    console.log(`   RPC Calls: ${rpcCalls.length}`);
    
    if (rpcCalls.length > 100) {
      console.log(`   ⚠️  EXCESSIVE RPC CALLS - May indicate polling issue`);
    }
    
    // Error analysis
    console.log(`\n❌ Errors Found: ${this.metrics.errors.length}`);
    this.metrics.errors.slice(0, 5).forEach(error => {
      console.log(`   - ${error.message}`);
    });
    
    // Re-render analysis
    if (this.metrics.rerenders > 0) {
      console.log(`\n🔴 CRITICAL: ${this.metrics.rerenders} infinite re-render cycles detected!`);
    }
    
    // Console warning analysis
    const warnings = this.metrics.console.filter(log => log.type === 'warning');
    console.log(`\n⚠️  Warnings: ${warnings.length}`);
    warnings.slice(0, 5).forEach(warn => {
      console.log(`   - ${warn.text.substring(0, 100)}`);
    });
  }

  async saveReport() {
    const report = {
      testDate: new Date().toISOString(),
      duration: TEST_DURATION_MS,
      url: DASHBOARD_URL,
      metrics: this.metrics,
      summary: {
        totalRequests: this.networkRequestCount,
        errors: this.metrics.errors.length,
        warnings: this.metrics.console.filter(l => l.type === 'warning').length,
        rerenders: this.metrics.rerenders,
        memoryGrowth: this.calculateMemoryGrowth()
      }
    };
    
    const filename = `dashboard-diagnostic-${Date.now()}.json`;
    await fs.writeFile(filename, JSON.stringify(report, null, 2));
    console.log(`\n💾 Full report saved to: ${filename}`);
  }

  calculateMemoryGrowth() {
    if (this.metrics.memory.length < 2) return 0;
    const first = this.metrics.memory[0]?.heap?.usedJSHeapSize || 0;
    const last = this.metrics.memory[this.metrics.memory.length - 1]?.heap?.usedJSHeapSize || 0;
    return ((last - first) / first * 100).toFixed(1);
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.initialize();
      await this.analyzeDashboard();
      this.analyzeResults();
      await this.saveReport();
    } catch (error) {
      console.error('Diagnostic failed:', error);
    } finally {
      await this.cleanup();
    }
  }
}

// Run diagnostics
const diagnostics = new DashboardDiagnostics();
diagnostics.run().catch(console.error);