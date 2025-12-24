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
  
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

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

  // Filter Logic for Dashboard
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

  // --- AUTOMATIC DISTANCE CALCULATION ---
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
        alert("Please fill in package name and Sedan price.");
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
        alert("Package updated successfully!");
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
        alert("Package added successfully!");
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
      if (transportDetails.packageId === id) {
        setTransportDetails(prev => ({ ...prev, packageId: '' }));
      }
      if (editingPackageId === id) {
        setEditingPackageId(null);
        setNewPackage({ name: '', hours: '', km: '', priceSedan: '', priceSuv: '' });
      }
      alert("Package removed.");
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
          msg = `Hello ${customerDetails.name || 'Sir/Madam'},
Thank you for contacting OK BOZ. 

Regarding your enquiry:
"${customerDetails.requirements || 'General Requirement'}"

We have received your request and our team will get back to you shortly with more details.

For immediate assistance, feel free to call us.

Regards,
OK BOZ Support Team`;
      } else {
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
          type: 'Customer',
          initialInteraction: 'Incoming',
          name: customerDetails.name,
          phone: customerDetails.phone,
          email: customerDetails.email || '',
          city: 'Coimbatore', 
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
          outstationSubType: tripType === 'Outstation' ? outstationSubType : undefined,
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
          outstationSubType: tripType === 'Outstation' ? outstationSubType : undefined,
          transportData: enquiryCategory === 'Transport' ? transportDetails : undefined,
          estimatedPrice: enquiryCategory === 'Transport' ? estimatedCost : undefined,
        };
        newEnquiriesList = [updatedEnquiry, ...newEnquiriesList];

        sendSystemNotification({
            type: 'new_enquiry',
            title: `New Customer Enquiry: ${updatedEnquiry.name}`,
            message: `A new enquiry (ID: ${updatedEnquiry.id}) has been created with status: ${updatedEnquiry.status}.`,
            targetRoles: [UserRole.ADMIN, UserRole.CORPORATE],
            corporateId: finalAssignedCorporateId === 'admin' ? undefined : finalAssignedCorporateId,
            link: `/admin/customer-care`
        });

        if (assignment.staffId && assignment.staffId !== sessionId) {
            sendSystemNotification({
                type: 'task_assigned',
                title: `New Enquiry Assigned: ${updatedEnquiry.id}`,
                message: `You have been assigned a new customer enquiry for ${updatedEnquiry.name}.`,
                targetRoles: [UserRole.EMPLOYEE],
                employeeId: assignment.staffId, 
                link: `/user/customer-care`
            });
        }
      }

      setEnquiries(newEnquiriesList);
      localStorage.setItem('global_enquiries_data', JSON.stringify(newEnquiriesList));

      alert(`${enquiryCategory === 'Transport' ? 'Order' : 'Enquiry'} ${status} Successfully!`);
      
      setCustomerDetails({ name: '', phone: '', email: '', pickup: '', requirements: '' });
      setTransportDetails({ drop: '', estKm: '', waitingMins: '', packageId: '', destination: '', days: '1', estTotalKm: '', nights: '0' });
      setGeneratedMessage('');
      setEstimatedCost(0);
      setIsScheduleModalOpen(false);
      setIsPhoneChecked(false);
      setPhoneLookupResult(null);
      setExistingEnquiriesForPhone([]);
      setGeneralFollowUpDate(new Date().toISOString().split('T')[0]);
      setGeneralFollowUpTime('10:00');
      setGeneralFollowUpPriority('Warm');
  };

  const handleBookNow = () => {
      if (!customerDetails.name || !customerDetails.phone) {
          alert("Please enter Customer Name and Phone.");
          return;
      }
      saveOrder('Order Accepted');
  };

  const handleOpenSchedule = () => {
      if (!customerDetails.name || !customerDetails.phone) {
          alert("Please enter Customer Name and Phone.");
          return;
      }
      setIsScheduleModalOpen(true);
  };

  const confirmSchedule = () => {
      if (!scheduleData.date || !scheduleData.time) {
          alert("Please select both Date and Time.");
          return;
      }
      saveOrder('Scheduled', { ...scheduleData, priority: generalFollowUpPriority });
  };

  const handleSaveGeneralFollowUp = () => {
    if (!customerDetails.name || !customerDetails.phone) {
        alert("Please enter Customer Name and Phone.");
        return;
    }
    saveOrder('Scheduled', { 
      date: generalFollowUpDate, 
      time: generalFollowUpTime, 
      priority: generalFollowUpPriority 
    });
  };

  const handleCancelForm = () => {
      setCustomerDetails({ name: '', phone: '', email: '', pickup: '', requirements: '' });
      setTransportDetails({ drop: '', estKm: '', waitingMins: '', packageId: '', destination: '', days: '1', estTotalKm: '', nights: '0' });
      setGeneratedMessage('');
      setEstimatedCost(0);
      setEditingOrderId(null);
      setIsPhoneChecked(false);
      setPhoneLookupResult(null);
      setExistingEnquiriesForPhone([]);
      setGeneralFollowUpDate(new Date().toISOString().split('T')[0]);
      setGeneralFollowUpTime('10:00');
      setGeneralFollowUpPriority('Warm');

      alert("Form cleared.");
  };

  const handleStatusUpdate = async (id: string, newStatus: OrderStatus) => {
    try {
      let updatedEnquiryItem: Enquiry | undefined;

      const updatedList = enquiries.map(e => {
          if (e.id === id) {
              const historyLog: HistoryLog = {
                  id: Date.now(),
                  type: 'Note',
                  message: `Status changed to ${newStatus}`,
                  date: new Date().toLocaleString(),
                  outcome: 'Completed'
              };
              updatedEnquiryItem = { ...e, status: newStatus, history: [historyLog, ...e.history] };
              return updatedEnquiryItem;
          }
          return e;
      });
      
      setEnquiries(updatedList);
      localStorage.setItem('global_enquiries_data', JSON.stringify(updatedList));

      if (updatedEnquiryItem) {
          sendSystemNotification({
              type: 'system',
              title: `Order Status Update: ${updatedEnquiryItem.id}`,
              message: `The status of order ${updatedEnquiryItem.id} for ${updatedEnquiryItem.name} has been updated to ${newStatus}.`,
              targetRoles: [UserRole.ADMIN, UserRole.CORPORATE],
              corporateId: updatedEnquiryItem.assignedCorporate || (updatedEnquiryItem.assignedTo ? (allStaff.find(s => s.id === updatedEnquiryItem.assignedTo)?.owner || undefined) : undefined),
              link: `/admin/customer-care`
          });
      }

    } catch (error) {
      console.error("Error in handleStatusUpdate:", error);
    }
  };

  const handleEditOrder = (order: Enquiry) => {
    try {
      setEditingOrderId(order.id);

      setCustomerDetails({
        name: order.name,
        phone: order.phone,
        email: order.email || '',
        pickup: (order.details.match(/Pickup:\s*(.*?)(?=(?:\s*->|\s*\.|\s*$))/i)?.[1] || '').trim(),
        requirements: order.enquiryCategory === 'General' ? order.details : (order.details.includes('\nReq: ') ? order.details.split('\nReq: ')[1] : '')
      });

      setEnquiryCategory(order.enquiryCategory || 'General');

      if (order.enquiryCategory === 'Transport' && order.transportData) {
        setTripType(order.tripType || 'Local');
        setVehicleType(order.vehicleType || 'Sedan');
        setOutstationSubType(order.outstationSubType || 'RoundTrip');
        setTransportDetails({
          drop: order.transportData.drop || '',
          estKm: order.transportData.estKm || '',
          waitingMins: order.transportData.waitingMins || '',
          packageId: order.transportData.packageId || '',
          destination: order.transportData.destination || '',
          days: order.transportData.days || '1',
          estTotalKm: order.transportData.estTotalKm || '',
          nights: order.transportData.nights || '0',
        });
        setEstimatedCost(order.estimatedPrice || 0);
      }

      setAssignment({
          corporateId: order.assignedCorporate || (isSuperAdmin ? 'admin' : sessionId),
          branchName: order.assignedBranch || '',
          staffId: order.assignedTo || ''
      });

      if (order.nextFollowUp) {
          const dt = new Date(order.nextFollowUp);
          setGeneralFollowUpDate(dt.toISOString().split('T')[0]);
          setGeneralFollowUpTime(dt.toTimeString().slice(0, 5));
          setGeneralFollowUpPriority(order.priority || 'Warm');
          setScheduleData({ 
            date: dt.toISOString().split('T')[0], 
            time: dt.toTimeString().slice(0, 5) 
          });
      }

      const cleanNumber = order.phone.replace(/\D/g, '');
      const previousEnquiries = enquiries.filter(e => e.phone.replace(/\D/g, '') === cleanNumber && e.id !== order.id);
      setExistingEnquiriesForPhone(previousEnquiries);
      setPhoneLookupResult(previousEnquiries.length > 0 ? 'Existing' : 'New');
      setIsPhoneChecked(true);

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error("Error in handleEditOrder:", error);
    }
  };

  const dashboardStats = useMemo(() => {
      const relevantEnquiries = enquiries.filter(e => {
          if (isSuperAdmin) return true;
          const isAssignedToCorp = e.assignedCorporate === sessionId;
          const isAssignedToCorpStaff = e.assignedTo && allStaff.find(s => s.id === e.assignedTo)?.owner === sessionId;
          return isAssignedToCorp || isAssignedToCorpStaff;
      });

      const total = relevantEnquiries.length;
      const accepted = relevantEnquiries.filter(e => e.status === 'Order Accepted' || e.status === 'Booked').length;
      const assigned = relevantEnquiries.filter(e => e.status === 'Driver Assigned').length;
      const completed = relevantEnquiries.filter(e => e.status === 'Completed').length;
      const cancelled = relevantEnquiries.filter(e => e.status === 'Cancelled').length;
      const scheduled = relevantEnquiries.filter(e => e.status === 'Scheduled').length;
      const todaysFollowUps = relevantEnquiries.filter(e => e.nextFollowUp && e.nextFollowUp.startsWith(new Date().toISOString().split('T')[0])).length;
      
      return { total, accepted, assigned, completed, cancelled, scheduled, todaysFollowUps };
  }, [enquiries, isSuperAdmin, sessionId, allStaff]);

  const filteredOrders = useMemo(() => {
      return enquiries.filter(e => {
          const matchesSearch = e.name.toLowerCase().includes(filterSearch.toLowerCase()) || 
                                e.phone.includes(filterSearch) || 
                                e.id.toLowerCase().includes(filterSearch.toLowerCase()) ||
                                e.details.toLowerCase().includes(filterSearch.toLowerCase());
          
          const matchesStatus = filterStatus === 'All' || e.status === filterStatus;
          
          let matchesDate = true;
          if (filterDateType === 'Date') {
              matchesDate = (e.date === filterDate || e.createdAt.startsWith(filterDate));
          } else if (filterDateType === 'Month') {
              matchesDate = (e.date?.startsWith(filterMonth) || e.createdAt.startsWith(filterMonth));
          }

          let recordCorporateId = e.assignedCorporate;
          if (!recordCorporateId && e.assignedTo) {
              const staff = allStaff.find(s => s.id === e.assignedTo);
              if (staff) recordCorporateId = staff.owner;
          }
          if (!recordCorporateId) recordCorporateId = 'admin';

          if (!isSuperAdmin && recordCorporateId !== sessionId) {
              return false;
          }

          let matchesCorporate = true;
          if (isSuperAdmin && filterCorporate !== 'All') {
              if (filterCorporate === 'admin') matchesCorporate = recordCorporateId === 'admin';
              else matchesCorporate = recordCorporateId === filterCorporate;
          }

          let matchesBranch = true;
          if (filterBranch !== 'All') {
              matchesBranch = e.assignedBranch === filterBranch;
          }

          return matchesSearch && matchesStatus && matchesDate && matchesCorporate && matchesBranch;
      });
  }, [enquiries, filterSearch, filterStatus, filterDate, filterDateType, filterMonth, filterCorporate, filterBranch, allStaff, isSuperAdmin, sessionId]);

  const isEmployee = role === UserRole.EMPLOYEE;

  const handlePhoneInputCheck = () => {
    const cleanNumber = customerDetails.phone.replace(/\D/g, '');
    if (cleanNumber.length < 5) {
        setIsPhoneChecked(false);
        setPhoneLookupResult(null);
        setExistingEnquiriesForPhone([]);
        return;
    }

    let foundEnquiry: Enquiry | undefined;
    let foundVendor: any;

    const previousEnquiries = enquiries.filter(e => e.phone.replace(/\D/g, '') === cleanNumber);
    if (previousEnquiries.length > 0) {
        foundEnquiry = previousEnquiries[0];
        setExistingEnquiriesForPhone(previousEnquiries);
    }

    foundVendor = vendorsData.find(v => v.phone && v.phone.replace(/\D/g, '') === cleanNumber);

    if (foundEnquiry || foundVendor) {
        setPhoneLookupResult('Existing');
        const source = foundEnquiry || foundVendor;
        setCustomerDetails(prev => ({
            ...prev,
            name: source.name || source.ownerName || '',
            email: source.email || '',
        }));
    } else {
        setPhoneLookupResult('New');
        setCustomerDetails(prev => ({
            ...prev,
            name: '',
            email: '',
        }));
        setExistingEnquiriesForPhone([]);
    }
    setIsPhoneChecked(true);
  };

  const getAssignedStaff = (id?: string) => {
    if (!id) return null;
    return allStaff.find(e => e.id === id);
  };

  const handleCorporateFilterChange = (newCorp: string) => {
      setFilterCorporate(newCorp);
      setFilterBranch('All');
  };

  const resetFilters = () => {
      setFilterSearch('');
      setFilterStatus('All');
      setFilterCorporate('All');
      setFilterBranch('All');
      setFilterDateType('Month');
      setFilterMonth(new Date().toISOString().slice(0, 7));
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
             <Headset className="w-8 h-8 text-emerald-600" /> Customer Care (Bookings)
          </h2>
          <p className="text-gray-500">Create bookings and manage order lifecycle</p>
        </div>
        {!isEmployee && ( 
          <div className="flex gap-2">
              <button 
                  onClick={() => setShowSettings(!showSettings)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showSettings ? 'bg-slate-800 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                  <Settings className="w-4 h-4" /> {showSettings ? 'Hide Rates' : 'Edit Rates'}
              </button>
          </div>
        )}
      </div>

      <div className="space-y-6">
          <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Orders Dashboard</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div 
                onClick={() => setFilterStatus('All')}
                className={`bg-white p-4 rounded-xl border border-gray-200 shadow-sm cursor-pointer transition-all hover:shadow-md ${filterStatus === 'All' ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}`}
              >
                  <p className="text-xs font-bold text-gray-500 uppercase">Total Orders</p>
                  <h3 className="text-2xl font-bold text-gray-800">{dashboardStats.total}</h3>
              </div>
              <div 
                onClick={() => { setFilterDateType('Date'); setFilterDate(new Date().toISOString().split('T')[0]); }}
                className={`bg-indigo-50 p-4 rounded-xl border border-indigo-200 shadow-sm cursor-pointer hover:bg-indigo-100 transition-colors ${filterDate === new Date().toISOString().split('T')[0] && filterDateType === 'Date' ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
              >
                  <p className="text-xs font-bold text-indigo-600 uppercase">Follow-ups Today</p>
                  <h3 className="text-2xl font-bold text-indigo-700">{dashboardStats.todaysFollowUps}</h3>
              </div>
              <div 
                onClick={() => setFilterStatus('Order Accepted')}
                className={`bg-white p-4 rounded-xl border border-gray-200 shadow-sm cursor-pointer transition-all hover:shadow-md ${filterStatus === 'Order Accepted' ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}`}
              >
                  <p className="text-xs font-bold text-gray-500 uppercase">Accepted</p>
                  <h3 className="text-2xl font-bold text-emerald-600">{dashboardStats.accepted}</h3>
              </div>
              <div 
                onClick={() => setFilterStatus('Completed')}
                className={`bg-white p-4 rounded-xl border border-gray-200 shadow-sm cursor-pointer transition-all hover:shadow-md ${filterStatus === 'Completed' ? 'ring-2 ring-purple-500 ring-offset-2' : ''}`}
              >
                  <p className="text-xs font-bold text-gray-500 uppercase">Completed</p>
                  <h3 className="text-2xl font-bold text-purple-600">{dashboardStats.completed}</h3>
              </div>
              <div 
                onClick={() => setFilterStatus('Scheduled')}
                className={`bg-white p-4 rounded-xl border border-gray-200 shadow-sm cursor-pointer transition-all hover:shadow-md ${filterStatus === 'Scheduled' ? 'ring-2 ring-orange-500 ring-offset-2' : ''}`}
              >
                  <p className="text-xs font-bold text-gray-500 uppercase">Scheduled</p>
                  <h3 className="text-2xl font-bold text-orange-600">{dashboardStats.scheduled}</h3>
              </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4">
              <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                  <div className="relative flex-1 w-full md:max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input 
                          placeholder="Search Orders, Customers, Phone..." 
                          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          value={filterSearch}
                          onChange={(e) => setFilterSearch(e.target.value)}
                      />
                  </div>
                  
                  <div className="flex gap-2 flex-wrap items-center w-full md:w-auto">
                      <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                          <button onClick={() => setFilterDateType('All')} className={`px-3 py-1 text-xs rounded transition-colors ${filterDateType === 'All' ? 'bg-white shadow text-gray-800 font-bold' : 'text-gray-500'}`}>All</button>
                          <button onClick={() => setFilterDateType('Month')} className={`px-3 py-1 text-xs rounded transition-colors ${filterDateType === 'Month' ? 'bg-white shadow text-emerald-600 font-bold' : 'text-gray-500'}`}>Month</button>
                          <button onClick={() => setFilterDateType('Date')} className={`px-3 py-1 text-xs rounded transition-colors ${filterDateType === 'Date' ? 'bg-white shadow text-blue-600 font-bold' : 'text-gray-500'}`}>Date</button>
                      </div>
                      
                      {filterDateType === 'Month' && (
                          <input type="month" className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} />
                      )}
                      
                      {filterDateType === 'Date' && (
                          <input type="date" className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
                      )}

                      <button onClick={resetFilters} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-red-500 transition-colors" title="Reset Filters">
                          <RefreshCcw className="w-4 h-4" />
                      </button>
                  </div>
              </div>

              <div className="flex flex-wrap gap-2 items-center pt-2 border-t border-gray-100">
                  <Filter className="w-4 h-4 text-gray-400 mr-1" />
                  
                  {isSuperAdmin && (
                      <select className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500" value={filterCorporate} onChange={(e) => handleCorporateFilterChange(e.target.value)}>
                          <option value="All">All Corporates</option>
                          <option value="admin">Head Office</option>
                          {corporates.map((c: any) => <option key={c.email} value={c.email}>{c.companyName}</option>)}
                      </select>
                  )}

                  <select className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500" value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)}>
                      <option value="All">All Branches</option>
                      {dashboardFilterBranches.map((b: any) => <option key={b.id} value={b.name}>{b.name}</option>)}
                  </select>

                  <select className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                      <option value="All">All Status</option>
                      <option value="Scheduled">Scheduled</option>
                      <option value="Order Accepted">Order Accepted</option>
                      <option value="Driver Assigned">Driver Assigned</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                      <option value="New">New Enquiry</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Converted">Converted</option>
                      <option value="Closed">Closed</option>
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
                              <th className="px-6 py-4">Follow-up Assign To</th>
                              <th className="px-6 py-4">Follow-up Date & Time</th>
                              <th className="px-6 py-4">Status</th>
                              <th className="px-6 py-4 text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {filteredOrders.length > 0 ? filteredOrders.map((order) => {
                              const assignedStaff = getAssignedStaff(order.assignedTo);
                              return (
                              <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-6 py-4">
                                      <div className="font-bold text-gray-900">{order.id}</div>
                                  </td>
                                  <td className="px-6 py-4 text-gray-600">
                                      {order.date || order.createdAt.split(',')[0]}
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="font-medium text-gray-900">{order.name}</div>
                                      <div className="text-xs text-gray-500">{order.phone}</div>
                                  </td>
                                  <td className="px-6 py-4 text-gray-600">
                                      {assignedStaff ? (
                                          <div className="flex items-center gap-2">
                                              <img src={assignedStaff.avatar} alt="" className="w-6 h-6 rounded-full" />
                                              <span>{assignedStaff.name}</span>
                                          </div>
                                      ) : 'Unassigned'}
                                  </td>
                                  <td className="px-6 py-4">
                                      {order.nextFollowUp ? (
                                          <span className="flex items-center gap-1 text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-full w-fit">
                                              <Clock className="w-3 h-3" />
                                              {new Date(order.nextFollowUp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                          </span>
                                      ) : '-'}
                                  </td>
                                  <td className="px-6 py-4">
                                      <span className={`px-2 py-1 rounded-full text-xs font-bold border ${
                                          order.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' :
                                          order.status === 'Cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                                          order.status === 'Scheduled' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                          order.status === 'Order Accepted' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                          order.status === 'Driver Assigned' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                          'bg-gray-50 text-gray-700 border-gray-200'
                                      }`}>
                                          {order.status}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                      <div className="flex justify-end gap-2">
                                          <button 
                                              onClick={() => handleEditOrder(order)}
                                              className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors font-medium flex items-center gap-1"
                                          >
                                              Follow-up
                                          </button>
                                          
                                          {order.status !== 'Completed' && order.status !== 'Cancelled' && (
                                              <>
                                                  {(order.status === 'New' || order.status === 'In Progress') && (
                                                      <button 
                                                          onClick={() => handleStatusUpdate(order.id, 'Scheduled')}
                                                          className="text-xs bg-orange-50 text-orange-600 px-3 py-1.5 rounded-lg border border-orange-100 hover:bg-orange-100 transition-colors font-medium"
                                                      >
                                                          Schedule
                                                      </button>
                                                  )}
                                                  {(order.status === 'New' || order.status === 'In Progress' || order.status === 'Scheduled') && (
                                                      <button 
                                                          onClick={() => handleStatusUpdate(order.id, 'Booked')}
                                                          className="text-xs bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-colors font-medium"
                                                      >
                                                          Book Now
                                                      </button>
                                                  )}
                                                  
                                                  <button 
                                                      onClick={() => handleEditOrder(order)}
                                                      className="text-gray-400 hover:text-blue-500 p-1.5 rounded-full hover:bg-blue-50 transition-colors"
                                                      title="Edit Order"
                                                  >
                                                      <Edit2 className="w-4 h-4" />
                                                  </button>
                                              </>
                                          )}
                                      </div>
                                  </td>
                              </tr>
                          );}) : (
                              <tr>
                                  <td colSpan={7} className="text-center py-10 text-gray-500">
                                      No orders found matching your filters.
                                  </td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><Edit2 className="w-4 h-4" /> Fare Configuration</h3>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="bg-white border border-gray-300 rounded-lg p-1 flex w-fit mb-6">
                <button onClick={() => setSettingsVehicleType('Sedan')} className={`px-4 py-1 text-xs font-bold rounded ${settingsVehicleType === 'Sedan' ? 'bg-emerald-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Sedan</button>
                <button onClick={() => setSettingsVehicleType('SUV')} className={`px-4 py-1 text-xs font-bold rounded ${settingsVehicleType === 'SUV' ? 'bg-emerald-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>SUV</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h4 className="text-sm font-bold text-emerald-600 uppercase tracking-wide border-b border-gray-200 pb-2 mb-2">Local Rules ({settingsVehicleType})</h4>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1 font-bold">Base Fare (₹)</label>
                      <input type="number" name="localBaseFare" value={pricing[settingsVehicleType].localBaseFare} onChange={handlePricingChange} className="w-full p-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1 font-bold">Base Km Included</label>
                      <input type="number" name="localBaseKm" value={pricing[settingsVehicleType].localBaseKm} onChange={handlePricingChange} className="w-full p-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1 font-bold">Extra Km Rate (₹/km)</label>
                      <input type="number" name="localPerKmRate" value={pricing[settingsVehicleType].localPerKmRate} onChange={handlePricingChange} className="w-full p-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1 font-bold">Waiting Charge (₹/min)</label>
                      <input type="number" name="localWaitingRate" value={pricing[settingsVehicleType].localWaitingRate} onChange={handlePricingChange} className="w-full p-2 border rounded-lg text-sm" />
                    </div>
                </div>

                <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-bold text-orange-600 uppercase tracking-wide border-b border-gray-200 pb-2 mb-2">Outstation Rules ({settingsVehicleType})</h4>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1 font-bold">Min Km / Day</label>
                    <input type="number" name="outstationMinKmPerDay" value={pricing[settingsVehicleType].outstationMinKmPerDay} onChange={handlePricingChange} className="w-full p-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1 font-bold">Per Km Rate (₹/km)</label>
                    <input type="number" name="outstationExtraKmRate" value={pricing[settingsVehicleType].outstationExtraKmRate} onChange={handlePricingChange} className="w-full p-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1 font-bold">Base Rate (One Way)</label>
                    <input type="number" name="outstationBaseRate" value={pricing[settingsVehicleType].outstationBaseRate} onChange={handlePricingChange} className="w-full p-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1 font-bold">Driver Allowance (₹/day)</label>
                    <input type="number" name="outstationDriverAllowance" value={pricing[settingsVehicleType].outstationDriverAllowance} onChange={handlePricingChange} className="w-full p-2 border rounded-lg text-sm" />
                    </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1 font-bold">Night Allowance (₹/night)</label>
                    <input type="number" name="outstationNightAllowance" value={pricing[settingsVehicleType].outstationNightAllowance} onChange={handlePricingChange} className="w-full p-2 border rounded-lg text-sm" />
                  </div>
                </div>

                <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-bold text-blue-600 uppercase tracking-wide border-b border-gray-200 pb-2 mb-2">Rental Packages ({settingsVehicleType})</h4>
                  
                  <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-gray-700 uppercase">Manage Packages</label>
                      <button 
                        onClick={() => { setShowAddPackage(!showAddPackage); setEditingPackageId(null); setNewPackage({ name: '', hours: '', km: '', priceSedan: '', priceSuv: '' }); }}
                        className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded shadow-sm hover:bg-blue-700 flex items-center gap-1 font-bold"
                      >
                        <Plus className="w-3 h-3" /> New
                      </button>
                  </div>
                  
                  {showAddPackage && (
                      <div className="bg-white p-3 rounded-lg border border-blue-200 mb-2 space-y-3 shadow-sm animate-in fade-in slide-in-from-top-1">
                          <input placeholder="Pkg Name (e.g. 10hr/100km)" className="w-full p-2 text-xs border rounded-lg outline-none focus:ring-1 focus:ring-blue-500" value={newPackage.name} onChange={e => setNewPackage({...newPackage, name: e.target.value})} />
                          <div className="grid grid-cols-2 gap-2">
                              <input placeholder="Hrs" type="number" className="w-full p-2 text-xs border rounded-lg" value={newPackage.hours} onChange={e => setNewPackage({...newPackage, hours: e.target.value})} />
                              <input placeholder="Km" type="number" className="w-full p-2 text-xs border rounded-lg" value={newPackage.km} onChange={e => setNewPackage({...newPackage, km: e.target.value})} />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                              <input placeholder="Sedan ₹" type="number" className="w-full p-2 text-xs border rounded-lg" value={newPackage.priceSedan} onChange={e => setNewPackage({...newPackage, priceSedan: e.target.value})} />
                              <input placeholder="SUV ₹" type="number" className="w-full p-2 text-xs border rounded-lg" value={newPackage.priceSuv} onChange={e => setNewPackage({...newPackage, priceSuv: e.target.value})} />
                          </div>
                          <div className="flex gap-2 pt-1">
                            {editingPackageId && (
                                <button onClick={handleCancelEditPackage} className="flex-1 bg-gray-100 text-gray-600 text-xs font-bold py-2 rounded-lg hover:bg-gray-200">Cancel</button>
                            )}
                            <button onClick={handleAddPackage} className={`flex-1 ${editingPackageId ? 'bg-indigo-600' : 'bg-blue-600'} text-white text-xs font-bold py-2 rounded-lg`}>
                                {editingPackageId ? 'Update' : 'Add'}
                            </button>
                          </div>
                      </div>
                  )}

                  <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                      {rentalPackages.map(pkg => (
                          <div key={pkg.id} className="flex justify-between items-center p-2.5 bg-white rounded-lg border border-gray-200 group transition-all hover:border-blue-300">
                              <div className="min-w-0">
                                  <div className="text-xs font-bold text-gray-800 truncate">{pkg.name}</div>
                                  <div className="text-[10px] text-gray-500">{pkg.hours}hr / {pkg.km}km</div>
                              </div>
                              <div className="text-right flex items-center gap-2 shrink-0">
                                  <div className="text-[10px] text-gray-600 font-mono">₹{settingsVehicleType === 'Sedan' ? pkg.priceSedan : pkg.priceSuv}</div>
                                  <button onClick={() => handleEditPackage(pkg)} className="text-gray-300 hover:text-blue-500 p-1">
                                      <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button onClick={(e) => removePackage(pkg.id, e)} className="text-gray-300 hover:text-red-500 p-1">
                                      <Trash2 className="w-3 h-3" />
                                  </button>
                              </div>
                          </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end">
               <button onClick={() => setShowSettings(false)} className="px-8 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-900 transition-colors">Done</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <User className="w-4 h-4" /> Customer Info
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <input 
                          placeholder="Name" 
                          className="p-2 border border-gray-300 rounded-lg w-full outline-none focus:ring-2 focus:ring-emerald-500"
                          value={customerDetails.name}
                          onChange={e => setCustomerDetails({...customerDetails, name: e.target.value})}
                      />
                      <div className="relative">
                          <input 
                              placeholder="Phone" 
                              className="p-2 border border-gray-300 rounded-lg w-full outline-none focus:ring-2 focus:ring-emerald-500 pr-10"
                              value={customerDetails.phone}
                              onChange={e => {
                                  setCustomerDetails({...customerDetails, phone: e.target.value});
                                  setIsPhoneChecked(false);
                                  setPhoneLookupResult(null);
                                  setExistingEnquiriesForPhone([]);
                              }}
                          />
                          <button
                            type="button"
                            onClick={handlePhoneInputCheck}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-emerald-600"
                            title="Check Phone Number"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                      </div>
                  </div>
                  {isPhoneChecked && (
                      <div className={`text-xs px-2 py-1 rounded-md mb-4 flex items-center gap-1 font-bold ${phoneLookupResult === 'Existing' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          {phoneLookupResult === 'Existing' ? <CheckCircleIcon className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                          {phoneLookupResult === 'Existing' ? 'Existing Customer/Vendor' : 'New Customer'}
                      </div>
                  )}
                  
                  <div className="flex gap-4 mb-4 border-b border-gray-100 pb-4">
                      <button 
                          onClick={() => setEnquiryCategory('Transport')}
                          className={`flex-1 py-2 text-sm font-black rounded-lg flex items-center justify-center gap-2 transition-colors ${enquiryCategory === 'Transport' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm' : 'bg-gray-50 text-gray-500 border border-transparent'}`}
                      >
                          <Car className="w-4 h-4" /> Transport
                      </button>
                      <button 
                          onClick={() => setEnquiryCategory('General')}
                          className={`flex-1 py-2 text-sm font-black rounded-lg flex items-center justify-center gap-2 transition-colors ${enquiryCategory === 'General' ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm' : 'bg-gray-50 text-gray-500 border border-transparent'}`}
                      >
                          <FileText className="w-4 h-4" /> General
                      </button>
                  </div>

                  {enquiryCategory === 'General' ? (
                      <div className="space-y-4 mt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Requirement Details</label>
                          <textarea 
                              rows={6}
                              className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 resize-y text-sm"
                              placeholder={phoneLookupResult === 'New' ? "New User Requirement Details" : "Enter new general requirements here..."}
                              value={customerDetails.requirements}
                              onChange={e => setCustomerDetails({...customerDetails, requirements: e.target.value})}
                          />
                          {isPhoneChecked && phoneLookupResult === 'Existing' && existingEnquiriesForPhone.length > 0 && (
                              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 text-blue-800 text-sm space-y-3 max-h-48 overflow-y-auto custom-scrollbar shadow-inner">
                                  <h4 className="font-black flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-blue-600"><History className="w-3 h-3"/> Past Enquiries</h4>
                                  {existingEnquiriesForPhone.map((enq, idx) => (
                                      <div key={enq.id} className="bg-white p-3 rounded-lg border border-blue-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                                          <div className="flex justify-between items-center mb-1">
                                              <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                                                <Calendar className="w-3 h-3"/> {enq.date || enq.createdAt.split('T')[0]}
                                              </span>
                                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${enq.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                  {enq.status}
                                              </span>
                                          </div>
                                          <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed italic">"{enq.details}"</p>
                                      </div>
                                  ))}
                              </div>
                          )}
                          <div className="space-y-4 pt-2">
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                                    <Building2 className="w-3 h-3" /> Assign To
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {isSuperAdmin && (
                                        <select className="p-2.5 border border-gray-300 rounded-lg text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-blue-500" value={assignment.corporateId} onChange={(e) => setAssignment({...assignment, corporateId: e.target.value, branchName: '', staffId: ''})}>
                                            <option value="admin">Head Office</option>
                                            {corporates.map((c: any) => (<option key={c.email} value={c.email}>{c.companyName}</option>))}
                                        </select>
                                    )}
                                    <select className="p-2.5 border border-gray-300 rounded-lg text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-blue-500" value={assignment.branchName} onChange={(e) => setAssignment({...assignment, branchName: e.target.value, staffId: ''})}>
                                        <option value="">All Branches</option>
                                        {filteredBranches.map((b: any) => (<option key={b.id} value={b.name}>{b.name}</option>))}
                                    </select>
                                    <select className="p-2.5 border border-gray-300 rounded-lg text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-blue-500" value={assignment.staffId} onChange={(e) => setAssignment({...assignment, staffId: e.target.value})}>
                                        <option value="">Select Staff</option>
                                        {filteredStaff.map((s: any) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                                    </select>
                                </div>
                            </div>

                            <div className="bg-indigo-50/30 p-4 rounded-xl border border-indigo-100">
                                <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                                    <Clock className="w-3 h-3" /> Set Follow-up
                                </h4>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1">Date</label>
                                        <input type="date" value={generalFollowUpDate} onChange={e => setGeneralFollowUpDate(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-lg outline-none text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1">Time</label>
                                        <input type="time" value={generalFollowUpTime} onChange={e => setGeneralFollowUpTime(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-lg outline-none text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500" />
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Priority</label>
                                    <div className="flex gap-2">
                                        {['Hot', 'Warm', 'Cold'].map(p => (
                                            <button 
                                                key={p}
                                                type="button"
                                                onClick={() => setGeneralFollowUpPriority(p as any)}
                                                className={`flex-1 py-2 text-xs font-black rounded-lg border transition-all ${generalFollowUpPriority === p ? 'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-[1.02]' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => saveOrder('New')} className="py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-900/10 flex items-center justify-center gap-2 transform active:scale-95"><Save className="w-4 h-4" /> Save Enquiry</button>
                                <button onClick={handleSaveGeneralFollowUp} className="py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/10 flex items-center justify-center gap-2 transform active:scale-95"><Clock className="w-4 h-4" /> {editingOrderId ? 'Update Follow-up' : 'Save Follow-up'}</button>
                            </div>
                            <button onClick={handleCancelForm} className="w-full py-3 text-gray-400 hover:text-rose-500 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all hover:bg-rose-50 border border-transparent hover:border-rose-100 flex items-center justify-center gap-2"><X className="w-4 h-4" /> Clear and Restart Form</button>
                          </div>
                      </div>
                  ) : (
                      <div className="space-y-4 mt-2 border-t border-gray-100 pt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                          <div className="flex justify-between items-center mb-2">
                              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Trip Type Selection</h4>
                              <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                                  {['Sedan', 'SUV'].map(v => (
                                      <button
                                          key={v}
                                          onClick={() => setVehicleType(v as any)}
                                          className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${vehicleType === v ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500 hover:text-gray-900'}`}
                                      >
                                          {v}
                                      </button>
                                  ))}
                              </div>
                          </div>

                          <div className="flex border-b border-gray-200">
                              {['Local', 'Rental', 'Outstation'].map(t => (
                                  <button
                                      key={t}
                                      onClick={() => setTripType(t as any)}
                                      className={`flex-1 py-3 text-xs font-black uppercase tracking-[0.2em] border-b-4 transition-all ${tripType === t ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                  >
                                      {t}
                                  </button>
                              ))}
                              </div>

                              <div className="space-y-2">
                                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Pickup Location</label>
                                  {!isMapReady ? (
                                      <div className="p-3 bg-gray-50 text-gray-500 text-xs font-bold rounded-xl flex items-center gap-2 border border-gray-100">
                                          <Loader2 className="w-4 h-4 animate-spin text-emerald-500" /> Connecting to Maps Service...
                                      </div>
                                  ) : (
                                      <Autocomplete 
                                          placeholder="Search Pickup Address"
                                          onAddressSelect={(addr) => setCustomerDetails(prev => ({ ...prev, pickup: addr }))}
                                          setNewPlace={(place) => setPickupCoords(place)}
                                          defaultValue={customerDetails.pickup}
                                      />
                                  )}
                              </div>

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
                              
                              {tripType === 'Rental' && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar animate-in slide-in-from-left-2 duration-200">
                                      {rentalPackages.map(pkg => (
                                          <button 
                                              key={pkg.id}
                                              onClick={() => setTransportDetails(prev => ({...prev, packageId: pkg.id}))}
                                              className={`p-4 border-2 rounded-2xl text-left transition-all group flex flex-col justify-between h-24 ${transportDetails.packageId === pkg.id ? 'border-emerald-500 bg-emerald-50 shadow-md transform scale-[1.02]' : 'border-gray-100 bg-white hover:border-emerald-200 shadow-sm'}`}
                                          >
                                              <div className={`text-xs font-black uppercase tracking-wider ${transportDetails.packageId === pkg.id ? 'text-emerald-700' : 'text-gray-500'}`}>{pkg.name}</div>
                                              <div className={`text-xl font-black ${transportDetails.packageId === pkg.id ? 'text-emerald-800' : 'text-gray-800'}`}>₹{vehicleType === 'Sedan' ? pkg.priceSedan : pkg.priceSuv}</div>
                                          </button>
                                      ))}
                                  </div>
                              )}

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
                              
                              <div className="mt-8 pt-8 border-t border-gray-100 space-y-6">
                                  <div className="space-y-2">
                                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Requirement Details (Optional)</label>
                                      <textarea 
                                          rows={2}
                                          className="w-full p-4 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-sm font-medium bg-gray-50 focus:bg-white transition-all shadow-inner"
                                          placeholder="Special requests, extra luggage, pet-friendly, etc..."
                                          value={customerDetails.requirements}
                                          onChange={e => setCustomerDetails({...customerDetails, requirements: e.target.value})}
                                      />
                                  </div>

                                  <div className="bg-gray-50 p-6 rounded-3xl border border-gray-200 shadow-inner">
                                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                          <Building2 className="w-4 h-4 text-emerald-500" /> Assign & Route Enquiry
                                      </label>
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                          {isSuperAdmin && (
                                              <div className="space-y-1.5">
                                                <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Corporate Partner</label>
                                                <select className="w-full p-2.5 border border-gray-300 rounded-xl text-xs font-black bg-white shadow-sm outline-none focus:ring-2 focus:ring-emerald-500" value={assignment.corporateId} onChange={(e) => setAssignment({...assignment, corporateId: e.target.value, branchName: '', staffId: ''})}>
                                                    <option value="admin">Head Office (Internal)</option>
                                                    {corporates.map((c: any) => (<option key={c.email} value={c.email}>{c.companyName}</option>))}
                                                </select>
                                              </div>
                                          )}
                                          <div className="space-y-1.5">
                                              <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Local Branch</label>
                                              <select className="w-full p-2.5 border border-gray-300 rounded-xl text-xs font-black bg-white shadow-sm outline-none focus:ring-2 focus:ring-emerald-500" value={assignment.branchName} onChange={(e) => setAssignment({...assignment, branchName: e.target.value, staffId: ''})}>
                                                  <option value="">All Branches</option>
                                                  {filteredBranches.map((b: any) => (<option key={b.id} value={b.name}>{b.name}</option>))}
                                              </select>
                                          </div>
                                          <div className="space-y-1.5">
                                              <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Assigned Agent</label>
                                              <select className="w-full p-2.5 border border-gray-300 rounded-xl text-xs font-black bg-white shadow-sm outline-none focus:ring-2 focus:ring-emerald-500" value={assignment.staffId} onChange={(e) => setAssignment({...assignment, staffId: e.target.value})}>
                                                  <option value="">Choose Agent</option>
                                                  {filteredStaff.map((s: any) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                                              </select>
                                          </div>
                                      </div>
                                  </div>

                                  <div className="space-y-4 pt-4">
                                      <div className="grid grid-cols-2 gap-4">
                                          <button 
                                              onClick={handleOpenSchedule}
                                              className="py-5 border-2 border-indigo-100 text-indigo-600 rounded-[2rem] font-black text-sm hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 transform active:scale-95 shadow-lg shadow-indigo-900/5"
                                          >
                                              <Calendar className="w-5 h-5" /> {editingOrderId ? 'Update Schedule' : 'Schedule Trip'}
                                          </button>
                                          <button 
                                              onClick={handleBookNow}
                                              className="py-5 bg-emerald-600 text-white rounded-[2rem] font-black text-sm hover:bg-emerald-700 transition-all shadow-2xl shadow-emerald-900/20 flex items-center justify-center gap-2 transform active:scale-95"
                                          >
                                              <ArrowRight className="w-5 h-5" /> {editingOrderId ? 'Confirm Update' : 'Accept Order'}
                                          </button>
                                      </div>
                                      <div className="flex justify-center">
                                          <button 
                                              onClick={handleCancelForm}
                                              className="px-8 py-3 text-gray-400 hover:text-rose-500 rounded-full font-black text-[10px] uppercase tracking-[0.2em] transition-all hover:bg-rose-50 border border-transparent hover:border-rose-100 flex items-center justify-center gap-2"
                                          >
                                              <X className="w-3 h-3" /> Reset Current Form
                                          </button>
                                      </div>
                                  </div>
                              </div>
                          </div>
                  )}
              </div>
          </div>

          <div className="space-y-6 h-fit sticky top-24">
              <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl shadow-slate-900/30 relative overflow-hidden group animate-in slide-in-from-right-4 duration-500">
                  <div className="relative z-10">
                      <p className="text-slate-400 text-[10px] uppercase font-black tracking-[0.3em] mb-4">Estimated Booking Cost</p>
                      <div className="flex items-baseline gap-2 mb-8">
                        <span className="text-2xl font-bold text-slate-500">₹</span>
                        <h3 className="text-7xl font-black tracking-tighter leading-none group-hover:scale-105 transition-transform duration-500">{estimatedCost.toLocaleString()}</h3>
                      </div>
                      <div className="text-[11px] text-slate-400 border-t border-slate-800 pt-6 flex items-start gap-2 font-bold italic leading-relaxed">
                          <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
                          <span>{enquiryCategory === 'Transport' ? "This is a base calculation. Government taxes (GST), Toll fees, and Parking charges will be additional as per actuals." : "General Enquiry mode selected. No monetary estimation is calculated for standard support requests."}</span>
                      </div>
                  </div>
                  <div className="absolute -right-12 -bottom-12 opacity-[0.03] transform rotate-12 group-hover:scale-110 transition-transform duration-700">
                      <DollarSign className="w-72 h-72 text-white" />
                  </div>
              </div>

              <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-xl shadow-emerald-900/5 animate-in slide-in-from-bottom-4 duration-500">
                  <div className="flex justify-between items-center mb-6">
                      <h4 className="font-black text-gray-800 text-[10px] uppercase tracking-[0.2em] flex items-center gap-2">
                          <MessageCircle className="w-4 h-4 text-emerald-500" /> Auto-Generated Quote
                      </h4>
                      <button 
                          onClick={() => {if(messageTextareaRef.current) { navigator.clipboard.writeText(generatedMessage); alert("Quote copied to clipboard!"); }}}
                          className="text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-xl transition-all hover:bg-blue-100"
                      >
                          <Copy className="w-3.5 h-3.5" /> Copy Message
                      </button>
                  </div>
                  <textarea 
                      ref={messageTextareaRef}
                      className="w-full min-h-[220px] p-5 bg-gray-50 border border-gray-100 rounded-[2rem] text-sm font-medium text-gray-600 focus:outline-none overflow-y-hidden resize-none mb-6 shadow-inner leading-relaxed"
                      value={generatedMessage}
                      readOnly
                  />
                  <div className="grid grid-cols-2 gap-4">
                      <button 
                          onClick={() => window.open(`https://wa.me/${customerDetails.phone.replace(/\D/g, '')}?text=${encodeURIComponent(generatedMessage)}`, '_blank')}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-emerald-200 transition-all flex items-center justify-center gap-2 transform active:scale-95"
                      >
                          <MessageCircle className="w-5 h-5" /> Share on WhatsApp
                      </button>
                      <button 
                          className="bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-blue-200 transition-all flex items-center justify-center gap-2 transform active:scale-95"
                      >
                          <Mail className="w-5 h-5" /> Send via Email
                      </button>
                  </div>
              </div>
          </div>
      </div>

      {isScheduleModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100">
                  <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                      <h3 className="text-2xl font-black text-gray-900 tracking-tighter">Schedule Trip</h3>
                      <button onClick={() => setIsScheduleModalOpen(false)} className="p-3 hover:bg-gray-200 rounded-2xl transition-all text-gray-400 hover:text-gray-900"><X className="w-6 h-6"/></button>
                  </div>
                  <div className="p-10 space-y-8">
                      <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">Pickup Date</label>
                          <input 
                              type="date" 
                              className="w-full p-4 border border-gray-200 rounded-2xl outline-none font-bold text-gray-800 focus:ring-4 focus:ring-emerald-500/10 shadow-inner"
                              value={scheduleData.date}
                              onChange={(e) => setScheduleData({...scheduleData, date: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">Pickup Time</label>
                          <input 
                              type="time" 
                              className="w-full p-4 border border-gray-200 rounded-2xl outline-none font-bold text-gray-800 focus:ring-4 focus:ring-emerald-500/10 shadow-inner"
                              value={scheduleData.time}
                              onChange={(e) => setScheduleData({...scheduleData, time: e.target.value})}
                          />
                      </div>
                      <div className="pt-4">
                        <button 
                            onClick={confirmSchedule}
                            className="w-full bg-indigo-600 text-white py-5 rounded-[2rem] font-black text-sm shadow-2xl shadow-indigo-900/20 hover:bg-indigo-700 transition-all transform active:scale-95"
                        >
                            Confirm Schedule
                        </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
