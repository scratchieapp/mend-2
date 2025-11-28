import React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PhoneInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value?: string;
  onChange?: (value: string) => void;
  error?: boolean;
}

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value = "", onChange, error, ...props }, ref) => {
    const formatPhoneNumber = (input: string | null | undefined): string => {
      if (!input) return "";
      
      // Remove all non-digits
      const digits = input.replace(/\D/g, "");
      
      // Handle different input scenarios
      if (digits.length === 0) return "";
      
      // If starts with 61, treat as +61 format and convert to 04
      if (digits.startsWith("61") && digits.length > 2) {
        const remainingDigits = digits.slice(2);
        if (remainingDigits.length >= 9) {
          return formatAustralianMobile("0" + remainingDigits.slice(0, 9));
        }
        return "0" + remainingDigits;
      }
      
      // If starts with 04, format as mobile
      if (digits.startsWith("04")) {
        return formatAustralianMobile(digits);
      }
      
      // If starts with 4 (user typing mobile without 0)
      if (digits.startsWith("4") && digits.length <= 9) {
        return formatAustralianMobile("0" + digits);
      }
      
      // If starts with 0 but not 04, could be landline - basic formatting
      if (digits.startsWith("0") && !digits.startsWith("04")) {
        if (digits.length <= 10) {
          // Format as landline: 0X XXXX XXXX
          if (digits.length > 6) {
            return digits.slice(0, 2) + " " + digits.slice(2, 6) + " " + digits.slice(6);
          } else if (digits.length > 2) {
            return digits.slice(0, 2) + " " + digits.slice(2);
          }
          return digits;
        }
        return digits.slice(0, 10);
      }
      
      // Default: try to format as mobile by adding 0
      if (digits.length <= 9) {
        return formatAustralianMobile("0" + digits);
      }
      
      return digits.slice(0, 10);
    };

    const formatAustralianMobile = (digits: string): string => {
      if (digits.length <= 4) return digits;
      if (digits.length <= 7) return digits.slice(0, 4) + " " + digits.slice(4);
      if (digits.length <= 10) {
        return digits.slice(0, 4) + " " + digits.slice(4, 7) + " " + digits.slice(7);
      }
      // Limit to 10 digits for Australian mobile
      return digits.slice(0, 4) + " " + digits.slice(4, 7) + " " + digits.slice(7, 10);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      const formatted = formatPhoneNumber(inputValue);
      
      if (onChange) {
        // Return unformatted value for validation
        const unformatted = formatted.replace(/\s/g, "");
        onChange(unformatted);
      }
    };

    const displayValue = formatPhoneNumber(value);

    return (
      <Input
        {...props}
        ref={ref}
        type="tel"
        value={displayValue}
        onChange={handleInputChange}
        placeholder="04## ### ###"
        className={cn(
          error && "border-destructive focus-visible:ring-destructive",
          className
        )}
      />
    );
  }
);

PhoneInput.displayName = "PhoneInput";