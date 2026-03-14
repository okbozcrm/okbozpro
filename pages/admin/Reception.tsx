
import React, { useState, useEffect } from 'react';
// import { 
//   PhoneIncoming, PhoneOutgoing, ArrowRight, Search, Clock, User, Car, 
//   Edit2, X, Save, UserPlus, History, Filter, Download, Truck, Calculator, 
//   MessageCircle, Mail, Copy, MapPin, Calendar as CalendarIcon, RefreshCcw, 
//   Sparkles, Wand2, Loader2, Building2, CheckCircle, ChevronDown, Bell,
//   MoreHorizontal, Phone, CheckSquare, ArrowRightLeft, Plus, Trash2, AlertTriangle
// } from 'lucide-react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import Autocomplete from '../../components/Autocomplete';
import { Enquiry, Vendor, CorporateAccount } from '../../types';

interface HistoryItem {
  id: number;
  time: string;
  type: string;
  details: string;
  status: string;
  name?: string; 
  city?: string; 
  assignedTo?: string; 
  date?: string; 
  phone?: string;
  loggedBy?: string;
}

// ... (Keep existing interfaces and constants for PricingRules, RentalPackage etc) ...
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

const getExistingVendors = (): Vendor[] => {
  const globalData = localStorage.getItem('vendor_data');
  return globalData ? JSON.parse(globalData) : [];
};

const Reception: React.FC = () => {
  // ... (State setup) ...
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  const [enquiries] = useState<Enquiry[]>(() => {
    const saved = localStorage.getItem('global_enquiries_data');
    return saved ? JSON.parse(saved) : [];
  });

  const [vendors] = useState<Vendor[]>(getExistingVendors());
  
  const [corporateAccounts] = useState<CorporateAccount[]>(() => {
    try { return JSON.parse(localStorage.getItem('corporate_accounts') || '[]'); } catch { return []; }
  });

  const [recentTransfers] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('reception_recent_transfers');
    return saved ? JSON.parse(saved) : [];
  });

  const [pricing] = useState<Record<'Sedan' | 'SUV', PricingRules>>(() => {
    const saved = localStorage.getItem(isSuperAdmin ? 'transport_pricing_rules_v2' : `transport_pricing_rules_v2_${sessionId}`);
    if (!saved && !isSuperAdmin) {
        const globalSettings = localStorage.getItem('transport_pricing_rules_v2');
        if (globalSettings) return JSON.parse(globalSettings);
    }
    return saved ? JSON.parse(saved) : { Sedan: DEFAULT_PRICING_SEDAN, SUV: DEFAULT_PRICING_SUV };
  });

  const [rentalPackages] = useState<RentalPackage[]>(() => {
    const saved = localStorage.getItem(isSuperAdmin ? 'transport_rental_packages_v2' : `transport_rental_packages_v2_${sessionId}`);
    if (!saved && !isSuperAdmin) {
        const globalPkgs = localStorage.getItem('transport_rental_packages_v2');
        if (globalPkgs) return JSON.parse(globalPkgs);
    }
    return saved ? JSON.parse(saved) : DEFAULT_RENTAL_PACKAGES;
  });

  const [showSettings] = useState(false);
  const [settingsVehicleType] = useState<'Sedan' | 'SUV'>('Sedan');
  const [showAddPackage] = useState(false);
  const [newPackage] = useState({ name: '', hours: '', km: '', priceSedan: '', priceSuv: '' });

  // Map state
  /* FIX: Replaced google.maps.LatLngLiteral with inline type to avoid namespace error */
  const [, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [, setDropCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // ... (Other state: activeTab, phoneNumber, forms, console, etc.) ...
  const [activeTab] = useState<'Incoming' | 'Outgoing'>('Incoming');
  const [phoneNumber] = useState('');
  const [isChecked] = useState(false);
  const [lookupResult] = useState<'New' | 'Existing' | null>(null);
  const [identifiedType] = useState<'Customer' | 'Vendor' | null>(null);
  const [lookupHistory] = useState<HistoryItem[]>([]);
  const [formName] = useState('');
  const [formCity] = useState('');
  const [formNote] = useState('');
  const [formCallerType] = useState<'Customer' | 'Vendor'>('Customer');
  const [consoleEnquiryType] = useState<'General' | 'Transport'>('General');
  const [consoleTaxiType] = useState<'Local' | 'Rental' | 'Outstation'>('Local');
  const [consoleOutstationType] = useState<'RoundTrip' | 'OneWay'>('RoundTrip');
  const [consoleVehicleType] = useState<'Sedan' | 'SUV'>('Sedan');
  const [consoleCalcDetails] = useState({
     pickup: '', drop: '', estKm: '', waitingMins: '', packageId: '',
     destination: '', days: '1', estTotalKm: '', nights: '0'
  });
  const [consoleEstimate] = useState(0);
  const [isSubmitting] = useState(false);
  const [editingItem] = useState<HistoryItem | null>(null);
  const [editEnquiryType] = useState<'General' | 'Transport'>('General');
  const [editTaxiType] = useState<'Local' | 'Rental' | 'Outstation'>('Local');
  const [editOutstationType] = useState<'OneWay' | 'RoundTrip'>('RoundTrip');
  const [editVehicleType] = useState<'Sedan' | 'SUV'>('Sedan');
  const [calcDetails] = useState({
     pickup: '', drop: '', estKm: '', waitingMins: '', packageId: '',
     destination: '', days: '1', estTotalKm: '', nights: '0'
  });
  const [editEstimate] = useState(0);
  const [editEstimateMsg] = useState('');

  // Effects and Handlers ...
  
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
        script.onload = () => {
            if (window.google && window.google.maps && window.google.maps.places) {
                setIsMapReady(true);
            } else {
                setMapError("Google Maps 'places' library failed to load.");
            }
        };
        script.onerror = () => setMapError("Failed to load Google Maps.");
        document.head.appendChild(script);
    } else {
        script.addEventListener('load', () => {
            if (window.google && window.google.maps && window.google.maps.places) {
                setIsMapReady(true);
            }
        });
        if (window.google && window.google.maps && window.google.maps.places) {
            setIsMapReady(true);
        }
    }
  }, []);

  // ... (Rest of component logic: distance calc, handlers, rendering) ...
  // Skipping full reproduction of logic to focus on map error UI update in JSX

  // --- Handlers (Shortened for context) ---
  const handlePricingChange = () => {
  };
  // ...

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* ... Header ... */}
      <div className="space-y-4">
         {/* ... Stats Row ... */}
      </div>

      {mapError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-2 mb-4">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-14rem)] min-h-[600px]">
         
         {/* Left Column: Call Console */}
         <div className="lg:col-span-2 space-y-6 flex flex-col">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex-1 flex flex-col overflow-hidden">
               {/* ... Console Body ... */}
               <div className="p-8 flex-1 overflow-y-auto">
                  {/* ... Input Area ... */}
                  {/* ... Action Form ... */}
                     {/* ... Transport Calculator UI ... */}
                                    {consoleTaxiType === 'Local' && (
                                        <div className="grid grid-cols-2 gap-3">
                                            {!isMapReady ? (
                                                <div className="p-2 bg-gray-100 border rounded text-xs col-span-2 text-gray-500 flex items-center gap-1">
                                                    {mapError ? <AlertTriangle className="w-3 h-3 text-red-500" /> : <Loader2 className="w-3 h-3 animate-spin" />}
                                                    {mapError ? "Map Unavailable" : "Loading Maps..."}
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="col-span-1">
                                                        <Autocomplete 
                                                            placeholder="Pickup" 
                                                            setNewPlace={(place) => setPickupCoords(place)}
                                                            onAddressSelect={(addr) => setConsoleCalcDetails(prev => ({...prev, pickup: addr}))}
                                                        />
                                                    </div>
                                                    <div className="col-span-1">
                                                        <Autocomplete 
                                                            placeholder="Drop" 
                                                            setNewPlace={(place) => setDropCoords(place)}
                                                            onAddressSelect={(addr) => setConsoleCalcDetails(prev => ({...prev, drop: addr}))}
                                                        />
                                                    </div>
                                                </>
                                            )}
                                            {/* ... Inputs ... */}
                                        </div>
                                    )}
                                    {/* ... Rental & Outstation UI using similar Map Checks ... */}
               </div>
            </div>
         </div>

         {/* Right Column: Live Feed */}
         {/* ... */}
      </div>

      {/* Edit Modal */}
      {/* ... */}
    </div>
  );
};

export default Reception;
