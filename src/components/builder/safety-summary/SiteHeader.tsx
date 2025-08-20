import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

interface SiteHeaderProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  monthOptions: { value: string; label: string }[];
}

export const SiteHeader = ({ selectedMonth, onMonthChange, monthOptions }: SiteHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/builder')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold">Site Safety Report</h2>
      </div>
      
      <div className="w-[200px]">
        <Select
          value={selectedMonth}
          onValueChange={onMonthChange}
        >
          <SelectTrigger>
            <SelectValue>
              {format(new Date(selectedMonth), 'MMMM yyyy')}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((month) => (
              <SelectItem key={month.value} value={month.value}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};