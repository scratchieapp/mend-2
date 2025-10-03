import React from 'react';
import { Building2, Shield, Users, Briefcase } from 'lucide-react';
import { NavigationLinks } from './NavigationLinks';
import { EmployerContextSelector } from '../EmployerContextSelectorWorking';
import { UserBadge } from '../auth/UserBadge';
import { useAuth } from '@/lib/auth/AuthContext';
import { Badge } from '@/components/ui/badge';

interface RoleBasedHeaderProps {
  className?: string;
}

/**
 * Role-based header component that replaces the obsolete ModeSelector
 * Shows appropriate UI elements based on user's role
 */
export function RoleBasedHeader({ className }: RoleBasedHeaderProps) {
  const { userData } = useAuth();

  if (!userData) {
    return null; // Don't show header if user data isn't loaded
  }

  const roleId = userData.role_id;
  const isSuperAdmin = roleId === 1;
  const isAccountManager = roleId === 2;
  const isProjectManager = roleId === 3;
  const isSupervisor = roleId === 4;
  const isBuilderAdmin = roleId === 5;
  const isMedicalProfessional = roleId === 6;
  const isInsuranceProvider = roleId === 7;
  const isGovernmentOfficial = roleId === 8;
  const isWorker = roleId === 9;

  // Determine role display info
  const getRoleInfo = () => {
    switch (roleId) {
      case 1:
        return {
          label: 'Super Admin',
          icon: <Shield className="h-4 w-4" />,
          color: 'bg-red-100 text-red-800'
        };
      case 2:
        return {
          label: 'Account Manager',
          icon: <Briefcase className="h-4 w-4" />,
          color: 'bg-blue-100 text-blue-800'
        };
      case 3:
        return {
          label: 'Project Manager',
          icon: <Building2 className="h-4 w-4" />,
          color: 'bg-green-100 text-green-800'
        };
      case 4:
        return {
          label: 'Supervisor',
          icon: <Users className="h-4 w-4" />,
          color: 'bg-purple-100 text-purple-800'
        };
      case 5:
        return {
          label: 'Builder Admin',
          icon: <Building2 className="h-4 w-4" />,
          color: 'bg-orange-100 text-orange-800'
        };
      case 6:
        return {
          label: 'Medical Professional',
          icon: <Users className="h-4 w-4" />,
          color: 'bg-cyan-100 text-cyan-800'
        };
      case 7:
        return {
          label: 'Insurance Provider',
          icon: <Shield className="h-4 w-4" />,
          color: 'bg-indigo-100 text-indigo-800'
        };
      case 8:
        return {
          label: 'Government Official',
          icon: <Shield className="h-4 w-4" />,
          color: 'bg-gray-100 text-gray-800'
        };
      case 9:
        return {
          label: 'Worker',
          icon: <Users className="h-4 w-4" />,
          color: 'bg-yellow-100 text-yellow-800'
        };
      default:
        return {
          label: 'Unknown Role',
          icon: <Users className="h-4 w-4" />,
          color: 'bg-gray-100 text-gray-800'
        };
    }
  };

  const roleInfo = getRoleInfo();
  const showEmployerSelector = isSuperAdmin; // ONLY show for super admin

  return (
    <nav className={`border-b bg-white shadow-sm ${className || ''}`}>
      <div className="container mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-8">
          {/* Role Badge */}
          <Badge className={`flex items-center gap-1.5 ${roleInfo.color}`}>
            {roleInfo.icon}
            <span className="font-medium">{roleInfo.label}</span>
          </Badge>

          {/* Employer Selector - ONLY for Super Admin */}
          {showEmployerSelector && (
            <EmployerContextSelector />
          )}

          {/* Navigation Links */}
          <NavigationLinks currentMode="mend" />
        </div>

        {/* User Badge */}
        <UserBadge />
      </div>
    </nav>
  );
}