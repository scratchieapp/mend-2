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

// Track if Places library is being loaded
let placesLibraryLoading = false;
let placesLibraryLoaded = false;
const placesCallbacks: (() => void)[] = [];

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
    
    if (!window.google?.maps?.places?.Autocomplete) {
      console.warn('Google Places Autocomplete not available yet');
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
      console.log('Google Places Autocomplete initialized successfully');
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
    // Already loaded
    if (placesLibraryLoaded && window.google?.maps?.places?.Autocomplete) {
      initAutocomplete();
      return;
    }

    // Register callback for when Places loads
    placesCallbacks.push(initAutocomplete);

    // Already loading, just wait
    if (placesLibraryLoading) {
      return () => {
        const idx = placesCallbacks.indexOf(initAutocomplete);
        if (idx > -1) placesCallbacks.splice(idx, 1);
      };
    }

    // Check if Google Maps is loaded but Places isn't
    if (window.google?.maps && !window.google?.maps?.places?.Autocomplete) {
      console.log('Google Maps loaded without Places library, loading Places...');
      placesLibraryLoading = true;
      
      // Use importLibrary for dynamic loading (Google's recommended approach)
      if (window.google.maps.importLibrary) {
        window.google.maps.importLibrary('places').then(() => {
          console.log('Google Places library loaded dynamically');
          placesLibraryLoaded = true;
          placesLibraryLoading = false;
          placesCallbacks.forEach(cb => cb());
        }).catch((err: Error) => {
          console.error('Failed to load Places library:', err);
          placesLibraryLoading = false;
        });
        return;
      }
    }

    // Need to load full script with Places
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn('Google Maps API key not found (VITE_GOOGLE_MAPS_API_KEY). Address autocomplete will not work.');
      return;
    }

    // Check if any Google Maps script exists
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript && !window.google?.maps?.places?.Autocomplete) {
      // Script exists but places not loaded - wait and try dynamic import
      placesLibraryLoading = true;
      const checkLoaded = setInterval(() => {
        if (window.google?.maps?.importLibrary) {
          clearInterval(checkLoaded);
          window.google.maps.importLibrary('places').then(() => {
            console.log('Google Places library loaded via importLibrary');
            placesLibraryLoaded = true;
            placesLibraryLoading = false;
            placesCallbacks.forEach(cb => cb());
          }).catch((err: Error) => {
            console.error('Failed to load Places library:', err);
            placesLibraryLoading = false;
          });
        } else if (window.google?.maps?.places?.Autocomplete) {
          clearInterval(checkLoaded);
          placesLibraryLoaded = true;
          placesLibraryLoading = false;
          placesCallbacks.forEach(cb => cb());
        }
      }, 100);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkLoaded);
        if (!placesLibraryLoaded) {
          console.error('Timeout waiting for Google Places library');
          placesLibraryLoading = false;
        }
      }, 10000);
      
      return () => {
        clearInterval(checkLoaded);
        const idx = placesCallbacks.indexOf(initAutocomplete);
        if (idx > -1) placesCallbacks.splice(idx, 1);
      };
    }

    // Load fresh script with places library
    if (!existingScript) {
      console.log('Loading Google Maps with Places library...');
      placesLibraryLoading = true;
      
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&callback=initGooglePlacesAutocomplete`;
      script.async = true;
      script.defer = true;
      
      window.initGooglePlacesAutocomplete = () => {
        console.log('Google Maps with Places loaded via callback');
        placesLibraryLoaded = true;
        placesLibraryLoading = false;
        placesCallbacks.forEach(cb => cb());
      };
      
      script.onerror = () => {
        console.error('Failed to load Google Maps script');
        placesLibraryLoading = false;
      };
      
      document.head.appendChild(script);
    }

    return () => {
      const idx = placesCallbacks.indexOf(initAutocomplete);
      if (idx > -1) placesCallbacks.splice(idx, 1);
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

