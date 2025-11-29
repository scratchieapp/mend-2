import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// Australian states/territories
const AUSTRALIAN_STATES = [
  { value: 'NSW', label: 'New South Wales' },
  { value: 'VIC', label: 'Victoria' },
  { value: 'QLD', label: 'Queensland' },
  { value: 'WA', label: 'Western Australia' },
  { value: 'SA', label: 'South Australia' },
  { value: 'TAS', label: 'Tasmania' },
  { value: 'ACT', label: 'Australian Capital Territory' },
  { value: 'NT', label: 'Northern Territory' },
];
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { 
  Building2, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Users,
  MapPin,
  Phone,
  Mail,
  Building
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RLSTestPanel } from "@/components/admin/RLSTestPanel";

interface Employer {
  employer_id: number;
  employer_name: string;
  employer_state: string;
  employer_post_code: string;
  employer_address?: string;
  employer_phone?: string;
  manager_name?: string;
  manager_phone?: string;
  manager_email?: string;
  abn?: string;
  aliases?: string[];
  created_at: string;
  updated_at: string;
  user_count?: number;
  incident_count?: number;
}

interface EmployerFormData {
  employer_name: string;
  employer_state: string;
  employer_post_code: string;
  employer_address: string;
  employer_phone: string;
  manager_name: string;
  manager_phone: string;
  manager_email: string;
  abn: string;
  aliases: string;  // Comma-separated for easy input
}

export default function EmployerManagementAdmin() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedEmployer, setSelectedEmployer] = useState<Employer | null>(null);
  const [formData, setFormData] = useState<EmployerFormData>({
    employer_name: "",
    employer_state: "",
    employer_post_code: "",
    employer_address: "",
    employer_phone: "",
    manager_name: "",
    manager_phone: "",
    manager_email: "",
    abn: "",
    aliases: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch employers with related counts
  const { data: employers, isLoading } = useQuery({
    queryKey: ['employers'],
    queryFn: async () => {
      const { data: employersData, error: employersError } = await supabase
        .from('employers')
        .select('*')
        .order('employer_name');

      if (employersError) throw employersError;

      // Fetch user counts for each employer
      const employersWithCounts = await Promise.all(
        employersData.map(async (employer) => {
          const { count: userCount } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('employer_id', employer.employer_id);

          const { count: incidentCount } = await supabase
            .from('incidents')
            .select('*', { count: 'exact', head: true })
            .eq('employer_id', employer.employer_id);

          return {
            ...employer,
            user_count: userCount || 0,
            incident_count: incidentCount || 0,
          };
        })
      );

      return employersWithCounts;
    }
  });

  // Create employer mutation
  const createEmployerMutation = useMutation({
    mutationFn: async (data: EmployerFormData) => {
      // Convert comma-separated aliases string to array
      const aliasesArray = data.aliases
        ? data.aliases.split(',').map(a => a.trim()).filter(a => a.length > 0)
        : [];
      
      const { aliases, ...restData } = data;
      const { data: newEmployer, error } = await supabase
        .from('employers')
        .insert([{ ...restData, aliases: aliasesArray }])
        .select()
        .single();

      if (error) throw error;
      return newEmployer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employers'] });
      toast({
        title: "Success",
        description: "Builder/Employer has been created successfully.",
      });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create employer: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Update employer mutation
  const updateEmployerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: EmployerFormData }) => {
      // Convert comma-separated aliases string to array
      const aliasesArray = data.aliases
        ? data.aliases.split(',').map(a => a.trim()).filter(a => a.length > 0)
        : [];
      
      const { aliases, ...restData } = data;
      const { data: updatedEmployer, error } = await supabase
        .from('employers')
        .update({ ...restData, aliases: aliasesArray })
        .eq('employer_id', id)
        .select()
        .single();

      if (error) throw error;
      return updatedEmployer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employers'] });
      toast({
        title: "Success",
        description: "Employer has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      setSelectedEmployer(null);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update employer: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Delete employer mutation
  const deleteEmployerMutation = useMutation({
    mutationFn: async (id: number) => {
      // Check if employer has users or incidents
      const { count: userCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('employer_id', id);

      const { count: incidentCount } = await supabase
        .from('incidents')
        .select('*', { count: 'exact', head: true })
        .eq('employer_id', id);

      if (userCount && userCount > 0) {
        throw new Error(`Cannot delete employer with ${userCount} active users`);
      }

      if (incidentCount && incidentCount > 0) {
        throw new Error(`Cannot delete employer with ${incidentCount} incidents`);
      }

      const { error } = await supabase
        .from('employers')
        .delete()
        .eq('employer_id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employers'] });
      toast({
        title: "Success",
        description: "Employer has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setFormData({
      employer_name: "",
      employer_state: "",
      employer_post_code: "",
      employer_address: "",
      employer_phone: "",
      manager_name: "",
      manager_phone: "",
      manager_email: "",
      abn: "",
      aliases: "",
    });
  };

  const handleEdit = (employer: Employer) => {
    setSelectedEmployer(employer);
    setFormData({
      employer_name: employer.employer_name,
      employer_state: employer.employer_state,
      employer_post_code: employer.employer_post_code,
      employer_address: employer.employer_address || "",
      employer_phone: employer.employer_phone || "",
      manager_name: employer.manager_name || "",
      manager_phone: employer.manager_phone || "",
      manager_email: employer.manager_email || "",
      abn: employer.abn || "",
      aliases: employer.aliases?.join(', ') || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedEmployer) {
      updateEmployerMutation.mutate({ 
        id: selectedEmployer.employer_id, 
        data: formData 
      });
    } else {
      createEmployerMutation.mutate(formData);
    }
  };

  const filteredEmployers = employers?.filter(employer =>
    employer.employer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employer.employer_state.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employer.abn?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Admin', href: '/admin' },
    { label: 'Employer Management' }
  ];

  return (
    <div className="min-h-screen bg-background">
      
      <DashboardHeader
        title="Builder/Employer Management"
        description="Manage construction companies and their details"
        breadcrumbItems={breadcrumbItems}
        customActions={
          <Badge variant="secondary">
            {employers?.length || 0} Total Employers
          </Badge>
        }
      />

      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Registered Builders/Employers
              </CardTitle>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add New Builder
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Builder/Employer</DialogTitle>
                    <DialogDescription>
                      Add a new construction company to the system. Users can be assigned to this company later.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-2 gap-4 py-4">
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
                        <Label htmlFor="abn">ABN</Label>
                        <Input
                          id="abn"
                          value={formData.abn}
                          onChange={(e) => setFormData({ ...formData, abn: e.target.value })}
                          placeholder="12345678901"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="employer_state">State *</Label>
                        <Select
                          value={formData.employer_state}
                          onValueChange={(value) => setFormData({ ...formData, employer_state: value })}
                          required
                        >
                          <SelectTrigger id="employer_state">
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent>
                            {AUSTRALIAN_STATES.map((state) => (
                              <SelectItem key={state.value} value={state.value}>
                                {state.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="employer_post_code">Post Code *</Label>
                        <Input
                          id="employer_post_code"
                          value={formData.employer_post_code}
                          onChange={(e) => setFormData({ ...formData, employer_post_code: e.target.value })}
                          placeholder="2000"
                          required
                        />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="employer_address">Address</Label>
                        <Input
                          id="employer_address"
                          value={formData.employer_address}
                          onChange={(e) => setFormData({ ...formData, employer_address: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="employer_phone">Company Phone</Label>
                        <Input
                          id="employer_phone"
                          value={formData.employer_phone}
                          onChange={(e) => setFormData({ ...formData, employer_phone: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="manager_name">Manager Name</Label>
                        <Input
                          id="manager_name"
                          value={formData.manager_name}
                          onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="manager_phone">Manager Phone</Label>
                        <Input
                          id="manager_phone"
                          value={formData.manager_phone}
                          onChange={(e) => setFormData({ ...formData, manager_phone: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="manager_email">Manager Email</Label>
                        <Input
                          id="manager_email"
                          type="email"
                          value={formData.manager_email}
                          onChange={(e) => setFormData({ ...formData, manager_email: e.target.value })}
                        />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="aliases">Voice Agent Aliases</Label>
                        <Input
                          id="aliases"
                          value={formData.aliases}
                          onChange={(e) => setFormData({ ...formData, aliases: e.target.value })}
                          placeholder="RIX, Ricks, Rex (comma-separated)"
                        />
                        <p className="text-xs text-muted-foreground">
                          Alternative names the voice agent should recognize. Include phonetic variations (e.g., how speech-to-text might transcribe the name).
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Create Employer</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <div className="relative w-96">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  className="pl-10"
                  placeholder="Search by name, state, or ABN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Incidents</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployers.map((employer) => (
                    <TableRow key={employer.employer_id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{employer.employer_name}</div>
                          {employer.abn && (
                            <div className="text-sm text-muted-foreground">ABN: {employer.abn}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span>{employer.employer_state} {employer.employer_post_code}</span>
                        </div>
                      </TableCell>
                      <TableCell>{employer.manager_name || '-'}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {employer.employer_phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              {employer.employer_phone}
                            </div>
                          )}
                          {employer.manager_email && (
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              {employer.manager_email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          <Users className="h-3 w-3 mr-1" />
                          {employer.user_count}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {employer.incident_count}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(employer)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete ${employer.employer_name}?`)) {
                                deleteEmployerMutation.mutate(employer.employer_id);
                              }
                            }}
                            disabled={employer.user_count > 0 || employer.incident_count > 0}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Employer</DialogTitle>
              <DialogDescription>
                Update the employer's information.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_employer_name">Company Name *</Label>
                  <Input
                    id="edit_employer_name"
                    value={formData.employer_name}
                    onChange={(e) => setFormData({ ...formData, employer_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_abn">ABN</Label>
                  <Input
                    id="edit_abn"
                    value={formData.abn}
                    onChange={(e) => setFormData({ ...formData, abn: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_employer_state">State *</Label>
                  <Select
                    value={formData.employer_state}
                    onValueChange={(value) => setFormData({ ...formData, employer_state: value })}
                    required
                  >
                    <SelectTrigger id="edit_employer_state">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {AUSTRALIAN_STATES.map((state) => (
                        <SelectItem key={state.value} value={state.value}>
                          {state.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_employer_post_code">Post Code *</Label>
                  <Input
                    id="edit_employer_post_code"
                    value={formData.employer_post_code}
                    onChange={(e) => setFormData({ ...formData, employer_post_code: e.target.value })}
                    required
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="edit_employer_address">Address</Label>
                  <Input
                    id="edit_employer_address"
                    value={formData.employer_address}
                    onChange={(e) => setFormData({ ...formData, employer_address: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_employer_phone">Company Phone</Label>
                  <Input
                    id="edit_employer_phone"
                    value={formData.employer_phone}
                    onChange={(e) => setFormData({ ...formData, employer_phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_manager_name">Manager Name</Label>
                  <Input
                    id="edit_manager_name"
                    value={formData.manager_name}
                    onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_manager_phone">Manager Phone</Label>
                  <Input
                    id="edit_manager_phone"
                    value={formData.manager_phone}
                    onChange={(e) => setFormData({ ...formData, manager_phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_manager_email">Manager Email</Label>
                  <Input
                    id="edit_manager_email"
                    type="email"
                    value={formData.manager_email}
                    onChange={(e) => setFormData({ ...formData, manager_email: e.target.value })}
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="edit_aliases">Voice Agent Aliases</Label>
                  <Input
                    id="edit_aliases"
                    value={formData.aliases}
                    onChange={(e) => setFormData({ ...formData, aliases: e.target.value })}
                    placeholder="RIX, Ricks, Rex (comma-separated)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Alternative names the voice agent should recognize. Include phonetic variations (e.g., how speech-to-text might transcribe the name).
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Update Employer</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* RLS Testing Panel */}
        <RLSTestPanel />
      </div>
    </div>
  );
}