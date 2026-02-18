import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Settings, Loader2, ArrowRight, ArrowRightLeft, 
  MessageCircle, Copy, Mail, Car, User, Edit2,
  CheckCircle, Building2, Save, X, Phone, Truck, DollarSign,
  Calendar, MapPin, Plus, Trash2, Headset,
  Clock, CheckCircle as CheckCircleIcon, Filter, Search, ChevronDown, UserCheck, XCircle, AlertCircle, History, PhoneOutgoing, PhoneIncoming, CalendarCheck, BookOpen, FileText, RefreshCcw, Mountain, List as ListIcon
} from 'lucide-react';
import Autocomplete from '../../components/Autocomplete';
import { Enquiry, HistoryLog, UserRole } from '../../types';
import { sendSystemNotification, HARDCODED_MAPS_API_KEY } from '../../services/cloudService';

// Types
type TripType = 'Local' | 'Rental' | 'Outstation';
type OutstationSubType = 'RoundTrip' | 'OneWay';
type VehicleType = 'Sedan' | 'SUV';
type EnquiryCategory = 'Transport' | 'General';
type OrderStatus = 'Scheduled' | 'Order Accepted' | 'Driver Assigned' | 'Completed' | 'Cancelled' | 'New' | 'In Progress' | 'Converted' | 'Closed' | 'Booked';

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
  outstationHillsAllowance: number;
}

interface FareItem {
  label: string;
  value: number;
  description?: string;
  type?: 'base' | 'extra' | 'allowance' | 'tax';
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
  outstationDriverAllowance: 400, outstationNightAllowance: 300,
  outstationHillsAllowance: 500
};

const DEFAULT_PRICING_SUV: PricingRules = {
  localBaseFare: 300, localBaseKm: 5, localPerKmRate: 25, localWaitingRate: 3,
  rentalExtraKmRate: 18, rentalExtraHrRate: 150,
  outstationMinKmPerDay: 300, outstationBaseRate: 0, outstationExtraKmRate: 17,
  outstationDriverAllowance: 500, outstationNightAllowance: 400,
  outstationHillsAllowance: 700
};

const getInitialEnquiries = (): Enquiry[] => {
  const saved = localStorage.getItem('global_enquiries_data');
  return saved ? JSON.parse(saved) : [];
};

interface CustomerCareProps {
  role: UserRole;
}

interface DropPoint {
    address: string;
    coords: { lat: number; lng: number } | null;
}

export const CustomerCare: React.FC<CustomerCareProps> = ({ role }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [settingsVehicleType, setSettingsVehicleType] = useState<VehicleType>('Sedan');
  
  // Enquiry State
  const [enquiryCategory, setEnquiryCategory] = useState<EnquiryCategory>('Transport');

  const [tripType, setTripType] = useState<TripType>('Local');
  const [vehicleType, setVehicleType] = useState<VehicleType>('Sedan');
  const [outstationSubType, setOutstationSubType] = useState<OutstationSubType>('RoundTrip');
  
  const [transportDetails, setTransportDetails] = useState({
    drops: [{ address: '', coords: null }] as DropPoint[], 
    estKm: '', waitingMins: '', packageId: '',
    destination: '', days: '1', estTotalKm: '', nights: '0',
    isHillsTrip: false
  });

  const [customerDetails, setCustomerDetails] = useState({
    name: '', phone: '', email: '', pickup: '', requirements: ''
  });

  // Map State
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [rentalPackages, setRentalPackages] = useState<RentalPackage[]>(() => {
    const saved = localStorage.getItem('transport_rental_packages_v2');
    return saved ? JSON.parse(saved) : DEFAULT_RENTAL_PACKAGES;
  });

  const [pricing, setPricing] = useState<Record<VehicleType, PricingRules>>(() => {
    const saved = localStorage.getItem('transport_pricing_rules_v2');
    return saved ? JSON.parse(saved) : { Sedan: DEFAULT_PRICING_SEDAN, SUV: DEFAULT_PRICING_SUV };
  });

  const [showAddPackage, setShowAddPackage] = useState(false);
  const [newPackage, setNewPackage] = useState({ name: '', hours: '', km: '', priceSedan: '', priceSuv: '' });
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);

  const [generatedMessage, setGeneratedMessage] = useState('');
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [fareBreakup, setFareBreakup] = useState<FareItem[]>([]);

  const messageTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [corporates, setCorporates] = useState<any[]>([]);
  const [allBranches, setAllBranches] = useState<any[]>([]);
  const [allStaff, setAllStaff] = useState<any[]>([]);
  
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';
  // FIX: Defined isEmployee to resolve 'Cannot find name' error
  const isEmployee = role === UserRole.EMPLOYEE;

  const [assignment, setAssignment] = useState({
    corporateId: isSuperAdmin ? 'admin' : sessionId,
    branchName: '',
    staffId: ''
  });

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterSearch, setFilterSearch] = useState<string>('');
  const [filterCorporate, setFilterCorporate] = useState<string>('All');
  const [filterBranch, setFilterBranch] = useState<string>('All');
  const [filterDateType, setFilterDateType] = useState<'All' | 'Date' | 'Month'>('Month');
  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [filterMonth, setFilterMonth] = useState<string>(new Date().toISOString().slice(0, 7));

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleData, setScheduleData] = useState({ date: '', time: '' });

  const [enquiries, setEnquiries] = useState<Enquiry[]>(getInitialEnquiries);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  const [isPhoneChecked, setIsPhoneChecked] = useState(false);
  const [phoneLookupResult, setPhoneLookupResult] = useState<'New' | 'Existing' | null>(null);
  const [existingEnquiriesForPhone, setExistingEnquiriesForPhone] = useState<Enquiry[]>([]);
  const [vendorsData, setVendorsData] = useState<any[]>([]);

  const [generalFollowUpDate, setGeneralFollowUpDate] = useState(new Date().toISOString().split('T')[0]);
  const [generalFollowUpTime, setGeneralFollowUpTime] = useState('10:00');
  const [generalFollowUpPriority, setGeneralFollowUpPriority] = useState<'Hot' | 'Warm' | 'Cold'>('Warm');

  useEffect(() => {
    localStorage.setItem('transport_rental_packages_v2', JSON.stringify(rentalPackages));
  }, [rentalPackages]);

  useEffect(() => {
    localStorage.setItem('transport_pricing_rules_v2', JSON.stringify(pricing));
  }, [pricing]);

  useEffect(() => {
    try {
      const savedVendors = localStorage.getItem('vendor_data');
      if (savedVendors) setVendorsData(JSON.parse(savedVendors));
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
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
  }, [isSuperAdmin, sessionId]);

  const filteredBranches = useMemo(() => allBranches.filter(b => assignment.corporateId === 'admin' ? b.owner === 'admin' : b.owner === assignment.corporateId), [allBranches, assignment.corporateId]);
  const filteredStaff = useMemo(() => allStaff.filter(s => (assignment.corporateId === 'admin' ? s.owner === 'admin' : s.owner === assignment.corporateId) && (assignment.branchName === '' || s.branch === assignment.branchName)), [allStaff, assignment.corporateId, assignment.branchName]);

  useEffect(() => {
    if (window.gm_authFailure_detected) { setMapError("Map API Error"); return; }
    const apiKey = HARDCODED_MAPS_API_KEY || localStorage.getItem('maps_api_key');
    if (!apiKey) { setMapError("API Key is missing."); return; }
    if (window.google && window.google.maps && window.google.maps.places) { setIsMapReady(true); return; }
    const scriptId = 'google-maps-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;
    if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.onload = () => setIsMapReady(true);
        document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (!isMapReady || !window.google || !window.google.maps.DistanceMatrixService || !pickupCoords) return;
    const service = new window.google.maps.DistanceMatrixService();
    const calculateSequentialDistance = async () => {
        let totalKm = 0;
        const locations = [pickupCoords];
        if (tripType === 'Local') transportDetails.drops.forEach(d => { if (d.coords) locations.push(d.coords); });
        else if (tripType === 'Outstation' && destCoords) locations.push(destCoords);
        if (locations.length < 2) return;
        for (let i = 0; i < locations.length - 1; i++) {
            const start = locations[i];
            const end = locations[i+1];
            try {
                const response: any = await new Promise((resolve, reject) => {
                    service.getDistanceMatrix({ origins: [start], destinations: [end], travelMode: window.google.maps.TravelMode.DRIVING, unitSystem: window.google.maps.UnitSystem.METRIC, }, (res, status) => { if (status === "OK") resolve(res); else reject(status); });
                });
                if (response.rows[0].elements[0].status === "OK") totalKm += response.rows[0].elements[0].distance.value / 1000;
            } catch (err) { console.error(err); }
        }
        if (tripType === 'Outstation' && outstationSubType === 'RoundTrip') totalKm *= 2;
        setTransportDetails(prev => ({ ...prev, [tripType === 'Outstation' ? 'estTotalKm' : 'estKm']: totalKm.toFixed(1) }));
    };
    calculateSequentialDistance();
  }, [pickupCoords, transportDetails.drops, destCoords, isMapReady, tripType, outstationSubType]);

  const handlePricingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPricing(prev => ({ ...prev, [settingsVehicleType]: { ...prev[settingsVehicleType], [name]: parseFloat(value) || 0 } }));
  };

  const handleAddPackage = () => {
    if (!newPackage.name || !newPackage.priceSedan) { alert("Please fill in package name and Sedan price."); return; }
    if (editingPackageId) {
        setRentalPackages(rentalPackages.map(pkg => pkg.id === editingPackageId ? { ...pkg, name: newPackage.name, hours: parseFloat(newPackage.hours) || 0, km: parseFloat(newPackage.km) || 0, priceSedan: parseFloat(newPackage.priceSedan) || 0, priceSuv: parseFloat(newPackage.priceSuv) || 0, } : pkg));
        setEditingPackageId(null);
    } else {
        setRentalPackages([...rentalPackages, { id: `pkg-${Date.now()}`, name: newPackage.name, hours: parseFloat(newPackage.hours) || 0, km: parseFloat(newPackage.km) || 0, priceSedan: parseFloat(newPackage.priceSedan) || 0, priceSuv: parseFloat(newPackage.priceSuv) || 0, }]);
    }
    setShowAddPackage(false);
    setNewPackage({ name: '', hours: '', km: '', priceSedan: '', priceSuv: '' });
  };

  const handleEditPackage = (pkg: RentalPackage) => {
    setEditingPackageId(pkg.id);
    setNewPackage({ name: pkg.name, hours: pkg.hours.toString(), km: pkg.km.toString(), priceSedan: pkg.priceSedan.toString(), priceSuv: pkg.priceSuv.toString(), });
    setShowAddPackage(true);
  };

  const handleCancelEditPackage = () => {
    setEditingPackageId(null);
    setNewPackage({ name: '', hours: '', km: '', priceSedan: '', priceSuv: '' });
    setShowAddPackage(false);
  };

  const removePackage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Remove this package?')) {
      setRentalPackages(prev => prev.filter(p => p.id !== id));
      if (transportDetails.packageId === id) setTransportDetails(prev => ({ ...prev, packageId: '' }));
      if (editingPackageId === id) { setEditingPackageId(null); setNewPackage({ name: '', hours: '', km: '', priceSedan: '', priceSuv: '' }); }
    }
  };

  const handleAddDrop = () => setTransportDetails(prev => ({ ...prev, drops: [...prev.drops, { address: '', coords: null }] }));
  const handleRemoveDrop = (index: number) => setTransportDetails(prev => { const newDrops = prev.drops.filter((_, i) => i !== index); if (newDrops.length === 0) return { ...prev, drops: [{ address: '', coords: null }] }; return { ...prev, drops: newDrops }; });
  const handleDropChange = (index: number, address: string, coords: any) => setTransportDetails(prev => { const newDrops = [...prev.drops]; newDrops[index] = { address, coords }; return { ...prev, drops: newDrops }; });

  // Calculation Logic Updated with detailed breakup
  useEffect(() => {
      let total = 0;
      const rules = pricing[vehicleType];
      let breakup: FareItem[] = [];
      let details = '';

      if (enquiryCategory === 'General') {
          total = 0;
          breakup = [];
          details = customerDetails.requirements || "General Enquiry.";
      } else if (tripType === 'Local') {
          const base = rules.localBaseFare;
          const km = parseFloat(transportDetails.estKm) || 0;
          const extraKmVal = Math.max(0, km - rules.localBaseKm);
          const extraKmCost = extraKmVal * rules.localPerKmRate;
          const waitCost = (parseFloat(transportDetails.waitingMins) || 0) * rules.localWaitingRate;
          
          total = base + extraKmCost + waitCost;
          
          breakup.push({ label: 'Base Fare', value: base, description: `Includes first ${rules.localBaseKm} KM`, type: 'base' });
          if (extraKmCost > 0) breakup.push({ label: 'Extra KM Charges', value: extraKmCost, description: `${extraKmVal.toFixed(1)} KM @ ₹${rules.localPerKmRate}/KM`, type: 'extra' });
          if (waitCost > 0) breakup.push({ label: 'Waiting Charges', value: waitCost, description: `${transportDetails.waitingMins} Mins @ ₹${rules.localWaitingRate}/min`, type: 'extra' });
          
          const validDrops = transportDetails.drops.filter(d => d.address);
          details = `Local Trip: ${km}km (${validDrops.length} Drops)`;
      } else if (tripType === 'Rental') {
          const pkg = rentalPackages.find(p => p.id === transportDetails.packageId);
          if (pkg) {
              total = vehicleType === 'Sedan' ? pkg.priceSedan : pkg.priceSuv;
              breakup.push({ label: 'Package Rate', value: total, description: pkg.name, type: 'base' });
              details = `Rental: ${pkg.name}`;
          }
      } else {
          const days = parseFloat(transportDetails.days) || 1;
          const km = parseFloat(transportDetails.estTotalKm) || 0;
          const driverAllowance = rules.outstationDriverAllowance * days;
          
          if (outstationSubType === 'RoundTrip') {
              const minKm = days * rules.outstationMinKmPerDay;
              const chargeKm = Math.max(km, minKm);
              const kmCharges = chargeKm * rules.outstationExtraKmRate;
              const nightAllowance = (parseFloat(transportDetails.nights) || 0) * rules.outstationNightAllowance;
              const hillsAllowance = transportDetails.isHillsTrip ? (rules.outstationHillsAllowance * days) : 0;
              
              total = kmCharges + driverAllowance + nightAllowance + hillsAllowance;
              
              breakup.push({ label: 'KM Charges', value: kmCharges, description: `${chargeKm.toFixed(1)} KM @ ₹${rules.outstationExtraKmRate}/KM (Min ${minKm} KM)`, type: 'base' });
              breakup.push({ label: 'Driver Allowance', value: driverAllowance, description: `${days} Days @ ₹${rules.outstationDriverAllowance}/day`, type: 'allowance' });
              if (nightAllowance > 0) breakup.push({ label: 'Night Allowance', value: nightAllowance, description: `${transportDetails.nights} Nights @ ₹${rules.outstationNightAllowance}/night`, type: 'allowance' });
              if (hillsAllowance > 0) breakup.push({ label: 'Hills Allowance', value: hillsAllowance, description: `${days} Days @ ₹${rules.outstationHillsAllowance}/day`, type: 'allowance' });
              
              details = `Round Trip: ${days} days, ${km} km${transportDetails.isHillsTrip ? ' (Hills Included)' : ''}`;
          } else {
              const baseFare = rules.outstationBaseRate;
              const kmCharges = km * rules.outstationExtraKmRate;
              const hillsAllowance = transportDetails.isHillsTrip ? (rules.outstationHillsAllowance * days) : 0;
              
              total = baseFare + kmCharges + driverAllowance + hillsAllowance;
              
              if (baseFare > 0) breakup.push({ label: 'Base Fare', value: baseFare, type: 'base' });
              breakup.push({ label: 'KM Charges', value: kmCharges, description: `${km.toFixed(1)} KM @ ₹${rules.outstationExtraKmRate}/KM`, type: 'base' });
              breakup.push({ label: 'Driver Allowance', value: driverAllowance, description: `${days} Days @ ₹${rules.outstationDriverAllowance}/day`, type: 'allowance' });
              if (hillsAllowance > 0) breakup.push({ label: 'Hills Allowance', value: hillsAllowance, description: `${days} Days @ ₹${rules.outstationHillsAllowance}/day`, type: 'allowance' });

              details = `One Way: ${km} km${transportDetails.isHillsTrip ? ' (Hills Included)' : ''}`;
          }
      }

      if (total > 0) {
          const gst = Math.round(total * 0.05); // 5% GST
          breakup.push({ label: 'GST (5%)', value: gst, type: 'tax' });
          total += gst;
      }

      setEstimatedCost(total);
      setFareBreakup(breakup);

      // Generated Message Logic (Unchanged but uses updated breakup for consistency)
      let msg = '';
      if (enquiryCategory === 'General') {
          msg = `Hello ${customerDetails.name || 'Sir/Madam'},\nThank you for contacting OK BOZ. \n\nRegarding your enquiry:\n"${customerDetails.requirements || 'General Requirement'}"\n\nWe have received your request and our team will get back to you shortly.\n\nRegards,\nOK BOZ Support Team`;
      } else {
          msg = `Hello ${customerDetails.name || 'Customer'},\nHere is your ${tripType} estimate from OK BOZ! 🚕\n\n*${tripType} Trip Estimate*\n🚘 Vehicle: ${vehicleType}\n📍 Pickup: ${customerDetails.pickup || 'TBD'}\n${tripType === 'Local' ? transportDetails.drops.filter(d => d.address).map((d, i) => `📍 Drop ${i+1}: ${d.address}`).join('\n') : ''}${tripType === 'Outstation' ? `🌍 Destination: ${transportDetails.destination}` : ''}\n📝 Details: ${details}\n💰 *Total Estimate: ₹${total.toFixed(0)}*\n(Includes GST and base calculations. Tolls & Parking Extra.)\n\nBook now with OK BOZ!`;
      }
      setGeneratedMessage(msg);
  }, [estimatedCost, customerDetails, transportDetails, tripType, vehicleType, pricing, rentalPackages, enquiryCategory, outstationSubType]);

  const saveOrder = async (status: OrderStatus, scheduleInfo?: { date: string, time: string, priority?: 'Hot' | 'Warm' | 'Cold' }) => {
      if (!customerDetails.name || !customerDetails.phone) { alert("Please enter Customer Name and Phone."); return; }
      let detailsText = enquiryCategory === 'Transport' ? `[${vehicleType} - ${tripType}] Estimate: ₹${estimatedCost}` : customerDetails.requirements;
      if (!detailsText.trim()) { alert("Please enter details."); return; }
      
      const newEnquiry: Enquiry = {
          id: editingOrderId || `ORD-${Date.now()}`,
          type: 'Customer',
          initialInteraction: 'Incoming',
          name: customerDetails.name,
          phone: customerDetails.phone,
          email: customerDetails.email,
          city: 'Coimbatore',
          details: detailsText,
          status: status,
          assignedTo: assignment.staffId,
          assignedCorporate: isSuperAdmin ? assignment.corporateId : sessionId,
          assignedBranch: assignment.branchName,
          createdAt: new Date().toLocaleString(),
          history: [{ id: Date.now(), type: 'Note', message: `Order ${status}. Est: ₹${estimatedCost}`, date: new Date().toLocaleString(), outcome: 'Completed' }],
          date: scheduleInfo ? scheduleInfo.date : new Date().toISOString().split('T')[0],
          nextFollowUp: scheduleInfo ? `${scheduleData.date}T${scheduleData.time}` : undefined,
          priority: scheduleInfo?.priority,
          enquiryCategory, tripType, vehicleType, outstationSubType,
          transportData: enquiryCategory === 'Transport' ? { ...transportDetails, drop: transportDetails.drops[0]?.address } : undefined,
          estimatedPrice: estimatedCost,
      };

      const updatedList = editingOrderId ? enquiries.map(e => e.id === editingOrderId ? newEnquiry : e) : [newEnquiry, ...enquiries];
      setEnquiries(updatedList);
      localStorage.setItem('global_enquiries_data', JSON.stringify(updatedList));
      alert(`Success: ${status}`);
      handleCancelForm();
  };

  const handleCancelForm = () => {
      setCustomerDetails({ name: '', phone: '', email: '', pickup: '', requirements: '' });
      setTransportDetails({ drops: [{ address: '', coords: null }], estKm: '', waitingMins: '', packageId: '', destination: '', days: '1', estTotalKm: '', nights: '0', isHillsTrip: false });
      setGeneratedMessage(''); setEstimatedCost(0); setEditingOrderId(null); setIsPhoneChecked(false);
  };

  const handleStatusUpdate = (id: string, newStatus: OrderStatus) => {
      const updatedList = enquiries.map(e => e.id === id ? { ...e, status: newStatus, history: [{ id: Date.now(), type: 'Note', message: `Status: ${newStatus}`, date: new Date().toLocaleString() }, ...e.history] } : e);
      setEnquiries(updatedList);
      localStorage.setItem('global_enquiries_data', JSON.stringify(updatedList));
  };

  const handleEditOrder = (order: Enquiry) => {
      setEditingOrderId(order.id);
      setCustomerDetails({ name: order.name, phone: order.phone, email: order.email || '', pickup: '', requirements: order.enquiryCategory === 'General' ? order.details : '' });
      setEnquiryCategory(order.enquiryCategory || 'General');
      if (order.transportData) {
          setTripType(order.tripType || 'Local'); setVehicleType(order.vehicleType || 'Sedan');
          setTransportDetails({ ...transportDetails, ...order.transportData, drops: order.transportData.drops || [{ address: '', coords: null }] });
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // FIX: Defined handleBookNow to resolve 'Cannot find name' error
  const handleBookNow = () => saveOrder('Booked');

  // FIX: Defined confirmSchedule to resolve 'Cannot find name' error
  const confirmSchedule = () => {
    if (!scheduleData.date || !scheduleData.time) {
      alert("Please select date and time");
      return;
    }
    saveOrder('Scheduled', { date: scheduleData.date, time: scheduleData.time });
    setIsScheduleModalOpen(false);
  };

  // FIX: Defined resetFilters to resolve 'Cannot find name' error
  const resetFilters = () => {
    setFilterStatus('All');
    setFilterSearch('');
    setFilterCorporate('All');
    setFilterBranch('All');
    setFilterDateType('Month');
    setFilterMonth(new Date().toISOString().slice(0, 7));
    setFilterDate(new Date().toISOString().split('T')[0]);
  };

  // FIX: Defined filteredOrders useMemo to resolve 'Cannot find name' error
  const filteredOrders = useMemo(() => {
      return enquiries.filter(order => {
          const matchesSearch = order.name.toLowerCase().includes(filterSearch.toLowerCase()) || 
                                order.phone.includes(filterSearch) || 
                                order.id.toLowerCase().includes(filterSearch.toLowerCase());
          const matchesStatus = filterStatus === 'All' || order.status === filterStatus;
          const matchesCorp = isSuperAdmin ? (filterCorporate === 'All' || order.assignedCorporate === filterCorporate) : true;
          const matchesBranch = filterBranch === 'All' || order.assignedBranch === filterBranch;
          
          let matchesDate = true;
          if (filterDateType === 'Date') {
              matchesDate = order.date === filterDate;
          } else if (filterDateType === 'Month') {
              matchesDate = order.date?.startsWith(filterMonth) || false;
          }

          return matchesSearch && matchesStatus && matchesCorp && matchesBranch && matchesDate;
      });
  }, [enquiries, filterSearch, filterStatus, filterCorporate, filterBranch, filterDateType, filterDate, filterMonth, isSuperAdmin]);

  // FIX: Defined getAssignedStaff helper to resolve 'Cannot find name' error
  const getAssignedStaff = (id?: string) => {
      if (!id) return null;
      return allStaff.find(s => s.id === id);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div><h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Headset className="w-8 h-8 text-emerald-600" /> Customer Care (Bookings)</h2><p className="text-gray-500">Create bookings and manage order lifecycle</p></div>
        {!isEmployee && (<div className="flex gap-2"><button onClick={() => setShowSettings(!showSettings)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showSettings ? 'bg-slate-800 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}><Settings className="w-4 h-4" /> {showSettings ? 'Hide Rates' : 'Edit Rates'}</button></div>)}
      </div>

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl"><h3 className="font-bold text-gray-800 flex items-center gap-2"><Edit2 className="w-4 h-4" /> Fare Configuration</h3><button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button></div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="bg-white border border-gray-300 rounded-lg p-1 flex w-fit mb-6"><button onClick={() => setSettingsVehicleType('Sedan')} className={`px-4 py-1 text-xs font-bold rounded ${settingsVehicleType === 'Sedan' ? 'bg-emerald-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Sedan</button><button onClick={() => setSettingsVehicleType('SUV')} className={`px-4 py-1 text-xs font-bold rounded ${settingsVehicleType === 'SUV' ? 'bg-emerald-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>SUV</button></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200"><h4 className="text-sm font-bold text-emerald-600 uppercase tracking-wide border-b border-gray-200 pb-2 mb-2">Local Rules</h4><div><label className="text-xs text-gray-500 block mb-1 font-bold">Base Fare (₹)</label><input type="number" name="localBaseFare" value={pricing[settingsVehicleType].localBaseFare} onChange={handlePricingChange} className="w-full p-2 border rounded-lg text-sm" /></div><div><label className="text-xs text-gray-500 block mb-1 font-bold">Base Km</label><input type="number" name="localBaseKm" value={pricing[settingsVehicleType].localBaseKm} onChange={handlePricingChange} className="w-full p-2 border rounded-lg text-sm" /></div><div><label className="text-xs text-gray-500 block mb-1 font-bold">Extra Km Rate</label><input type="number" name="localPerKmRate" value={pricing[settingsVehicleType].localPerKmRate} onChange={handlePricingChange} className="w-full p-2 border rounded-lg text-sm" /></div></div>
                 <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200"><h4 className="text-sm font-bold text-orange-600 uppercase tracking-wide border-b border-gray-200 pb-2 mb-2">Outstation Rules</h4><div><label className="text-xs text-gray-500 block mb-1 font-bold">Min Km / Day</label><input type="number" name="outstationMinKmPerDay" value={pricing[settingsVehicleType].outstationMinKmPerDay} onChange={handlePricingChange} className="w-full p-2 border rounded-lg text-sm" /></div><div><label className="text-xs text-gray-500 block mb-1 font-bold">Per Km Rate</label><input type="number" name="outstationExtraKmRate" value={pricing[settingsVehicleType].outstationExtraKmRate} onChange={handlePricingChange} className="w-full p-2 border rounded-lg text-sm" /></div><div><label className="text-xs text-gray-500 block mb-1 font-bold">Driver Allw.</label><input type="number" name="outstationDriverAllowance" value={pricing[settingsVehicleType].outstationDriverAllowance} onChange={handlePricingChange} className="w-full p-2 border rounded-lg text-sm" /></div></div>
                 <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200"><h4 className="text-sm font-bold text-blue-600 uppercase tracking-wide border-b border-gray-200 pb-2 mb-2">Rental Packages</h4><div className="space-y-1">{rentalPackages.map(pkg => (<div key={pkg.id} className="flex justify-between items-center p-2 bg-white rounded-lg border text-xs font-bold"><span>{pkg.name}</span><span>₹{settingsVehicleType === 'Sedan' ? pkg.priceSedan : pkg.priceSuv}</span></div>))}</div></div>
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end"><button onClick={() => setShowSettings(false)} className="px-8 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-900 transition-colors">Done</button></div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><User className="w-4 h-4" /> Customer Info</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4"><input placeholder="Name" className="p-2 border border-gray-300 rounded-lg w-full" value={customerDetails.name} onChange={e => setCustomerDetails({...customerDetails, name: e.target.value})} /><input placeholder="Phone" className="p-2 border border-gray-300 rounded-lg w-full" value={customerDetails.phone} onChange={e => setCustomerDetails({...customerDetails, phone: e.target.value})} /></div>
                  
                  <div className="flex gap-4 mb-4"><button onClick={() => setEnquiryCategory('Transport')} className={`flex-1 py-2 text-sm font-black rounded-lg ${enquiryCategory === 'Transport' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm' : 'bg-gray-50 text-gray-500'}`}><Car className="w-4 h-4 mr-2 inline" /> Transport</button><button onClick={() => setEnquiryCategory('General')} className={`flex-1 py-2 text-sm font-black rounded-lg ${enquiryCategory === 'General' ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm' : 'bg-gray-50 text-gray-500'}`}><FileText className="w-4 h-4 mr-2 inline" /> General</button></div>

                  {enquiryCategory === 'General' ? (
                      <div className="space-y-4 mt-2 animate-in fade-in"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Requirement Details</label><textarea rows={6} className="w-full p-3 border border-gray-300 rounded-lg text-sm" placeholder="Enter user requirement details..." value={customerDetails.requirements} onChange={e => setCustomerDetails({...customerDetails, requirements: e.target.value})} /></div>
                  ) : (
                      <div className="space-y-4 mt-2 border-t border-gray-100 pt-4 animate-in fade-in">
                          <div className="flex justify-between items-center mb-2"><h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Trip Type</h4><div className="flex bg-gray-100 p-1 rounded-lg border"><button onClick={() => setVehicleType('Sedan')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${vehicleType === 'Sedan' ? 'bg-white shadow text-emerald-600' : 'text-gray-500'}`}>Sedan</button><button onClick={() => setVehicleType('SUV')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${vehicleType === 'SUV' ? 'bg-white shadow text-emerald-600' : 'text-gray-500'}`}>SUV</button></div></div>
                          <div className="flex border-b border-gray-200">{['Local', 'Rental', 'Outstation'].map(t => (<button key={t} onClick={() => setTripType(t as any)} className={`flex-1 py-3 text-xs font-black uppercase tracking-[0.2em] border-b-4 transition-all ${tripType === t ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-gray-400'}`}>{t}</button>))}</div>
                          
                          <div className="space-y-2">
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Pickup Location</label>
                              {isMapReady ? (<Autocomplete placeholder="Search Pickup Address" onAddressSelect={(addr, coords) => { setCustomerDetails(prev => ({ ...prev, pickup: addr })); setPickupCoords(coords); }} setNewPlace={(place) => setPickupCoords(place)} defaultValue={customerDetails.pickup} />) : <div className="p-3 bg-gray-50 rounded-lg border text-xs text-gray-400">MAP LOADING...</div>}
                          </div>

                          {tripType === 'Local' && (
                              <div className="space-y-4 animate-in slide-in-from-left-2 duration-200">
                                  <div className="space-y-4"><div className="flex justify-between items-center"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Drop Locations</label><button onClick={handleAddDrop} className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100"><Plus className="w-3 h-3 inline mr-1"/> Add Drop</button></div>{transportDetails.drops.map((drop, idx) => (<div key={idx} className="flex items-start gap-2 group"><div className="flex-1">{isMapReady ? <Autocomplete placeholder={`Drop ${idx + 1}`} onAddressSelect={(addr, coords) => handleDropChange(idx, addr, coords)} setNewPlace={(place) => handleDropChange(idx, drop.address, place)} defaultValue={drop.address} /> : <div className="p-2 bg-gray-50 text-xs border rounded-lg">MAP...</div>}</div>{transportDetails.drops.length > 1 && <button onClick={() => handleRemoveDrop(idx)} className="p-2.5 text-gray-400 hover:text-rose-500"><X className="w-4 h-4"/></button>}</div>))}</div>
                                  <div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] font-black text-gray-400 uppercase block mb-1 ml-1">Estimated Total KM</label><input type="number" className="p-3 border rounded-xl w-full text-sm font-black" value={transportDetails.estKm} onChange={e => setTransportDetails({...transportDetails, estKm: e.target.value})} /></div><div><label className="text-[10px] font-black text-gray-400 uppercase block mb-1 ml-1">Wait Time (Mins)</label><input type="number" className="p-3 border rounded-xl w-full text-sm font-black" value={transportDetails.waitingMins} onChange={e => setTransportDetails({...transportDetails, waitingMins: e.target.value})} /></div></div>
                              </div>
                          )}
                          {tripType === 'Rental' && (<div className="grid grid-cols-2 gap-3">{rentalPackages.map(pkg => (<button key={pkg.id} onClick={() => setTransportDetails({...transportDetails, packageId: pkg.id})} className={`p-4 border-2 rounded-2xl text-left transition-all h-24 flex flex-col justify-between ${transportDetails.packageId === pkg.id ? 'border-emerald-500 bg-emerald-50 shadow-md' : 'border-gray-100 bg-white'}`}><div className="text-xs font-black uppercase tracking-wider text-gray-500">{pkg.name}</div><div className="text-xl font-black">₹{vehicleType === 'Sedan' ? pkg.priceSedan : pkg.priceSuv}</div></button>))}</div>)}
                          {tripType === 'Outstation' && (
                              <div className="space-y-4 animate-in slide-in-from-left-2 duration-200">
                                  <div className="flex bg-gray-100 p-1 rounded-xl border"><button onClick={() => setOutstationSubType('RoundTrip')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${outstationSubType === 'RoundTrip' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500'}`}>Round Trip</button><button onClick={() => setOutstationSubType('OneWay')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${outstationSubType === 'OneWay' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500'}`}>One Way</button></div>
                                  <div className="space-y-2"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Destination</label>{isMapReady ? <Autocomplete placeholder="Search Destination City" onAddressSelect={(addr, coords) => { setTransportDetails(prev => ({ ...prev, destination: addr })); setDestCoords(coords); }} setNewPlace={(place) => setDestCoords(place)} defaultValue={transportDetails.destination} /> : <div className="p-2 border rounded-lg bg-gray-50 text-xs">MAP...</div>}</div>
                                  <div className="grid grid-cols-3 gap-3"><div><label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Days</label><input type="number" className="p-3 border rounded-xl w-full text-sm font-black" value={transportDetails.days} onChange={e => setTransportDetails({...transportDetails, days: e.target.value})} /></div><div><label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Total KM</label><input type="number" className="p-3 border rounded-xl w-full text-sm font-black" value={transportDetails.estTotalKm} onChange={e => setTransportDetails({...transportDetails, estTotalKm: e.target.value})} /></div><div><label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Nights</label><input type="number" className="p-3 border rounded-xl w-full text-sm font-black" value={transportDetails.nights} onChange={e => setTransportDetails({...transportDetails, nights: e.target.value})} /></div></div>
                                  <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-2xl"><div className={`p-2 rounded-xl ${transportDetails.isHillsTrip ? 'bg-indigo-100 text-indigo-600' : 'bg-white text-gray-400'}`}><Mountain className="w-5 h-5" /></div><div className="flex-1"><p className="text-sm font-bold text-gray-800">Hills Station Trip</p><p className="text-[10px] text-gray-500 font-bold uppercase">Add Hills Allowance</p></div><button onClick={() => setTransportDetails(prev => ({...prev, isHillsTrip: !prev.isHillsTrip}))} className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${transportDetails.isHillsTrip ? 'bg-indigo-600' : 'bg-gray-300'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${transportDetails.isHillsTrip ? 'translate-x-6' : 'translate-x-1'}`} /></button></div>
                              </div>
                          )}
                          
                          <div className="pt-4 space-y-4">
                                <div className="grid grid-cols-2 gap-4"><button onClick={() => saveOrder('Scheduled')} className="py-4 border-2 border-indigo-100 text-indigo-600 rounded-[2rem] font-black text-sm hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"><Calendar className="w-5 h-5" /> Schedule Trip</button><button onClick={handleBookNow} className="py-4 bg-emerald-600 text-white rounded-[2rem] font-black text-sm hover:bg-emerald-700 transition-all shadow-xl flex items-center justify-center gap-2"><ArrowRight className="w-5 h-5" /> Accept Order</button></div>
                                <div className="flex justify-center"><button onClick={handleCancelForm} className="px-8 py-3 text-gray-400 hover:text-rose-500 rounded-full font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"><X className="w-3 h-3" /> Reset Form</button></div>
                          </div>
                      </div>
                  )}
              </div>
          </div>

          <div className="space-y-6 h-fit sticky top-24">
              <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group animate-in slide-in-from-right-4 duration-500">
                  <div className="relative z-10">
                      <p className="text-slate-400 text-[10px] uppercase font-black tracking-[0.3em] mb-4">Estimated Booking Cost</p>
                      <h3 className="text-7xl font-black tracking-tighter mb-8">₹{estimatedCost.toLocaleString()}</h3>
                      
                      {enquiryCategory === 'Transport' && fareBreakup.length > 0 && (
                          <div className="space-y-4 border-t border-slate-800 pt-6 mb-8 animate-in fade-in">
                              <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                  <ListIcon className="w-4 h-4" /> Fare Detailed Breakup
                              </h4>
                              <div className="space-y-3">
                                  {fareBreakup.map((item, idx) => (
                                      <div key={idx} className="flex justify-between items-start group/item">
                                          <div>
                                              <p className={`text-sm font-bold ${item.type === 'tax' ? 'text-blue-400' : item.type === 'allowance' ? 'text-indigo-300' : 'text-slate-100'}`}>{item.label}</p>
                                              {item.description && <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tighter">{item.description}</p>}
                                          </div>
                                          <p className={`font-mono text-sm font-bold ${item.type === 'tax' ? 'text-blue-400' : 'text-slate-100'}`}>₹{item.value.toLocaleString()}</p>
                                      </div>
                                  ))}
                                  <div className="h-px bg-slate-800 my-2"></div>
                                  <div className="flex justify-between items-center">
                                      <p className="text-sm font-black text-emerald-400 uppercase tracking-widest">Grand Total</p>
                                      <p className="text-xl font-black text-emerald-400">₹{estimatedCost.toLocaleString()}</p>
                                  </div>
                              </div>
                          </div>
                      )}

                      <div className="text-[11px] text-slate-400 flex items-start gap-2 font-bold italic leading-relaxed">
                          <AlertCircle className="w-5 h-5 shrink-0 text-amber-500" />
                          <span>{enquiryCategory === 'Transport' ? "This is a base calculation. Taxes (GST), Toll fees, and Parking charges will be additional." : "General Enquiry mode. No monetary estimation calculated."}</span>
                      </div>
                  </div>
                  <div className="absolute -right-12 -bottom-12 opacity-[0.03] transform rotate-12 group-hover:scale-110 transition-transform duration-700"><DollarSign className="w-72 h-72 text-white" /></div>
              </div>

              <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-xl">
                  <div className="flex justify-between items-center mb-6">
                      <h4 className="font-black text-gray-800 text-[10px] uppercase tracking-[0.2em] flex items-center gap-2"><MessageCircle className="w-4 h-4 text-emerald-500" /> Generated Quote</h4>
                      <button onClick={() => {if(messageTextareaRef.current) { navigator.clipboard.writeText(generatedMessage); alert("Copied!"); }}} className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-xl"><Copy className="w-3.5 h-3.5 mr-1 inline" /> Copy</button>
                  </div>
                  <textarea ref={messageTextareaRef} className="w-full min-h-[220px] p-5 bg-gray-50 border border-gray-100 rounded-[2rem] text-sm font-medium text-gray-600 focus:outline-none resize-none mb-6 shadow-inner" value={generatedMessage} readOnly />
                  <div className="grid grid-cols-2 gap-4"><button onClick={() => window.open(`https://wa.me/${customerDetails.phone.replace(/\D/g, '')}?text=${encodeURIComponent(generatedMessage)}`, '_blank')} className="bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-2 transform active:scale-90"><MessageCircle className="w-5 h-5" /> WhatsApp</button><button className="bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-2 transform active:scale-90"><Mail className="w-4 h-4" /> Email</button></div>
              </div>
          </div>
      </div>

      {isScheduleModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100">
                  <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50"><h3 className="text-2xl font-black text-gray-800 tracking-tighter">Schedule Trip</h3><button onClick={() => setIsScheduleModalOpen(false)} className="p-3 hover:bg-gray-200 rounded-2xl text-gray-400"><X className="w-6 h-6"/></button></div>
                  <div className="p-10 space-y-8">
                      <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-3">Pickup Date</label><input type="date" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none font-bold text-gray-800" value={scheduleData.date} onChange={(e) => setScheduleData({...scheduleData, date: e.target.value})} /></div>
                      <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-3">Pickup Time</label><input type="time" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none font-bold text-gray-800" value={scheduleData.time} onChange={(e) => setScheduleData({...scheduleData, time: e.target.value})} /></div>
                      <button onClick={confirmSchedule} className="w-full bg-indigo-600 text-white py-5 rounded-[2rem] font-black text-sm shadow-2xl hover:bg-indigo-700 transition-all transform active:scale-90">Confirm Schedule</button>
                  </div>
              </div>
          </div>
      )}

      {/* DASHBOARD STATUS TABLE */}
      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-2xl shadow-indigo-900/5 overflow-hidden animate-in fade-in">
        <div className="p-8 md:p-10 border-b border-gray-50 flex flex-col md:flex-row justify-between items-center gap-6 bg-gray-50/30">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><Calendar className="w-5 h-5" /></div>
                    <div className="flex bg-gray-100 p-1 rounded-lg border">
                        <button onClick={() => setFilterDateType('Month')} className={`px-3 py-1 text-[10px] font-black rounded ${filterDateType === 'Month' ? 'bg-white shadow text-indigo-600' : 'text-gray-400'}`}>Month</button>
                        <button onClick={() => setFilterDateType('Date')} className={`px-3 py-1 text-[10px] font-black rounded ${filterDateType === 'Date' ? 'bg-white shadow text-indigo-600' : 'text-gray-400'}`}>Date</button>
                    </div>
                    {filterDateType === 'Month' ? (
                        <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="bg-transparent border-none outline-none font-black text-gray-800 text-xs appearance-none cursor-pointer" />
                    ) : (
                        <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="bg-transparent border-none outline-none font-black text-gray-800 text-xs appearance-none cursor-pointer" />
                    )}
                </div>
            </div>
            <div className="flex gap-4">
                <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" /><input type="text" placeholder="Search..." value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} className="pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none w-48 lg:w-64 shadow-sm" /></div>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-black uppercase text-gray-500 outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm">
                    <option value="All">All Status</option><option>New</option><option>Scheduled</option><option>Order Accepted</option><option>Completed</option><option>Cancelled</option>
                </select>
                <button onClick={resetFilters} className="p-3 bg-white border border-gray-200 text-gray-400 hover:text-red-500 rounded-2xl transition-colors shadow-sm"><RefreshCcw className="w-4 h-4" /></button>
            </div>
        </div>
        <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left">
                <thead className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 bg-white sticky top-0 z-10">
                    <tr><th className="px-10 py-8">Customer Details</th><th className="px-10 py-8">Enquiry / Route</th><th className="px-10 py-8">Assigned Staff</th><th className="px-10 py-8 text-center">Status</th><th className="px-10 py-8 text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {filteredOrders.map((order, i) => {
                        const assigned = getAssignedStaff(order.assignedTo);
                        return (
                        <tr key={i} className="hover:bg-gray-50/50 transition-all group">
                            <td className="px-10 py-8"><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-lg border border-indigo-100">{order.name.charAt(0)}</div><div><p className="font-black text-gray-800 tracking-tight">{order.name}</p><p className="text-[10px] text-gray-400 font-bold uppercase">{order.phone}</p></div></div></td>
                            <td className="px-10 py-8"><div className="max-w-xs space-y-1"><p className="text-sm text-gray-600 font-bold line-clamp-1 truncate" title={order.details}>{order.details}</p><div className="flex gap-2 flex-wrap">{order.enquiryCategory === 'Transport' && <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded text-[8px] font-black border border-emerald-100">TAXI</span>}{order.priority === 'Hot' && <span className="bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded text-[8px] font-black border border-rose-100">HOT</span>}</div></div></td>
                            <td className="px-10 py-8">{assigned ? (<div className="flex items-center gap-2"><img src={assigned.avatar} className="w-6 h-6 rounded-full border border-white shadow-sm" alt="" /><div className="text-[10px] font-black text-gray-500 uppercase tracking-tight">{assigned.name}</div></div>) : <span className="text-[10px] text-gray-300 font-black italic">UNASSIGNED</span>}</td>
                            <td className="px-10 py-8 text-center"><span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${order.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : order.status === 'Cancelled' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>{order.status}</span></td>
                            <td className="px-10 py-8 text-right"><div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => handleEditOrder(order)} className="p-3 bg-white border border-gray-100 text-gray-400 hover:text-indigo-600 rounded-2xl shadow-sm"><Edit2 className="w-4 h-4"/></button><button onClick={() => { if(window.confirm('Delete?')) setEnquiries(enquiries.filter(e => e.id !== order.id)) }} className="p-3 bg-white border border-gray-100 text-gray-400 hover:text-rose-600 rounded-2xl shadow-sm"><Trash2 className="w-4 h-4"/></button></div></td>
                        </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default CustomerCare;