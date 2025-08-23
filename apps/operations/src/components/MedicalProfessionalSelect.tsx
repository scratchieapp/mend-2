import React, { useState, useEffect, useCallback } from 'react';
import { Check, ChevronsUpDown, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import {
  getAllMedicalProfessionals,
  searchMedicalProfessionals,
  type MedicalProfessional
} from '@/lib/supabase/medical-professionals';
import { useDebounce } from '@/hooks/useDebounce';

interface MedicalProfessionalSelectProps {
  value?: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  onAddNew?: () => void;
}

export function MedicalProfessionalSelect({
  value,
  onChange,
  placeholder = 'Select medical professional...',
  disabled = false,
  required = false,
  className,
  onAddNew
}: MedicalProfessionalSelectProps) {
  const [open, setOpen] = useState(false);
  const [professionals, setProfessionals] = useState<MedicalProfessional[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProfessional, setSelectedProfessional] = useState<MedicalProfessional | null>(null);
  
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Load all professionals on mount
  useEffect(() => {
    loadProfessionals();
  }, []);

  // Load selected professional if value is provided
  useEffect(() => {
    if (value && professionals.length > 0) {
      const professional = professionals.find(p => p.doctor_id === value);
      setSelectedProfessional(professional || null);
    } else {
      setSelectedProfessional(null);
    }
  }, [value, professionals]);

  // Search when search term changes
  useEffect(() => {
    if (debouncedSearchTerm) {
      searchProfessionals(debouncedSearchTerm);
    } else {
      loadProfessionals();
    }
  }, [debouncedSearchTerm]);

  const loadProfessionals = async () => {
    setLoading(true);
    try {
      const data = await getAllMedicalProfessionals();
      setProfessionals(data);
    } catch (error) {
      console.error('Failed to load medical professionals:', error);
      setProfessionals([]);
    } finally {
      setLoading(false);
    }
  };

  const searchProfessionals = async (term: string) => {
    setLoading(true);
    try {
      const data = await searchMedicalProfessionals(term);
      setProfessionals(data);
    } catch (error) {
      console.error('Failed to search medical professionals:', error);
      setProfessionals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (professionalId: string) => {
    const id = parseInt(professionalId, 10);
    const professional = professionals.find(p => p.doctor_id === id);
    
    if (professional) {
      setSelectedProfessional(professional);
      onChange(id);
      setOpen(false);
      setSearchTerm('');
    }
  };

  const handleClear = () => {
    setSelectedProfessional(null);
    onChange(null);
    setSearchTerm('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select medical professional"
          className={cn('w-full justify-between', className)}
          disabled={disabled}
        >
          {selectedProfessional ? (
            <div className="flex items-center gap-2 truncate">
              <span className="truncate">{selectedProfessional.full_name}</span>
              {selectedProfessional.specialty && (
                <Badge variant="secondary" className="ml-auto">
                  {selectedProfessional.specialty}
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <CommandEmpty>
            <div className="py-6 text-center text-sm">
              <p className="text-muted-foreground mb-2">No medical professional found.</p>
              {onAddNew && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setOpen(false);
                    onAddNew();
                  }}
                  className="gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Add New Professional
                </Button>
              )}
            </div>
          </CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-auto">
            {!required && selectedProfessional && (
              <CommandItem
                onSelect={handleClear}
                className="text-muted-foreground"
              >
                <span className="italic">Clear selection</span>
              </CommandItem>
            )}
            {loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Loading...
              </div>
            ) : (
              professionals.map((professional) => (
                <CommandItem
                  key={professional.doctor_id}
                  value={professional.doctor_id.toString()}
                  onSelect={handleSelect}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      selectedProfessional?.doctor_id === professional.doctor_id
                        ? 'opacity-100'
                        : 'opacity-0'
                    )}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{professional.full_name}</span>
                      {professional.registration_number && (
                        <span className="text-xs text-muted-foreground">
                          #{professional.registration_number}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {professional.specialty && (
                        <span>{professional.specialty}</span>
                      )}
                      {professional.phone_number && (
                        <>
                          <span>•</span>
                          <span>{professional.phone_number}</span>
                        </>
                      )}
                    </div>
                  </div>
                </CommandItem>
              ))
            )}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}