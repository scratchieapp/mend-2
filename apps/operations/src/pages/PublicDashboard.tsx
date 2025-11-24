import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, TrendingUp, AlertTriangle, CheckCircle, Calendar } from "lucide-react";

import { DataErrorBoundary } from "@/components/DataErrorBoundary";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const PublicDashboard = () => {
  // Fetch public statistics (aggregated, non-sensitive data)
  const { data: publicStats, isLoading } = useQuery({
    queryKey: ['public-stats'],
    queryFn: async () => {
      // Fetch aggregated public statistics
      const { data, error } = await supabase
        .rpc('get_public_statistics');
      
      if (error) {
        console.error('Error fetching public stats:', error);
        return null;
      }
      
      return data || {
        totalIncidents: 0,
        averageDaysLost: 0,
        topInjuryTypes: [],
        monthlyTrend: 'stable'
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });

  const statsCards = [
    {
      title: "Industry Safety Trends",
      value: publicStats?.monthlyTrend || "Loading...",
      description: "Based on aggregated industry data",
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Safety Resources",
      value: "12 Guides",
      description: "Best practices and safety protocols",
      icon: Info,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Compliance Updates",
      value: "3 New",
      description: "Recent regulatory changes",
      icon: AlertTriangle,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    },
    {
      title: "Training Materials",
      value: "8 Modules",
      description: "Safety training resources",
      icon: CheckCircle,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      
      <div className="pt-16 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-bold">Public Safety Dashboard</h1>
                <Badge variant="secondary">PUBLIC ACCESS</Badge>
              </div>
              <p className="mt-2 text-muted-foreground">
                Industry safety insights and public resources
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              <Calendar className="inline-block mr-2 h-4 w-4" />
              {format(new Date(), 'MMMM d, yyyy')}
            </div>
          </div>

          {/* Public Notice */}
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4" />
            <AlertTitle>Public Information</AlertTitle>
            <AlertDescription>
              This dashboard displays aggregated, non-sensitive safety statistics and educational resources. 
              For detailed incident reporting or company-specific data, please log in with your credentials.
            </AlertDescription>
          </Alert>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statsCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={index} className={`border-0 shadow-sm ${stat.bgColor}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">
                        {stat.title}
                      </CardTitle>
                      <Icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Industry Insights */}
          <DataErrorBoundary errorTitle="Failed to load industry insights">
            <Card>
              <CardHeader>
                <CardTitle>Industry Safety Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h3 className="font-semibold mb-2">Recent Trends</h3>
                    <p className="text-sm text-muted-foreground">
                      Industry-wide safety metrics show improvement in workplace incident prevention through 
                      enhanced training programs and safety protocols implementation.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-muted rounded-lg">
                    <h3 className="font-semibold mb-2">Best Practices</h3>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li>Regular safety training and refresher courses</li>
                      <li>Proper use of personal protective equipment (PPE)</li>
                      <li>Incident reporting and near-miss documentation</li>
                      <li>Workplace hazard assessments and mitigation</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <h3 className="font-semibold mb-2">Common Injury Types (Industry Average)</h3>
                    {isLoading ? (
                      <p className="text-sm text-muted-foreground">Loading statistics...</p>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Slips, Trips & Falls</span>
                          <span className="font-medium">28%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Manual Handling</span>
                          <span className="font-medium">23%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Struck by Object</span>
                          <span className="font-medium">18%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Tool-related Injuries</span>
                          <span className="font-medium">15%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Other</span>
                          <span className="font-medium">16%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </DataErrorBoundary>

          {/* Resources Section */}
          <Card>
            <CardHeader>
              <CardTitle>Safety Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg hover:bg-muted cursor-pointer transition-colors">
                  <h3 className="font-semibold mb-1">Safety Guidelines</h3>
                  <p className="text-sm text-muted-foreground">
                    Comprehensive workplace safety guidelines and protocols
                  </p>
                </div>
                <div className="p-4 border rounded-lg hover:bg-muted cursor-pointer transition-colors">
                  <h3 className="font-semibold mb-1">Training Materials</h3>
                  <p className="text-sm text-muted-foreground">
                    Educational resources for safety training programs
                  </p>
                </div>
                <div className="p-4 border rounded-lg hover:bg-muted cursor-pointer transition-colors">
                  <h3 className="font-semibold mb-1">Regulatory Compliance</h3>
                  <p className="text-sm text-muted-foreground">
                    Latest safety regulations and compliance requirements
                  </p>
                </div>
                <div className="p-4 border rounded-lg hover:bg-muted cursor-pointer transition-colors">
                  <h3 className="font-semibold mb-1">Emergency Procedures</h3>
                  <p className="text-sm text-muted-foreground">
                    Emergency response protocols and contact information
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Call to Action */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Need Full Access?</AlertTitle>
            <AlertDescription>
              To access detailed incident reports, submit new incidents, or view company-specific data, 
              please contact your organization's administrator for login credentials.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
};

export default PublicDashboard;