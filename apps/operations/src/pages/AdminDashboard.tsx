import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '@/integrations/supabase/client';
import { isSuperAdmin, isBuilderAdmin, isMendDataEntry } from '@/lib/auth/roles';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { DashboardMap } from '@/components/dashboard/DashboardMap';
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
  Shield,
  Building,
  DollarSign,
  Calculator,
  MapPin
} from 'lucide-react';

interface AdminCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  link: string;
  requiredRole?: 'super' | 'builder' | 'admin';
  userRoleId?: number;
}

function AdminCard({ title, description, icon, link, requiredRole, userRoleId }: AdminCardProps) {
  // Check if user has required role
  if (requiredRole === 'super' && !isSuperAdmin(userRoleId)) {
    return null;
  }
  if (requiredRole === 'builder' && !isBuilderAdmin(userRoleId) && !isSuperAdmin(userRoleId)) {
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
  const { user, isLoaded } = useUser();
  const [userRoleId, setUserRoleId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user?.primaryEmailAddress?.emailAddress) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('role_id')
        .eq('email', user.primaryEmailAddress.emailAddress)
        .single();

      if (data?.role_id) {
        setUserRoleId(data.role_id);
      }
      setLoading(false);
    };

    if (isLoaded) {
      fetchUserRole();
    }
  }, [user, isLoaded]);

  if (loading || !isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check if user has any admin role
  const hasAdminAccess = userRoleId && (
    isSuperAdmin(userRoleId) || 
    isBuilderAdmin(userRoleId) || 
    isMendDataEntry(userRoleId)
  );

  if (!hasAdminAccess) {
    return <Navigate to="/unauthorized" replace />;
  }

  const adminSections = [
    {
      title: 'Worker Management',
      description: 'Manage your workforce and employee records',
      icon: <Users className="h-5 w-5" />,
      link: '/builder/workers',
      requiredRole: 'builder' as const
    },
    {
      title: 'Builder/Employer Management',
      description: 'Manage construction companies and builders',
      icon: <Building className="h-5 w-5" />,
      link: '/admin/employer-management',
      requiredRole: 'super' as const
    },
    {
      title: 'Site Management',
      description: 'Manage all MEND construction sites with map view',
      icon: <MapPin className="h-5 w-5" />,
      link: '/admin/site-management',
      requiredRole: 'super' as const
    },
    {
      title: 'My Sites',
      description: 'Manage your company\'s construction sites',
      icon: <MapPin className="h-5 w-5" />,
      link: '/builder/site-management',
      requiredRole: 'builder' as const
    },
    {
      title: 'Super User Management',
      description: 'Manage ALL users, roles, and company assignments',
      icon: <Shield className="h-5 w-5" />,
      link: '/admin/super-user-management',
      requiredRole: 'super' as const
    },
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
      title: 'Data Configuration',
      description: 'Configure cost estimates and benchmarks',
      icon: <DollarSign className="h-5 w-5" />,
      link: '/admin/data-configuration',
      requiredRole: 'super' as const
    },
    {
      title: 'Cost Configuration',
      description: 'Manage incident cost assumptions and calculations',
      icon: <Calculator className="h-5 w-5" />,
      link: '/admin/cost-configuration',
      requiredRole: 'super' as const
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

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Admin Dashboard' }
  ];

  const customActions = (
    <div className="flex items-center gap-2">
      <Shield className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">
        Role ID: {userRoleId}
      </span>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        title="Admin Dashboard"
        description="Manage system settings, users, and data"
        breadcrumbItems={breadcrumbItems}
        customActions={customActions}
      />
      
      <div className="container mx-auto py-8 px-4">

      {userRoleId && isSuperAdmin(userRoleId) && (
        <div className="mb-8">
          <DashboardMap height="400px" />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminSections.map((section) => (
          <AdminCard
            key={section.link}
            {...section}
            userRoleId={userRoleId}
          />
        ))}
      </div>

      <div className="mt-12 p-6 bg-muted/30 rounded-lg">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/incident-report?new=true">
            <Button variant="outline" className="w-full">
              New Incident Report
            </Button>
          </Link>
          <Link to="/builder/workers">
            <Button variant="outline" className="w-full">
              Manage Workers
            </Button>
          </Link>
          <Link to="/admin/data-import">
            <Button variant="outline" className="w-full">
              Import Data
            </Button>
          </Link>
        </div>
      </div>
    </div>
    </div>
  );
}