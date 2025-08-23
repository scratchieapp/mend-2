import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SiteHoursSearchProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export const SiteHoursSearch = ({ searchQuery, onSearchChange }: SiteHoursSearchProps) => {
  return (
    <div className="relative">
      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search sites..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="pl-8"
      />
    </div>
  );
};