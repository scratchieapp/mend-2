import { useEffect, useRef, useState, useCallback } from 'react';
import { Input } from './input';
import { cn } from '@/lib/utils';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';

// Extend Window interface to include google
declare global {
  interface Window {
    google: typeof google;
    initGooglePlacesAutocomplete?: () => void;
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
  // Type of place to search for:
  // 'address' - strict street addresses only
  // 'geocode' - addresses and geographic locations (roads, regions)
  // 'establishment' - businesses and named places
  // 'regions' - larger areas like suburbs, cities
  // undefined - all types (most flexible)
  searchType?: 'address' | 'geocode' | 'establishment' | 'regions' | 'all';
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

// Parse Google address components into structured data (defined outside component to avoid closure issues)
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
  let streetAddress = [streetNumber, streetName].filter(Boolean).join(' ');
  
  // If no street address, try to use the place name (for non-address locations)
  if (!streetAddress && place.name) {
    streetAddress = place.name;
  }

  // Get city/suburb - try multiple component types
  // In Australia, 'locality' is usually the suburb
  let city = getComponent(['locality', 'sublocality', 'sublocality_level_1']);
  if (!city) {
    // Fallback to administrative_area_level_2 (like a council area) or neighborhood
    city = getComponent(['administrative_area_level_2', 'neighborhood', 'colloquial_area']);
  }

  return {
    streetAddress,
    city,
    state: getShortComponent(['administrative_area_level_1']),
    postCode: getComponent(['postal_code']),
    country: getComponent(['country']),
    latitude: place.geometry?.location?.lat(),
    longitude: place.geometry?.location?.lng(),
    formattedAddress: place.formatted_address || place.name || '',
  };
};

export function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  onAddressChange,
  placeholder = 'Start typing an address...',
  className,
  disabled = false,
  id,
  searchType = 'geocode', // Default to geocode which includes addresses and geographic locations
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const { isLoaded: mapsLoaded } = useGoogleMaps(); // Use shared hook - includes places library
  const [isReady, setIsReady] = useState(false);
  const initRef = useRef(false);

  // Store callbacks in refs to avoid stale closure issues
  const onChangeRef = useRef(onChange);
  const onPlaceSelectRef = useRef(onPlaceSelect);
  const onAddressChangeRef = useRef(onAddressChange);
  
  useEffect(() => {
    onChangeRef.current = onChange;
    onPlaceSelectRef.current = onPlaceSelect;
    onAddressChangeRef.current = onAddressChange;
  }, [onChange, onPlaceSelect, onAddressChange]);

  // Initialize Google Places Autocomplete
  // Note: Using legacy Autocomplete API as PlaceAutocompleteElement has React lifecycle conflicts
  // The legacy API will continue to work and receive bug fixes per Google's deprecation policy
  const initAutocomplete = useCallback(() => {
    if (!inputRef.current || initRef.current) {
      return;
    }
    
    // Ensure google maps places is fully loaded
    if (!window.google?.maps?.places?.Autocomplete) {
      console.log('Google Places Autocomplete not available yet');
      return;
    }

    try {
      // Build autocomplete options
      const options: google.maps.places.AutocompleteOptions = {
        componentRestrictions: { country: 'au' }, // Restrict to Australia
        fields: ['address_components', 'formatted_address', 'geometry', 'name', 'place_id'],
      };

      // Set search type - 'all' means no restriction
      if (searchType && searchType !== 'all') {
        if (searchType === 'regions') {
          options.types = ['(regions)'];
        } else {
          options.types = [searchType];
        }
      }
      // If searchType is 'all' or undefined, don't set types - allows all results

      // Create autocomplete instance
      autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, options);

      // Handle place selection
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        if (!place) return;

        console.log('Selected place:', place); // Debug logging

        // Update the simple value - use name if formatted_address is not available
        const displayValue = place.formatted_address || place.name || '';
        if (displayValue) {
          onChangeRef.current(displayValue);
        }

        // Call onPlaceSelect callback
        if (onPlaceSelectRef.current) {
          onPlaceSelectRef.current(place);
        }

        // Parse and return structured address data
        if (onAddressChangeRef.current) {
          const addressData = parseAddressComponents(place);
          console.log('Parsed address data:', addressData); // Debug logging
          onAddressChangeRef.current(addressData);
        }
      });

      initRef.current = true;
      setIsReady(true);
      console.log('Google Places Autocomplete initialized with type:', searchType || 'all');
    } catch (error) {
      console.error('Failed to initialize Google Places Autocomplete:', error);
    }
  }, [searchType]); // Only searchType needed since callbacks are in refs

  // Initialize autocomplete when Google Maps is loaded
  useEffect(() => {
    if (mapsLoaded && !initRef.current) {
      // Small delay to ensure DOM is ready
      const timeoutId = setTimeout(() => {
        initAutocomplete();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [mapsLoaded, initAutocomplete]);

  return (
    <Input
      ref={inputRef}
      id={id}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={isReady ? placeholder : 'Loading address search...'}
      disabled={disabled}
      className={cn(className, !isReady && 'opacity-75')}
      autoComplete="off"
    />
  );
}

export default AddressAutocomplete;
