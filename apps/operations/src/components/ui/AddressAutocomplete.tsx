import { useEffect, useRef, useState, useCallback } from 'react';
import { Input } from './input';
import { cn } from '@/lib/utils';

// Extend Window interface to include google
declare global {
  interface Window {
    google: typeof google;
  }
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: google.maps.places.PlaceResult) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  // For structured address data
  onAddressChange?: (address: {
    streetAddress: string;
    city: string;
    state: string;
    postCode: string;
    country: string;
    latitude?: number;
    longitude?: number;
    formattedAddress: string;
  }) => void;
}

export function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  onAddressChange,
  placeholder = 'Start typing an address...',
  className,
  disabled = false,
  id,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize Google Places Autocomplete
  const initAutocomplete = useCallback(() => {
    if (!inputRef.current || !window.google?.maps?.places) return;

    // Create autocomplete instance
    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'au' }, // Restrict to Australia
      fields: ['address_components', 'formatted_address', 'geometry', 'name'],
      types: ['address'], // Only return addresses
    });

    // Handle place selection
    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace();
      if (!place) return;

      // Update the simple value
      if (place.formatted_address) {
        onChange(place.formatted_address);
      }

      // Call onPlaceSelect callback
      if (onPlaceSelect) {
        onPlaceSelect(place);
      }

      // Parse and return structured address data
      if (onAddressChange && place.address_components) {
        const addressData = parseAddressComponents(place);
        onAddressChange(addressData);
      }
    });

    setIsLoaded(true);
  }, [onChange, onPlaceSelect, onAddressChange]);

  // Parse Google address components into structured data
  const parseAddressComponents = (place: google.maps.places.PlaceResult) => {
    const components = place.address_components || [];
    
    const getComponent = (types: string[]) => {
      const component = components.find(c => 
        types.some(type => c.types.includes(type))
      );
      return component?.long_name || '';
    };

    const getShortComponent = (types: string[]) => {
      const component = components.find(c => 
        types.some(type => c.types.includes(type))
      );
      return component?.short_name || '';
    };

    // Build street address from components
    const streetNumber = getComponent(['street_number']);
    const streetName = getComponent(['route']);
    const streetAddress = [streetNumber, streetName].filter(Boolean).join(' ');

    return {
      streetAddress,
      city: getComponent(['locality', 'sublocality', 'sublocality_level_1']),
      state: getShortComponent(['administrative_area_level_1']),
      postCode: getComponent(['postal_code']),
      country: getComponent(['country']),
      latitude: place.geometry?.location?.lat(),
      longitude: place.geometry?.location?.lng(),
      formattedAddress: place.formatted_address || '',
    };
  };

  // Load Google Maps script if not already loaded
  useEffect(() => {
    if (window.google?.maps?.places) {
      initAutocomplete();
      return;
    }

    // Check if script is already in DOM
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
      // Wait for it to load
      const checkLoaded = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(checkLoaded);
          initAutocomplete();
        }
      }, 100);
      return () => clearInterval(checkLoaded);
    }

    // Load the script
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn('Google Maps API key not found. Address autocomplete will not work.');
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => initAutocomplete();
    document.head.appendChild(script);

    return () => {
      // Don't remove script on unmount as other components may use it
    };
  }, [initAutocomplete]);

  return (
    <Input
      ref={inputRef}
      id={id}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(className, !isLoaded && 'opacity-75')}
      autoComplete="off"
    />
  );
}

export default AddressAutocomplete;

