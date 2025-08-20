import { Link, Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/AuthContext';
import { isSuperAdmin, isBuilderAdmin, isAdministrator } from '@/lib/auth/roles';
import { 
  Database, 
  Users, 
  FileUp, 
  Search, 
  Table2, 
  Clock, 
  UserCog,
  HardDrive,
  Activity,
  Upload,
  Shield
} from 'lucide-react';

interface AdminCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  link: string;
  requiredRole?: 'super' | 'builder' | 'admin';
}

function AdminCard({ title, description, icon, link, requiredRole }: AdminCardProps) {
  const { userData } = useAuth();
  
  // Check if user has required role
  if (requiredRole === 'super' && !isSuperAdmin(userData?.role_id)) {
    return null;
  }
  if (requiredRole === 'builder' && !isBuilderAdmin(userData?.role_id) && !isSuperAdmin(userData?.role_id)) {
    return null;
  }
  
  return (
    <Link to={link}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {icon}
            <span>{title}</span>
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full">
            Access {title}
          </Button>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function AdminDashboard() {
  const { userData } = useAuth();

  // Check if user has any admin role
  const hasAdminAccess = userData && (
    isSuperAdmin(userData.role_id) || 
    isBuilderAdmin(userData.role_id) || 
    isAdministrator(userData.role_id)
  );

  if (!hasAdminAccess) {
    return <Navigate to="/unauthorized" replace />;
  }

  const adminSections = [
    {
      title: 'User Management',
      description: 'Manage users, roles, and permissions',
      icon: <Users className="h-5 w-5" />,
      link: '/admin/user-management',
      requiredRole: 'admin' as const
    },
    {
      title: 'Data Management',
      description: 'Import, export, and manage data',
      icon: <Database className="h-5 w-5" />,
      link: '/admin/data',
      requiredRole: 'admin' as const
    },
    {
      title: 'Data Import',
      description: 'Bulk import data from CSV/Excel files',
      icon: <FileUp className="h-5 w-5" />,
      link: '/admin/data-import',
      requiredRole: 'admin' as const
    },
    {
      title: 'Storage Setup',
      description: 'Configure Supabase storage buckets',
      icon: <HardDrive className="h-5 w-5" />,
      link: '/admin/storage-setup',
      requiredRole: 'super' as const
    },
    {
      title: 'Reference Tables',
      description: 'Manage lookup tables and codes',
      icon: <Table2 className="h-5 w-5" />,
      link: '/admin/reference-tables',
      requiredRole: 'admin' as const
    },
    {
      title: 'Search & Verify',
      description: 'Search and verify worker information',
      icon: <Search className="h-5 w-5" />,
      link: '/admin/search-verify',
      requiredRole: 'builder' as const
    },
    {
      title: 'Medical Professionals',
      description: 'Manage medical professional accounts',
      icon: <UserCog className="h-5 w-5" />,
      link: '/admin/medical-professionals',
      requiredRole: 'admin' as const
    },
    {
      title: 'Hours Worked',
      description: 'Track and manage work hours',
      icon: <Clock className="h-5 w-5" />,
      link: '/admin/hours-worked',
      requiredRole: 'builder' as const
    },
    {
      title: 'System Logs',
      description: 'View system activity and error logs',
      icon: <Activity className="h-5 w-5" />,
      link: '/admin/system-logs',
      requiredRole: 'super' as const
    }
  ];

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage system settings, users, and data
        </p>
        <div className="flex items-center gap-2 mt-4">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Your role: {userData?.role?.role_name || 'Unknown'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminSections.map((section) => (
          <AdminCard
            key={section.link}
            title={section.title}
            description={section.description}
            icon={section.icon}
            link={section.link}
            requiredRole={section.requiredRole}
          />
        ))}
      </div>

      {isSuperAdmin(userData?.role_id) && (
        <div className="mt-12 p-6 bg-muted rounded-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Quick Setup Guide
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Configure storage buckets using Storage Setup</li>
            <li>Run database migrations in Supabase SQL Editor</li>
            <li>Set up reference tables for injury codes</li>
            <li>Import initial user data</li>
            <li>Configure email notifications</li>
            <li>Review system logs for any issues</li>
          </ol>
        </div>
      )}
    </div>
  );
}