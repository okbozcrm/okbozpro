
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Settings, Loader2, ArrowRight, ArrowRightLeft, 
  MessageCircle, Copy, Mail, Car, User, Edit2,
  CheckCircle, Building2, Save, X, Phone, Truck, DollarSign,
  Calendar, MapPin, Plus, Trash2, Headset,
  Clock, CheckCircle as CheckCircleIcon, Filter, Search, ChevronDown, UserCheck, XCircle, AlertCircle, History, PhoneOutgoing, PhoneIncoming, CalendarCheck, BookOpen, FileText, RefreshCcw
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

const getInitialEnquiries = (): Enquiry[] => {
  const saved = localStorage.getItem('global_enquiries_data');
  return saved ? JSON.parse(saved) : [];
};

interface CustomerCareProps {
  role: UserRole;
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
    drop: '', estKm: '', waitingMins: '', packageId: '',
    destination: '', days: '1', estTotalKm: '', nights: '0'
  });

  const [customerDetails, setCustomerDetails] = useState({
    name: '', phone: '', email: '', pickup: '', requirements: ''
  });

  // Map State
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [pickupCoords, setPickupCoords] = useState<google.maps.LatLngLiteral | null>(null);
  const [dropCoords, setDropCoords] = useState<google.maps.LatLngLiteral | null>(null);
  const [destCoords, setDestCoords] = useState<google.maps.LatLngLiteral | null>(null);

  const [rentalPackages, setRentalPackages] = useState<RentalPackage[]>(() => {
    const saved = localStorage.getItem('transport_rental_packages_v2');
    return saved ? JSON.parse(saved) : DEFAULT_RENTAL_PACKAGES;
  });

  const [pricing, setPricing] = useState<Record<VehicleType, PricingRules>>(() => {
    const saved = localStorage.getItem('transport_pricing_rules_v2');
    return saved ? JSON.parse(saved) : { Sedan: DEFAULT_PRICING_SEDAN, SUV: DEFAULT_PRICING_SUV };
  });

  // Package Management State
  const [showAddPackage, setShowAddPackage] = useState(false);
  const [newPackage, setNewPackage] = useState({ name: '', hours: '', km: '', priceSedan: '', priceSuv: '' });
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);

  const [generatedMessage, setGeneratedMessage] = useState('');
  const [estimatedCost, setEstimatedCost] = useState(0);

  const messageTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [corporates, setCorporates] = useState<any[]>([]);
  const [allBranches, setAllBranches] = useState<any[]>([]);
  const [allStaff, setAllStaff] = useState<any[]>([]);
  
  const [assignment, setAssignment] = useState({
    corporateId: '',
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

  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

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
      if (savedVendors) {
        setVendorsData(JSON.parse(savedVendors));
      }
    } catch (e) {
      console.error("Failed to load vendor data for phone check", e);
    }
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
      
      // Default assignment based on login
      setAssignment(prev => ({ 
          ...prev, 
          corporateId: isSuperAdmin ? 'admin' : sessionId,
          branchName: '', 
          staffId: ''
      }));
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

  const dashboardFilterBranches = useMemo(() => {
      if (isSuperAdmin) {
          if (filterCorporate === 'All') return allBranches;
          if (filterCorporate === 'admin') return allBranches.filter(b => b.owner === 'admin');
          return allBranches.filter(b => b.owner === filterCorporate);
      } else {
          return allBranches.filter(b => b.owner === sessionId);
      }
  }, [allBranches, filterCorporate, isSuperAdmin, sessionId]);

  useEffect(() => {
    if (window.gm_authFailure_detected) {
      setMapError("Map API Error: Check required APIs (Maps JS, Places).");
      return;
    }
    const apiKey = HARDCODED_MAPS_API_KEY || localStorage.getItem('maps_api_key');
    if (!apiKey) {
      setMapError("API Key is missing. Please add it in Settings > Integrations.");
      return;
    }
    const originalAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      window.gm_authFailure_detected = true;
      setMapError("Map Load Error: API Key invalid or APIs not enabled.");
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
              setTimeout(() => setMapError("Google Maps 'places' library failed to load."), 0);
            }
        };
        script.onerror = () => setTimeout(() => setMapError("Network error: Failed to load Google Maps script."), 0);
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

  useEffect(() => {
    if (!isMapReady || !window.google || !window.google.maps.DistanceMatrixService || !pickupCoords) return;

    const service = new window.google.maps.DistanceMatrixService();
    let destination: google.maps.LatLngLiteral | null = null;
    let isRoundTrip = false;
    let isOutstation = false;

    if (tripType === 'Local' && dropCoords) {
        destination = dropCoords;
    } else if (tripType === 'Outstation' && destCoords) {
        destination = destCoords;
        isRoundTrip = outstationSubType === 'RoundTrip';
        isOutstation = true;
    }

    if (destination) {
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
                    if (isRoundTrip) distanceInKm = distanceInKm * 2; 
                    const formattedDist = distanceInKm.toFixed(1);
                    setTransportDetails(prev => ({ 
                        ...prev, 
                        [isOutstation ? 'estTotalKm' : 'estKm']: formattedDist 
                    }));
                }
            }
        );
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

  const handleAddPackage = () => {
    if (!newPackage.name || !newPackage.priceSedan) {
        setTimeout(() => alert("Please fill in package name and Sedan price."), 0);
        return;
    }
    if (editingPackageId) {
        const updatedPackages = rentalPackages.map(pkg => 
            pkg.id === editingPackageId ? {
                ...pkg,
                name: newPackage.name,
                hours: parseFloat(newPackage.hours) || 0,
                km: parseFloat(newPackage.km) || 0,
                priceSedan: parseFloat(newPackage.priceSedan) || 0,
                priceSuv: parseFloat(newPackage.priceSuv) || 0,
            } : pkg
        );
        setRentalPackages(updatedPackages);
        setEditingPackageId(null);
    } else {
        const pkg: RentalPackage = {
            id: `pkg-${Date.now()}`,
            name: newPackage.name,
            hours: parseFloat(newPackage.hours) || 0,
            km: parseFloat(newPackage.km) || 0,
            priceSedan: parseFloat(newPackage.priceSedan) || 0,
            priceSuv: parseFloat(newPackage.priceSuv) || 0,
        };
        setRentalPackages([...rentalPackages, pkg]);
    }
    setShowAddPackage(false);
    setNewPackage({ name: '', hours: '', km: '', priceSedan: '', priceSuv: '' });
  };

  const handleEditPackage = (pkg: RentalPackage) => {
    setEditingPackageId(pkg.id);
    setNewPackage({
        name: pkg.name,
        hours: pkg.hours.toString(),
        km: pkg.km.toString(),
        priceSedan: pkg.priceSedan.toString(),
        priceSuv: pkg.priceSuv.toString(),
    });
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
    }
  };

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
      let msg = '';
      if (enquiryCategory === 'General') {
          msg = `Hello ${customerDetails.name || 'Sir/Madam'},\nThank you for contacting OK BOZ. \n\nRegarding your enquiry:\n"${customerDetails.requirements || 'General Requirement'}"\n\nWe have received your request and our team will get back to you shortly.\n\nRegards,\nOK BOZ Team`;
      } else {
          const pkg = rentalPackages.find(p => p.id === transportDetails.packageId);
          msg = `Hello ${customerDetails.name || 'Customer'},\nHere is your ${tripType} estimate from OK BOZ! 🚕\n\n🚘 Vehicle: ${vehicleType}\n📍 Pickup: ${customerDetails.pickup || 'TBD'}\n${tripType === 'Local' ? `📍 Drop: ${transportDetails.drop}` : ''}${tripType === 'Outstation' ? `🌍 Destination: ${transportDetails.destination}` : ''}\n📝 Details: ${details}\n💰 *Base Fare: ₹${total.toFixed(0)}*\n\nBook now with OK BOZ!`;
      }
      setGeneratedMessage(msg);
  }, [estimatedCost, customerDetails, transportDetails, tripType, vehicleType, pricing, rentalPackages, enquiryCategory, outstationSubType]);

  useEffect(() => {
    if (messageTextareaRef.current) {
      messageTextareaRef.current.style.height = 'auto';
      messageTextareaRef.current.style.height = messageTextareaRef.current.scrollHeight + 'px';
    }
  }, [generatedMessage]);


  const saveOrder = async (status: OrderStatus, scheduleInfo?: { date: string, time: string, priority?: 'Hot' | 'Warm' | 'Cold' }) => {
      if (!customerDetails.name || !customerDetails.phone) {
          alert("Please enter Customer Name and Phone.");
          return;
      }
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
          detailsText = customerDetails.requirements;
      }
      if (!detailsText.trim()) {
        alert("Please enter requirements/details for the enquiry.");
        return;
      }
      const historyLog: HistoryLog = {
          id: Date.now(),
          type: 'Note',
          message: `Order Created as ${status}. ${estimatedCost > 0 ? `Est: ₹${estimatedCost}` : ''}`,
          date: new Date().toLocaleString(),
          outcome: 'Completed'
      };
      let finalAssignedCorporateId = assignment.corporateId;
      if (!isSuperAdmin) {
          finalAssignedCorporateId = sessionId;
      } else if (!finalAssignedCorporateId) {
          finalAssignedCorporateId = 'admin';
      }
      let updatedEnquiry: Enquiry;
      let newEnquiriesList = [...enquiries];
      if (editingOrderId) {
        updatedEnquiry = {
          ...enquiries.find(e => e.id === editingOrderId)!,
          name: customerDetails.name,
          phone: customerDetails.phone,
          email: customerDetails.email || '',
          details: detailsText,
          status: status,
          assignedTo: assignment.staffId,
          assignedCorporate: finalAssignedCorporateId, 
          assignedBranch: assignment.branchName,       
          history: [historyLog, ...(enquiries.find(e => e.id === editingOrderId)?.history || [])],
          date: scheduleInfo ? scheduleInfo.date : new Date().toISOString().split('T')[0],
          nextFollowUp: scheduleInfo ? `${scheduleData.date}T${scheduleData.time}` : undefined,
          priority: scheduleInfo?.priority, 
          enquiryCategory: enquiryCategory,
          tripType: tripType,
          vehicleType: vehicleType,
          transportData: enquiryCategory === 'Transport' ? transportDetails : undefined,
          estimatedPrice: enquiryCategory === 'Transport' ? estimatedCost : undefined,
        };
        newEnquiriesList = newEnquiriesList.map(e => e.id === editingOrderId ? updatedEnquiry : e);
        setEditingOrderId(null);
      } else {
        updatedEnquiry = {
          id: `ORD-${Date.now()}`,
          type: 'Customer',
          initialInteraction: 'Incoming',
          name: customerDetails.name,
          phone: customerDetails.phone,
          email: customerDetails.email,
          city: 'Coimbatore',
          details: detailsText,
          status: status,
          assignedTo: assignment.staffId,
          assignedCorporate: finalAssignedCorporateId,
          assignedBranch: assignment.branchName,       
          createdAt: new Date().toLocaleString(),
          history: [historyLog],
          date: scheduleInfo ? scheduleInfo.date : new Date().toISOString().split('T')[0],
          nextFollowUp: scheduleInfo ? `${scheduleData.date}T${scheduleData.time}` : undefined,
          priority: scheduleInfo?.priority, 
          enquiryCategory: enquiryCategory,
          tripType: tripType,
          vehicleType: vehicleType,
          transportData: enquiryCategory === 'Transport' ? transportDetails : undefined,
          estimatedPrice: enquiryCategory === 'Transport' ? estimatedCost : undefined,
        };
        newEnquiriesList = [updatedEnquiry, ...newEnquiriesList];
        sendSystemNotification({
            type: 'new_enquiry',
            title: `New Customer Enquiry: ${updatedEnquiry.name}`,
            message: `A new enquiry (ID: ${updatedEnquiry.id}) has been created.`,
            targetRoles: [UserRole.ADMIN, UserRole.CORPORATE],
            corporateId: finalAssignedCorporateId === 'admin' ? undefined : finalAssignedCorporateId,
            link: `/admin/customer-care`
        });
      }
      setEnquiries(newEnquiriesList);
      localStorage.setItem('global_enquiries_data', JSON.stringify(newEnquiriesList));
      handleCancelForm();
  };

  const handleBookNow = () => saveOrder('Order Accepted');
  const handleOpenSchedule = () => setIsScheduleModalOpen(true);
  const confirmSchedule = () => saveOrder('Scheduled', { ...scheduleData, priority: generalFollowUpPriority });
  const handleSaveGeneralFollowUp = () => saveOrder('Scheduled', { date: generalFollowUpDate, time: generalFollowUpTime, priority: generalFollowUpPriority });

  const handleCancelForm = () => {
      setCustomerDetails({ name: '', phone: '', email: '', pickup: '', requirements: '' });
      setTransportDetails({ drop: '', estKm: '', waitingMins: '', packageId: '', destination: '', days: '1', estTotalKm: '', nights: '0' });
      setGeneratedMessage('');
      setEstimatedCost(0);
      setEditingOrderId(null);
      setIsPhoneChecked(false);
  };

  const handleStatusUpdate = (id: string, newStatus: OrderStatus) => {
      const updatedList = enquiries.map(e => e.id === id ? { ...e, status: newStatus } : e);
      setEnquiries(updatedList);
      localStorage.setItem('global_enquiries_data', JSON.stringify(updatedList));
  };

  const handleEditOrder = (order: Enquiry) => {
    setEditingOrderId(order.id);
    setCustomerDetails({
      name: order.name,
      phone: order.phone,
      email: order.email || '',
      pickup: '',
      requirements: order.details
    });
    setEnquiryCategory(order.enquiryCategory || 'General');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePhoneInputCheck = () => {
    setIsPhoneChecked(true);
  };

  const getAssignedStaff = (id?: string) => allStaff.find(e => e.id === id);

  // --- Filtering & Stats Logic ---
  const filteredOrders = useMemo(() => {
    return enquiries.filter(order => {
      const matchesSearch = 
        order.id.toLowerCase().includes(filterSearch.toLowerCase()) ||
        order.name.toLowerCase().includes(filterSearch.toLowerCase()) ||
        order.phone.includes(filterSearch);
      
      const matchesStatus = filterStatus === 'All' || order.status === filterStatus;
      
      let matchesCorporate = true;
      if (isSuperAdmin) {
        matchesCorporate = filterCorporate === 'All' || order.assignedCorporate === filterCorporate || (filterCorporate === 'admin' && (order.assignedCorporate === 'admin' || !order.assignedCorporate));
      } else {
        matchesCorporate = order.assignedCorporate === sessionId;
      }

      const matchesBranch = filterBranch === 'All' || order.assignedBranch === filterBranch;

      let matchesDate = true;
      const orderDate = order.date || order.createdAt.split(',')[0];
      if (filterDateType === 'Date') {
        matchesDate = orderDate === filterDate;
      } else if (filterDateType === 'Month') {
        matchesDate = orderDate.startsWith(filterMonth);
      }

      return matchesSearch && matchesStatus && matchesCorporate && matchesBranch && matchesDate;
    });
  }, [enquiries, filterSearch, filterStatus, filterCorporate, filterBranch, filterDateType, filterDate, filterMonth, isSuperAdmin, sessionId]);

  const dashboardStats = useMemo(() => {
    const relevantEnquiries = enquiries.filter(order => {
       if (isSuperAdmin) return true;
       return order.assignedCorporate === sessionId;
    });

    const today = new Date().toISOString().split('T')[0];

    return {
      total: relevantEnquiries.length,
      accepted: relevantEnquiries.filter(e => e.status === 'Order Accepted').length,
      assigned: relevantEnquiries.filter(e => e.status === 'Driver Assigned').length,
      completed: relevantEnquiries.filter(e => e.status === 'Completed').length,
      scheduled: relevantEnquiries.filter(e => e.status === 'Scheduled').length,
      todaysFollowUps: relevantEnquiries.filter(e => (e.date || e.createdAt.split(',')[0]) === today).length
    };
  }, [enquiries, isSuperAdmin, sessionId]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
             <Headset className="w-8 h-8 text-emerald-600" /> Customer Care (Bookings)
          </h2>
          <p className="text-gray-500">Create bookings and manage order lifecycle</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div onClick={() => setFilterStatus('All')} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm cursor-pointer hover:shadow-md">
              <p className="text-xs font-bold text-gray-500 uppercase">Total Orders</p>
              <h3 className="text-2xl font-bold text-gray-800">{dashboardStats.total}</h3>
          </div>
          <div onClick={() => setFilterStatus('Order Accepted')} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm cursor-pointer hover:shadow-md">
              <p className="text-xs font-bold text-gray-500 uppercase">Accepted</p>
              <h3 className="text-2xl font-bold text-emerald-600">{dashboardStats.accepted}</h3>
          </div>
          <div onClick={() => setFilterStatus('Driver Assigned')} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm cursor-pointer hover:shadow-md">
              <p className="text-xs font-bold text-gray-500 uppercase">Driver Assigned</p>
              <h3 className="text-2xl font-bold text-blue-600">{dashboardStats.assigned}</h3>
          </div>
          <div onClick={() => setFilterStatus('Completed')} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm cursor-pointer hover:shadow-md">
              <p className="text-xs font-bold text-gray-500 uppercase">Completed</p>
              <h3 className="text-2xl font-bold text-purple-600">{dashboardStats.completed}</h3>
          </div>
          <div onClick={() => setFilterStatus('Scheduled')} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm cursor-pointer hover:shadow-md">
              <p className="text-xs font-bold text-gray-500 uppercase">Scheduled</p>
              <h3 className="text-2xl font-bold text-orange-600">{dashboardStats.scheduled}</h3>
          </div>
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200 shadow-sm">
              <p className="text-xs font-bold text-indigo-600 uppercase">Today's Leads</p>
              <h3 className="text-2xl font-bold text-indigo-700">{dashboardStats.todaysFollowUps}</h3>
          </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="relative flex-1 w-full md:max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input placeholder="Search Orders, Customers, Phone..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} />
              </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center pt-2 border-t border-gray-100">
              <Filter className="w-4 h-4 text-gray-400 mr-1" />
              <select className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white outline-none" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="All">All Status</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Order Accepted">Order Accepted</option>
                  <option value="Driver Assigned">Driver Assigned</option>
                  <option value="Completed">Completed</option>
              </select>
          </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                      <tr>
                          <th className="px-6 py-4">Order ID</th>
                          <th className="px-6 py-4">Date</th>
                          <th className="px-6 py-4">Customer</th>
                          <th className="px-6 py-4">Assign To</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {filteredOrders.length > 0 ? filteredOrders.map((order) => {
                          const assignedStaff = getAssignedStaff(order.assignedTo);
                          return (
                          <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 font-bold text-gray-900">{order.id}</td>
                              <td className="px-6 py-4 text-gray-600">{order.date || order.createdAt.split(',')[0]}</td>
                              <td className="px-6 py-4">
                                  <div className="font-medium text-gray-900">{order.name}</div>
                                  <div className="text-xs text-gray-500">{order.phone}</div>
                              </td>
                              <td className="px-6 py-4 text-gray-600">
                                  {assignedStaff ? <span>{assignedStaff.name}</span> : 'Unassigned'}
                              </td>
                              <td className="px-6 py-4">
                                  <span className={`px-2 py-1 rounded-full text-xs font-bold border ${
                                      order.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' :
                                      'bg-gray-50 text-gray-700 border-gray-200'
                                  }`}>
                                      {order.status}
                                  </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                  <button onClick={() => handleEditOrder(order)} className="text-gray-400 hover:text-blue-500 p-1.5 rounded-full"><Edit2 className="w-4 h-4" /></button>
                              </td>
                          </tr>
                      )}) : (
                          <tr>
                              <td colSpan={6} className="text-center py-10 text-gray-500">
                                  No orders found matching your filters.
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
};
