import { useEffect, useRef, useState, useCallback } from 'react';
import { Input } from './input';
import { cn } from '@/lib/utils';

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

// Global loading state tracking
let isScriptLoading = false;
let isScriptLoaded = false;
const scriptLoadCallbacks: (() => void)[] = [];

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
  const initRef = useRef(false);

  // Initialize Google Places Autocomplete
  const initAutocomplete = useCallback(() => {
    if (!inputRef.current || initRef.current) return;
    
    // Ensure google maps is fully loaded
    if (!window.google?.maps?.places?.Autocomplete) {
      // If importLibrary is available, try to load places library specifically
      if (window.google?.maps?.importLibrary) {
        window.google.maps.importLibrary('places').then(() => {
          initAutocomplete();
        }).catch(err => console.error('Failed to import places library:', err));
      }
      return;
    }

    try {
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

      initRef.current = true;
      setIsLoaded(true);
    } catch (error) {
      console.error('Failed to initialize Google Places Autocomplete:', error);
    }
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

  // Load Google Maps Places library
  useEffect(() => {
    // 1. Check if already loaded
    if (window.google?.maps?.places?.Autocomplete) {
      setIsLoaded(true);
      isScriptLoaded = true;
      initAutocomplete();
      return;
    }

    // 2. Define global callback if not exists
    if (!window.initGooglePlacesAutocomplete) {
      window.initGooglePlacesAutocomplete = () => {
        isScriptLoaded = true;
        isScriptLoading = false;
        setIsLoaded(true);
        scriptLoadCallbacks.forEach(cb => cb());
        // Trigger custom event for other components
        window.dispatchEvent(new Event('google-maps-loaded'));
      };
    }

    // 3. Add ourselves to callback list
    const onScriptLoad = () => {
      setIsLoaded(true);
      initAutocomplete();
    };
    scriptLoadCallbacks.push(onScriptLoad);

    // Listen for custom event (in case another component loaded it)
    window.addEventListener('google-maps-loaded', onScriptLoad);

    // 4. If not loading and not loaded, start loading
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn('Google Maps API key not found');
      return;
    }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');

    if (!existingScript && !isScriptLoading && !isScriptLoaded) {
      isScriptLoading = true;
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&callback=initGooglePlacesAutocomplete`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        console.error('Failed to load Google Maps script');
        isScriptLoading = false;
      };
      document.head.appendChild(script);
    } else if (existingScript && !isScriptLoaded) {
      // Script exists but maybe callback hasn't fired or it was loaded differently
      // Poll for it
      const interval = setInterval(() => {
        if (window.google?.maps?.places?.Autocomplete) {
          clearInterval(interval);
          isScriptLoaded = true;
          setIsLoaded(true);
          initAutocomplete();
        }
      }, 500);
      
      return () => clearInterval(interval);
    }

    return () => {
      window.removeEventListener('google-maps-loaded', onScriptLoad);
      const idx = scriptLoadCallbacks.indexOf(onScriptLoad);
      if (idx > -1) scriptLoadCallbacks.splice(idx, 1);
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
