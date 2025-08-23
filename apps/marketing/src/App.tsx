import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import NotFound from './pages/NotFound'
import ScrollToTop from './components/ScrollToTop'
import { AnalyticsProvider } from './lib/analytics/useAnalytics'
import './App.css'

function App() {
  return (
    <AnalyticsProvider>
      <div className="min-h-screen bg-white">
        <ScrollToTop />
        <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/operations/*" element={
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Operations Platform</h1>
              <p className="text-gray-600 mb-6">
                The Mend operations platform runs on a separate application. Click below to access the secure operations dashboard.
              </p>
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    const operationsUrl = import.meta.env.VITE_OPERATIONS_URL || 'http://localhost:5173';
                    window.location.href = `${operationsUrl}/auth/clerk-login`;
                  }}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Go to Operations Platform
                </button>
                <a 
                  href="/"
                  className="block w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back to Marketing Site
                </a>
              </div>
              <p className="text-xs text-gray-500 mt-4">
                Note: In production, this redirects to operations.mend.com.au
              </p>
            </div>
          </div>
        } />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
    </AnalyticsProvider>
  )
}

export default App