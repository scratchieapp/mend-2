import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, XCircle, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

interface UserRole {
  role_id: number;
  role_name: string;
  role_label: string;
}

interface Employer {
  employer_id: number;
  employer_name: string;
}

interface ParsedUser {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  employer: string;
  status: 'pending' | 'valid' | 'error' | 'success' | 'failed';
  error?: string;
  roleId?: number;
  employerId?: number;
}

interface BulkUserImportDialogProps {
  onUsersCreated: () => void;
}

export function BulkUserImportDialog({ onUsersCreated }: BulkUserImportDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parsedUsers, setParsedUsers] = useState<ParsedUser[]>([]);
  const [importStep, setImportStep] = useState<'upload' | 'preview' | 'importing' | 'complete'>('upload');

  // Fetch roles
  const { data: roles } = useQuery({
    queryKey: ['user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('role_id');

      if (error) throw error;
      return data as UserRole[];
    }
  });

  // Fetch employers
  const { data: employers } = useQuery({
    queryKey: ['employers-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employers')
        .select('employer_id, employer_name')
        .order('employer_name');

      if (error) throw error;
      return data as Employer[];
    }
  });

  const findRoleByLabel = (label: string): UserRole | undefined => {
    const normalizedLabel = label.toLowerCase().trim();
    return roles?.find(r =>
      r.role_label.toLowerCase() === normalizedLabel ||
      r.role_name.toLowerCase() === normalizedLabel ||
      r.role_name.replace('_', ' ').toLowerCase() === normalizedLabel
    );
  };

  const findEmployerByName = (name: string): Employer | undefined => {
    const normalizedName = name.toLowerCase().trim();
    return employers?.find(e =>
      e.employer_name.toLowerCase() === normalizedName ||
      e.employer_name.toLowerCase().includes(normalizedName) ||
      normalizedName.includes(e.employer_name.toLowerCase())
    );
  };

  const parseCSV = (content: string): ParsedUser[] => {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV must have a header row and at least one data row');
    }

    const header = lines[0].toLowerCase();
    const headerParts = header.split(',').map(h => h.trim());

    // Validate required columns
    const requiredColumns = ['email', 'first_name', 'last_name', 'role'];
    const missingColumns = requiredColumns.filter(col =>
      !headerParts.some(h => h.includes(col.replace('_', '')))
    );

    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }

    // Find column indices
    const emailIdx = headerParts.findIndex(h => h.includes('email'));
    const firstNameIdx = headerParts.findIndex(h => h.includes('first') && h.includes('name'));
    const lastNameIdx = headerParts.findIndex(h => h.includes('last') && h.includes('name'));
    const roleIdx = headerParts.findIndex(h => h === 'role' || h === 'user_role');
    const employerIdx = headerParts.findIndex(h => h.includes('employer') || h.includes('company'));

    const users: ParsedUser[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle CSV with possible quoted values
      const values = parseCSVLine(line);

      const email = values[emailIdx]?.trim() || '';
      const firstName = values[firstNameIdx]?.trim() || '';
      const lastName = values[lastNameIdx]?.trim() || '';
      const roleName = values[roleIdx]?.trim() || '';
      const employerName = employerIdx >= 0 ? (values[employerIdx]?.trim() || '') : '';

      const user: ParsedUser = {
        email,
        firstName,
        lastName,
        role: roleName,
        employer: employerName,
        status: 'pending'
      };

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        user.status = 'error';
        user.error = 'Invalid email format';
        users.push(user);
        continue;
      }

      // Validate and match role
      const matchedRole = findRoleByLabel(roleName);
      if (!matchedRole) {
        user.status = 'error';
        user.error = `Unknown role: ${roleName}`;
        users.push(user);
        continue;
      }
      user.roleId = matchedRole.role_id;

      // Match employer if provided (and not Super Admin)
      if (employerName && matchedRole.role_name !== 'mend_super_admin') {
        const matchedEmployer = findEmployerByName(employerName);
        if (!matchedEmployer) {
          user.status = 'error';
          user.error = `Unknown employer: ${employerName}`;
          users.push(user);
          continue;
        }
        user.employerId = matchedEmployer.employer_id;
      }

      user.status = 'valid';
      users.push(user);
    }

    return users;
  };

  // Parse a single CSV line handling quoted values
  const parseCSVLine = (line: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    return values;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const users = parseCSV(content);
        setParsedUsers(users);
        setImportStep('preview');
      } catch (error) {
        toast({
          title: "Error parsing CSV",
          description: error instanceof Error ? error.message : "Failed to parse CSV file",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const generatePassword = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleImport = async () => {
    const validUsers = parsedUsers.filter(u => u.status === 'valid');
    if (validUsers.length === 0) {
      toast({
        title: "No valid users",
        description: "Please fix the errors before importing",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    setImportStep('importing');
    setProgress(0);

    const updatedUsers = [...parsedUsers];

    for (let i = 0; i < validUsers.length; i++) {
      const user = validUsers[i];
      const userIndex = parsedUsers.findIndex(u => u.email === user.email);
      const password = generatePassword();

      try {
        // Create user in Clerk via Edge Function
        const { data: clerkResponse, error: clerkError } = await supabase.functions.invoke('manage-users', {
          method: 'POST',
          body: {
            action: 'createUser',
            data: {
              email: user.email,
              password: password,
              firstName: user.firstName,
              lastName: user.lastName,
            }
          }
        });

        if (clerkError) throw clerkError;

        // Create user in database
        const fullName = `${user.firstName} ${user.lastName}`.trim();
        const { error: dbError } = await supabase
          .from('users')
          .upsert({
            email: user.email,
            role_id: user.roleId!,
            employer_id: user.employerId || null,
            user_name: fullName || user.email,
            clerk_user_id: clerkResponse.id,
          }, {
            onConflict: 'email'
          });

        if (dbError) throw dbError;

        updatedUsers[userIndex] = { ...user, status: 'success' };
      } catch (error) {
        updatedUsers[userIndex] = {
          ...user,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }

      setParsedUsers([...updatedUsers]);
      setProgress(((i + 1) / validUsers.length) * 100);
    }

    setIsImporting(false);
    setImportStep('complete');
    onUsersCreated();

    const successCount = updatedUsers.filter(u => u.status === 'success').length;
    const failedCount = updatedUsers.filter(u => u.status === 'failed').length;

    toast({
      title: "Import complete",
      description: `${successCount} users created, ${failedCount} failed`,
    });
  };

  const handleClose = () => {
    setIsOpen(false);
    setParsedUsers([]);
    setImportStep('upload');
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const template = `email,first_name,last_name,role,employer_name
admin@example.com,John,Smith,Builder Admin,Example Construction Pty Ltd
worker1@example.com,Jane,Doe,Worker,Example Construction Pty Ltd
worker2@example.com,Bob,Jones,Worker,Example Construction Pty Ltd`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const validCount = parsedUsers.filter(u => u.status === 'valid').length;
  const errorCount = parsedUsers.filter(u => u.status === 'error').length;
  const successCount = parsedUsers.filter(u => u.status === 'success').length;
  const failedCount = parsedUsers.filter(u => u.status === 'failed').length;

  const getStatusIcon = (status: ParsedUser['status']) => {
    switch (status) {
      case 'valid':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleClose();
      else setIsOpen(true);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Import Users
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Bulk User Import
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to create multiple users at once.
          </DialogDescription>
        </DialogHeader>

        {importStep === 'upload' && (
          <div className="space-y-4 py-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>CSV Format:</strong> email, first_name, last_name, role, employer_name
                <br />
                <strong>Valid roles:</strong> {roles?.map(r => r.role_label).join(', ')}
              </AlertDescription>
            </Alert>

            <div className="flex justify-center">
              <Button variant="outline" onClick={downloadTemplate} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Download Template
              </Button>
            </div>

            <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-lg font-medium">Click to upload CSV file</p>
                <p className="text-sm text-muted-foreground mt-1">
                  or drag and drop
                </p>
              </label>
            </div>
          </div>
        )}

        {(importStep === 'preview' || importStep === 'importing' || importStep === 'complete') && (
          <div className="space-y-4 py-4">
            <div className="flex gap-4 mb-4">
              <Badge variant="outline" className="px-3 py-1">
                Total: {parsedUsers.length}
              </Badge>
              {importStep === 'preview' && (
                <>
                  <Badge variant="default" className="px-3 py-1 bg-green-500">
                    Valid: {validCount}
                  </Badge>
                  <Badge variant="destructive" className="px-3 py-1">
                    Errors: {errorCount}
                  </Badge>
                </>
              )}
              {importStep === 'complete' && (
                <>
                  <Badge variant="default" className="px-3 py-1 bg-green-600">
                    Created: {successCount}
                  </Badge>
                  <Badge variant="destructive" className="px-3 py-1">
                    Failed: {failedCount}
                  </Badge>
                </>
              )}
            </div>

            {importStep === 'importing' && (
              <div className="space-y-2">
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-center text-muted-foreground">
                  Creating users... {Math.round(progress)}%
                </p>
              </div>
            )}

            <div className="border rounded-lg max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">Status</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Employer</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedUsers.map((user, index) => (
                    <TableRow key={index}>
                      <TableCell>{getStatusIcon(user.status)}</TableCell>
                      <TableCell className="font-mono text-sm">{user.email}</TableCell>
                      <TableCell>{user.firstName} {user.lastName}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{user.role}</Badge>
                      </TableCell>
                      <TableCell>{user.employer || '-'}</TableCell>
                      <TableCell className="text-red-500 text-sm">
                        {user.error || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter>
          {importStep === 'upload' && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}

          {importStep === 'preview' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={validCount === 0}
              >
                Import {validCount} Users
              </Button>
            </>
          )}

          {importStep === 'importing' && (
            <Button disabled>
              Importing...
            </Button>
          )}

          {importStep === 'complete' && (
            <Button onClick={handleClose}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
