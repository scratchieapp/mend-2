import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export const DashboardHeader = () => {
  const handleExportReport = () => {
    toast({
      title: "Generating report",
      description: "Your report will be ready shortly.",
    });
  };

  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
          Executive Dashboard
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Company-wide safety performance and KPIs
        </p>
      </div>
      <Button onClick={handleExportReport}>
        <Download className="mr-2 h-4 w-4" />
        Export Monthly Report
      </Button>
    </div>
  );
};