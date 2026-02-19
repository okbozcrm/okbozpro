import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Settings, Loader2, ArrowRight, ArrowRightLeft, 
  MessageCircle, Copy, Mail, Car, User, Edit2,
  CheckCircle, Building2, Save, X, Phone, Truck, DollarSign,
  Calendar, MapPin, Plus, Trash2, Headset,
  Clock, CheckCircle as CheckCircleIcon, Filter, Search, ChevronDown, UserCheck, XCircle, AlertCircle, History, PhoneOutgoing, PhoneIncoming, CalendarCheck, BookOpen, FileText, RefreshCcw, Mountain, List as ListIcon,
  // Added TrendingUp as TrendingUpIcon to fix the compilation error
  Package, Bike, TrendingUp as TrendingUpIcon
} from 'lucide-react';
import Autocomplete from '../../components/Autocomplete';
import { Enquiry, HistoryLog, UserRole } from '../../types';
import { sendSystemNotification, HARDCODED_MAPS_API_KEY } from '../../services/cloudService';

// Types
type TripType = 'Local' | 'Rental' | 'Outstation';
type OutstationSubType = 'RoundTrip' | 'OneWay';
type VehicleType = 'Sedan' | 'SUV' | '3 Wheeler Auto' | 'Tata Ace' | 'Pickup';
type EnquiryCategory = 'Transport' | 'General';
type OrderStatus = 'Scheduled' | 'Order Accepted' | 'Driver Assigned' | 'Completed' | 'Cancelled' | 'New' | 'In Progress' | 'Converted' | 'Closed' | 'Booked';

interface RentalPackage {
  id: string;
  name: string;
  hours: number;
  km: number;
  priceSedan: number;
  priceSuv: number;
  priceAuto: number;
  priceAce: number;
  pricePickup: number;
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
  { id: '1hr', name: '1 Hr / 10 km', hours: 1, km: 10, priceSedan: 200, priceSuv: 300, priceAuto: 150, priceAce: 400, pricePickup: 500 },
  { id: '2hr', name: '2 Hr / 20 km', hours: 2, km: 20, priceSedan: 400, priceSuv: 600, priceAuto: 300, priceAce: 750, pricePickup: 900 },
  { id: '4hr', name: '4 Hr / 40 km', hours: 4, km: 40, priceSedan: 800, priceSuv: 1100, priceAuto: 550, priceAce: 1400, pricePickup: 1700 },
  { id: '8hr', name: '8 Hr / 80 km', hours: 8, km: 80, priceSedan: 1600, priceSuv: 2200, priceAuto: 1000, priceAce: 2600, pricePickup: 3200 },
];

const DEFAULT_PRICING_SEDAN: PricingRules = {
  localBaseFare: 200, localBaseKm: 5, localPerKmRate: 20, localWaitingRate: 2,
  rentalExtraKmRate: 15, rentalExtraHrRate: 100,
  outstationMinKmPerDay: 250, outstationBaseRate: 0, outstationExtraKmRate: 13,
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

const DEFAULT_PRICING_AUTO: PricingRules = {
  localBaseFare: 100, localBaseKm: 2, localPerKmRate: 15, localWaitingRate: 1,
  rentalExtraKmRate: 12, rentalExtraHrRate: 80,
  outstationMinKmPerDay: 200, outstationBaseRate: 0, outstationExtraKmRate: 12,
  outstationDriverAllowance: 300, outstationNightAllowance: 200,
  outstationHillsAllowance: 400
};

const DEFAULT_PRICING_ACE: PricingRules = {
  localBaseFare: 400, localBaseKm: 5, localPerKmRate: 30, localWaitingRate: 4,
  rentalExtraKmRate: 22, rentalExtraHrRate: 200,
  outstationMinKmPerDay: 250, outstationBaseRate: 500, outstationExtraKmRate: 18,
  outstationDriverAllowance: 500, outstationNightAllowance: 400,
  outstationHillsAllowance: 600
};

const DEFAULT_PRICING_PICKUP: PricingRules = {
  localBaseFare: 600, localBaseKm: 5, localPerKmRate: 40, localWaitingRate: 5,
  rentalExtraKmRate: 28, rentalExtraHrRate: 250,
  outstationMinKmPerDay: 300, outstationBaseRate: 800, outstationExtraKmRate: 22,
  outstationDriverAllowance: 600, outstationNightAllowance: 500,
  outstationHillsAllowance: 800
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
    const saved = localStorage.getItem('transport_rental_packages_v3');
    return saved ? JSON.parse(saved) : DEFAULT_RENTAL_PACKAGES;
  });

  const [pricing, setPricing] = useState<Record<VehicleType, PricingRules>>(() => {
    const saved = localStorage.getItem('transport_pricing_rules_v3');
    return saved ? JSON.parse(saved) : { 
        Sedan: DEFAULT_PRICING_SEDAN, 
        SUV: DEFAULT_PRICING_SUV,
        '3 Wheeler Auto': DEFAULT_PRICING_AUTO,
        'Tata Ace': DEFAULT_PRICING_ACE,
        'Pickup': DEFAULT_PRICING_PICKUP
    };
  });

  const [showAddPackage, setShowAddPackage] = useState(false);
  const [newPackage, setNewPackage] = useState({ name: '', hours: '', km: '', priceSedan: '', priceSuv: '', priceAuto: '', priceAce: '', pricePickup: '' });
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
    localStorage.setItem('transport_rental_packages_v3', JSON.stringify(rentalPackages));
  }, [rentalPackages]);

  useEffect(() => {
    localStorage.setItem('transport_pricing_rules_v3', JSON.stringify(pricing));
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
    if ((window as any).gm_authFailure_detected) { setMapError("Map API Error"); return; }
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
    if (!newPackage.name) { alert("Please fill in package name."); return; }
    const pkgData = {
        id: editingPackageId || `pkg-${Date.now()}`,
        name: newPackage.name,
        hours: parseFloat(newPackage.hours) || 0,
        km: parseFloat(newPackage.km) || 0,
        priceSedan: parseFloat(newPackage.priceSedan) || 0,
        priceSuv: parseFloat(newPackage.priceSuv) || 0,
        priceAuto: parseFloat(newPackage.priceAuto) || 0,
        priceAce: parseFloat(newPackage.priceAce) || 0,
        pricePickup: parseFloat(newPackage.pricePickup) || 0,
    };

    if (editingPackageId) {
        setRentalPackages(rentalPackages.map(pkg => pkg.id === editingPackageId ? pkgData : pkg));
        setEditingPackageId(null);
    } else {
        setRentalPackages([...rentalPackages, pkgData]);
    }
    setShowAddPackage(false);
    setNewPackage({ name: '', hours: '', km: '', priceSedan: '', priceSuv: '', priceAuto: '', priceAce: '', pricePickup: '' });
  };

  const handleEditPackage = (pkg: RentalPackage) => {
    setEditingPackageId(pkg.id);
    setNewPackage({ 
        name: pkg.name, 
        hours: pkg.hours.toString(), 
        km: pkg.km.toString(), 
        priceSedan: pkg.priceSedan.toString(), 
        priceSuv: pkg.priceSuv.toString(), 
        priceAuto: pkg.priceAuto.toString(),
        priceAce: pkg.priceAce.toString(),
        pricePickup: pkg.pricePickup.toString()
    });
    setShowAddPackage(true);
  };

  const handleCancelEditPackage = () => {
    setEditingPackageId(null);
    setNewPackage({ name: '', hours: '', km: '', priceSedan: '', priceSuv: '', priceAuto: '', priceAce: '', pricePickup: '' });
    setShowAddPackage(false);
  };

  const removePackage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Remove this package?')) {
      setRentalPackages(prev => prev.filter(p => p.id !== id));
      if (transportDetails.packageId === id) setTransportDetails(prev => ({ ...prev, packageId: '' }));
      if (editingPackageId === id) handleCancelEditPackage();
    }
  };

  const handleAddDrop = () => setTransportDetails(prev => ({ ...prev, drops: [...prev.drops, { address: '', coords: null }] }));
  const handleRemoveDrop = (index: number) => setTransportDetails(prev => { const newDrops = prev.drops.filter((_, i) => i !== index); if (newDrops.length === 0) return { ...prev, drops: [{ address: '', coords: null }] }; return { ...prev, drops: newDrops }; });
  const handleDropChange = (index: number, address: string, coords: any) => setTransportDetails(prev => { const newDrops = [...prev.drops]; newDrops[index] = { address, coords }; return { ...prev, drops: newDrops }; });

  // Calculation Logic Updated
  useEffect(() => {
      let total = 0;
      const rules = pricing[vehicleType];
      let breakup: FareItem[] = [];
      let details = '';
      let msg = '';

      if (enquiryCategory === 'General') {
          total = 0;
          breakup = [];
          details = customerDetails.requirements || "General Enquiry.";
          msg = `Hello ${customerDetails.name || 'Sir/Madam'},\nThank you for contacting OK BOZ. \n\nRegarding your enquiry:\n"${customerDetails.requirements || 'General Requirement'}"\n\nWe have received your request and our team will get back to you shortly.\n\nRegards,\nOK BOZ Support Team`;
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

          msg = `Hello ${customerDetails.name || 'Customer'},\nHere is your *Local Trip* estimate from OK BOZ! 🚕\n\n` +
                `🚘 Vehicle: ${vehicleType}\n` +
                `📍 Pickup: ${customerDetails.pickup || 'TBD'}\n` +
                `${transportDetails.drops.filter(d => d.address).map((d, i) => `📍 Drop ${i+1}: ${d.address}`).join('\n')}\n\n` +
                `*Fare Breakdown:*\n` +
                `• Base Fare: ₹${base} (Upto ${rules.localBaseKm} KM)\n` +
                `• Extra KM: ₹${extraKmCost} (${extraKmVal.toFixed(1)} KM @ ₹${rules.localPerKmRate})\n` +
                `• Waiting: ₹${waitCost} (${transportDetails.waitingMins} Mins @ ₹${rules.localWaitingRate}/min)\n`;
      } else if (tripType === 'Rental') {
          const pkg = rentalPackages.find(p => p.id === transportDetails.packageId);
          if (pkg) {
              if (vehicleType === 'Sedan') total = pkg.priceSedan;
              else if (vehicleType === 'SUV') total = pkg.priceSuv;
              else if (vehicleType === '3 Wheeler Auto') total = pkg.priceAuto;
              else if (vehicleType === 'Tata Ace') total = pkg.priceAce;
              else if (vehicleType === 'Pickup') total = pkg.pricePickup;

              breakup.push({ label: 'Package Rate', value: total, description: pkg.name, type: 'base' });
              details = `Rental: ${pkg.name}`;

              msg = `Hello ${customerDetails.name || 'Customer'},\nHere is your *Rental Package* estimate from OK BOZ! 🚕\n\n` +
                    `🚘 Vehicle: ${vehicleType}\n` +
                    `📍 Pickup: ${customerDetails.pickup || 'TBD'}\n` +
                    `📦 Package: ${pkg.name}\n\n` +
                    `*Fare Breakdown:*\n` +
                    `• Package Price: ₹${total}\n`;
          }
      } else {
          const days = parseFloat(transportDetails.days) || 1;
          const km = parseFloat(transportDetails.estTotalKm) || 0;
          const driverAllowance = rules.outstationDriverAllowance * days;
          const perKmRate = rules.outstationExtraKmRate;
          const minKmPerDay = rules.outstationMinKmPerDay;
          const hillsAllowanceRate = rules.outstationHillsAllowance;
          const nightAllowanceRate = rules.outstationNightAllowance;
          
          if (outstationSubType === 'RoundTrip') {
              const minKm = days * minKmPerDay;
              const chargeKm = Math.max(km, minKm);
              const kmCharges = chargeKm * perKmRate;
              const nightAllowance = (parseFloat(transportDetails.nights) || 0) * nightAllowanceRate;
              const hillsAllowance = transportDetails.isHillsTrip ? (hillsAllowanceRate * days) : 0;
              
              total = kmCharges + driverAllowance + nightAllowance + hillsAllowance;
              
              breakup.push({ label: 'KM Charges', value: kmCharges, description: `${chargeKm.toFixed(1)} KM @ ₹${perKmRate}/KM (Min ${minKm} KM)`, type: 'base' });
              breakup.push({ label: 'Driver Allowance', value: driverAllowance, description: `${days} Days @ ₹${rules.outstationDriverAllowance}/day`, type: 'allowance' });
              if (nightAllowance > 0) breakup.push({ label: 'Night Allowance', value: nightAllowance, description: `${transportDetails.nights} Nights @ ₹${nightAllowanceRate}/night`, type: 'allowance' });
              if (hillsAllowance > 0) breakup.push({ label: 'Hills Allowance', value: hillsAllowance, description: `${days} Days @ ₹${hillsAllowanceRate}/day`, type: 'allowance' });
              
              details = `Round Trip: ${days} days, ${km} km${transportDetails.isHillsTrip ? ' (Hills Included)' : ''}`;

              msg = `Hello ${customerDetails.name || 'Customer'},\nHere is your *Outstation Round-Trip* estimate from OK BOZ! 🚕\n\n` +
                    `🚘 Vehicle: ${vehicleType}\n` +
                    `📍 Pickup: ${customerDetails.pickup || 'TBD'}\n` +
                    `🌍 Destination: ${transportDetails.destination}\n\n` +
                    `*Trip Parameters:*\n` +
                    `• Days: ${days}\n` +
                    `• Approx KM: ${km} KM\n` +
                    `• Min KM/Day: ${minKmPerDay} KM\n` +
                    `• Per KM Rate: ₹${perKmRate}\n\n` +
                    `*Fare Breakdown:*\n` +
                    `• KM Charges: ₹${kmCharges} (${chargeKm.toFixed(1)} KM)\n` +
                    `• Driver Allw.: ₹${driverAllowance} (${days} Days @ ₹${rules.outstationDriverAllowance})\n` +
                    (nightAllowance > 0 ? `• Night Allw.: ₹${nightAllowance} (${transportDetails.nights} Nights)\n` : '') +
                    (hillsAllowance > 0 ? `• Hills Allw.: ₹${hillsAllowance} (${days} Days @ ₹${hillsAllowanceRate})\n` : '');
          } else {
              const baseFare = rules.outstationBaseRate;
              const kmCharges = km * perKmRate;
              const hillsAllowance = transportDetails.isHillsTrip ? (hillsAllowanceRate * days) : 0;
              
              total = baseFare + kmCharges + driverAllowance + hillsAllowance;
              
              if (baseFare > 0) breakup.push({ label: 'Base Fare', value: baseFare, type: 'base' });
              breakup.push({ label: 'KM Charges', value: kmCharges, description: `${km.toFixed(1)} KM @ ₹${perKmRate}/KM`, type: 'base' });
              breakup.push({ label: 'Driver Allowance', value: driverAllowance, description: `${days} Days @ ₹${rules.outstationDriverAllowance}/day`, type: 'allowance' });
              if (hillsAllowance > 0) breakup.push({ label: 'Hills Allowance', value: hillsAllowance, description: `${days} Days @ ₹${hillsAllowanceRate}/day`, type: 'allowance' });

              details = `One Way: ${km} km${transportDetails.isHillsTrip ? ' (Hills Included)' : ''}`;

              msg = `Hello ${customerDetails.name || 'Customer'},\nHere is your *Outstation One-Way* estimate from OK BOZ! 🚕\n\n` +
                    `🚘 Vehicle: ${vehicleType}\n` +
                    `📍 Pickup: ${customerDetails.pickup || 'TBD'}\n` +
                    `🌍 Destination: ${transportDetails.destination}\n\n` +
                    `*Trip Parameters:*\n` +
                    `• Approx KM: ${km} KM\n` +
                    `• Per KM Rate: ₹${perKmRate}\n\n` +
                    `*Fare Breakdown:*\n` +
                    (baseFare > 0 ? `• Base Fare: ₹${baseFare}\n` : '') +
                    `• KM Charges: ₹${kmCharges} (${km.toFixed(1)} KM)\n` +
                    `• Driver Allw.: ₹${driverAllowance} (${days} Days @ ₹${rules.outstationDriverAllowance})\n` +
                    (hillsAllowance > 0 ? `• Hills Allw.: ₹${hillsAllowance} (${days} Days @ ₹${hillsAllowanceRate})\n` : '');
          }
      }

      if (total > 0) {
          const gst = Math.round(total * 0.05); // 5% GST
          breakup.push({ label: 'GST (5%)', value: gst, type: 'tax' });
          total += gst;
          msg += `• GST (5%): ₹${gst}\n\n`;
          msg += `💰 *Total Estimate: ₹${total.toFixed(0)}*\n`;
          msg += `(Tolls & Parking Charges Extra as per actuals.)\n\nBook now with OK BOZ!`;
      }

      setEstimatedCost(total);
      setFareBreakup(breakup);
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
          setTransportDetails({ ...transportDetails, ...order.transportData, drops: (order.transportData as any).drops || [{ address: '', coords: null }] });
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBookNow = () => saveOrder('Booked');

  const confirmSchedule = () => {
    if (!scheduleData.date || !scheduleData.time) {
      alert("Please select date and time");
      return;
    }
    saveOrder('Scheduled', { date: scheduleData.date, time: scheduleData.time });
    setIsScheduleModalOpen(false);
  };

  const resetFilters = () => {
    setFilterStatus('All');
    setFilterSearch('');
    setFilterCorporate('All');
    setFilterBranch('All');
    setFilterDateType('Month');
    setFilterMonth(new Date().toISOString().slice(0, 7));
    setFilterDate(new Date().toISOString().split('T')[0]);
  };

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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                <h3 className="font-bold text-gray-800 flex items-center gap-2"><Edit2 className="w-4 h-4" /> Fare Configuration</h3>
                <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
              <div className="space-y-4 mb-8">
                 <div className="space-y-2">
                    <p className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.2em] ml-1">TAXI FLEET</p>
                    <div className="flex gap-4">
                        <button 
                            onClick={() => setSettingsVehicleType('Sedan')} 
                            className={`flex-1 py-6 px-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${settingsVehicleType === 'Sedan' ? 'border-emerald-500 bg-emerald-50 shadow-xl shadow-emerald-500/10' : 'border-gray-100 hover:border-gray-200 bg-white'}`}
                        >
                            <Car className={`w-8 h-8 ${settingsVehicleType === 'Sedan' ? 'text-emerald-600' : 'text-gray-300'}`} />
                            <span className={`text-xs font-black uppercase tracking-widest ${settingsVehicleType === 'Sedan' ? 'text-emerald-700' : 'text-gray-400'}`}>Sedan</span>
                        </button>
                        <button 
                            onClick={() => setSettingsVehicleType('SUV')} 
                            className={`flex-1 py-6 px-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${settingsVehicleType === 'SUV' ? 'border-emerald-500 bg-emerald-50 shadow-xl shadow-emerald-500/10' : 'border-gray-100 hover:border-gray-200 bg-white'}`}
                        >
                            <Car className={`w-8 h-8 ${settingsVehicleType === 'SUV' ? 'text-emerald-600' : 'text-gray-300'}`} />
                            <span className={`text-xs font-black uppercase tracking-widest ${settingsVehicleType === 'SUV' ? 'text-emerald-700' : 'text-gray-400'}`}>SUV</span>
                        </button>
                        <div className="flex-[2]"></div> {/* Spacer */}
                    </div>
                 </div>
                 <div className="space-y-2">
                    <p className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em] ml-1">LOAD XPRESS</p>
                    <div className="flex gap-4">
                        <button 
                            onClick={() => setSettingsVehicleType('3 Wheeler Auto')} 
                            className={`flex-1 py-6 px-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${settingsVehicleType === '3 Wheeler Auto' ? 'border-blue-500 bg-blue-50 shadow-xl shadow-blue-500/10' : 'border-gray-100 hover:border-gray-200 bg-white'}`}
                        >
                            <Truck className={`w-8 h-8 ${settingsVehicleType === '3 Wheeler Auto' ? 'text-blue-600' : 'text-gray-300'}`} />
                            <span className={`text-xs font-black uppercase tracking-widest ${settingsVehicleType === '3 Wheeler Auto' ? 'text-blue-700' : 'text-gray-400'}`}>Auto</span>
                        </button>
                        <button 
                            onClick={() => setSettingsVehicleType('Tata Ace')} 
                            className={`flex-1 py-6 px-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${settingsVehicleType === 'Tata Ace' ? 'border-blue-500 bg-blue-50 shadow-xl shadow-blue-500/10' : 'border-gray-100 hover:border-gray-200 bg-white'}`}
                        >
                            <Truck className={`w-8 h-8 ${settingsVehicleType === 'Tata Ace' ? 'text-blue-600' : 'text-gray-300'}`} />
                            <span className={`text-xs font-black uppercase tracking-widest ${settingsVehicleType === 'Tata Ace' ? 'text-blue-700' : 'text-gray-400'}`}>Tata Ace</span>
                        </button>
                        <button 
                            onClick={() => setSettingsVehicleType('Pickup')} 
                            className={`flex-1 py-6 px-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${settingsVehicleType === 'Pickup' ? 'border-blue-500 bg-blue-50 shadow-xl shadow-blue-500/10' : 'border-gray-100 hover:border-gray-200 bg-white'}`}
                        >
                            <Truck className={`w-8 h-8 ${settingsVehicleType === 'Pickup' ? 'text-blue-600' : 'text-gray-300'}`} />
                            <span className={`text-xs font-black uppercase tracking-widest ${settingsVehicleType === 'Pickup' ? 'text-blue-700' : 'text-gray-400'}`}>Pickup</span>
                        </button>
                        <div className="flex-1"></div> {/* Spacer */}
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-gray-100">
                 {/* LOCAL RULES COLUMN */}
                 <div className="space-y-6">
                    <h4 className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.2em] border-b-2 border-emerald-100 pb-2 flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5" /> Local Strategy
                    </h4>
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Base Fare (₹)</label>
                            <input type="number" name="localBaseFare" value={pricing[settingsVehicleType].localBaseFare} onChange={handlePricingChange} className="w-full p-3 border border-gray-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none text-sm shadow-inner" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Base Km Included</label>
                            <input type="number" name="localBaseKm" value={pricing[settingsVehicleType].localBaseKm} onChange={handlePricingChange} className="w-full p-3 border border-gray-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none text-sm shadow-inner" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Extra Km Rate (₹/km)</label>
                            <input type="number" name="localPerKmRate" value={pricing[settingsVehicleType].localPerKmRate} onChange={handlePricingChange} className="w-full p-3 border border-gray-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none text-sm shadow-inner" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Waiting Charge (₹/min)</label>
                            <input type="number" name="localWaitingRate" value={pricing[settingsVehicleType].localWaitingRate} onChange={handlePricingChange} className="w-full p-3 border border-gray-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none text-sm shadow-inner" />
                        </div>
                    </div>
                 </div>

                 {/* OUTSTATION RULES COLUMN */}
                 <div className="space-y-6">
                    <h4 className="text-[11px] font-black text-orange-600 uppercase tracking-[0.2em] border-b-2 border-orange-100 pb-2 flex items-center gap-2">
                        <TrendingUpIcon className="w-3.5 h-3.5" /> Outstation Matrix
                    </h4>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Min Km / Day</label>
                                <input type="number" name="outstationMinKmPerDay" value={pricing[settingsVehicleType].outstationMinKmPerDay} onChange={handlePricingChange} className="w-full p-3 border border-gray-200 rounded-xl font-bold focus:ring-2 focus:ring-orange-500 outline-none text-sm shadow-inner" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Per Km Rate (₹/km)</label>
                                <input type="number" name="outstationExtraKmRate" value={pricing[settingsVehicleType].outstationExtraKmRate} onChange={handlePricingChange} className="w-full p-3 border border-gray-200 rounded-xl font-bold focus:ring-2 focus:ring-orange-500 outline-none text-sm shadow-inner" />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Base Rate (One Way)</label>
                            <input type="number" name="outstationBaseRate" value={pricing[settingsVehicleType].outstationBaseRate} onChange={handlePricingChange} className="w-full p-3 border border-gray-200 rounded-xl font-bold focus:ring-2 focus:ring-orange-500 outline-none text-sm shadow-inner" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Driver Allowance (₹/day)</label>
                            <input type="number" name="outstationDriverAllowance" value={pricing[settingsVehicleType].outstationDriverAllowance} onChange={handlePricingChange} className="w-full p-3 border border-gray-200 rounded-xl font-bold focus:ring-2 focus:ring-orange-500 outline-none text-sm shadow-inner" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Night Allowance (₹/night)</label>
                            <input type="number" name="outstationNightAllowance" value={pricing[settingsVehicleType].outstationNightAllowance} onChange={handlePricingChange} className="w-full p-3 border border-gray-200 rounded-xl font-bold focus:ring-2 focus:ring-orange-500 outline-none text-sm shadow-inner" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Hills Allowance (₹/day)</label>
                            <input type="number" name="outstationHillsAllowance" value={pricing[settingsVehicleType].outstationHillsAllowance} onChange={handlePricingChange} className="w-full p-3 border border-gray-200 rounded-xl font-bold focus:ring-2 focus:ring-orange-500 outline-none text-sm shadow-inner" />
                        </div>
                    </div>
                 </div>

                 {/* RENTAL PACKAGES COLUMN */}
                 <div className="space-y-6">
                    <div className="flex justify-between items-center border-b-2 border-blue-100 pb-2">
                        <h4 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5" /> Package Fleet
                        </h4>
                        <button onClick={() => setShowAddPackage(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 shadow-sm"><Plus className="w-3 h-3" /> New</button>
                    </div>
                    <div className="space-y-3">
                        {rentalPackages.map(pkg => (
                            <div key={pkg.id} className="flex justify-between items-center p-4 bg-white rounded-xl border border-gray-100 shadow-sm group hover:border-blue-200 transition-all">
                                <div>
                                    <p className="text-sm font-black text-gray-800">{pkg.name}</p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{pkg.hours}Hr / {pkg.km}km</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="font-mono font-black text-gray-900 text-base">
                                        ₹{settingsVehicleType === 'Sedan' ? pkg.priceSedan : 
                                          settingsVehicleType === 'SUV' ? pkg.priceSuv :
                                          settingsVehicleType === '3 Wheeler Auto' ? pkg.priceAuto :
                                          settingsVehicleType === 'Tata Ace' ? pkg.priceAce : pkg.pricePickup}
                                    </span>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEditPackage(pkg)} className="p-1.5 text-blue-400 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                                        <button onClick={(e) => removePackage(pkg.id, e)} className="p-1.5 text-rose-400 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                 </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end">
                <button onClick={() => setShowSettings(false)} className="px-10 py-3 bg-slate-900 text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-900/20">Apply Configuration</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD PACKAGE MODAL (NESTED) */}
      {showAddPackage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200">
                  <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                      <h4 className="font-black text-gray-800 uppercase tracking-[0.2em] text-xs">
                          {editingPackageId ? 'Update Tier' : 'New Strategic Tier'}
                      </h4>
                      <button onClick={handleCancelEditPackage} className="p-2 hover:bg-gray-200 rounded-lg text-gray-400 transition-colors">
                          <X className="w-5 h-5"/>
                      </button>
                  </div>
                  <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                      <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase mb-1.5 block ml-1">Package Display Name</label>
                          <input className="w-full p-3 border border-gray-200 rounded-xl text-sm font-bold shadow-inner" value={newPackage.name} onChange={e => setNewPackage({...newPackage, name: e.target.value})} placeholder="e.g. 4 Hours / 40 KM" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="text-[10px] font-black text-gray-400 uppercase mb-1.5 block ml-1">Hours</label><input type="number" className="w-full p-3 border border-gray-200 rounded-xl text-sm font-bold shadow-inner" value={newPackage.hours} onChange={e => setNewPackage({...newPackage, hours: e.target.value})} /></div>
                          <div><label className="text-[10px] font-black text-gray-400 uppercase mb-1.5 block ml-1">KM Limit</label><input type="number" className="w-full p-3 border border-gray-200 rounded-xl text-sm font-bold shadow-inner" value={newPackage.km} onChange={e => setNewPackage({...newPackage, km: e.target.value})} /></div>
                      </div>
                      
                      <div className="space-y-4 pt-2">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">Multi-Vehicle Payout Logic</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-[10px] font-black text-emerald-600 uppercase mb-1.5 block ml-1">Sedan Price</label><input type="number" className="w-full p-3 border border-emerald-100 bg-emerald-50/20 rounded-xl text-sm font-black shadow-inner" value={newPackage.priceSedan} onChange={e => setNewPackage({...newPackage, priceSedan: e.target.value})} /></div>
                            <div><label className="text-[10px] font-black text-emerald-600 uppercase mb-1.5 block ml-1">SUV Price</label><input type="number" className="w-full p-3 border border-emerald-100 bg-emerald-50/20 rounded-xl text-sm font-black shadow-inner" value={newPackage.priceSuv} onChange={e => setNewPackage({...newPackage, priceSuv: e.target.value})} /></div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div><label className="text-[10px] font-black text-blue-600 uppercase mb-1.5 block ml-1">Auto</label><input type="number" className="w-full p-3 border border-blue-100 bg-blue-50/20 rounded-xl text-sm font-black shadow-inner" value={newPackage.priceAuto} onChange={e => setNewPackage({...newPackage, priceAuto: e.target.value})} /></div>
                            <div><label className="text-[10px] font-black text-blue-600 uppercase mb-1.5 block ml-1">Tata Ace</label><input type="number" className="w-full p-3 border border-blue-100 bg-blue-50/20 rounded-xl text-sm font-black shadow-inner" value={newPackage.priceAce} onChange={e => setNewPackage({...newPackage, priceAce: e.target.value})} /></div>
                            <div><label className="text-[10px] font-black text-blue-600 uppercase mb-1.5 block ml-1">Pickup</label><input type="number" className="w-full p-3 border border-blue-100 bg-blue-50/20 rounded-xl text-sm font-black shadow-inner" value={newPackage.pricePickup} onChange={e => setNewPackage({...newPackage, pricePickup: e.target.value})} /></div>
                        </div>
                      </div>

                      <button onClick={handleAddPackage} className="w-full py-4 bg-blue-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-900/20 transform active:scale-95 transition-all">
                          {editingPackageId ? 'Update Matrix' : 'Commit Package'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
              <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-xl shadow-indigo-900/5">
                  <div className="flex justify-between items-start mb-8">
                    <h3 className="font-black text-gray-800 text-sm uppercase tracking-widest flex items-center gap-3">
                        <User className="w-5 h-5 text-indigo-500" /> Lead Context
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Customer Name</label>
                        <input placeholder="Enter Name" className="p-4 bg-gray-50 border-none rounded-2xl w-full font-bold shadow-inner outline-none focus:ring-2 focus:ring-indigo-500/20" value={customerDetails.name} onChange={e => setCustomerDetails({...customerDetails, name: e.target.value})} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Mobile Number</label>
                        <input placeholder="+91..." className="p-4 bg-gray-50 border-none rounded-2xl w-full font-bold shadow-inner outline-none focus:ring-2 focus:ring-indigo-500/20" value={customerDetails.phone} onChange={e => setCustomerDetails({...customerDetails, phone: e.target.value})} />
                    </div>
                  </div>
                  
                  <div className="flex gap-4 mb-8">
                    <button onClick={() => setEnquiryCategory('Transport')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl border-2 transition-all flex items-center justify-center gap-2 ${enquiryCategory === 'Transport' ? 'bg-emerald-50 text-emerald-700 border-emerald-500 shadow-lg shadow-emerald-500/10' : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'}`}>
                        <Car className="w-4 h-4" /> Transport Drive
                    </button>
                    <button onClick={() => setEnquiryCategory('General')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl border-2 transition-all flex items-center justify-center gap-2 ${enquiryCategory === 'General' ? 'bg-blue-50 text-blue-700 border-blue-500 shadow-lg shadow-blue-500/10' : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'}`}>
                        <FileText className="w-4 h-4" /> General Lead
                    </button>
                  </div>

                  {enquiryCategory === 'General' ? (
                      <div className="space-y-4 mt-2 animate-in fade-in duration-500">
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Requirement Synthesis</label>
                          <textarea rows={8} className="w-full p-6 bg-gray-50 border border-gray-100 rounded-[2.5rem] text-sm font-bold text-gray-700 shadow-inner outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" placeholder="Draft specific requirements or meeting notes..." value={customerDetails.requirements} onChange={e => setCustomerDetails({...customerDetails, requirements: e.target.value})} />
                      </div>
                  ) : (
                      <div className="space-y-8 mt-2 border-t border-gray-50 pt-8 animate-in fade-in duration-500">
                          <div className="space-y-6">
                              <div className="space-y-3">
                                  <p className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.2em] ml-2">TAXI FLEET</p>
                                  <div className="flex gap-3">
                                      <button 
                                          onClick={() => setVehicleType('Sedan')} 
                                          className={`flex-1 py-4 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-2 ${vehicleType === 'Sedan' ? 'border-emerald-500 bg-emerald-50 shadow-lg text-emerald-700' : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200'}`}
                                      >
                                          <Car className="w-6 h-6" />
                                          <span className="text-[10px] font-black uppercase">Sedan</span>
                                      </button>
                                      <button 
                                          onClick={() => setVehicleType('SUV')} 
                                          className={`flex-1 py-4 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-2 ${vehicleType === 'SUV' ? 'border-emerald-500 bg-emerald-50 shadow-lg text-emerald-700' : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200'}`}
                                      >
                                          <Car className="w-6 h-6" />
                                          <span className="text-[10px] font-black uppercase">SUV</span>
                                      </button>
                                      <div className="flex-1"></div>
                                  </div>
                              </div>
                              <div className="space-y-3">
                                  <p className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em] ml-2">LOAD XPRESS</p>
                                  <div className="flex gap-3">
                                      <button 
                                          onClick={() => setVehicleType('3 Wheeler Auto')} 
                                          className={`flex-1 py-4 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-2 ${vehicleType === '3 Wheeler Auto' ? 'border-blue-500 bg-blue-50 shadow-lg text-blue-700' : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200'}`}
                                      >
                                          <Truck className="w-6 h-6" />
                                          <span className="text-[10px] font-black uppercase">Auto</span>
                                      </button>
                                      <button 
                                          onClick={() => setVehicleType('Tata Ace')} 
                                          className={`flex-1 py-4 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-2 ${vehicleType === 'Tata Ace' ? 'border-blue-500 bg-blue-50 shadow-lg text-blue-700' : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200'}`}
                                      >
                                          <Truck className="w-6 h-6" />
                                          <span className="text-[10px] font-black uppercase">Tata Ace</span>
                                      </button>
                                      <button 
                                          onClick={() => setVehicleType('Pickup')} 
                                          className={`flex-1 py-4 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-2 ${vehicleType === 'Pickup' ? 'border-blue-500 bg-blue-50 shadow-lg text-blue-700' : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200'}`}
                                      >
                                          <Truck className="w-6 h-6" />
                                          <span className="text-[10px] font-black uppercase">Pickup</span>
                                      </button>
                                  </div>
                              </div>
                          </div>

                          <div className="flex border-b border-gray-100">{['Local', 'Rental', 'Outstation'].map(t => (<button key={t} onClick={() => setTripType(t as any)} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.3em] border-b-4 transition-all ${tripType === t ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>{t}</button>))}</div>
                          
                          <div className="space-y-2">
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Pickup Origin</label>
                              {isMapReady ? (<Autocomplete placeholder="Search Google Maps for Pickup" onAddressSelect={(addr, coords) => { setCustomerDetails(prev => ({ ...prev, pickup: addr })); setPickupCoords(coords); }} setNewPlace={(place) => setPickupCoords(place)} defaultValue={customerDetails.pickup} />) : <div className="p-4 bg-gray-50 rounded-2xl border text-xs font-bold text-gray-400 animate-pulse">CONNECTING TO SAT...</div>}
                          </div>

                          {tripType === 'Local' && (
                              <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
                                  <div className="space-y-4">
                                      <div className="flex justify-between items-center mb-1">
                                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Target Destination(s)</label>
                                          <button onClick={handleAddDrop} className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-all flex items-center gap-2"><Plus className="w-3.5 h-3.5"/> Add Waypoint</button>
                                      </div>
                                      {transportDetails.drops.map((drop, idx) => (
                                          <div key={idx} className="flex items-start gap-3 group animate-in slide-in-from-left-2 duration-200">
                                              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px] mt-1.5 shrink-0 shadow-lg">{idx + 1}</div>
                                              <div className="flex-1">{isMapReady ? <Autocomplete placeholder={`Drop Destination ${idx + 1}`} onAddressSelect={(addr, coords) => handleDropChange(idx, addr, coords)} setNewPlace={(place) => handleDropChange(idx, drop.address, place)} defaultValue={drop.address} /> : <div className="p-3 bg-gray-50 border rounded-xl">...</div>}</div>
                                              {transportDetails.drops.length > 1 && <button onClick={() => handleRemoveDrop(idx)} className="p-3 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 className="w-4.5 h-4.5"/></button>}
                                          </div>
                                      ))}
                                  </div>
                                  <div className="grid grid-cols-2 gap-6">
                                      <div className="space-y-1.5"><label className="text-[10px] font-black text-gray-400 uppercase ml-2">Estimated Total Distance</label><div className="relative"><input type="number" className="p-4 bg-gray-50 border-none rounded-2xl w-full text-sm font-black shadow-inner outline-none focus:ring-2 focus:ring-emerald-500/20" value={transportDetails.estKm} onChange={e => setTransportDetails({...transportDetails, estKm: e.target.value})} /><span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-300 uppercase">KM</span></div></div>
                                      <div className="space-y-1.5"><label className="text-[10px] font-black text-gray-400 uppercase ml-2">Staging Wait Time</label><div className="relative"><input type="number" className="p-4 bg-gray-50 border-none rounded-2xl w-full text-sm font-black shadow-inner outline-none focus:ring-2 focus:ring-emerald-500/20" value={transportDetails.waitingMins} onChange={e => setTransportDetails({...transportDetails, waitingMins: e.target.value})} /><span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-300 uppercase">MINS</span></div></div>
                                  </div>
                              </div>
                          )}
                          
                          {tripType === 'Rental' && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in slide-in-from-left-4 duration-300">
                                  {rentalPackages.map(pkg => {
                                      let price = 0;
                                      if (vehicleType === 'Sedan') price = pkg.priceSedan;
                                      else if (vehicleType === 'SUV') price = pkg.priceSuv;
                                      else if (vehicleType === '3 Wheeler Auto') price = pkg.priceAuto;
                                      else if (vehicleType === 'Tata Ace') price = pkg.priceAce;
                                      else if (vehicleType === 'Pickup') price = pkg.pricePickup;

                                      return (
                                          <button key={pkg.id} onClick={() => setTransportDetails({...transportDetails, packageId: pkg.id})} className={`p-6 border-2 rounded-[2.5rem] text-left transition-all relative overflow-hidden group ${transportDetails.packageId === pkg.id ? 'border-emerald-500 bg-emerald-50 shadow-xl shadow-emerald-500/10' : 'border-gray-50 bg-gray-50/50 hover:bg-white hover:border-gray-200'}`}>
                                              <div className="relative z-10">
                                                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{pkg.name}</div>
                                                  <div className="text-2xl font-black text-gray-900 tracking-tighter">₹{price}</div>
                                              </div>
                                              <Package className={`absolute -right-4 -bottom-4 w-16 h-16 transition-all duration-500 ${transportDetails.packageId === pkg.id ? 'text-emerald-500/10 scale-110' : 'text-gray-100'}`} />
                                          </button>
                                      );
                                  })}
                              </div>
                          )}

                          {tripType === 'Outstation' && (
                              <div className="space-y-8 animate-in slide-in-from-left-4 duration-300">
                                  <div className="flex bg-gray-100 p-1.5 rounded-2xl border border-gray-200">
                                      <button onClick={() => setOutstationSubType('RoundTrip')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${outstationSubType === 'RoundTrip' ? 'bg-white shadow-md text-emerald-600' : 'text-gray-500'}`}>Round Trip</button>
                                      <button onClick={() => setOutstationSubType('OneWay')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${outstationSubType === 'OneWay' ? 'bg-white shadow-md text-emerald-600' : 'text-gray-500'}`}>One Way</button>
                                  </div>
                                  <div className="space-y-2">
                                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Destination City</label>
                                      {isMapReady ? <Autocomplete placeholder="Search Destination Hub" onAddressSelect={(addr, coords) => { setTransportDetails(prev => ({ ...prev, destination: addr })); setDestCoords(coords); }} setNewPlace={(place) => setDestCoords(place)} defaultValue={transportDetails.destination} /> : <div className="p-4 border rounded-2xl bg-gray-50 text-[10px] font-black text-gray-300 animate-pulse">HUB LOADING...</div>}
                                  </div>
                                  <div className="grid grid-cols-3 gap-4">
                                      <div className="space-y-1.5"><label className="text-[10px] font-black text-gray-400 uppercase ml-1">Days</label><input type="number" className="p-4 bg-gray-50 border-none rounded-2xl w-full text-sm font-black shadow-inner outline-none focus:ring-2 focus:ring-emerald-500/20" value={transportDetails.days} onChange={e => setTransportDetails({...transportDetails, days: e.target.value})} /></div>
                                      <div className="space-y-1.5"><label className="text-[10px] font-black text-gray-400 uppercase ml-1">Approx KM</label><input type="number" className="p-4 bg-gray-50 border-none rounded-2xl w-full text-sm font-black shadow-inner outline-none focus:ring-2 focus:ring-emerald-500/20" value={transportDetails.estTotalKm} onChange={e => setTransportDetails({...transportDetails, estTotalKm: e.target.value})} /></div>
                                      <div className="space-y-1.5"><label className="text-[10px] font-black text-gray-400 uppercase ml-1">Nights</label><input type="number" className="p-4 bg-gray-50 border-none rounded-2xl w-full text-sm font-black shadow-inner outline-none focus:ring-2 focus:ring-emerald-500/20" value={transportDetails.nights} onChange={e => setTransportDetails({...transportDetails, nights: e.target.value})} /></div>
                                  </div>
                                  <div onClick={() => setTransportDetails(prev => ({...prev, isHillsTrip: !prev.isHillsTrip}))} className={`flex items-center gap-5 p-6 border-2 rounded-[2.5rem] cursor-pointer transition-all ${transportDetails.isHillsTrip ? 'bg-indigo-50 border-indigo-500 shadow-xl shadow-indigo-500/10' : 'bg-gray-50/50 border-gray-100 hover:border-gray-200'}`}>
                                      <div className={`p-4 rounded-2xl transition-all ${transportDetails.isHillsTrip ? 'bg-indigo-500 text-white shadow-lg' : 'bg-white text-gray-300 border border-gray-100'}`}><Mountain className="w-6 h-6" /></div>
                                      <div className="flex-1">
                                          <p className={`text-sm font-black uppercase tracking-tight ${transportDetails.isHillsTrip ? 'text-indigo-800' : 'text-gray-800'}`}>Hill Station Drive</p>
                                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Apply Gradient Allowance</p>
                                      </div>
                                      <div className={`w-14 h-8 rounded-full transition-all relative ${transportDetails.isHillsTrip ? 'bg-indigo-500 shadow-inner' : 'bg-gray-200'}`}>
                                          <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${transportDetails.isHillsTrip ? 'translate-x-6' : ''}`} />
                                      </div>
                                  </div>
                              </div>
                          )}
                          
                          <div className="pt-4 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={() => saveOrder('Scheduled')} className="py-5 border-2 border-indigo-100 text-indigo-600 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 transform active:scale-95"><Calendar className="w-5 h-5" /> Schedule</button>
                                    <button onClick={handleBookNow} className="py-5 bg-emerald-600 text-white rounded-[2.5rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-emerald-700 transition-all shadow-2xl shadow-emerald-900/20 flex items-center justify-center gap-2 transform active:scale-95"><ArrowRight className="w-5 h-5" /> Accept Order</button>
                                </div>
                                <div className="flex justify-center">
                                    <button onClick={handleCancelForm} className="px-10 py-3 text-gray-400 hover:text-rose-500 rounded-full font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 transform active:scale-90 hover:bg-rose-50"><X className="w-4 h-4" /> Reset Application</button>
                                </div>
                          </div>
                      </div>
                  )}
              </div>
          </div>

          <div className="space-y-6 h-fit sticky top-24">
              <div className="bg-slate-900 text-white p-10 rounded-[4rem] shadow-2xl shadow-emerald-900/10 relative overflow-hidden group animate-in slide-in-from-right-8 duration-700">
                  <div className="relative z-10">
                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Financial Estimation Terminal</p>
                      <h3 className="text-8xl font-black tracking-tighter mb-10 leading-none">₹{estimatedCost.toLocaleString()}</h3>
                      
                      {enquiryCategory === 'Transport' && fareBreakup.length > 0 && (
                          <div className="space-y-5 border-t border-slate-800 pt-8 mb-10 animate-in fade-in slide-in-from-bottom-2">
                              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] flex items-center gap-3">
                                  <ListIcon className="w-4 h-4 text-emerald-500" /> Dispatch Matrix
                              </h4>
                              <div className="space-y-4">
                                  {fareBreakup.map((item, idx) => (
                                      <div key={idx} className="flex justify-between items-start group/item">
                                          <div>
                                              <p className={`text-sm font-black tracking-tight ${item.type === 'tax' ? 'text-blue-400' : item.type === 'allowance' ? 'text-indigo-300' : 'text-slate-100'}`}>{item.label}</p>
                                              {item.description && <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-0.5">{item.description}</p>}
                                          </div>
                                          <p className={`font-mono text-sm font-black ${item.type === 'tax' ? 'text-blue-400' : 'text-slate-100'}`}>₹{item.value.toLocaleString()}</p>
                                      </div>
                                  ))}
                                  <div className="h-px bg-slate-800 my-4"></div>
                                  <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl">
                                      <p className="text-xs font-black text-emerald-400 uppercase tracking-[0.2em]">Net Final Estimate</p>
                                      <p className="text-2xl font-black text-emerald-400 tracking-tighter">₹{estimatedCost.toLocaleString()}</p>
                                  </div>
                              </div>
                          </div>
                      )}

                      <div className="bg-amber-500/10 p-5 rounded-3xl border border-amber-500/20 flex items-start gap-4">
                          <AlertCircle className="w-6 h-6 shrink-0 text-amber-500" />
                          <p className="text-[10px] text-amber-200/80 font-bold italic leading-relaxed uppercase tracking-wider">
                              {enquiryCategory === 'Transport' ? "Base calculation generated. State taxes, tolls and parking are subject to actuals." : "Lead processing mode. Estimated monetary conversion pending strategy."}
                          </p>
                      </div>
                  </div>
                  <div className="absolute -right-16 -bottom-16 opacity-[0.04] transform rotate-12 group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-1000"><DollarSign className="w-96 h-96 text-white" /></div>
              </div>

              <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-2xl shadow-emerald-900/5">
                  <div className="flex justify-between items-center mb-8">
                      <h4 className="font-black text-gray-800 text-[10px] uppercase tracking-[0.3em] flex items-center gap-3"><MessageCircle className="w-5 h-5 text-emerald-500" /> Outreach Synthesis</h4>
                      <button onClick={() => {if(messageTextareaRef.current) { navigator.clipboard.writeText(generatedMessage); alert("Synthesis Copied!"); }}} className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 hover:bg-blue-100 transition-all"><Copy className="w-3.5 h-3.5 mr-2 inline" /> Copy</button>
                  </div>
                  <textarea ref={messageTextareaRef} className="w-full min-h-[250px] p-8 bg-gray-50 border border-gray-100 rounded-[2.5rem] text-sm font-bold text-gray-600 focus:outline-none resize-none mb-8 shadow-inner leading-relaxed" value={generatedMessage} readOnly />
                  <div className="grid grid-cols-2 gap-4"><button onClick={() => window.open(`https://wa.me/${customerDetails.phone.replace(/\D/g, '')}?text=${encodeURIComponent(generatedMessage)}`, '_blank')} className="bg-emerald-500 hover:bg-emerald-600 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-emerald-900/20 flex items-center justify-center gap-3 transform active:scale-95 transition-all"><MessageCircle className="w-5 h-5" /> WhatsApp</button><button className="bg-blue-500 hover:bg-blue-600 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-blue-900/20 flex items-center justify-center gap-3 transform active:scale-95 transition-all"><Mail className="w-5 h-5" /> Email</button></div>
              </div>
          </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-2xl shadow-indigo-900/5 overflow-hidden animate-in fade-in duration-700">
        <div className="p-8 md:p-12 border-b border-gray-50 flex flex-col md:flex-row justify-between items-center gap-8 bg-gray-50/30">
            <div className="flex items-center gap-8">
                <div className="flex items-center gap-4 bg-white p-3 rounded-[1.75rem] border border-gray-100 shadow-sm">
                    <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600"><Calendar className="w-6 h-6" /></div>
                    <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                        <button onClick={() => setFilterDateType('Month')} className={`px-5 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${filterDateType === 'Month' ? 'bg-white shadow text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>Month</button>
                        <button onClick={() => setFilterDateType('Date')} className={`px-5 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${filterDateType === 'Date' ? 'bg-white shadow text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>Date</button>
                    </div>
                    {filterDateType === 'Month' ? (
                        <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="bg-transparent border-none outline-none font-black text-gray-800 text-sm appearance-none cursor-pointer pr-4" />
                    ) : (
                        <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="bg-transparent border-none outline-none font-black text-gray-800 text-sm appearance-none cursor-pointer pr-4" />
                    )}
                </div>
            </div>
            <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
                <div className="relative flex-1 md:w-80 group"><Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-indigo-500 transition-colors" /><input type="text" placeholder="Search manifest..." value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-black shadow-sm outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" /></div>
                <div className="relative"><select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="pl-6 pr-12 py-4 bg-white border border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-sm appearance-none cursor-pointer min-w-[180px]"><option value="All">All Status</option><option>New</option><option>Scheduled</option><option>Booked</option><option>Order Accepted</option><option>Completed</option><option>Cancelled</option></select><ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" /></div>
                <button onClick={resetFilters} className="p-4 bg-white border border-gray-200 text-gray-400 hover:text-rose-500 rounded-[1.5rem] transition-all shadow-sm transform active:scale-90 hover:shadow-lg"><RefreshCcw className="w-5 h-5" /></button>
            </div>
        </div>
        <div className="overflow-x-auto min-h-[450px] custom-scrollbar">
            <table className="w-full text-left">
                <thead className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] border-b border-gray-50 bg-white sticky top-0 z-10">
                    <tr><th className="px-12 py-10">Client Identity</th><th className="px-12 py-10">Dispatch Routing</th><th className="px-12 py-10">Personnel Assigned</th><th className="px-12 py-10 text-center">Status</th><th className="px-12 py-10 text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {filteredOrders.map((order, i) => {
                        const assigned = getAssignedStaff(order.assignedTo);
                        return (
                        <tr key={i} className="hover:bg-gray-50/80 transition-all group animate-in slide-in-from-bottom-2 duration-300">
                            <td className="px-12 py-10"><div className="flex items-center gap-6"><div className="w-14 h-14 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xl border border-indigo-100 shadow-inner">{order.name.charAt(0)}</div><div><p className="font-black text-gray-900 text-lg tracking-tighter leading-none mb-2">{order.name}</p><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2 font-mono"><Phone className="w-3 h-3" /> {order.phone}</p></div></div></td>
                            <td className="px-12 py-10"><div className="max-w-xs space-y-2"><p className="text-sm text-gray-600 font-black line-clamp-1 truncate leading-tight uppercase tracking-tight" title={order.details}>{order.details}</p><div className="flex gap-2 flex-wrap">{order.enquiryCategory === 'Transport' && <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-[9px] font-black border border-emerald-100 tracking-tighter uppercase">Dispatched</span>}{(order as any).priority === 'Hot' && <span className="bg-rose-50 text-rose-700 px-3 py-1 rounded-lg text-[9px] font-black border border-rose-100 tracking-tighter uppercase">High Priority</span>}</div></div></td>
                            <td className="px-12 py-10">{assigned ? (<div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-100 w-fit pr-4 shadow-sm"><img src={assigned.avatar} className="w-8 h-8 rounded-xl border-2 border-white shadow-sm" alt="" /><div className="text-[10px] font-black text-gray-700 uppercase tracking-widest">{assigned.name}</div></div>) : <span className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] italic border-b border-gray-100 pb-1">Operational Pending</span>}</td>
                            <td className="px-12 py-10 text-center"><span className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm ${order.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : order.status === 'Cancelled' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>{order.status}</span></td>
                            <td className="px-12 py-10 text-right"><div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => handleEditOrder(order)} className="p-3 bg-white border border-gray-100 text-gray-400 hover:text-indigo-600 rounded-2xl shadow-xl transition-all hover:scale-110 active:scale-95"><Edit2 className="w-5 h-5"/></button><button onClick={() => { if(window.confirm('Delete Permanent?')) setEnquiries(enquiries.filter(e => e.id !== order.id)) }} className="p-3 bg-white border border-gray-100 text-gray-400 hover:text-rose-500 rounded-2xl shadow-xl transition-all hover:scale-110 active:scale-95"><Trash2 className="w-5 h-5"/></button></div></td>
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
