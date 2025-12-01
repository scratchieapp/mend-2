    
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
      console.log('Creating Autocomplete instance on:', inputRef.current);
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
      
      // Force high z-index for the autocomplete dropdown
      // This is a workaround for when the input is inside a modal
      const styleId = 'google-places-autocomplete-z-index';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
          .pac-container {
            z-index: 99999 !important;
          }
        `;
        document.head.appendChild(style);
        console.log('Injected z-index fix for pac-container');
      }

    } catch (error) {
      console.error('Failed to initialize Google Places Autocomplete:', error);
    }
  }, [searchType]); // Only searchType needed since callbacks are in refs
