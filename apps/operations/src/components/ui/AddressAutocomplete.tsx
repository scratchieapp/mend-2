import { useEffect, useRef, useState, useCallback } from 'react';
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

export function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  onAddressChange,
  placeholder = 'Start typing an address...',
  className,
  disabled = false,
  id,
  searchType = 'geocode',
}: AddressAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const autocompleteElementRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(null);
  const { isLoaded: mapsLoaded } = useGoogleMaps();
  const [isReady, setIsReady] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const initRef = useRef(false);

  // Update inputValue when value prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Parse Google address components into structured data
  const parseAddressComponents = useCallback((place: google.maps.places.Place) => {
    const components = place.addressComponents || [];
    
    const getComponent = (types: string[]) => {
      const component = components.find(c => 
        types.some(type => c.types.includes(type))
      );
      return component?.longText || '';
    };

    const getShortComponent = (types: string[]) => {
      const component = components.find(c => 
        types.some(type => c.types.includes(type))
      );
      return component?.shortText || '';
    };

    // Build street address from components
    const streetNumber = getComponent(['street_number']);
    const streetName = getComponent(['route']);
    let streetAddress = [streetNumber, streetName].filter(Boolean).join(' ');
    
    // If no street address, try to use the place name
    if (!streetAddress && place.displayName) {
      streetAddress = place.displayName;
    }

    // Get city - try multiple component types
    let city = getComponent(['locality', 'sublocality', 'sublocality_level_1']);
    if (!city) {
      city = getComponent(['administrative_area_level_2', 'neighborhood', 'colloquial_area']);
    }

    return {
      streetAddress,
      city,
      state: getShortComponent(['administrative_area_level_1']),
      postCode: getComponent(['postal_code']),
      country: getComponent(['country']),
      latitude: place.location?.lat(),
      longitude: place.location?.lng(),
      formattedAddress: place.formattedAddress || place.displayName || '',
    };
  }, []);

  // Initialize Google Places Autocomplete Element (new API)
  const initAutocomplete = useCallback(async () => {
    if (!containerRef.current || initRef.current) {
      return;
    }
    
    // Check for the new PlaceAutocompleteElement API
    if (!window.google?.maps?.places?.PlaceAutocompleteElement) {
      console.log('PlaceAutocompleteElement not available, trying to import...');
      try {
        await window.google?.maps?.importLibrary('places');
      } catch (e) {
        console.error('Failed to import places library:', e);
        return;
      }
    }

    if (!window.google?.maps?.places?.PlaceAutocompleteElement) {
      console.error('PlaceAutocompleteElement still not available after import');
      return;
    }

    try {
      // Clear container
      containerRef.current.innerHTML = '';

      // Build type array based on searchType
      let types: string[] = [];
      if (searchType && searchType !== 'all') {
        if (searchType === 'regions') {
          types = ['(regions)'];
        } else {
          types = [searchType];
        }
      }

      // Create the PlaceAutocompleteElement
      const autocompleteElement = new google.maps.places.PlaceAutocompleteElement({
        componentRestrictions: { country: 'au' },
        types: types.length > 0 ? types : undefined,
      });

      // Style the element to match our input styling
      autocompleteElement.style.cssText = `
        width: 100%;
        --gmpx-color-surface: transparent;
        --gmpx-color-on-surface: hsl(var(--foreground));
        --gmpx-color-on-surface-variant: hsl(var(--muted-foreground));
        --gmpx-color-primary: hsl(var(--primary));
        --gmpx-font-family-base: inherit;
        --gmpx-font-size-base: 0.875rem;
      `;

      // Set placeholder
      autocompleteElement.setAttribute('placeholder', placeholder);
      
      // Set initial value if provided
      if (value) {
        // The element doesn't support setting value directly on creation
        // It will be populated by the input event
      }

      // Handle place selection
      autocompleteElement.addEventListener('gmp-placeselect', async (event: any) => {
        const place = event.place as google.maps.places.Place;
        
        // Fetch full place details
        await place.fetchFields({
          fields: ['displayName', 'formattedAddress', 'addressComponents', 'location'],
        });

        console.log('Selected place:', place);

        // Update the value
        const displayValue = place.formattedAddress || place.displayName || '';
        if (displayValue) {
          setInputValue(displayValue);
          onChange(displayValue);
        }

        // Call onPlaceSelect callback with compatible format
        if (onPlaceSelect) {
          // Convert new Place to PlaceResult for backward compatibility
          const placeResult: google.maps.places.PlaceResult = {
            formatted_address: place.formattedAddress,
            name: place.displayName,
            geometry: place.location ? {
              location: place.location,
            } : undefined,
            address_components: place.addressComponents?.map(c => ({
              long_name: c.longText || '',
              short_name: c.shortText || '',
              types: c.types,
            })),
          };
          onPlaceSelect(placeResult);
        }

        // Parse and return structured address data
        if (onAddressChange) {
          const addressData = parseAddressComponents(place);
          console.log('Parsed address data:', addressData);
          onAddressChange(addressData);
        }
      });

      // Handle input changes for controlled component behavior
      autocompleteElement.addEventListener('gmp-input', (event: any) => {
        const inputText = event.target?.value || '';
        setInputValue(inputText);
        onChange(inputText);
      });

      // Append to container
      containerRef.current.appendChild(autocompleteElement);
      autocompleteElementRef.current = autocompleteElement;

      initRef.current = true;
      setIsReady(true);
      console.log('PlaceAutocompleteElement initialized with type:', searchType || 'all');
    } catch (error) {
      console.error('Failed to initialize PlaceAutocompleteElement:', error);
    }
  }, [onChange, onPlaceSelect, onAddressChange, searchType, placeholder, parseAddressComponents, value]);

  // Initialize autocomplete when Google Maps is loaded
  useEffect(() => {
    if (mapsLoaded && !initRef.current) {
      const timeoutId = setTimeout(() => {
        initAutocomplete();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [mapsLoaded, initAutocomplete]);

  return (
    <div 
      ref={containerRef}
      id={id}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors",
        "focus-within:outline-none focus-within:ring-1 focus-within:ring-ring",
        disabled && "cursor-not-allowed opacity-50",
        !isReady && "opacity-75",
        className
      )}
      style={{
        // CSS custom properties for the PlaceAutocompleteElement
        '--gmpx-color-surface': 'transparent',
      } as React.CSSProperties}
    >
      {!isReady && (
        <span className="text-muted-foreground text-sm py-1">Loading address search...</span>
      )}
    </div>
  );
}

export default AddressAutocomplete;
