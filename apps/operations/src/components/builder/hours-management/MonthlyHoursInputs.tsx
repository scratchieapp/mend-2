import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";
import { HoursEntry } from "./types";

interface MonthlyHoursInputsProps {
  month: string;
  hours: HoursEntry;
  onChange: (month: string, field: keyof HoursEntry, value: string) => void;
}

export const MonthlyHoursInputs = ({ month, hours, onChange }: MonthlyHoursInputsProps) => {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">
        {format(new Date(month), 'MMM yyyy')}
      </p>
      <div className="space-y-2">
        <div>
          <Label htmlFor={`employer-${month}`} className="text-xs text-muted-foreground">
            Employer Hours
          </Label>
          <Input
            id={`employer-${month}`}
            type="number"
            min="0"
            value={hours.employer_hours || ''}
            onChange={(e) => onChange(month, 'employer_hours', e.target.value)}
            placeholder="0"
            className="h-8"
          />
        </div>
        <div>
          <Label htmlFor={`subcontractor-${month}`} className="text-xs text-muted-foreground">
            Subcontractor Hours
          </Label>
          <Input
            id={`subcontractor-${month}`}
            type="number"
            min="0"
            value={hours.subcontractor_hours || ''}
            onChange={(e) => onChange(month, 'subcontractor_hours', e.target.value)}
            placeholder="0"
            className="h-8"
          />
        </div>
      </div>
    </div>
  );
};