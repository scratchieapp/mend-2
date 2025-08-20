import { Button } from "@/components/ui/button";
import { Database, Building, Stethoscope } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type UserMode = "mend" | "builder" | "medical";

interface ModeSelectorProps {
  currentMode: UserMode;
  onModeChange: (mode: UserMode) => void;
}

export function ModeSelector({ currentMode, onModeChange }: ModeSelectorProps) {
  const getModeIcon = () => {
    switch (currentMode) {
      case "mend":
        return <Database className="h-4 w-4 mr-2" />;
      case "builder":
        return <Building className="h-4 w-4 mr-2" />;
      case "medical":
        return <Stethoscope className="h-4 w-4 mr-2" />;
    }
  };

  const getModeLabel = () => {
    switch (currentMode) {
      case "mend":
        return "Mend Services";
      case "builder":
        return "Builder";
      case "medical":
        return "Medical Professional";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="min-w-[180px] justify-start">
          {getModeIcon()}
          {getModeLabel()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => onModeChange("mend")}>
          <Database className="h-4 w-4 mr-2" />
          Mend Services
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onModeChange("builder")}>
          <Building className="h-4 w-4 mr-2" />
          Builder
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onModeChange("medical")}>
          <Stethoscope className="h-4 w-4 mr-2" />
          Medical Professional
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}