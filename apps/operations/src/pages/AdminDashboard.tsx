import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '@/integrations/supabase/client';
import { isSuperAdmin, isBuilderAdmin, isMendAdmin, isMendDataEntry } from '@/lib/auth/roles';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { DashboardMap } from '@/components/dashboard/DashboardMap';
import { Badge } from '@/components/ui/badge';
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
  Shield,
  Building,
  DollarSign,
  Calculator,
  MapPin,
  AlertTriangle,
  FileText,
  ChevronRight
} from 'lucide-react';

interface AdminCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  link: string;
  requiredRole: 'super' | 'mend' | 'builder' | 'all';
  userRoleId?: number;
}

function AdminCard({ title, description, icon, link, requiredRole, userRoleId }: AdminCardProps) {
  // Check if user has required role
  if (requiredRole === 'super' && !isSuperAdmin(userRoleId)) {
    return null;
  }
  // 'mend' = Mend staff only (roles 1-4)
  if (requiredRole === 'mend' && !isMendAdmin(userRoleId)) {
    return null;
  }
  // 'builder' = Builder Admin and above (roles 1-5)
  if (requiredRole === 'builder' && !isBuilderAdmin(userRoleId) && !isMendAdmin(userRoleId)) {
    return null;
  }
  // 'all' = anyone with admin access
  
  return (
    <Link to={link}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full group">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 group-hover:text-primary transition-colors">
            {icon}
            <span>{title}</span>
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            Access {title}
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function AdminDashboard() {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
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
    isMendAdmin(userRoleId) || 
    isBuilderAdmin(userRoleId)
  );

  if (!hasAdminAccess) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Determine role label for display
  const getRoleLabel = () => {
    if (isSuperAdmin(userRoleId)) return { label: 'Super Admin', color: 'bg-red-100 text-red-800' };
    if (isMendAdmin(userRoleId)) return { label: 'Mend Staff', color: 'bg-blue-100 text-blue-800' };
    if (isBuilderAdmin(userRoleId)) return { label: 'Builder Admin', color: 'bg-green-100 text-green-800' };
    return { label: 'Admin', color: 'bg-gray-100 text-gray-800' };
  };

  const roleInfo = getRoleLabel();

  // ============================================
  // ADMIN SECTIONS - Organized by Category
  // ============================================
  
  // SECTION 1: User & Company Management
  const userManagementSection = [
    {
      title: 'Builder/Employer Management',
      description: 'Manage construction companies and builders',
      icon: <Building className="h-5 w-5" />,
      link: '/admin/employer-management',
      requiredRole: 'super' as const
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
      description: 'Manage users within your organization',
      icon: <Users className="h-5 w-5" />,
      link: '/admin/user-management',
      requiredRole: 'builder' as const
    },
  ];

  // SECTION 2: Site & Worker Management  
  const siteWorkerSection = [
    {
      title: 'All Sites',
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
      title: 'Worker Management',
      description: 'Manage your workforce and employee records',
      icon: <Users className="h-5 w-5" />,
      link: '/builder/workers',
      requiredRole: 'builder' as const
    },
    {
      title: 'Hours Worked',
      description: 'Track and manage work hours by site',
      icon: <Clock className="h-5 w-5" />,
      link: '/hours-management',
      requiredRole: 'builder' as const
    },
  ];

  // SECTION 3: Data & Configuration (Mend Staff Only)
  const dataConfigSection = [
    {
      title: 'Data Management',
      description: 'Import, export, and manage data',
      icon: <Database className="h-5 w-5" />,
      link: '/admin/data',
      requiredRole: 'mend' as const
    },
    {
      title: 'Reference Tables',
      description: 'Manage lookup tables and codes',
      icon: <Table2 className="h-5 w-5" />,
      link: '/admin/reference-tables',
      requiredRole: 'mend' as const
    },
    {
      title: 'Medical Professionals',
      description: 'Manage medical professional accounts',
      icon: <UserCog className="h-5 w-5" />,
      link: '/admin/medical-professionals',
      requiredRole: 'mend' as const
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
      description: 'Manage incident cost assumptions',
      icon: <Calculator className="h-5 w-5" />,
      link: '/admin/cost-configuration',
      requiredRole: 'super' as const
    },
  ];

  // SECTION 4: System (Super Admin Only)
  const systemSection = [
    {
      title: 'Storage Setup',
      description: 'Configure Supabase storage buckets',
      icon: <HardDrive className="h-5 w-5" />,
      link: '/admin/storage-setup',
      requiredRole: 'super' as const
    },
    {
      title: 'System Logs',
      description: 'View system activity and error logs',
      icon: <Activity className="h-5 w-5" />,
      link: '/admin/system-logs',
      requiredRole: 'super' as const
    },
  ];

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Admin Dashboard' }
  ];

  const customActions = (
    <Badge className={roleInfo.color}>
      {roleInfo.label}
    </Badge>
  );

  // Check if any cards would render in a section
  const hasCardsInSection = (section: typeof userManagementSection) => {
    return section.some(card => {
      if (card.requiredRole === 'super') return isSuperAdmin(userRoleId);
      if (card.requiredRole === 'mend') return isMendAdmin(userRoleId);
      if (card.requiredRole === 'builder') return isBuilderAdmin(userRoleId) || isMendAdmin(userRoleId);
      return true;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        title="Admin Dashboard"
        description="Manage system settings, users, and data"
        breadcrumbItems={breadcrumbItems}
        customActions={customActions}
      />
      
      <div className="container mx-auto py-8 px-4 space-y-8">

        {/* Map for Super Admins */}
        {userRoleId && isSuperAdmin(userRoleId) && (
          <div className="mb-8">
            <DashboardMap height="400px" />
          </div>
        )}

        {/* SECTION 1: User & Company Management */}
        {hasCardsInSection(userManagementSection) && (
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-muted-foreground">
              <Users className="h-5 w-5" />
              User & Company Management
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userManagementSection.map((section) => (
                <AdminCard
                  key={section.link}
                  {...section}
                  userRoleId={userRoleId}
                />
              ))}
            </div>
          </div>
        )}

        {/* SECTION 2: Site & Worker Management */}
        {hasCardsInSection(siteWorkerSection) && (
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-5 w-5" />
              Site & Worker Management
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {siteWorkerSection.map((section) => (
                <AdminCard
                  key={section.link}
                  {...section}
                  userRoleId={userRoleId}
                />
              ))}
            </div>
          </div>
        )}

        {/* SECTION 3: Data & Configuration (Mend Staff Only) */}
        {hasCardsInSection(dataConfigSection) && (
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-muted-foreground">
              <Database className="h-5 w-5" />
              Data & Configuration
              <Badge variant="outline" className="ml-2 text-xs">Mend Staff</Badge>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dataConfigSection.map((section) => (
                <AdminCard
                  key={section.link}
                  {...section}
                  userRoleId={userRoleId}
                />
              ))}
            </div>
          </div>
        )}

        {/* SECTION 4: System Administration (Super Admin Only) */}
        {hasCardsInSection(systemSection) && (
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-muted-foreground">
              <Shield className="h-5 w-5" />
              System Administration
              <Badge variant="outline" className="ml-2 text-xs">Super Admin</Badge>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {systemSection.map((section) => (
                <AdminCard
                  key={section.link}
                  {...section}
                  userRoleId={userRoleId}
                />
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 p-6 bg-muted/30 rounded-lg">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate('/incident-report?new=true')}
            >
              <FileText className="h-4 w-4 mr-2" />
              New Incident Report
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate('/builder/workers')}
            >
              <Users className="h-4 w-4 mr-2" />
              Manage Workers
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate('/reports')}
            >
              <FileUp className="h-4 w-4 mr-2" />
              Safety Reports
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
