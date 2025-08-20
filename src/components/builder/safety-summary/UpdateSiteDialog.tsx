import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X, Check } from "lucide-react";
import { format } from "date-fns";

interface UpdateSiteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    projectType: string;
    employerHours: number;
    subcontractorHours: number;
    currentStatus: string;
  };
  onUpdateStatus: (status: string) => void;
  onUpdateHours: (employerHours: number, subcontractorHours: number) => void;
}

export const UpdateSiteDialog = ({
  isOpen,
  onClose,
  data,
  onUpdateStatus,
  onUpdateHours,
}: UpdateSiteDialogProps) => {
  const currentMonth = format(new Date(), 'MMMM yyyy');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const employerHours = Number(formData.get('employerHours'));
    const subcontractorHours = Number(formData.get('subcontractorHours'));
    onUpdateHours(employerHours, subcontractorHours);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Site Details</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Site Status for {currentMonth}</Label>
            <Select
              defaultValue={data.currentStatus || 'working'}
              onValueChange={onUpdateStatus}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="working">Working</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="finished">Finished</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Employer Hours</Label>
            <Input
              name="employerHours"
              type="number"
              defaultValue={data.employerHours}
              disabled={data.currentStatus !== 'working'}
            />
          </div>

          <div className="space-y-2">
            <Label>Subcontractor Hours</Label>
            <Input
              name="subcontractorHours"
              type="number"
              defaultValue={data.subcontractorHours}
              disabled={data.currentStatus !== 'working'}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit">
              <Check className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};