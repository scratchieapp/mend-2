import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Employer {
  employer_id: number;
  employer_name: string;
}

interface EmployerSelectorProps {
  employers: Employer[];
  selectedEmployerId: number | null;
  onSelect: (employerId: number) => void;
  isLoading: boolean;
}

export const EmployerSelector = ({
  employers = [],
  selectedEmployerId,
  onSelect,
  isLoading,
}: EmployerSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const selectedEmployer = employers.find(
    (employer) => employer.employer_id === selectedEmployerId
  );

  const filteredEmployers = employers.filter((employer) =>
    employer.employer_name.toLowerCase().includes(searchValue.toLowerCase())
  );

  if (isLoading) {
    return (
      <Button variant="outline" className="w-[200px] justify-between" disabled>
        Loading employers...
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
        >
          {selectedEmployer?.employer_name ?? "Select employer..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <div className="flex flex-col">
          <div className="p-2">
            <Input
              placeholder="Search employers..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="h-8"
            />
          </div>
          <ScrollArea className="h-[300px]">
            <div className="p-2">
              {filteredEmployers.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No employer found.
                </div>
              ) : (
                filteredEmployers.map((employer) => (
                  <Button
                    key={employer.employer_id}
                    variant="ghost"
                    role="option"
                    onClick={() => {
                      onSelect(employer.employer_id);
                      setOpen(false);
                      setSearchValue("");
                    }}
                    className="w-full justify-start font-normal"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedEmployerId === employer.employer_id
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    {employer.employer_name}
                  </Button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
};