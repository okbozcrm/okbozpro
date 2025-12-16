
import React, { useState, useEffect } from 'react';
import { 
  Car, MapPin, User, Phone, MessageCircle, Mail, 
  Settings, Navigation, Copy, Edit2, Plus, Trash2, AlertTriangle, Loader2, ArrowRightLeft, ArrowRight, DollarSign
} from 'lucide-react';
import Autocomplete from '../../components/Autocomplete';
import { HARDCODED_MAPS_API_KEY } from '../../services/cloudService';

// ... (Keep existing types and constants) ...
type TripType = 'Local' | 'Rental' | 'Outstation';
type OutstationSubType = 'RoundTrip' | 'OneWay';
type VehicleType = 'Sedan' | 'SUV';

interface RentalPackage {
  id: string;
  name: string;
  hours: number;
  km: number;
  priceSedan: number;
  priceSuv: number;
}

interface PricingRules {
  localBaseFare: number;
  localBaseKm: number;
  localPerKmRate: number;
  localWaitingRate: number;
  rentalExtraKmRate: number;
  rentalExtraHrRate: number;
  outstationMinKmPerDay: number;
  outstationBaseRate: number;
  outstationExtraKmRate: number;
  outstationDriverAllowance: number;
  outstationNightAllowance: number;
}

const DEFAULT_RENTAL_PACKAGES: RentalPackage[] = [
  { id: '1hr', name: '1 Hr / 10 km', hours: 1, km: 10, priceSedan: 200, priceSuv: 300 },
  { id: '2hr', name: '2 Hr / 20 km', hours: 2, km: 20, priceSedan: 400, priceSuv: 600 },
  { id: '4hr', name: '4 Hr / 40 km', hours: 4, km: 40, priceSedan: 800, priceSuv: 1100 },
  { id: '8hr', name: '8 Hr / 80 km', hours: 8, km: 80, priceSedan: 1600, priceSuv: 2200 },
];

const DEFAULT_PRICING_SEDAN: PricingRules = {
  localBaseFare: 200, localBaseKm: 5, localPerKmRate: 20, localWaitingRate: 2,
  rentalExtraKmRate: 15, rentalExtraHrRate: 100,
  outstationMinKmPerDay: 300, outstationBaseRate: 0, outstationExtraKmRate: 13,
  outstationDriverAllowance: 400, outstationNightAllowance: 300 
};

const DEFAULT_PRICING_SUV: PricingRules = {
  localBaseFare: 300, localBaseKm: 5, localPerKmRate: 25, localWaitingRate: 3,
  rentalExtraKmRate: 18, rentalExtraHrRate: 150,
  outstationMinKmPerDay: 300, outstationBaseRate: 0, outstationExtraKmRate: 17,
  outstationDriverAllowance: 500, outstationNightAllowance: 400 
};

const Transport: React.FC = () => {
  // ... (State setup) ...
  const [tripType, setTripType] = useState<TripType>('Local');
  const [outstationSubType, setOutstationSubType] = useState<OutstationSubType>('RoundTrip');
  const [vehicleType, setVehicleType] = useState<VehicleType>('Sedan');
  const [showSettings, setShowSettings] = useState(false);
  const [settingsVehicleType, setSettingsVehicleType] = useState<VehicleType>('Sedan'); 
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [pickupCoords, setPickupCoords] = useState<google.maps.LatLngLiteral | null>(null);
  const [dropCoords, setDropCoords] = useState<google.maps.LatLngLiteral | null>(null);
  const [destCoords, setDestCoords] = useState<google.maps.LatLngLiteral | null>(null);

  const getSessionKey = (baseKey: string) => {
    const sessionId = localStorage.getItem('app_session_id') || 'admin';
    return sessionId === 'admin' ? baseKey : `${baseKey}_${sessionId}`;
  };

  // --- Google Maps Script Loader ---
  useEffect(() => {
    if (window.gm_authFailure_detected) {
      setMapError("Billing Not Enabled: Enable billing on Google Cloud.");
      return;
    }
    const apiKey = HARDCODED_MAPS_API_KEY || localStorage.getItem('maps_api_key');
    if (!apiKey) {
      setMapError("API Key missing. Add in Settings > Integrations.");
      return;
    }
    const originalAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      window.gm_authFailure_detected = true;
      setMapError("Billing Not Enabled: Google Maps requires billing enabled.");
      if (originalAuthFailure) originalAuthFailure();
    };

    if (window.google && window.google.maps && window.google.maps.places) {
      setIsMapReady(true);
      return;
    }
    const scriptId = 'google-maps-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;
    if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => setIsMapReady(true);
        script.onerror = () => setMapError("Failed to load Google Maps.");
        document.head.appendChild(script);
    } else {
        script.addEventListener('load', () => setIsMapReady(true));
        if (window.google && window.google.maps) setIsMapReady(true);
    }
  }, []);

  // ... (Rest of component state and logic: pricing, packages, customers, effects) ...
  const [pricing, setPricing] = useState<Record<VehicleType, PricingRules>>(() => {
    const key = getSessionKey('transport_pricing_rules_v2'); 
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : { Sedan: DEFAULT_PRICING_SEDAN, SUV: DEFAULT_PRICING_SUV };
  });

  const [rentalPackages, setRentalPackages] = useState<RentalPackage[]>(() => {
    const key = getSessionKey('transport_rental_packages_v2'); 
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : DEFAULT_RENTAL_PACKAGES;
  });

  // State for form fields
  const [customer, setCustomer] = useState({ name: '', phone: '', pickup: '' });
  const [localDetails, setLocalDetails] = useState({ drop: '', estKm: '', waitingMins: '' });
  const [rentalDetails, setRentalDetails] = useState({ packageId: rentalPackages[0]?.id || '' });
  const [outstationDetails, setOutstationDetails] = useState({ destination: '', days: '1', estTotalKm: '', nights: '0' });
  const [estimate, setEstimate] = useState({
    base: 0, extraKmCost: 0, waitingCost: 0, driverCost: 0, nightAllowanceCost: 0, total: 0, chargeableKm: 0, details: ''
  });
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [showAddPackage, setShowAddPackage] = useState(false);
  const [newPackage, setNewPackage] = useState({ name: '', hours: '', km: '', priceSedan: '', priceSuv: '' });

  // ... (Effects for calculation, persistence etc) ...
  
  // Handlers ... (shortened)
  const handlePricingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPricing(prev => ({
      ...prev,
      [settingsVehicleType]: {
        ...prev[settingsVehicleType],
        [name]: parseFloat(value) || 0
      }
    }));
  };

  const handleAddPackage = () => { /* ... */ };
  const removePackage = (id: string, e: React.MouseEvent) => { /* ... */ };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Car className="w-8 h-8 text-emerald-600" /> Transport Enquiry
          </h2>
          <p className="text-gray-500">Calculate fares for Local, Rental & Outstation trips</p>
        </div>
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${showSettings ? 'bg-slate-800 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
        >
          <Settings className="w-4 h-4" /> {showSettings ? 'Hide Rates' : 'Edit Rates'}
        </button>
      </div>

      {/* Error for Maps */}
      {mapError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" /> 
          <div>
            <p className="font-bold">Map Error: {mapError}</p>
            {mapError.includes("Billing") && (
                <a href="https://console.cloud.google.com/project/_/billing/enable" target="_blank" rel="noreferrer" className="text-xs underline hover:text-red-900">Click to Enable Billing</a>
            )}
          </div>
        </div>
      )}

      {/* ... Settings Panel ... */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Inputs */}
        <div className="lg:col-span-2 space-y-6">
            {/* Customer Info Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                {/* ... Name & Phone inputs ... */}
                {/* Pickup Location */}
                <div className="md:col-span-2 mb-4">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pickup Location</label>
                        {!isMapReady ? (
                           <div className="p-2 bg-gray-100 text-gray-500 text-sm rounded flex items-center gap-2">
                              {mapError ? <AlertTriangle className="w-4 h-4 text-red-500"/> : <Loader2 className="w-4 h-4 animate-spin" />}
                              {mapError ? "Map Unavailable (Check Billing)" : "Loading Google Maps..."}
                           </div>
                        ) : (
                           <Autocomplete 
                             placeholder="Search Google Maps for Pickup"
                             onAddressSelect={(addr) => setCustomer(prev => ({ ...prev, pickup: addr }))}
                             setNewPlace={(place) => setPickupCoords(place)}
                             defaultValue={customer.pickup}
                           />
                        )}
                </div>
            </div>

            {/* Trip Details Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* ... Tabs ... */}
                
                <div className="p-6">
                    {/* ... Vehicle Type Selection ... */}

                    {/* LOCAL INPUTS */}
                    {tripType === 'Local' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Drop Location</label>
                                    {!isMapReady ? (
                                       <div className="p-2 bg-gray-100 text-gray-500 text-sm rounded flex items-center gap-2">
                                          {mapError ? "Map Unavailable" : "Loading Maps..."}
                                       </div>
                                    ) : (
                                      <Autocomplete 
                                        placeholder="Search Google Maps for Drop"
                                        onAddressSelect={(addr) => setLocalDetails(prev => ({ ...prev, drop: addr }))}
                                        setNewPlace={(place) => setDropCoords(place)}
                                        defaultValue={localDetails.drop}
                                      />
                                    )}
                                </div>
                                {/* ... Est Km & Wait Mins ... */}
                            </div>
                            {/* ... Rule summary ... */}
                        </div>
                    )}

                    {/* ... Rental Inputs ... */}

                    {/* OUTSTATION INPUTS */}
                    {tripType === 'Outstation' && (
                        <div className="space-y-4">
                            {/* ... */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Destination</label>
                                    {!isMapReady ? (
                                       <div className="p-2 bg-gray-100 text-gray-500 text-sm rounded flex items-center gap-2">
                                          {mapError ? "Map Unavailable" : "Loading Maps..."}
                                       </div>
                                    ) : (
                                      <Autocomplete 
                                        placeholder="Search Google Maps for Destination"
                                        onAddressSelect={(addr) => setOutstationDetails(prev => ({ ...prev, destination: addr }))}
                                        setNewPlace={(place) => setDestCoords(place)}
                                        defaultValue={outstationDetails.destination}
                                      />
                                    )}
                                </div>
                                {/* ... Days, Km, Nights ... */}
                            </div>
                            {/* ... Rule summary ... */}
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Right Column: Estimate & Actions */}
        {/* ... (Existing Output code) ... */}
      </div>
    </div>
  );
};

export default Transport;
