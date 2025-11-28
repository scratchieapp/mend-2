import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { AddressAutocomplete } from "@/components/ui/AddressAutocomplete";
import { 
  Building2, 
  Save, 
  CheckCircle,
  AlertCircle,
  Loader2,
  Phone,
  Mail,
  MapPin,
  FileText
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface CompanyData {
  employer_id: number;
  employer_name: string;
  employer_address: string;
  employer_phone: string;
  employer_email?: string;
  employer_state?: string;
  abn?: string;
  manager_name?: string;
  latitude?: number;
  longitude?: number;
}

interface ABNLookupResult {
  valid: boolean;
  abn: string;
  entityName?: string;
  entityType?: string;
  status?: string;
  postcode?: string;
  state?: string;
  message?: string;
}

export default function CompanySettings() {
  const { isAuthenticated, isLoading: authLoading, userData } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<Partial<CompanyData>>({
    employer_name: "",
    employer_address: "",
    employer_phone: "",
    employer_email: "",
    employer_state: "",
    abn: "",
    manager_name: "",
  });
  
  const [abnVerifying, setAbnVerifying] = useState(false);
  const [abnResult, setAbnResult] = useState<ABNLookupResult | null>(null);
  
  const userEmployerId = userData?.employer_id ? parseInt(userData.employer_id) : null;

  // Fetch company data
  const { data: companyData, isLoading } = useQuery({
    queryKey: ['company-settings', userEmployerId],
    queryFn: async () => {
      if (!userEmployerId) return null;
      
      const { data, error } = await supabase
        .from('employers')
        .select('*')
        .eq('employer_id', userEmployerId)
        .single();
      
      if (error) throw error;
      return data as CompanyData;
    },
    enabled: isAuthenticated && !authLoading && !!userEmployerId
  });

  // Populate form when data loads
  useEffect(() => {
    if (companyData) {
      setFormData({
        employer_name: companyData.employer_name || "",
        employer_address: companyData.employer_address || "",
        employer_phone: companyData.employer_phone || "",
        employer_email: companyData.employer_email || "",
        employer_state: companyData.employer_state || "",
        abn: companyData.abn || "",
        manager_name: companyData.manager_name || "",
        latitude: companyData.latitude,
        longitude: companyData.longitude,
      });
    }
  }, [companyData]);

  // Update company mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<CompanyData>) => {
      if (!userEmployerId) throw new Error('No employer ID');
      
      const { error } = await supabase
        .from('employers')
        .update({
          employer_name: data.employer_name,
          employer_address: data.employer_address,
          employer_phone: data.employer_phone,
          employer_email: data.employer_email,
          employer_state: data.employer_state,
          abn: data.abn,
          manager_name: data.manager_name,
          latitude: data.latitude,
          longitude: data.longitude,
          updated_at: new Date().toISOString(),
        })
        .eq('employer_id', userEmployerId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-settings', userEmployerId] });
      toast({
        title: "Settings Saved",
        description: "Your company settings have been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save settings: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // ABN Verification
  const verifyABN = async (abn: string) => {
    if (!abn || abn.length < 11) {
      toast({
        title: "Invalid ABN",
        description: "Please enter a valid 11-digit ABN",
        variant: "destructive",
      });
      return;
    }

    setAbnVerifying(true);
    setAbnResult(null);

    try {
      // Clean the ABN (remove spaces)
      const cleanAbn = abn.replace(/\s/g, '');
      
      // Call the ABN Lookup API
      const abnApiKey = import.meta.env.VITE_ABN_API_KEY;
      
      if (!abnApiKey) {
        // If no API key, just validate format
        const isValidFormat = /^\d{11}$/.test(cleanAbn);
        setAbnResult({
          valid: isValidFormat,
          abn: cleanAbn,
          message: isValidFormat 
            ? "ABN format is valid (API key not configured for full verification)"
            : "Invalid ABN format - must be 11 digits"
        });
        return;
      }

      // Call ABN Lookup API
      const response = await fetch(
        `https://abr.business.gov.au/json/AbnDetails.aspx?abn=${cleanAbn}&callback=callback&guid=${abnApiKey}`
      );
      
      const text = await response.text();
      // Parse JSONP response
      const jsonMatch = text.match(/callback\((.*)\)/);
      if (!jsonMatch) {
        throw new Error('Invalid API response');
      }
      
      const data = JSON.parse(jsonMatch[1]);
      
      if (data.Message) {
        setAbnResult({
          valid: false,
          abn: cleanAbn,
          message: data.Message
        });
      } else {
        setAbnResult({
          valid: true,
          abn: data.Abn,
          entityName: data.EntityName,
          entityType: data.EntityTypeName,
          status: data.AbnStatus,
          postcode: data.AddressPostcode,
          state: data.AddressState,
        });
        
        // Auto-fill some fields from ABN result
        if (data.EntityName && !formData.employer_name) {
          setFormData(prev => ({ ...prev, employer_name: data.EntityName }));
        }
        if (data.AddressState && !formData.employer_state) {
          setFormData(prev => ({ ...prev, employer_state: data.AddressState }));
        }
      }
    } catch (error) {
      console.error('ABN verification error:', error);
      setAbnResult({
        valid: false,
        abn: abn,
        message: 'Failed to verify ABN. Please check the number and try again.'
      });
    } finally {
      setAbnVerifying(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  // Format ABN with spaces (XX XXX XXX XXX)
  const formatABN = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
    if (digits.length <= 8) return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
    return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  };

  // Early returns
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !userEmployerId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You must be logged in with an assigned company to access settings.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Dashboard', href: '/builder' },
    { label: 'Company Settings' }
  ];

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        title="Company Settings"
        description="Manage your company information and preferences"
        breadcrumbItems={breadcrumbItems}
      />

      <div className="container mx-auto py-8 px-4 max-w-4xl">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading company data...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Company Information
                </CardTitle>
                <CardDescription>
                  Basic details about your company
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employer_name">Company Name *</Label>
                    <Input
                      id="employer_name"
                      value={formData.employer_name}
                      onChange={(e) => setFormData({ ...formData, employer_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manager_name">Primary Contact</Label>
                    <Input
                      id="manager_name"
                      value={formData.manager_name}
                      onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                      placeholder="Contact person name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employer_phone" className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      Phone Number
                    </Label>
                    <Input
                      id="employer_phone"
                      value={formData.employer_phone}
                      onChange={(e) => setFormData({ ...formData, employer_phone: e.target.value })}
                      placeholder="02 1234 5678"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employer_email" className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      Email Address
                    </Label>
                    <Input
                      id="employer_email"
                      type="email"
                      value={formData.employer_email}
                      onChange={(e) => setFormData({ ...formData, employer_email: e.target.value })}
                      placeholder="contact@company.com"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ABN Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Australian Business Number (ABN)
                </CardTitle>
                <CardDescription>
                  Your company's ABN for official records
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="abn">ABN</Label>
                    <Input
                      id="abn"
                      value={formatABN(formData.abn || '')}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
                        setFormData({ ...formData, abn: raw });
                        setAbnResult(null); // Clear previous result
                      }}
                      placeholder="XX XXX XXX XXX"
                      maxLength={14}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => verifyABN(formData.abn || '')}
                      disabled={abnVerifying || !formData.abn || formData.abn.length < 11}
                    >
                      {abnVerifying ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        'Verify ABN'
                      )}
                    </Button>
                  </div>
                </div>

                {/* ABN Verification Result */}
                {abnResult && (
                  <Alert variant={abnResult.valid ? "default" : "destructive"}>
                    {abnResult.valid ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <AlertTitle>
                      {abnResult.valid ? 'ABN Verified' : 'Verification Failed'}
                    </AlertTitle>
                    <AlertDescription>
                      {abnResult.message ? (
                        <p>{abnResult.message}</p>
                      ) : abnResult.valid ? (
                        <div className="space-y-1 mt-2">
                          <p><strong>Entity Name:</strong> {abnResult.entityName}</p>
                          <p><strong>Entity Type:</strong> {abnResult.entityType}</p>
                          <p><strong>Status:</strong> <Badge variant={abnResult.status === 'Active' ? 'default' : 'secondary'}>{abnResult.status}</Badge></p>
                          {abnResult.state && <p><strong>State:</strong> {abnResult.state}</p>}
                        </div>
                      ) : null}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Address Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Business Address
                </CardTitle>
                <CardDescription>
                  Your company's registered business address
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="employer_address">Address</Label>
                  <AddressAutocomplete
                    id="employer_address"
                    value={formData.employer_address || ''}
                    onChange={(value) => setFormData({ ...formData, employer_address: value })}
                    onAddressChange={(address) => {
                      setFormData(prev => ({
                        ...prev,
                        employer_address: address.formattedAddress,
                        employer_state: address.state,
                        latitude: address.latitude,
                        longitude: address.longitude,
                      }));
                    }}
                    placeholder="Start typing your business address..."
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employer_state">State</Label>
                    <Input
                      id="employer_state"
                      value={formData.employer_state}
                      onChange={(e) => setFormData({ ...formData, employer_state: e.target.value })}
                      placeholder="e.g., NSW"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end gap-4">
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="min-w-[150px]"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

