import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { useAuth } from "@/lib/auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { Save, DollarSign, AlertTriangle, Info } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CostSettings {
  fai_cost: number;
  mti_cost: number;
  lti_base_cost: number;
  lti_daily_cost: number;
  rwi_cost: number;
  fatality_cost: number;
}

interface LTIRateSettings {
  industry_average: number;
  high_risk_threshold: number;
  low_risk_threshold: number;
}

export default function DataConfigurationAdmin() {
  const { userData } = useAuth();
  const navigate = useNavigate();
  
  // Check if user is role 1 (Super Admin)
  useEffect(() => {
    if (userData && userData.role_id !== 1) {
      toast({
        title: "Access Denied",
        description: "Only Super Admins can access this page",
        variant: "destructive"
      });
      navigate("/dashboard");
    }
  }, [userData, navigate]);

  const [costSettings, setCostSettings] = useState<CostSettings>({
    fai_cost: 50000,
    mti_cost: 15000,
    lti_base_cost: 85000,
    lti_daily_cost: 500,
    rwi_cost: 25000,
    fatality_cost: 5000000
  });

  const [ltiSettings, setLTISettings] = useState<LTIRateSettings>({
    industry_average: 1.5,
    high_risk_threshold: 2.0,
    low_risk_threshold: 1.0
  });

  const [isSaving, setIsSaving] = useState(false);

  // Load settings from localStorage (in production, this would come from database)
  useEffect(() => {
    const savedCosts = localStorage.getItem('incident_cost_settings');
    const savedLTI = localStorage.getItem('lti_rate_settings');
    
    if (savedCosts) {
      setCostSettings(JSON.parse(savedCosts));
    }
    if (savedLTI) {
      setLTISettings(JSON.parse(savedLTI));
    }
  }, []);

  const handleCostChange = (field: keyof CostSettings, value: string) => {
    const numValue = parseFloat(value) || 0;
    setCostSettings(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  const handleLTIChange = (field: keyof LTIRateSettings, value: string) => {
    const numValue = parseFloat(value) || 0;
    setLTISettings(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // In production, save to database via Supabase
      // For now, save to localStorage
      localStorage.setItem('incident_cost_settings', JSON.stringify(costSettings));
      localStorage.setItem('lti_rate_settings', JSON.stringify(ltiSettings));
      
      toast({
        title: "Settings Saved",
        description: "Data configuration has been updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Admin', href: '/admin' },
    { label: 'Data Configuration' }
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        title="Data Configuration"
        description="Configure cost estimates and industry benchmarks"
        breadcrumbItems={breadcrumbItems}
      />
      
      <div className="p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              These settings are used to calculate estimated costs and risk assessments across the platform.
              Changes will affect all dashboards and reports immediately.
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="costs" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="costs">Incident Costs</TabsTrigger>
              <TabsTrigger value="lti">LTI Benchmarks</TabsTrigger>
            </TabsList>

            <TabsContent value="costs" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Incident Cost Estimates
                  </CardTitle>
                  <CardDescription>
                    Configure the estimated costs for different incident classifications.
                    These values are used to calculate total claim costs and insurance premiums.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="fai_cost">
                        First Aid Injury (FAI) Cost
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">$</span>
                        <Input
                          id="fai_cost"
                          type="number"
                          value={costSettings.fai_cost}
                          onChange={(e) => handleCostChange('fai_cost', e.target.value)}
                          placeholder="50000"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Average cost per FAI incident
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mti_cost">
                        Medical Treatment Injury (MTI) Cost
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">$</span>
                        <Input
                          id="mti_cost"
                          type="number"
                          value={costSettings.mti_cost}
                          onChange={(e) => handleCostChange('mti_cost', e.target.value)}
                          placeholder="15000"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Average cost per MTI incident
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lti_base_cost">
                        Lost Time Injury (LTI) Base Cost
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">$</span>
                        <Input
                          id="lti_base_cost"
                          type="number"
                          value={costSettings.lti_base_cost}
                          onChange={(e) => handleCostChange('lti_base_cost', e.target.value)}
                          placeholder="85000"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Base cost for LTI incidents
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lti_daily_cost">
                        LTI Daily Cost (per day lost)
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">$</span>
                        <Input
                          id="lti_daily_cost"
                          type="number"
                          value={costSettings.lti_daily_cost}
                          onChange={(e) => handleCostChange('lti_daily_cost', e.target.value)}
                          placeholder="500"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Additional cost per day lost
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rwi_cost">
                        Restricted Work Injury (RWI) Cost
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">$</span>
                        <Input
                          id="rwi_cost"
                          type="number"
                          value={costSettings.rwi_cost}
                          onChange={(e) => handleCostChange('rwi_cost', e.target.value)}
                          placeholder="25000"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Average cost per RWI incident
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fatality_cost">
                        Fatality Cost
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">$</span>
                        <Input
                          id="fatality_cost"
                          type="number"
                          value={costSettings.fatality_cost}
                          onChange={(e) => handleCostChange('fatality_cost', e.target.value)}
                          placeholder="5000000"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Estimated cost per fatality
                      </p>
                    </div>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Cost Formula Example</h4>
                    <p className="text-sm text-muted-foreground">
                      LTI Total Cost = {formatCurrency(costSettings.lti_base_cost)} + 
                      ({formatCurrency(costSettings.lti_daily_cost)} × Days Lost)
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Example: 30 days lost = {formatCurrency(costSettings.lti_base_cost + (costSettings.lti_daily_cost * 30))}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="lti" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    LTI Rate Benchmarks
                  </CardTitle>
                  <CardDescription>
                    Configure industry benchmark rates for Lost Time Injury frequency.
                    Rates are per million hours worked.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="industry_average">
                        Industry Average LTI Rate
                      </Label>
                      <Input
                        id="industry_average"
                        type="number"
                        step="0.1"
                        value={ltiSettings.industry_average}
                        onChange={(e) => handleLTIChange('industry_average', e.target.value)}
                        placeholder="1.5"
                      />
                      <p className="text-xs text-muted-foreground">
                        Australian construction industry average (per million hours worked)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="high_risk_threshold">
                        High Risk Threshold
                      </Label>
                      <Input
                        id="high_risk_threshold"
                        type="number"
                        step="0.1"
                        value={ltiSettings.high_risk_threshold}
                        onChange={(e) => handleLTIChange('high_risk_threshold', e.target.value)}
                        placeholder="2.0"
                      />
                      <p className="text-xs text-muted-foreground">
                        Rate above which employer is considered high risk
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="low_risk_threshold">
                        Low Risk Threshold
                      </Label>
                      <Input
                        id="low_risk_threshold"
                        type="number"
                        step="0.1"
                        value={ltiSettings.low_risk_threshold}
                        onChange={(e) => handleLTIChange('low_risk_threshold', e.target.value)}
                        placeholder="1.0"
                      />
                      <p className="text-xs text-muted-foreground">
                        Rate below which employer is considered low risk
                      </p>
                    </div>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Risk Categories</h4>
                    <div className="space-y-1 text-sm">
                      <p className="text-green-600">
                        Low Risk: &lt; {ltiSettings.low_risk_threshold} per million hours
                      </p>
                      <p className="text-amber-600">
                        Medium Risk: {ltiSettings.low_risk_threshold} - {ltiSettings.high_risk_threshold} per million hours
                      </p>
                      <p className="text-red-600">
                        High Risk: &gt; {ltiSettings.high_risk_threshold} per million hours
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end">
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              size="lg"
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}