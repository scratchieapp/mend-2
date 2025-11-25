import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const EmployerDashboard = () => {
  const { employerId } = useParams();
  const navigate = useNavigate();

  const { data: employer, isLoading } = useQuery({
    queryKey: ['employer', employerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employers')
        .select(`
          *,
          workplace_locations(*)
        `)
        .eq('employer_id', employerId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!employer) {
    return <div>Employer not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      
      <div className="pt-16 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/account-manager')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Account Manager
            </Button>
          </div>

          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              {employer.employer_name}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Employer Dashboard
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Address</dt>
                    <dd className="mt-1">{employer.employer_address || 'Not provided'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Phone</dt>
                    <dd className="mt-1">{employer.employer_phone || 'Not provided'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Manager</dt>
                    <dd className="mt-1">{employer.manager_name || 'Not assigned'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Manager Contact</dt>
                    <dd className="mt-1">
                      {employer.manager_email && (
                        <div>Email: {employer.manager_email}</div>
                      )}
                      {employer.manager_phone && (
                        <div>Phone: {employer.manager_phone}</div>
                      )}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Employment Details</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Employment Arrangement</dt>
                    <dd className="mt-1">{employer.employment_arrangement || 'Not specified'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Basis of Employment</dt>
                    <dd className="mt-1">{employer.basis_of_employment || 'Not specified'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Shift Arrangement</dt>
                    <dd className="mt-1">{employer.shift_arrangement || 'Not specified'}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployerDashboard;