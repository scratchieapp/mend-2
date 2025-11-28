import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, UserPlus, Search, Edit, Trash2, Phone, Mail, MapPin, Calendar, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useEmployerContext } from "@/hooks/useEmployerContext";
import { useAuth } from "@/lib/auth/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { AddressAutocomplete } from "@/components/ui/AddressAutocomplete";
import { format } from "date-fns";

interface Worker {
  worker_id: number;
  given_name: string;
  family_name: string;
  phone_number: string | null;
  mobile_number: string | null;
  email: string | null;
  residential_address: string | null;
  suburb: string | null;
  state: string | null;
  post_code: string | null;
  date_of_birth: string | null;
  gender: string | null;
  occupation: string | null;
  employment_type: string | null;
  employment_arrangement: string | null;
  employer_id: number | null;
  created_at: string | null;
}

const emptyWorker = {
  given_name: "",
  family_name: "",
  phone_number: "",
  mobile_number: "",
  email: "",
  residential_address: "",
  suburb: "",
  state: "",
  post_code: "",
  date_of_birth: "",
  gender: "",
  occupation: "",
  employment_type: "",
  employment_arrangement: "",
};

export default function BuilderWorkerManagement() {
  const { userData } = useAuth();
  const { selectedEmployerId, statistics } = useEmployerContext();
  
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [formData, setFormData] = useState(emptyWorker);
  const [isSaving, setIsSaving] = useState(false);
  
  // Determine the employer ID to use
  const effectiveEmployerId = selectedEmployerId || (userData?.employer_id ? parseInt(userData.employer_id) : null);
  
  // Fetch workers for the employer
  useEffect(() => {
    async function fetchWorkers() {
      if (!effectiveEmployerId) {
        setWorkers([]);
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('workers')
          .select('*')
          .eq('employer_id', effectiveEmployerId)
          .order('family_name', { ascending: true });
        
        if (error) throw error;
        setWorkers(data || []);
      } catch (error) {
        console.error('Error fetching workers:', error);
        toast.error('Failed to load workers');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchWorkers();
  }, [effectiveEmployerId]);
  
  // Filter workers by search term
  const filteredWorkers = workers.filter(worker => {
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${worker.given_name || ''} ${worker.family_name || ''}`.toLowerCase();
    return fullName.includes(searchLower) ||
           (worker.email?.toLowerCase().includes(searchLower)) ||
           (worker.phone_number?.includes(searchTerm)) ||
           (worker.mobile_number?.includes(searchTerm));
  });
  
  const handleAddNew = () => {
    setEditingWorker(null);
    setFormData(emptyWorker);
    setIsDialogOpen(true);
  };
  
  const handleEdit = (worker: Worker) => {
    setEditingWorker(worker);
    setFormData({
      given_name: worker.given_name || "",
      family_name: worker.family_name || "",
      phone_number: worker.phone_number || "",
      mobile_number: worker.mobile_number || "",
      email: worker.email || "",
      residential_address: worker.residential_address || "",
      suburb: worker.suburb || "",
      state: worker.state || "",
      post_code: worker.post_code || "",
      date_of_birth: worker.date_of_birth || "",
      gender: worker.gender || "",
      occupation: worker.occupation || "",
      employment_type: worker.employment_type || "",
      employment_arrangement: worker.employment_arrangement || "",
    });
    setIsDialogOpen(true);
  };
  
  const handleDelete = async (workerId: number) => {
    if (!confirm('Are you sure you want to delete this worker? This cannot be undone.')) return;
    
    try {
      const { error } = await supabase
        .from('workers')
        .delete()
        .eq('worker_id', workerId);
      
      if (error) throw error;
      
      setWorkers(prev => prev.filter(w => w.worker_id !== workerId));
      toast.success('Worker deleted successfully');
    } catch (error: any) {
      console.error('Error deleting worker:', error);
      toast.error(error.message || 'Failed to delete worker');
    }
  };
  
  const handleSave = async () => {
    if (!formData.given_name || !formData.family_name) {
      toast.error('First name and last name are required');
      return;
    }
    
    setIsSaving(true);
    try {
      if (editingWorker) {
        // Update existing worker
        const { error } = await supabase
          .from('workers')
          .update({
            given_name: formData.given_name,
            family_name: formData.family_name,
            phone_number: formData.phone_number || null,
            mobile_number: formData.mobile_number || null,
            email: formData.email || null,
            residential_address: formData.residential_address || null,
            suburb: formData.suburb || null,
            state: formData.state || null,
            post_code: formData.post_code || null,
            date_of_birth: formData.date_of_birth || null,
            gender: formData.gender || null,
            occupation: formData.occupation || null,
            employment_type: formData.employment_type || null,
            employment_arrangement: formData.employment_arrangement || null,
            updated_at: new Date().toISOString(),
          })
          .eq('worker_id', editingWorker.worker_id);
        
        if (error) throw error;
        
        // Refresh the list
        setWorkers(prev => prev.map(w => 
          w.worker_id === editingWorker.worker_id 
            ? { ...w, ...formData, updated_at: new Date().toISOString() }
            : w
        ));
        toast.success('Worker updated successfully');
      } else {
        // Create new worker using RPC to bypass RLS
        const { data, error } = await supabase.rpc('add_worker_rbac', {
          p_given_name: formData.given_name,
          p_family_name: formData.family_name,
          p_phone_number: formData.phone_number || null,
          p_residential_address: formData.residential_address || null,
          p_date_of_birth: formData.date_of_birth || null,
          p_gender: formData.gender || null,
          p_employer_id: effectiveEmployerId,
          p_user_role_id: userData?.role_id || null,
          p_user_employer_id: userData?.employer_id ? parseInt(userData.employer_id) : null
        });
        
        if (error) throw error;
        
        if (data) {
          // Fetch the full worker record
          const { data: newWorker, error: fetchError } = await supabase
            .from('workers')
            .select('*')
            .eq('worker_id', data.worker_id)
            .single();
          
          if (!fetchError && newWorker) {
            // Update additional fields that weren't in the RPC
            await supabase
              .from('workers')
              .update({
                mobile_number: formData.mobile_number || null,
                email: formData.email || null,
                suburb: formData.suburb || null,
                state: formData.state || null,
                post_code: formData.post_code || null,
                occupation: formData.occupation || null,
                employment_type: formData.employment_type || null,
                employment_arrangement: formData.employment_arrangement || null,
              })
              .eq('worker_id', data.worker_id);
            
            setWorkers(prev => [...prev, { ...newWorker, ...formData }]);
          }
        }
        toast.success('Worker added successfully');
      }
      
      setIsDialogOpen(false);
      setFormData(emptyWorker);
      setEditingWorker(null);
    } catch (error: any) {
      console.error('Error saving worker:', error);
      toast.error(error.message || 'Failed to save worker');
    } finally {
      setIsSaving(false);
    }
  };
  
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy');
    } catch {
      return dateStr;
    }
  };
  
  const formatPhone = (phone: string | null | undefined) => {
    if (!phone) return '—';
    // Format as Australian mobile: 04## ### ###
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10 && digits.startsWith('04')) {
      return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
    }
    return phone;
  };

  return (
    <div className="bg-background p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/builder">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8" />
            Worker Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage workers for {statistics?.selected_employer_name || 'your organization'}
          </p>
        </div>
        
        <Button onClick={handleAddNew}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add New Worker
        </Button>
      </div>
      
      {/* Search and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="md:col-span-2">
          <CardContent className="pt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Workers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workers.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Filtered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredWorkers.length}</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Workers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Workers List</CardTitle>
          <CardDescription>
            All workers registered to this organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading workers...</div>
          ) : filteredWorkers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No workers match your search' : 'No workers registered yet'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Date of Birth</TableHead>
                    <TableHead>Employment</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWorkers.map((worker) => (
                    <TableRow key={worker.worker_id}>
                      <TableCell className="font-medium">
                        {worker.given_name} {worker.family_name}
                        {worker.occupation && (
                          <div className="text-xs text-muted-foreground">{worker.occupation}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {formatPhone(worker.phone_number || worker.mobile_number)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {worker.email ? (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{worker.email}</span>
                          </div>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {formatDate(worker.date_of_birth)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm capitalize">
                          {worker.employment_type?.replace('_', ' ') || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(worker)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(worker.worker_id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Add/Edit Worker Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingWorker ? 'Edit Worker' : 'Add New Worker'}</DialogTitle>
            <DialogDescription>
              {editingWorker ? 'Update worker information' : 'Enter details for the new worker'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="given_name">First Name *</Label>
                <Input
                  id="given_name"
                  value={formData.given_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, given_name: e.target.value }))}
                  placeholder="John"
                />
              </div>
              <div>
                <Label htmlFor="family_name">Last Name *</Label>
                <Input
                  id="family_name"
                  value={formData.family_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, family_name: e.target.value }))}
                  placeholder="Smith"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone_number">Phone Number</Label>
                <PhoneInput
                  value={formData.phone_number}
                  onChange={(value) => setFormData(prev => ({ ...prev, phone_number: value }))}
                />
              </div>
              <div>
                <Label htmlFor="mobile_number">Mobile Number</Label>
                <PhoneInput
                  value={formData.mobile_number}
                  onChange={(value) => setFormData(prev => ({ ...prev, mobile_number: value }))}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="john.smith@example.com"
              />
            </div>
            
            <div>
              <Label htmlFor="residential_address">Residential Address</Label>
              <AddressAutocomplete
                value={formData.residential_address}
                onChange={(value) => setFormData(prev => ({ ...prev, residential_address: value }))}
                placeholder="Start typing address..."
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="suburb">Suburb</Label>
                <Input
                  id="suburb"
                  value={formData.suburb}
                  onChange={(e) => setFormData(prev => ({ ...prev, suburb: e.target.value }))}
                  placeholder="Sydney"
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Select
                  value={formData.state}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, state: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NSW">NSW</SelectItem>
                    <SelectItem value="VIC">VIC</SelectItem>
                    <SelectItem value="QLD">QLD</SelectItem>
                    <SelectItem value="WA">WA</SelectItem>
                    <SelectItem value="SA">SA</SelectItem>
                    <SelectItem value="TAS">TAS</SelectItem>
                    <SelectItem value="ACT">ACT</SelectItem>
                    <SelectItem value="NT">NT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="post_code">Post Code</Label>
                <Input
                  id="post_code"
                  value={formData.post_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, post_code: e.target.value }))}
                  placeholder="2000"
                  maxLength={4}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="gender">Gender</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                    <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="occupation">Occupation</Label>
                <Input
                  id="occupation"
                  value={formData.occupation}
                  onChange={(e) => setFormData(prev => ({ ...prev, occupation: e.target.value }))}
                  placeholder="Carpenter"
                />
              </div>
              <div>
                <Label htmlFor="employment_type">Employment Type</Label>
                <Select
                  value={formData.employment_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, employment_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Full Time</SelectItem>
                    <SelectItem value="part_time">Part Time</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="contractor">Contractor</SelectItem>
                    <SelectItem value="subcontractor">Subcontractor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : (editingWorker ? 'Update Worker' : 'Add Worker')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

