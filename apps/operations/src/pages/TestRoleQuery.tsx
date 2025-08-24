import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TestResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

interface TestResults {
  [key: string]: TestResult;
}

export default function TestRoleQuery() {
  const [results, setResults] = useState<TestResults>({});
  const [loading, setLoading] = useState(false);

  const testEmail = 'role1@scratchie.com';

  const runTest = async (testName: string, queryFn: () => Promise<unknown>) => {
    console.log(`🧪 Running test: ${testName}`);
    try {
      const result = await queryFn();
      console.log(`✅ ${testName} result:`, result);
      setResults(prev => ({
        ...prev,
        [testName]: { success: true, data: result }
      }));
    } catch (error) {
      console.error(`❌ ${testName} error:`, error);
      setResults(prev => ({
        ...prev,
        [testName]: { success: false, error: error.message }
      }));
    }
  };

  const runAllTests = async () => {
    setLoading(true);
    setResults({});

    // Test 1: Basic user query
    await runTest('Basic User Query', async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', testEmail)
        .single();
      if (error) throw error;
      return data;
    });

    // Test 2: Query with old join syntax
    await runTest('Old Join Syntax (!inner)', async () => {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          role:user_roles!inner(*)
        `)
        .eq('email', testEmail)
        .single();
      if (error) throw error;
      return data;
    });

    // Test 3: Query with new join syntax
    await runTest('New Join Syntax (!role_id)', async () => {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          role:user_roles!role_id(*)
        `)
        .eq('email', testEmail)
        .single();
      if (error) throw error;
      return data;
    });

    // Test 4: Query with explicit foreign key
    await runTest('Explicit Foreign Key', async () => {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          user_roles!users_role_id_fkey(*)
        `)
        .eq('email', testEmail)
        .single();
      if (error) throw error;
      return data;
    });

    // Test 5: Manual join with two queries
    await runTest('Manual Join', async () => {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', testEmail)
        .single();
      
      if (userError) throw userError;
      
      if (userData?.role_id) {
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('*')
          .eq('role_id', userData.role_id)
          .single();
        
        if (roleError) throw roleError;
        
        return { ...userData, role: roleData };
      }
      
      return userData;
    });

    setLoading(false);
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>🧪 Supabase Role Query Test</CardTitle>
          <p className="text-sm text-muted-foreground">
            Testing different query syntaxes for {testEmail}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={runAllTests} disabled={loading}>
            {loading ? 'Running Tests...' : 'Run All Tests'}
          </Button>

          <div className="space-y-4">
            {Object.entries(results).map(([testName, result]) => (
              <Card key={testName} className={result.success ? 'border-green-500' : 'border-red-500'}>
                <CardHeader>
                  <CardTitle className="text-sm">
                    {result.success ? '✅' : '❌'} {testName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                    {JSON.stringify(result.data || result.error, null, 2)}
                  </pre>
                  {result.success && result.data?.role && (
                    <div className="mt-2 p-2 bg-blue-50 rounded">
                      <p className="text-sm font-semibold">Role Data Found:</p>
                      <p className="text-sm">role_id: {result.data.role?.role_id || result.data.user_roles?.role_id}</p>
                      <p className="text-sm">role_name: {result.data.role?.role_name || result.data.user_roles?.role_name}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-sm">📋 Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="text-sm space-y-1">
                <li>1. Open browser console to see detailed logs</li>
                <li>2. Click "Run All Tests" to test different query syntaxes</li>
                <li>3. Green = Success, Red = Failed</li>
                <li>4. Check which syntax returns the role data correctly</li>
                <li>5. The working syntax should show role_id and role_name</li>
              </ol>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}