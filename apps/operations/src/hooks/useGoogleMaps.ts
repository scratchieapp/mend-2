import { useState, useEffect } from 'react';

interface UseGoogleMapsOptions {
  libraries?: ("drawing" | "geometry" | "localContext" | "places" | "visualization")[];
}

// Default libraries to always load - places is needed for AddressAutocomplete
const DEFAULT_LIBRARIES: UseGoogleMapsOptions['libraries'] = ['places'];

export const useGoogleMaps = (options: UseGoogleMapsOptions = {}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Merge default libraries with any additional ones requested
  const libraries = [...new Set([...DEFAULT_LIBRARIES, ...(options.libraries || [])])];

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.warn('Google Maps API key not found in VITE_GOOGLE_MAPS_API_KEY');
      setError(new Error('Google Maps API key not found'));
      return;
    }

    // Check if Google Maps is already loaded WITH places library
    if (window.google?.maps?.Map && window.google?.maps?.Marker && window.google?.maps?.places?.Autocomplete) {
      console.log('Google Maps already loaded with Places');
      setIsLoaded(true);
      return;
    }

    // Check for existing script
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      console.log('Google Maps script exists, waiting for load...');
      const checkLoaded = () => {
        // Check for both Map and Places to be loaded
        if (window.google?.maps?.Map && window.google?.maps?.places?.Autocomplete) {
          console.log('Google Maps fully loaded');
          setIsLoaded(true);
        } else if (window.google?.maps?.Map && window.google?.maps?.importLibrary) {
          // If Map is loaded but Places isn't, try to import places dynamically
          console.log('Loading places library dynamically...');
          window.google.maps.importLibrary('places').then(() => {
            console.log('Places library loaded dynamically');
            setIsLoaded(true);
          }).catch(err => {
            console.error('Failed to load places library:', err);
            setTimeout(checkLoaded, 200);
          });
        } else {
          setTimeout(checkLoaded, 100);
        }
      };
      checkLoaded();
      return;
    }

    // Create a callback function name
    const callbackName = `initGoogleMaps_${Date.now()}`;
    
    // Set up the callback on window
    (window as any)[callbackName] = () => {
      console.log('Google Maps callback fired');
      const checkReady = () => {
        if (window.google?.maps?.Map && window.google?.maps?.places?.Autocomplete) {
          console.log('Google Maps with Places ready');
          setIsLoaded(true);
          delete (window as any)[callbackName];
        } else {
          setTimeout(checkReady, 50);
        }
      };
      checkReady();
    };

    // Construct script URL with libraries - always include places
    const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=${libraries.join(',')}&loading=async&callback=${callbackName}`;
    console.log('Loading Google Maps with libraries:', libraries.join(','));

    // Load script
    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;
    script.defer = true;
    script.onerror = (e) => {
      console.error('Failed to load Google Maps script', e);
      setError(new Error('Failed to load Google Maps'));
      delete (window as any)[callbackName];
    };
    document.head.appendChild(script);
  }, [libraries.join(',')]); // Re-run if libraries change

  return { isLoaded, error };
};
