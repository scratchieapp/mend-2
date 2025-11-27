import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from '@/components/ui/breadcrumb';
import { UserBadge } from '@/components/auth/UserBadge';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface DashboardHeaderProps {
  title: string;
  description?: string;
  breadcrumbItems?: BreadcrumbItem[];
  showBackButton?: boolean;
  backButtonLabel?: string;
  customActions?: React.ReactNode;
  onBackClick?: () => void;
}

export function DashboardHeader({
  title,
  description,
  breadcrumbItems = [],
  showBackButton = false,
  backButtonLabel = "Back",
  customActions,
  onBackClick
}: DashboardHeaderProps) {
  const navigate = useNavigate();

  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      navigate(-1);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Left side - Navigation and Title */}
          <div className="flex flex-col space-y-3">
            {/* Breadcrumbs and Back Button Row */}
            <div className="flex items-center space-x-4">
              {showBackButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackClick}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {backButtonLabel}
                </Button>
              )}
              
              {breadcrumbItems.length > 0 && (
                <Breadcrumb>
                  <BreadcrumbList>
                    {breadcrumbItems.map((item, index) => (
                      <div key={index} className="flex items-center">
                        <BreadcrumbItem>
                          {item.href ? (
                            <BreadcrumbLink 
                              href={item.href}
                              className="hover:text-foreground transition-colors"
                            >
                              {item.label}
                            </BreadcrumbLink>
                          ) : (
                            <BreadcrumbPage className="font-medium">
                              {item.label}
                            </BreadcrumbPage>
                          )}
                        </BreadcrumbItem>
                        {index < breadcrumbItems.length - 1 && (
                          <BreadcrumbSeparator />
                        )}
                      </div>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>
              )}
            </div>

            {/* Title and Description */}
            <div>
              <h1 className="text-3xl font-bold text-foreground">{title}</h1>
              {description && (
                <p className="text-muted-foreground mt-1">{description}</p>
              )}
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center space-x-4">
            {customActions && (
              <div className="flex items-center space-x-2">
                {customActions}
              </div>
            )}
            {/* UserBadge removed to avoid duplication with top navigation */}
          </div>
        </div>
      </div>
    </header>
  );
}