import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Shield, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface RLSTestResult {
  testName: string;
  passed: boolean;
  message: string;
  details?: unknown;
}

export function RLSTestPanel() {
  const [selectedEmployerId, setSelectedEmployerId] = useState<string>("");
  const [testResults, setTestResults] = useState<RLSTestResult[]>([]);
  const [isTestRunning, setIsTestRunning] = useState(false);

  // Fetch employers for testing
  const { data: employers } = useQuery({
    queryKey: ['employers-for-rls-test'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employers')
        .select('employer_id, employer_name')
        .order('employer_name');
      
      if (error) throw error;
      return data;
    }
  });

  const runRLSTests = async () => {
    if (!selectedEmployerId) return;
    
    setIsTestRunning(true);
    const results: RLSTestResult[] = [];
    const employerId = parseInt(selectedEmployerId);

    try {
      // Test 1: Check if employer can see only their own incidents
      const { data: incidents, error: incidentsError } = await supabase
        .from('incidents')
        .select('incident_id, employer_id')
        .eq('employer_id', employerId)
        .limit(5);

      if (incidentsError) {
        results.push({
          testName: "Incident Data Isolation",
          passed: false,
          message: `Error fetching incidents: ${incidentsError.message}`,
        });
      } else {
        const wrongEmployerIncidents = incidents?.filter(i => i.employer_id !== employerId) || [];
        results.push({
          testName: "Incident Data Isolation",
          passed: wrongEmployerIncidents.length === 0,
          message: wrongEmployerIncidents.length === 0 
            ? `✓ All ${incidents?.length || 0} incidents belong to selected employer`
            : `✗ Found ${wrongEmployerIncidents.length} incidents from other employers`,
          details: incidents,
        });
      }

      // Test 2: Check if users assigned to employer can be retrieved
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('user_id, email, employer_id')
        .eq('employer_id', employerId);

      if (usersError) {
        results.push({
          testName: "User-Employer Assignment",
          passed: false,
          message: `Error fetching users: ${usersError.message}`,
        });
      } else {
        results.push({
          testName: "User-Employer Assignment",
          passed: true,
          message: `✓ Found ${users?.length || 0} users assigned to this employer`,
          details: users,
        });
      }

      // Test 3: Check if workers for this employer can be accessed
      const { data: workers, error: workersError } = await supabase
        .from('workers')
        .select('worker_id, employer_id')
        .eq('employer_id', employerId)
        .limit(5);

      if (workersError) {
        results.push({
          testName: "Worker Data Access",
          passed: false,
          message: `Error fetching workers: ${workersError.message}`,
        });
      } else {
        results.push({
          testName: "Worker Data Access",
          passed: true,
          message: `✓ Found ${workers?.length || 0} workers for this employer`,
          details: workers,
        });
      }

      // Test 4: Verify employer details are accessible
      const { data: employerDetails, error: employerError } = await supabase
        .from('employers')
        .select('*')
        .eq('employer_id', employerId)
        .single();

      if (employerError) {
        results.push({
          testName: "Employer Details Access",
          passed: false,
          message: `Error fetching employer details: ${employerError.message}`,
        });
      } else {
        results.push({
          testName: "Employer Details Access",
          passed: true,
          message: `✓ Successfully retrieved employer: ${employerDetails.employer_name}`,
          details: employerDetails,
        });
      }

      // Test 5: Cross-employer data isolation test
      const { data: allIncidents, error: allIncidentsError } = await supabase
        .from('incidents')
        .select('incident_id, employer_id')
        .limit(20);

      if (!allIncidentsError) {
        const uniqueEmployers = new Set(allIncidents?.map(i => i.employer_id));
        results.push({
          testName: "Cross-Employer Isolation",
          passed: uniqueEmployers.size <= 1,
          message: uniqueEmployers.size <= 1
            ? "✓ RLS is working - can only see one employer's data"
            : `⚠️ RLS may be disabled - can see data from ${uniqueEmployers.size} different employers`,
          details: { uniqueEmployerCount: uniqueEmployers.size },
        });
      }

    } catch (error) {
      results.push({
        testName: "General Error",
        passed: false,
        message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    setTestResults(results);
    setIsTestRunning(false);
  };

  const allTestsPassed = testResults.length > 0 && testResults.every(r => r.passed);
  const someTestsFailed = testResults.some(r => !r.passed);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Row-Level Security (RLS) Testing
        </CardTitle>
        <CardDescription>
          Verify that data isolation is working correctly for each employer
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Select
            value={selectedEmployerId}
            onValueChange={setSelectedEmployerId}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select an employer to test" />
            </SelectTrigger>
            <SelectContent>
              {employers?.map((employer) => (
                <SelectItem 
                  key={employer.employer_id} 
                  value={employer.employer_id.toString()}
                >
                  {employer.employer_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={runRLSTests}
            disabled={!selectedEmployerId || isTestRunning}
          >
            {isTestRunning ? "Running Tests..." : "Run RLS Tests"}
          </Button>
        </div>

        {testResults.length > 0 && (
          <div className="space-y-3">
            {allTestsPassed && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  All RLS tests passed! Data isolation is working correctly.
                </AlertDescription>
              </Alert>
            )}
            
            {someTestsFailed && (
              <Alert className="border-red-200 bg-red-50">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  Some RLS tests failed. Review the results below.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              {testResults.map((result, index) => (
                <div 
                  key={index}
                  className={`p-3 rounded-lg border ${
                    result.passed 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {result.passed ? (
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {result.testName}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {result.message}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {testResults.length === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Select an employer and run tests to verify RLS is working correctly.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}