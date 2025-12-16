
import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, Settings, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { HARDCODED_MAPS_API_KEY } from '../../services/cloudService';

declare global {
  interface Window {
    google: any;
    gm_authFailure?: () => void;
    gm_authFailure_detected?: boolean;
  }
}

const LiveTracking: React.FC = () => {
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  
  // Determine Session Context
  const userRole = localStorage.getItem('user_role');
  const isSuperAdminUser = userRole === 'ADMIN';
  const isCorporateUser = userRole === 'CORPORATE';

  // Center of Coimbatore for default view
  const center = { lat: 11.0168, lng: 76.9558 };

  // Staff Locations state - initialized as empty (no mock data)
  const [staffLocations, setStaffLocations] = useState<any[]>([]);

  useEffect(() => {
    // 1. Check global failure flag
    if (window.gm_authFailure_detected) {
      setMapError("Billing Not Enabled: Please enable billing on your Google Cloud Project.");
      return;
    }

    // 2. Handle Missing API Key - Explicitly check LocalStorage only
    const apiKey = HARDCODED_MAPS_API_KEY || localStorage.getItem('maps_api_key');
    if (!apiKey) {
      setMapError("API Key is missing. Please add it in Settings > Integrations.");
      return;
    }

    // 3. Global Auth Failure Handler
    const originalAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      window.gm_authFailure_detected = true;
      setMapError("Billing Not Enabled: Map functionality requires an active billing account on Google Cloud.");
      if (originalAuthFailure) originalAuthFailure();
    };

    // 4. Validate Existing Script
    const scriptId = 'google-maps-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    if (script) {
       const src = script.getAttribute('src') || '';
       if (!src.includes(`key=${apiKey}`)) {
          script.remove();
          if (window.google) {
             window.location.reload();
             return;
          }
       }
    }

    // 5. Check if script is already fully loaded
    if (window.google && window.google.maps) {
      setIsMapReady(true);
      return;
    }

    // 6. Load Script if needed
    if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => setIsMapReady(true);
        script.onerror = () => setMapError("Failed to load Google Maps script. Check network.");
        document.head.appendChild(script);
    } else {
        script.addEventListener('load', () => setIsMapReady(true));
        if (window.google && window.google.maps) setIsMapReady(true);
    }

    return () => {
        // cleanup if needed
    };
  }, []);

  // Initialize Map & Markers
  useEffect(() => {
    if (mapError || !isMapReady || !mapRef.current || mapInstance || !window.google) return;

    try {
      const map = new window.google.maps.Map(mapRef.current, {
        center: center,
        zoom: 13,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });

      setMapInstance(map);

      // Add Markers (Only if staffLocations has data)
      staffLocations.forEach(emp => {
        const marker = new window.google.maps.Marker({
          position: { lat: emp.lat, lng: emp.lng },
          map: map,
          title: emp.name,
          label: {
             text: emp.name.charAt(0),
             color: 'white',
             fontSize: '12px',
             fontWeight: 'bold'
          }
        });

        const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div style="padding: 5px;">
                <h3 style="margin:0; font-weight:bold;">${emp.name}</h3>
                <p style="margin:2px 0; font-size:12px; color:gray;">${emp.role}</p>
                <p style="margin:0; font-size:10px;">Last seen: ${emp.lastUpdate}</p>
              </div>
            `
        });

        marker.addListener("click", () => {
            infoWindow.open(map, marker);
        });
      });

    } catch (e) {
      console.error(e);
      setMapError("Error initializing map.");
    }
  }, [isMapReady, mapError, staffLocations]);

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col space-y-4">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold text-gray-800">Live Staff Tracking</h2>
           <p className="text-gray-500">Real-time location of your field force</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
           <span className={`w-2 h-2 rounded-full ${staffLocations.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`}></span>
           {staffLocations.length > 0 ? 'Live Updating' : 'No active devices'}
        </div>
      </div>

      <div className="flex-1 bg-gray-100 rounded-xl overflow-hidden border border-gray-200 relative shadow-sm">
         {mapError ? (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500 bg-gray-50 p-6 text-center z-10">
              <div className="flex flex-col items-center gap-3 max-w-sm">
                <AlertTriangle className="w-10 h-10 text-red-400" />
                <h3 className="font-medium text-gray-900">Map Unavailable</h3>
                {isCorporateUser ? (
                    <p className="text-sm text-gray-600">
                      Google Maps API Key is not configured correctly or billing is disabled. Please contact Super Admin.
                    </p>
                ) : (
                    <>
                        <p className="text-sm text-gray-600 font-medium">{mapError}</p>
                        
                        <div className="bg-amber-50 border border-amber-100 p-3 rounded text-xs text-amber-800 mt-2 text-left w-full">
                               <strong>Troubleshooting:</strong>
                               <ul className="list-disc list-inside mt-1 space-y-1">
                                  <li>Go to Google Cloud Console</li>
                                  <li className="font-bold">Enable "Billing" on the Project (Required)</li>
                                  <li>Enable "Maps JavaScript API" & "Places API"</li>
                               </ul>
                        </div>

                        <a 
                          href="https://console.cloud.google.com/project/_/billing/enable"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 text-xs flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" /> Enable Billing
                        </a>

                        <button 
                          onClick={() => navigate('/admin/settings')} 
                          className="mt-2 text-xs flex items-center gap-1 bg-white border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <Settings className="w-3 h-3" /> Check Settings
                        </button>
                    </>
                )}
              </div>
            </div>
         ) : (
            <>
               {!isMapReady && (
                 <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                    <div className="flex flex-col items-center gap-2">
                       <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                       <span className="text-gray-500 font-medium">Connecting to satellites...</span>
                    </div>
                 </div>
               )}
               <div ref={mapRef} className="w-full h-full" />
               
               {/* Overlay Legend */}
               {isMapReady && staffLocations.length > 0 && (
                 <div className="absolute bottom-6 left-6 bg-white p-3 rounded-lg shadow-lg max-w-xs border border-gray-100 hidden md:block">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Active Staff</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                       {staffLocations.map((emp, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm gap-4 cursor-pointer hover:bg-gray-50 p-1 rounded">
                             <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                <span className="font-medium text-gray-700">{emp.name}</span>
                             </div>
                             <span className="text-[10px] text-gray-400">{emp.lastUpdate}</span>
                          </div>
                       ))}
                    </div>
                 </div>
               )}
            </>
         )}
      </div>
    </div>
  );
};

export default LiveTracking;
