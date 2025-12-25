
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Settings, Loader2, ArrowRight, ArrowRightLeft, 
  MessageCircle, Copy, Mail, Car, User, Edit2,
  CheckCircle, Building2, Save, X, Phone, Truck, AlertTriangle, DollarSign,
  Calendar, MapPin, Briefcase
} from 'lucide-react';
import Autocomplete from '../../components/Autocomplete';
import { Enquiry, HistoryLog } from '../../types';

// Types
type TripType = 'Local' | 'Rental' | 'Outstation';
type OutstationSubType = 'RoundTrip' | 'OneWay';
type VehicleType = 'Sedan' | 'SUV';
type CallerType = 'Customer' | 'Vendor';
type EnquiryCategory = 'Transport' | 'General';

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

export const VehicleEnquiries: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [settingsVehicleType, setSettingsVehicleType] = useState<VehicleType>('Sedan');
  
  // Enquiry State
  const [callerType, setCallerType] = useState<CallerType>('Customer');
  const [enquiryCategory, setEnquiryCategory] = useState<EnquiryCategory>('Transport');

  const [tripType, setTripType] = useState<TripType>('Local');
  const [vehicleType, setVehicleType] = useState<VehicleType>('Sedan');
  const [outstationSubType, setOutstationSubType] = useState<OutstationSubType>('RoundTrip');
  
  const [transportDetails, setTransportDetails] = useState({
    drop: '', estKm: '', waitingMins: '', packageId: '',
    destination: '', days: '1', estTotalKm: '', nights: '0'
  });

  const [customerDetails, setCustomerDetails] = useState({
    name: '', phone: '', email: '', pickup: '', requirements: ''
  });

  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  /* FIX: Replaced google.maps.LatLngLiteral with inline type to avoid namespace error */
  const [dropCoords, setDropCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [rentalPackages, setRentalPackages] = useState<RentalPackage[]>(DEFAULT_RENTAL_PACKAGES);
  const [pricing, setPricing] = useState<Record<VehicleType, PricingRules>>({
    Sedan: DEFAULT_PRICING_SEDAN,
    SUV: DEFAULT_PRICING_SUV
  });

  const [generatedMessage, setGeneratedMessage] = useState('');
  const [estimatedCost, setEstimatedCost] = useState(0);

  // --- Assignment Data ---
  const [corporates, setCorporates] = useState<any[]>([]);
  const [allBranches, setAllBranches] = useState<any[]>([]);
  const [allStaff, setAllStaff] = useState<any[]>([]);
  
  const [assignment, setAssignment] = useState({
    corporateId: '',
    branchName: '',
    staffId: ''
  });

  // --- Enquiry List Management ---
  const [enquiries, setEnquiries] = useState<Enquiry[]>(() => {
      const saved = localStorage.getItem('global_enquiries_data');
      return saved ? JSON.parse(saved) : [];
  });

  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  useEffect(() => {
      // 1. Load Data for Assignment Dropdowns
      const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
      setCorporates(corps);

      const adminBranches = JSON.parse(localStorage.getItem('branches_data') || '[]');
      let branches = [...adminBranches.map((b: any) => ({...b, owner: 'admin'}))];
      
      const adminStaff = JSON.parse(localStorage.getItem('staff_data') || '[]');
      let staff = [...adminStaff.map((s: any) => ({...s, owner: 'admin'}))];

      corps.forEach((c: any) => {
          const cBranches = JSON.parse(localStorage.getItem(`branches_data_${c.email}`) || '[]');
          branches = [...branches, ...cBranches.map((b: any) => ({...b, owner: c.email}))];
          
          const cStaff = JSON.parse(localStorage.getItem(`staff_data_${c.email}`) || '[]');
          staff = [...staff, ...cStaff.map((s: any) => ({...s, owner: c.email}))];
      });

      setAllBranches(branches);
      setAllStaff(staff);
      
      setAssignment(prev => ({ ...prev, corporateId: isSuperAdmin ? 'admin' : sessionId }));
  }, [isSuperAdmin, sessionId]);

  const filteredBranches = useMemo(() => {
      return allBranches.filter(b => 
        assignment.corporateId === 'admin' ? b.owner === 'admin' : b.owner === assignment.corporateId
      );
  }, [allBranches, assignment.corporateId]);
  
  const filteredStaff = useMemo(() => {
      return allStaff.filter(s => 
        (assignment.corporateId === 'admin' ? s.owner === 'admin' : s.owner === assignment.corporateId) &&
        (assignment.branchName === '' || s.branch === assignment.branchName)
      );
  }, [allStaff, assignment.corporateId, assignment.branchName]);


  // --- Google Maps Script Loader ---
  useEffect(() => {
    if (window.gm_authFailure_detected) {
      setMapError("Billing Not Enabled: Enable billing on Google Cloud.");
      return;
    }
    const apiKey = localStorage.getItem('maps_api_key');
    if (!apiKey) {
      setMapError("API Key is missing. Add in Settings > Integrations.");
      return;
    }
    const originalAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      window.gm_authFailure_detected = true;
      setMapError("Billing Not Enabled: Google Maps requires billing enabled.");
      if (originalAuthFailure) originalAuthFailure();
    };

    const scriptId = 'google-maps-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    if (window.google && window.google.maps && window.google.maps.places) {
      setIsMapReady(true);
      return;
    }

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
        script.onerror = () => setMapError("Network error: Failed to load Google Maps script.");
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

  // --- Auto Distance Calculation Effect ---
  useEffect(() => {
    if (!isMapReady || !window.google || !window.google.maps.DistanceMatrixService || !pickupCoords) return;

    const service = new window.google.maps.DistanceMatrixService();

    /* FIX: Replaced google.maps.LatLngLiteral with inline type to avoid namespace error */
    const calculateDistance = (destination: { lat: number; lng: number }, isRoundTripCalculation: boolean, isOutstationState: boolean) => {
        service.getDistanceMatrix(
            {
                origins: [pickupCoords],
                destinations: [destination],
                travelMode: window.google.maps.TravelMode.DRIVING,
                unitSystem: window.google.maps.UnitSystem.METRIC,
            },
            (response: any, status: any) => {
                if (status === "OK" && response.rows[0].elements[0].status === "OK") {
                    const distanceInMeters = response.rows[0].elements[0].distance.value;
                    let distanceInKm = distanceInMeters / 1000;
                    
                    if (isRoundTripCalculation) distanceInKm = distanceInKm * 2; 

                    const formattedDist = distanceInKm.toFixed(1);

                    setTransportDetails(prev => ({ 
                        ...prev, 
                        [isOutstationState ? 'estTotalKm' : 'estKm']: formattedDist 
                    }));
                } else {
                    console.error("Error calculating distance:", status, response);
                }
            }
        );
    };

    if (tripType === 'Local' && dropCoords) {
        calculateDistance(dropCoords, false, false);
    } else if (tripType === 'Outstation' && destCoords) {
        const isRoundTrip = outstationSubType === 'RoundTrip';
        calculateDistance(destCoords, isRoundTrip, true); 
    }

  }, [pickupCoords, dropCoords, destCoords, isMapReady, tripType, outstationSubType]);

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

  // Calculation Logic
  useEffect(() => {
      let total = 0;
      const rules = pricing[vehicleType];
      let details = '';

      if (enquiryCategory === 'General') {
          total = 0; 
          details = customerDetails.requirements || "General Enquiry.";
      } else if (tripType === 'Local') {
          const base = rules.localBaseFare;
          const km = parseFloat(transportDetails.estKm) || 0;
          const extraKm = Math.max(0, km - rules.localBaseKm) * rules.localPerKmRate;
          const wait = (parseFloat(transportDetails.waitingMins) || 0) * rules.localWaitingRate;
          total = base + extraKm + wait;
          details = `Local Trip: ${km}km`;
      } else if (tripType === 'Rental') {
          const pkg = rentalPackages.find(p => p.id === transportDetails.packageId);
          if (pkg) {
              total = vehicleType === 'Sedan' ? pkg.priceSedan : pkg.priceSuv;
              details = `Rental: ${pkg.name}`;
          }
      } else {
          const days = parseFloat(transportDetails.days) || 1;
          const km = parseFloat(transportDetails.estTotalKm) || 0;
          const driver = rules.outstationDriverAllowance * days;
          
          if (outstationSubType === 'RoundTrip') {
              const minKm = days * rules.outstationMinKmPerDay;
              const chargeKm = Math.max(km, minKm);
              total = (chargeKm * rules.outstationExtraKmRate) + driver;
              const nights = (parseFloat(transportDetails.nights) || 0) * rules.outstationNightAllowance;
              total += nights;
              details = `Round Trip: ${days} days, ${km} km`;
          } else {
              total = rules.outstationBaseRate + (km * rules.outstationExtraKmRate) + driver;
              details = `One Way: ${km} km`;
          }
      }

      setEstimatedCost(total);

      // Generate Message Based on Enquiry Type
      let msg = '';

      if (enquiryCategory === 'General') {
          msg = `Hello ${customerDetails.name || 'Sir/Madam'},
Thank you for contacting OK BOZ. 

Regarding your enquiry:
"${customerDetails.requirements || 'General Requirement'}"

We have received your request and our team will get back to you shortly with more details.

For immediate assistance, feel free to call us.

Regards,
OK BOZ Support Team`;
      } else {
          // Transport Estimate Message
          const pkg = rentalPackages.find(p => p.id === transportDetails.packageId);
          msg = `Hello ${customerDetails.name || 'Customer'},
Here is your ${tripType} estimate from OK BOZ! 🚕

*${tripType} Trip Estimate*
🚘 Vehicle: ${vehicleType}
📍 Pickup: ${customerDetails.pickup || 'TBD'}
${tripType === 'Local' ? `📍 Drop: ${transportDetails.drop}` : ''}
${tripType === 'Outstation' ? `🌍 Destination: ${transportDetails.destination}` : ''}
📝 Details: ${details}
${tripType === 'Local' ? `⏳ Waiting Time: ${transportDetails.waitingMins} mins` : ''}
${tripType === 'Rental' ? `📦 Package: ${pkg?.name || 'Custom'}` : ''}

💰 *Base Fare: ₹${total.toFixed(0)}*
(Includes ${tripType === 'Local' ? 'Base Fare + Km' : tripType === 'Rental' ? 'Package Rate' : 'Driver Allowance + Km'})

*Toll and Parking Extra.*

Book now with OK BOZ Transport!`;
      }

      setGeneratedMessage(msg);
  }, [estimatedCost, customerDetails, transportDetails, tripType, vehicleType, pricing, rentalPackages, enquiryCategory, outstationSubType]);

  const handleEnquiryAction = (action: 'Schedule' | 'Book' | 'Save') => {
      if (!customerDetails.name || !customerDetails.phone) {
          alert("Please enter Customer Name and Phone.");
          return;
      }

      // 1. Construct Details String
      let detailsText = '';
      if (enquiryCategory === 'Transport') {
          detailsText = `[${vehicleType} - ${tripType}] `;
          if (tripType === 'Local') detailsText += `Pickup: ${customerDetails.pickup} -> Drop: ${transportDetails.drop}. Dist: ${transportDetails.estKm}km.`;
          if (tripType === 'Rental') {
              const pkg = rentalPackages.find(p => p.id === transportDetails.packageId);
              detailsText += `Package: ${pkg?.name}. Pickup: ${customerDetails.pickup}.`;
          }
          if (tripType === 'Outstation') detailsText += `Dest: ${transportDetails.destination}. ${transportDetails.days} Days. Pickup: ${customerDetails.pickup}.`;
          detailsText += ` Estimate: ₹${estimatedCost}`;
      } else {
          detailsText = "General Enquiry. ";
      }
      
      if (customerDetails.requirements) detailsText += `\nReq: ${customerDetails.requirements}`;

      // 2. Determine Status
      let status: Enquiry['status'] = 'New';
      if (action === 'Book') status = 'Booked';
      if (action === 'Schedule') status = 'Scheduled';

      // 3. Create History Log
      const historyLog: HistoryLog = {
          id: Date.now(),
          type: 'Note',
          message: `Enquiry ${action === 'Book' ? 'Booked' : action === 'Schedule' ? 'Scheduled' : 'Saved'} via Vehicle Console. ${estimatedCost > 0 ? `Est: ₹${estimatedCost}` : ''}`,
          date: new Date().toLocaleString(),
          outcome: 'Completed'
      };

      // 4. Create Object
      const newEnquiry: Enquiry = {
          id: `ENQ-${Date.now()}`,
          type: 'Customer',
          initialInteraction: 'Incoming',
          name: customerDetails.name,
          phone: customerDetails.phone,
          email: customerDetails.email,
          city: 'Coimbatore', // Default if not parsed
          details: detailsText,
          status: status,
          assignedTo: assignment.staffId,
          createdAt: new Date().toLocaleString(),
          history: [historyLog],
          date: new Date().toISOString().split('T')[0]
      };

      // 5. Save
      const updatedList = [newEnquiry, ...enquiries];
      setEnquiries(updatedList);
      localStorage.setItem('global_enquiries_data', JSON.stringify(updatedList));

      alert(`Enquiry ${status} Successfully!`);
      
      // 6. Reset
      setCustomerDetails({ name: '', phone: '', email: '', pickup: '', requirements: '' });
      setTransportDetails({ drop: '', estKm: '', waitingMins: '', packageId: '', destination: '', days: '1', estTotalKm: '', nights: '0' });
      setGeneratedMessage('');
      setEstimatedCost(0);
  };

  const handleCancel = () => {
      setCustomerDetails({ name: '', phone: '', email: '', pickup: '', requirements: '' });
      setTransportDetails({ drop: '', estKm: '', waitingMins: '', packageId: '', destination: '', days: '1', estTotalKm: '', nights: '0' });
      alert("Form cleared.");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Truck className="w-8 h-8 text-emerald-600" /> Vehicle Enquiries
          </h2>
          <p className="text-gray-500">Manage transport requests and generate estimates</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
                <Settings className="w-4 h-4" /> Rates
            </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4">
              <p className="text-sm text-gray-600">Rate settings are managed in Transport Settings page.</p>
          </div>
      )}

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Input Form */}
          <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  {/* ... (rest of the input form code) ... */}
                  {/* ... I am only changing the map loading parts below ... */}
                  
                  {/* Pickup Location - Moved to Customer Info */}
                  <div className="mb-4">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pickup Location</label>
                      {!isMapReady ? (
                           <div className="p-2 bg-gray-100 text-gray-500 text-sm rounded flex items-center gap-2">
                              {mapError ? <AlertTriangle className="w-4 h-4 text-red-500" /> : <Loader2 className="w-4 h-4 animate-spin" />} 
                              {mapError ? "Map Unavailable (Check Billing)" : "Loading Google Maps..."}
                           </div>
                        ) : (
                           <Autocomplete 
                             placeholder="Search Google Maps for Pickup"
                             onAddressSelect={(addr) => setCustomerDetails(prev => ({ ...prev, pickup: addr }))}
                             setNewPlace={(place) => setPickupCoords(place)}
                             defaultValue={customerDetails.pickup}
                           />
                        )}
                  </div>
                  
                  {/* ... (rest of the component) ... */}
                  {tripType === 'Local' && (
                              <div className="space-y-4 animate-in slide-in-from-left-2 duration-200">
                                  <div className="space-y-2">
                                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Drop Location</label>
                                      {!isMapReady ? <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-[10px] font-bold text-gray-400">MAP UNAVAILABLE</div> : (
                                          <Autocomplete 
                                              placeholder="Search Destination Address"
                                              onAddressSelect={(addr) => setTransportDetails(prev => ({ ...prev, drop: addr }))}
                                              setNewPlace={(place) => setDropCoords(place)}
                                              defaultValue={transportDetails.drop}
                                          />
                                      )}
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-1.5">
                                          <label className="block text-[10px] font-black text-gray-400 uppercase ml-1">Estimated KM</label>
                                          <input type="number" placeholder="0.0" className="p-3 border border-gray-200 rounded-xl w-full text-sm font-black focus:ring-2 focus:ring-emerald-500 outline-none shadow-inner" value={transportDetails.estKm} onChange={e => setTransportDetails({...transportDetails, estKm: e.target.value})} />
                                      </div>
                                      <div className="space-y-1.5">
                                          <label className="block text-[10px] font-black text-gray-400 uppercase ml-1">Wait Time (Mins)</label>
                                          <input type="number" placeholder="0" className="p-3 border border-gray-200 rounded-xl w-full text-sm font-black focus:ring-2 focus:ring-emerald-500 outline-none shadow-inner" value={transportDetails.waitingMins} onChange={e => setTransportDetails({...transportDetails, waitingMins: e.target.value})} />
                                      </div>
                                  </div>
                              </div>
                  )}
                  {/* ... */}
                  {tripType === 'Outstation' && (
                              <div className="space-y-4 animate-in slide-in-from-left-2 duration-200">
                                  <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                                      <button onClick={() => setOutstationSubType('RoundTrip')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${outstationSubType === 'RoundTrip' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500'}`}>Round Trip</button>
                                      <button onClick={() => setOutstationSubType('OneWay')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${outstationSubType === 'OneWay' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500'}`}>One Way</button>
                                  </div>
                                  <div className="space-y-2">
                                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Destination</label>
                                      {!isMapReady ? <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-[10px] font-bold text-gray-400">MAP UNAVAILABLE</div> : (
                                          <Autocomplete 
                                              placeholder="Search Destination City"
                                              onAddressSelect={(addr) => setTransportDetails(prev => ({ ...prev, destination: addr }))}
                                              setNewPlace={(place) => setDestCoords(place)}
                                              defaultValue={transportDetails.destination}
                                          />
                                      )}
                                  </div>
                                  <div className="grid grid-cols-3 gap-3">
                                      <div className="space-y-1.5">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase ml-1">Days</label>
                                        <input type="number" className="p-3 border border-gray-200 rounded-xl w-full text-sm font-black focus:ring-2 focus:ring-emerald-500 outline-none shadow-inner" value={transportDetails.days} onChange={e => setTransportDetails({...transportDetails, days: e.target.value})} />
                                      </div>
                                      <div className="space-y-1.5">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase ml-1">Total KM</label>
                                        <input type="number" className="p-3 border border-gray-200 rounded-xl w-full text-sm font-black focus:ring-2 focus:ring-emerald-500 outline-none shadow-inner" value={transportDetails.estTotalKm} onChange={e => setTransportDetails({...transportDetails, estTotalKm: e.target.value})} />
                                      </div>
                                      {outstationSubType === 'RoundTrip' && (
                                          <div className="space-y-1.5">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase ml-1">Nights</label>
                                            <input type="number" className="p-3 border border-gray-200 rounded-xl w-full text-sm font-black focus:ring-2 focus:ring-emerald-500 outline-none shadow-inner" value={transportDetails.nights} onChange={e => setTransportDetails({...transportDetails, nights: e.target.value})} />
                                          </div>
                                      )}
                                  </div>
                              </div>
                  )}
              </div>
          </div>

          {/* Right Column: Output */}
          <div className="space-y-6">
              {/* Estimate Card & Message ... */}
              <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
                  <div className="relative z-10">
                      <p className="text-slate-400 text-xs uppercase font-bold mb-1">Estimated Cost</p>
                      <h3 className="text-4xl font-bold mb-4">₹{estimatedCost.toLocaleString()}</h3>
                      <div className="text-sm text-slate-300 border-t border-slate-700 pt-3">
                          {enquiryCategory === 'Transport' ? (
                              <p>Includes basic fare calculations. Tolls & Parking extra.</p>
                          ) : (
                              <p>Standard Enquiry. No cost calculated.</p>
                          )}
                      </div>
                  </div>
                  <div className="absolute right-0 bottom-0 opacity-10">
                      <DollarSign className="w-32 h-32 text-white" />
                  </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                      <h4 className="font-bold text-gray-800 flex items-center gap-2">
                          <MessageCircle className="w-4 h-4 text-emerald-500" /> Generated Message
                      </h4>
                      <button 
                          onClick={() => {navigator.clipboard.writeText(generatedMessage); alert("Copied!")}}
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                          <Copy className="w-3 h-3" /> Copy
                      </button>
                  </div>
                  <textarea 
                      className="w-full h-40 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none resize-none mb-3"
                      value={generatedMessage}
                      readOnly
                  />
                  <div className="grid grid-cols-2 gap-3">
                      <button 
                          onClick={() => window.open(`https://wa.me/${customerDetails.phone.replace(/\D/g, '')}?text=${encodeURIComponent(generatedMessage)}`, '_blank')}
                          className="bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2"
                      >
                          <MessageCircle className="w-4 h-4" /> WhatsApp
                      </button>
                      <button 
                          className="bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2"
                      >
                          <Mail className="w-4 h-4" /> Email
                      </button>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};
