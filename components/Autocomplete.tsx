
import React, { useEffect, useRef, useState } from "react";
import { Search as SearchIcon, X, AlertTriangle } from "lucide-react";
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";

interface AutocompleteProps {
  setNewPlace?: (newPlace: google.maps.LatLngLiteral) => void;
  onAddressSelect?: (address: string) => void;
  placeholder?: string;
  defaultValue?: string;
}

const Autocomplete: React.FC<AutocompleteProps> = ({
  setNewPlace,
  onAddressSelect,
  placeholder = "Search for a location",
  defaultValue = ""
}) => {
  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
    },
    debounce: 300,
    defaultValue: defaultValue
  });

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (defaultValue && defaultValue !== value) {
      setValue(defaultValue, false);
    }
  }, [defaultValue, setValue]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    setShowSuggestions(true);
    setErrorMsg(null);
  };

  const handleSelect = async (address: string, placeId: string) => {
    setValue(address, false);
    clearSuggestions();
    setShowSuggestions(false);
    setErrorMsg(null);

    if (onAddressSelect) {
      onAddressSelect(address);
    }

    if (setNewPlace) {
      try {
        const results = await getGeocode({ address });
        const { lat, lng } = await getLatLng(results[0]);
        setNewPlace({ lat, lng });
      } catch (error: any) {
        console.warn("Geocoding failed, attempting PlacesService fallback...", error);
        
        if (window.google && window.google.maps && window.google.maps.places) {
            try {
                const mapDiv = document.createElement('div');
                const service = new window.google.maps.places.PlacesService(mapDiv);
                
                service.getDetails({ placeId: placeId, fields: ['geometry'] }, (place: any, status: any) => {
                    if (status === window.google.maps.places.PlacesServiceStatus.OK && place && place.geometry && place.geometry.location) {
                        setNewPlace({
                            lat: place.geometry.location.lat(),
                            lng: place.geometry.location.lng()
                        });
                        setErrorMsg(null);
                    } else {
                        console.error("Places Details fallback failed:", status);
                        if (error?.toString().includes("REQUEST_DENIED") || error === "REQUEST_DENIED") {
                             setErrorMsg("Geocoding/Places API not fully authorized. Coordinates unavailable.");
                        } else {
                             setErrorMsg("Failed to fetch location coordinates.");
                        }
                    }
                });
            } catch (fallbackError) {
                console.error("Fallback error", fallbackError);
            }
        } else {
             setErrorMsg("Maps services unavailable.");
        }
      }
    }
  };

  return (
    <div ref={wrapperRef} className="relative flex-grow w-full"> 
      <div className="relative">
        <input
          value={value}
          onChange={handleInput}
          disabled={!ready}
          placeholder={placeholder}
          className={`w-full pl-10 pr-8 py-2 border rounded-lg focus:ring-2 outline-none text-sm disabled:bg-gray-50 transition-all ${errorMsg ? 'border-red-300 focus:ring-red-200' : 'border-gray-300 focus:ring-emerald-500'}`}
          onFocus={() => { if(value) setShowSuggestions(true); }}
        />
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        {value && (
            <button 
                type="button"
                onClick={() => { setValue("", false); clearSuggestions(); setErrorMsg(null); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
            >
                <X className="w-3 h-3" />
            </button>
        )}
      </div>
      
      {errorMsg && (
          <div className="absolute right-0 top-full mt-1 z-10 bg-red-50 text-red-600 text-xs px-2 py-1 rounded border border-red-100 flex items-center gap-1 shadow-sm">
              <AlertTriangle className="w-3 h-3" /> {errorMsg}
          </div>
      )}

      {showSuggestions && status === "OK" && data.length > 0 && (
        <ul className="absolute z-[1000] mt-1 w-full bg-white shadow-xl rounded-lg border border-gray-200 overflow-hidden max-h-60 overflow-y-auto">
          {data.map(({ place_id, description }) => (
            <li
              key={place_id}
              onClick={() => handleSelect(description, place_id)}
              className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-700 border-b border-gray-50 last:border-0 transition-colors"
            >
              {description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Autocomplete;
