import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Employer } from "@/integrations/supabase/types/employer";

interface EmployerDetailsProps {
  employer: Employer;
  onUpdate: (updates: Partial<Employer>) => void;
}

export function EmployerDetails({ employer, onUpdate }: EmployerDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(employer);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
    setIsEditing(false);
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Company Name</label>
            <Input
              value={formData.employer_name || ''}
              onChange={(e) => setFormData({ ...formData, employer_name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">ABN</label>
            <Input
              value={formData.abn || ''}
              onChange={(e) => setFormData({ ...formData, abn: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <Input
              value={formData.employer_address || ''}
              onChange={(e) => setFormData({ ...formData, employer_address: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit">Save Changes</Button>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium">Company Name</h3>
            <p>{employer.employer_name}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium">ABN</h3>
            <p>{employer.abn}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium">Address</h3>
            <p>{employer.employer_address}</p>
          </div>
          <Button onClick={() => setIsEditing(true)}>Edit Details</Button>
        </div>
      )}
    </div>
  );
}