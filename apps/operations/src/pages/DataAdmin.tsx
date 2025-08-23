import { Card } from "@/components/ui/card";
import { MenuBar } from "@/components/MenuBar";
import { useNavigate } from "react-router-dom";

const DataAdmin = () => {
  const navigate = useNavigate();

  const adminSections = [
    {
      title: "Reference Tables",
      description: "Manage code tables and reference data",
      route: "/admin/reference-tables",
    },
    {
      title: "Medical Professionals",
      description: "Manage healthcare provider directory",
      route: "/admin/medical-professionals",
    },
    {
      title: "Data Import",
      description: "Import data from external systems",
      route: "/admin/import",
    },
    {
      title: "Search & Verify",
      description: "Search and verify data integrity",
      route: "/admin/search",
    },
    {
      title: "User Management",
      description: "Manage user accounts and permissions",
      route: "/admin/users",
    },
    {
      title: "System Logs",
      description: "View system activity logs",
      route: "/admin/logs",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <MenuBar />
      <div className="pt-16 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Data Administration
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Manage reference data and system configuration
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adminSections.map((section) => (
              <Card
                key={section.title}
                className="p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                onClick={() => navigate(section.route)}
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {section.title}
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {section.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataAdmin;