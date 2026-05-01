import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Settings,
  MessageCircle,
  Copy,
  Mail,
  Car,
  User,
  Edit2,
  X,
  Phone,
  Truck,
  DollarSign,
  Calendar,
  MapPin,
  Plus,
  Trash2,
  Headset,
  Clock,
  Search,
  ChevronDown,
  AlertCircle,
  RefreshCcw,
  Mountain,
  List as ListIcon,
  Building2,
  Package,
  TrendingUp as TrendingUpIcon,
  FileText,
  ArrowRight,
  Printer,
} from "lucide-react";
import Autocomplete from "../../components/Autocomplete";
import { Enquiry, UserRole, CorporateAccount, Employee } from "../../types";
import {
  HARDCODED_MAPS_API_KEY,
  syncToCloud,
} from "../../services/cloudService";

// Types
type TripType = "Local" | "Rental" | "Outstation";
type OutstationSubType = "RoundTrip" | "OneWay";
type VehicleType =
  | "Sedan"
  | "SUV"
  | "3 Wheeler Auto"
  | "Tata Ace"
  | "Pickup"
  | "BADA DOST";
type EnquiryCategory = "Transport" | "General";
type OrderStatus =
  | "Scheduled"
  | "Order Accepted"
  | "Driver Assigned"
  | "Completed"
  | "Cancelled"
  | "New"
  | "In Progress"
  | "Converted"
  | "Closed"
  | "Booked";

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
  priceBadaDost: number;
  extraHrRate?: number;
  extraKmRate?: number;
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
  outstationBaseKm: number;
  outstationExtraKmRate: number;
  outstationOneWayExtraKmRate: number; // Added for One Way Extra Km Rate
  outstationExtraHrRate: number; // Added for Extra Hr Rate
  outstationRoundTripFreeHours: number; // Added for round trip free hours
  outstationDriverAllowance: number;
  outstationNightAllowance: number;
  outstationHillsAllowance: number;
}

interface FareItem {
  label: string;
  value: number;
  description?: string;
  type?: "base" | "extra" | "allowance" | "tax";
}

const DEFAULT_RENTAL_PACKAGES: RentalPackage[] = [
  {
    id: "1hr",
    name: "1 Hr / 10 km",
    hours: 1,
    km: 10,
    priceSedan: 200,
    priceSuv: 300,
    priceAuto: 150,
    priceAce: 400,
    pricePickup: 500,
    priceBadaDost: 550,
    extraHrRate: 100,
    extraKmRate: 15,
  },
  {
    id: "2hr",
    name: "2 Hr / 20 km",
    hours: 2,
    km: 20,
    priceSedan: 400,
    priceSuv: 600,
    priceAuto: 300,
    priceAce: 750,
    pricePickup: 900,
    priceBadaDost: 1000,
    extraHrRate: 100,
    extraKmRate: 15,
  },
  {
    id: "4hr",
    name: "4 Hr / 40 km",
    hours: 4,
    km: 40,
    priceSedan: 800,
    priceSuv: 1100,
    priceAuto: 550,
    priceAce: 1400,
    pricePickup: 1700,
    priceBadaDost: 1900,
    extraHrRate: 100,
    extraKmRate: 15,
  },
  {
    id: "8hr",
    name: "8 Hr / 80 km",
    hours: 8,
    km: 80,
    priceSedan: 1600,
    priceSuv: 2200,
    priceAuto: 1000,
    priceAce: 2600,
    pricePickup: 3200,
    priceBadaDost: 3600,
    extraHrRate: 100,
    extraKmRate: 15,
  },
];

const DEFAULT_PRICING_SEDAN: PricingRules = {
  localBaseFare: 200,
  localBaseKm: 5,
  localPerKmRate: 20,
  localWaitingRate: 2,
  rentalExtraKmRate: 15,
  rentalExtraHrRate: 100,
  outstationMinKmPerDay: 250,
  outstationBaseRate: 1800,
  outstationBaseKm: 250,
  outstationExtraKmRate: 13,
  outstationOneWayExtraKmRate: 13,
  outstationExtraHrRate: 100,
  outstationRoundTripFreeHours: 0,
  outstationDriverAllowance: 400,
  outstationNightAllowance: 300,
  outstationHillsAllowance: 500,
};

const DEFAULT_PRICING_SUV: PricingRules = {
  localBaseFare: 300,
  localBaseKm: 5,
  localPerKmRate: 25,
  localWaitingRate: 3,
  rentalExtraKmRate: 18,
  rentalExtraHrRate: 150,
  outstationMinKmPerDay: 300,
  outstationBaseRate: 2500,
  outstationBaseKm: 300,
  outstationExtraKmRate: 17,
  outstationOneWayExtraKmRate: 17,
  outstationExtraHrRate: 150,
  outstationRoundTripFreeHours: 0,
  outstationDriverAllowance: 500,
  outstationNightAllowance: 400,
  outstationHillsAllowance: 700,
};

const DEFAULT_PRICING_AUTO: PricingRules = {
  localBaseFare: 100,
  localBaseKm: 2,
  localPerKmRate: 15,
  localWaitingRate: 1,
  rentalExtraKmRate: 12,
  rentalExtraHrRate: 80,
  outstationMinKmPerDay: 200,
  outstationBaseRate: 0,
  outstationBaseKm: 0,
  outstationExtraKmRate: 12,
  outstationOneWayExtraKmRate: 12,
  outstationExtraHrRate: 80,
  outstationRoundTripFreeHours: 0,
  outstationDriverAllowance: 300,
  outstationNightAllowance: 200,
  outstationHillsAllowance: 400,
};

const DEFAULT_PRICING_ACE: PricingRules = {
  localBaseFare: 400,
  localBaseKm: 5,
  localPerKmRate: 30,
  localWaitingRate: 4,
  rentalExtraKmRate: 22,
  rentalExtraHrRate: 200,
  outstationMinKmPerDay: 250,
  outstationBaseRate: 500,
  outstationBaseKm: 50,
  outstationExtraKmRate: 18,
  outstationOneWayExtraKmRate: 18,
  outstationExtraHrRate: 200,
  outstationRoundTripFreeHours: 0,
  outstationDriverAllowance: 500,
  outstationNightAllowance: 400,
  outstationHillsAllowance: 600,
};

const DEFAULT_PRICING_PICKUP: PricingRules = {
  localBaseFare: 600,
  localBaseKm: 5,
  localPerKmRate: 40,
  localWaitingRate: 5,
  rentalExtraKmRate: 28,
  rentalExtraHrRate: 250,
  outstationMinKmPerDay: 300,
  outstationBaseRate: 800,
  outstationBaseKm: 50,
  outstationExtraKmRate: 22,
  outstationOneWayExtraKmRate: 22,
  outstationExtraHrRate: 250,
  outstationRoundTripFreeHours: 0,
  outstationDriverAllowance: 600,
  outstationNightAllowance: 500,
  outstationHillsAllowance: 800,
};

const DEFAULT_PRICING_BADA_DOST: PricingRules = {
  localBaseFare: 700,
  localBaseKm: 5,
  localPerKmRate: 45,
  localWaitingRate: 6,
  rentalExtraKmRate: 32,
  rentalExtraHrRate: 300,
  outstationMinKmPerDay: 300,
  outstationBaseRate: 1000,
  outstationBaseKm: 50,
  outstationExtraKmRate: 25,
  outstationOneWayExtraKmRate: 25,
  outstationExtraHrRate: 300,
  outstationRoundTripFreeHours: 0,
  outstationDriverAllowance: 700,
  outstationNightAllowance: 600,
  outstationHillsAllowance: 900,
};

const getInitialEnquiries = (): Enquiry[] => {
  const saved = localStorage.getItem("global_enquiries_data");
  return saved ? JSON.parse(saved) : [];
};

interface CustomerCareProps {
  role: UserRole;
}

interface DropPoint {
  address: string;
  coords: { lat: number; lng: number } | null;
  date?: string;
}

// Utility to safely stringify objects with potential circular references
const safeStringify = (obj: unknown) => {
  const cache = new Set();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === "object" && value !== null) {
      if (cache.has(value)) {
        return "[Circular]";
      }
      cache.add(value);
    }
    return value;
  });
};

export const CustomerCare: React.FC<CustomerCareProps> = ({ role }) => {
  const [showInvoice, setShowInvoice] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsVehicleType, setSettingsVehicleType] =
    useState<VehicleType>("Sedan");

  const sessionId = localStorage.getItem("app_session_id") || "admin";
  const isSuperAdmin = sessionId === "admin";
  const isEmployee = role === UserRole.EMPLOYEE;

  // Determine corporate context
  const corporateEmail = isEmployee
    ? localStorage.getItem("logged_in_employee_corporate_id") || "admin"
    : role === UserRole.CORPORATE
      ? sessionId
      : "admin";

  const ADMIN_PRICING_KEY = "transport_pricing_rules_v3";
  const ADMIN_PACKAGES_KEY = "transport_rental_packages_v3";

  const contextPricingKey =
    corporateEmail === "admin"
      ? ADMIN_PRICING_KEY
      : `transport_pricing_rules_v3_${corporateEmail}`;
  const contextPackagesKey =
    corporateEmail === "admin"
      ? ADMIN_PACKAGES_KEY
      : `transport_rental_packages_v3_${corporateEmail}`;

  const [targetCorporateForRates, setTargetCorporateForRates] =
    useState<string>("admin");

  // Effective keys based on targetCorporateForRates if super admin, otherwise use context keys
  const effectivePricingKey = isSuperAdmin
    ? targetCorporateForRates === "admin"
      ? ADMIN_PRICING_KEY
      : `transport_pricing_rules_v3_${targetCorporateForRates}`
    : contextPricingKey;

  const effectivePackagesKey = isSuperAdmin
    ? targetCorporateForRates === "admin"
      ? ADMIN_PACKAGES_KEY
      : `transport_rental_packages_v3_${targetCorporateForRates}`
    : contextPackagesKey;

  // Enquiry State
  const [enquiryCategory, setEnquiryCategory] =
    useState<EnquiryCategory>("Transport");

  const [tripType, setTripType] = useState<TripType>("Local");
  const [vehicleType, setVehicleType] = useState<VehicleType>("Sedan");
  const [outstationSubType, setOutstationSubType] =
    useState<OutstationSubType>("RoundTrip");

  const [transportDetails, setTransportDetails] = useState({
    drops: [{ address: "", coords: null, date: "" }] as DropPoint[],
    outstationWaypoints: [] as DropPoint[],
    estKm: "",
    waitingMins: "",
    packageId: "",
    extraHr: "",
    extraKm: "",
    tollCharge: "",
    destination: "",
    destinationDate: "",
    days: "1",
    estTotalKm: "",
    nights: "0",
    isHillsTrip: false,
    totalTripHrs: "",
    legDistances: [] as number[],
  });

  const [customerDetails, setCustomerDetails] = useState({
    name: "",
    phone: "",
    email: "",
    pickup: "",
    requirements: "",
    travelDate: "",
    travelTime: "",
  });

  // Map State
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [pickupCoords, setPickupCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [destCoords, setDestCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [rentalPackages, setRentalPackages] = useState<RentalPackage[]>(() => {
    const saved =
      localStorage.getItem(contextPackagesKey) ||
      localStorage.getItem(ADMIN_PACKAGES_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure each package has all price fields to avoid undefined errors
        return (parsed as RentalPackage[]).map((pkg) => ({
          ...pkg,
          priceAuto: pkg.priceAuto ?? 0,
          priceAce: pkg.priceAce ?? 0,
          pricePickup: pkg.pricePickup ?? 0,
          priceBadaDost: pkg.priceBadaDost ?? 0,
        }));
      } catch (e) {
        console.error("Error parsing rental packages:", e);
        return DEFAULT_RENTAL_PACKAGES;
      }
    }
    return DEFAULT_RENTAL_PACKAGES;
  });

  const [pricing, setPricing] = useState<Record<VehicleType, PricingRules>>(
    () => {
      const saved =
        localStorage.getItem(contextPricingKey) ||
        localStorage.getItem(ADMIN_PRICING_KEY);
      const defaults = {
        Sedan: DEFAULT_PRICING_SEDAN,
        SUV: DEFAULT_PRICING_SUV,
        "3 Wheeler Auto": DEFAULT_PRICING_AUTO,
        "Tata Ace": DEFAULT_PRICING_ACE,
        Pickup: DEFAULT_PRICING_PICKUP,
        "BADA DOST": DEFAULT_PRICING_BADA_DOST,
      };
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Merge defaults with parsed to ensure all vehicle types exist and have all fields
          const merged = { ...defaults };
          Object.keys(parsed).forEach((key) => {
            const vKey = key as VehicleType;
            if (merged[vKey]) {
              merged[vKey] = { ...merged[vKey], ...parsed[vKey] };
            }
          });
          return merged;
        } catch (e) {
          console.error("Error parsing pricing rules:", e);
          return defaults;
        }
      }
      return defaults;
    },
  );

  const [showAddPackage, setShowAddPackage] = useState(false);
  const [newPackage, setNewPackage] = useState({
    name: "",
    hours: "",
    km: "",
    priceSedan: "",
    priceSuv: "",
    priceAuto: "",
    priceAce: "",
    pricePickup: "",
    priceBadaDost: "",
    extraHrRate: "",
    extraKmRate: "",
  });
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);

  const [generatedMessage, setGeneratedMessage] = useState("");
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [fareBreakup, setFareBreakup] = useState<FareItem[]>([]);

  const messageTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [allStaff, setAllStaff] = useState<Employee[]>([]);

  const currentCorporate = useMemo(() => {
    const corps = JSON.parse(
      localStorage.getItem("corporate_accounts") || "[]",
    );
    return corps.find((c: CorporateAccount) => c.email === corporateEmail);
  }, [corporateEmail]);

  const corporateName = currentCorporate?.companyName || "OK BOZ";

  const [assignment] = useState({
    corporateId: isSuperAdmin ? "admin" : corporateEmail,
    branchName: "",
    staffId: "",
  });

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [filterSearch, setFilterSearch] = useState<string>("");
  const [filterCorporate, setFilterCorporate] = useState<string>("All");
  const [filterBranch, setFilterBranch] = useState<string>("All");
  const [filterDateType, setFilterDateType] = useState<
    "All" | "Date" | "Month"
  >("Month");
  const [filterDate, setFilterDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [filterMonth, setFilterMonth] = useState<string>(
    new Date().toISOString().slice(0, 7),
  );

  const [scheduleData] = useState({ date: "", time: "" });

  const [enquiries, setEnquiries] = useState<Enquiry[]>(getInitialEnquiries);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  // Reload rates when effective keys change (for Super Admin switching context)
  useEffect(() => {
    if (!isSuperAdmin && targetCorporateForRates === "admin") return; // Default behavior for non-admins

    const pSaved =
      localStorage.getItem(effectivePricingKey) ||
      localStorage.getItem(ADMIN_PRICING_KEY);
    const pkgSaved =
      localStorage.getItem(effectivePackagesKey) ||
      localStorage.getItem(ADMIN_PACKAGES_KEY);

    const defaults = {
      Sedan: DEFAULT_PRICING_SEDAN,
      SUV: DEFAULT_PRICING_SUV,
      "3 Wheeler Auto": DEFAULT_PRICING_AUTO,
      "Tata Ace": DEFAULT_PRICING_ACE,
      Pickup: DEFAULT_PRICING_PICKUP,
      "BADA DOST": DEFAULT_PRICING_BADA_DOST,
    };

    if (pSaved) {
      try {
        const parsed = JSON.parse(pSaved);
        const merged = { ...defaults };
        Object.keys(parsed).forEach((key) => {
          const vKey = key as VehicleType;
          if (merged[vKey]) {
            merged[vKey] = { ...merged[vKey], ...parsed[vKey] };
          }
        });
        setPricing(merged);
      } catch (e) {
        console.error("Error parsing pricing rules:", e);
      }
    } else {
      setPricing(defaults);
    }

    if (pkgSaved) {
      try {
        const parsed = JSON.parse(pkgSaved);
        setRentalPackages(
          (parsed as RentalPackage[]).map((pkg) => ({
            ...pkg,
            priceAuto: pkg.priceAuto ?? 0,
            priceAce: pkg.priceAce ?? 0,
            pricePickup: pkg.pricePickup ?? 0,
            priceBadaDost: pkg.priceBadaDost ?? 0,
          })),
        );
      } catch (e) {
        console.error("Error parsing rental packages:", e);
      }
    } else {
      setRentalPackages(DEFAULT_RENTAL_PACKAGES);
    }
  }, [
    effectivePricingKey,
    effectivePackagesKey,
    isSuperAdmin,
    targetCorporateForRates,
  ]);

  useEffect(() => {
    localStorage.setItem(effectivePackagesKey, safeStringify(rentalPackages));
  }, [rentalPackages, effectivePackagesKey]);

  useEffect(() => {
    localStorage.setItem(effectivePricingKey, safeStringify(pricing));
  }, [pricing, effectivePricingKey]);

  // Listen for storage changes to sync across tabs or after manual refresh from cloud
  useEffect(() => {
    const handleStorageChange = () => {
      const pSaved =
        localStorage.getItem(effectivePricingKey) ||
        localStorage.getItem(ADMIN_PRICING_KEY);
      const pkgSaved =
        localStorage.getItem(effectivePackagesKey) ||
        localStorage.getItem(ADMIN_PACKAGES_KEY);

      const defaults = {
        Sedan: DEFAULT_PRICING_SEDAN,
        SUV: DEFAULT_PRICING_SUV,
        "3 Wheeler Auto": DEFAULT_PRICING_AUTO,
        "Tata Ace": DEFAULT_PRICING_ACE,
        Pickup: DEFAULT_PRICING_PICKUP,
        "BADA DOST": DEFAULT_PRICING_BADA_DOST,
      };

      if (pSaved) {
        try {
          const parsed = JSON.parse(pSaved);
          const merged = { ...defaults };
          Object.keys(parsed).forEach((key) => {
            const vKey = key as VehicleType;
            if (merged[vKey]) {
              merged[vKey] = { ...merged[vKey], ...parsed[vKey] };
            }
          });
          setPricing(merged);
        } catch (e) {
          console.error("Error parsing pricing rules on sync:", e);
        }
      }

      if (pkgSaved) {
        try {
          const parsed = JSON.parse(pkgSaved);
          setRentalPackages(
            (parsed as RentalPackage[]).map((pkg) => ({
              ...pkg,
              priceAuto: pkg.priceAuto ?? 0,
              priceAce: pkg.priceAce ?? 0,
              pricePickup: pkg.pricePickup ?? 0,
              priceBadaDost: pkg.priceBadaDost ?? 0,
            })),
          );
        } catch (e) {
          console.error("Error parsing rental packages on sync:", e);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [effectivePricingKey, effectivePackagesKey]);

  useEffect(() => {
    const corps = JSON.parse(
      localStorage.getItem("corporate_accounts") || "[]",
    );
    const adminStaff = JSON.parse(localStorage.getItem("staff_data") || "[]");
    let staff: Employee[] = [
      ...adminStaff.map((s: Employee) => ({ ...s, owner: "admin" })),
    ];
    corps.forEach((c: CorporateAccount) => {
      const cStaff = JSON.parse(
        localStorage.getItem(`staff_data_${c.email}`) || "[]",
      );
      staff = [
        ...staff,
        ...cStaff.map((s: Employee) => ({ ...s, owner: c.email })),
      ];
    });
    setAllStaff(staff);
  }, [isSuperAdmin, sessionId]);

  useEffect(() => {
    if (window.gm_authFailure_detected) {
      setMapError("Billing Not Enabled: Enable billing on Google Cloud.");
      return;
    }
    const apiKey =
      HARDCODED_MAPS_API_KEY || localStorage.getItem("maps_api_key");
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

    if (window.google && window.google.maps && window.google.maps.places) {
      setIsMapReady(true);
      return;
    }

    const scriptId = "google-maps-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    if (!script) {
      script = document.createElement("script");
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
      script.onerror = () =>
        setMapError("Network error: Failed to load Google Maps script.");
      document.head.appendChild(script);
    } else {
      script.addEventListener("load", () => {
        if (window.google && window.google.maps && window.google.maps.places) {
          setIsMapReady(true);
        }
      });
      // If script exists but onload hasn't fired yet, the listener above handles it.
      // If it's already loaded but window.google wasn't ready when we checked,
      // we can check again after a short delay or just rely on the fact that
      // if it's loaded, window.google should be there.
      if (window.google && window.google.maps && window.google.maps.places) {
        setIsMapReady(true);
      }
    }
  }, []);

  useEffect(() => {
    if (
      !isMapReady ||
      !window.google ||
      !window.google.maps.DistanceMatrixService ||
      !pickupCoords
    )
      return;
    const service = new window.google.maps.DistanceMatrixService();
    const calculateSequentialDistance = async () => {
      let totalKm = 0;
      const legs: number[] = [];
      const locations = [pickupCoords];
      if (tripType === "Local")
        transportDetails.drops.forEach((d) => {
          if (d.coords) locations.push(d.coords);
        });
      else if (tripType === "Outstation") {
        transportDetails.outstationWaypoints.forEach((w) => {
          if (w.coords) locations.push(w.coords);
        });
        if (destCoords) locations.push(destCoords);
        // For Round Trip, explicitly add return to origin to ensure leg distances sum up to total
        if (outstationSubType === "RoundTrip") locations.push(pickupCoords);
      }
      if (locations.length < 2) return;
      for (let i = 0; i < locations.length - 1; i++) {
        const start = locations[i];
        const end = locations[i + 1];
        try {
          const response: google.maps.DistanceMatrixResponse =
            await new Promise((resolve, reject) => {
              service.getDistanceMatrix(
                {
                  origins: [start],
                  destinations: [end],
                  travelMode: window.google.maps.TravelMode.DRIVING,
                  unitSystem: window.google.maps.UnitSystem.METRIC,
                },
                (res, status) => {
                  if (status === "OK" && res) resolve(res);
                  else reject(status);
                },
              );
            });
          if (response.rows[0].elements[0].status === "OK") {
            const dist = response.rows[0].elements[0].distance.value / 1000;
            totalKm += dist;
            legs.push(dist);
          }
        } catch (err) {
          console.error("Distance Matrix Error:", err);
          const errStr = String(err);
          if (
            errStr.includes("REQUEST_DENIED") ||
            errStr.includes("not activated")
          ) {
            setMapError(
              "Maps APIs Not Enabled: Please enable 'Distance Matrix API' and 'Geocoding API' in Google Cloud Console: https://console.cloud.google.com/apis/library?filter=category:maps",
            );
          }
        }
      }
      setTransportDetails((prev) => ({
        ...prev,
        [tripType === "Outstation" ? "estTotalKm" : "estKm"]:
          totalKm.toFixed(1),
        legDistances: legs,
      }));
    };
    calculateSequentialDistance();
  }, [
    pickupCoords,
    transportDetails.drops,
    transportDetails.outstationWaypoints,
    destCoords,
    isMapReady,
    tripType,
    outstationSubType,
  ]);


  const rules = pricing[vehicleType];

  const handlePricingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPricing((prev) => ({
      ...prev,
      [settingsVehicleType]: {
        ...prev[settingsVehicleType],
        [name]: parseFloat(value) || 0,
      },
    }));
  };

  const handleAddPackage = () => {
    if (!newPackage.name) {
      alert("Please fill in package name.");
      return;
    }
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
      priceBadaDost: parseFloat(newPackage.priceBadaDost) || 0,
      extraHrRate: parseFloat(newPackage.extraHrRate) || 0,
      extraKmRate: parseFloat(newPackage.extraKmRate) || 0,
    };

    if (editingPackageId) {
      setRentalPackages(
        rentalPackages.map((pkg) =>
          pkg.id === editingPackageId ? pkgData : pkg,
        ),
      );
      setEditingPackageId(null);
    } else {
      setRentalPackages([...rentalPackages, pkgData]);
    }
    setShowAddPackage(false);
    setNewPackage({
      name: "",
      hours: "",
      km: "",
      priceSedan: "",
      priceSuv: "",
      priceAuto: "",
      priceAce: "",
      pricePickup: "",
      priceBadaDost: "",
      extraHrRate: "",
      extraKmRate: "",
    });
    syncToCloud();
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
      pricePickup: pkg.pricePickup.toString(),
      priceBadaDost: pkg.priceBadaDost.toString(),
      extraHrRate: (pkg.extraHrRate || 0).toString(),
      extraKmRate: (pkg.extraKmRate || 0).toString(),
    });
    setShowAddPackage(true);
  };

  const handleCancelEditPackage = () => {
    setEditingPackageId(null);
    setNewPackage({
      name: "",
      hours: "",
      km: "",
      priceSedan: "",
      priceSuv: "",
      priceAuto: "",
      priceAce: "",
      pricePickup: "",
      priceBadaDost: "",
      extraHrRate: "",
      extraKmRate: "",
    });
    setShowAddPackage(false);
  };

  const removePackage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Remove this package?")) {
      setRentalPackages((prev) => prev.filter((p) => p.id !== id));
      if (transportDetails.packageId === id)
        setTransportDetails((prev) => ({ ...prev, packageId: "" }));
      if (editingPackageId === id) handleCancelEditPackage();
      syncToCloud();
    }
  };

  const handleAddDrop = () =>
    setTransportDetails((prev) => ({
      ...prev,
      drops: [...prev.drops, { address: "", coords: null }],
    }));
  const handleRemoveDrop = (index: number) =>
    setTransportDetails((prev) => {
      const newDrops = prev.drops.filter((_, i) => i !== index);
      if (newDrops.length === 0)
        return { ...prev, drops: [{ address: "", coords: null }] };
      return { ...prev, drops: newDrops };
    });
  const handleDropChange = (
    index: number,
    address: string,
    coords: { lat: number; lng: number } | null,
    date?: string,
  ) =>
    setTransportDetails((prev) => {
      const newDrops = [...prev.drops];
      newDrops[index] = {
        ...newDrops[index],
        address,
        coords,
        date: date ?? newDrops[index].date,
      };
      return { ...prev, drops: newDrops };
    });

  const handleAddWaypoint = () =>
    setTransportDetails((prev) => ({
      ...prev,
      outstationWaypoints: [
        ...prev.outstationWaypoints,
        { address: "", coords: null, date: "" },
      ],
    }));
  const handleRemoveWaypoint = (index: number) =>
    setTransportDetails((prev) => ({
      ...prev,
      outstationWaypoints: prev.outstationWaypoints.filter(
        (_, i) => i !== index,
      ),
    }));
  const handleWaypointChange = (
    index: number,
    address: string,
    coords: { lat: number; lng: number } | null,
    date?: string,
  ) =>
    setTransportDetails((prev) => {
      const newWaypoints = [...prev.outstationWaypoints];
      newWaypoints[index] = {
        ...newWaypoints[index],
        address,
        coords,
        date: date ?? newWaypoints[index].date,
      };
      return { ...prev, outstationWaypoints: newWaypoints };
    });

  // Auto calculate nights and days based on travel date and destination date
  useEffect(() => {
    if (
      tripType === "Outstation" &&
      customerDetails.travelDate &&
      transportDetails.destinationDate
    ) {
      const start = new Date(customerDetails.travelDate);
      const end = new Date(transportDetails.destinationDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const diffTime = end.getTime() - start.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays >= 0) {
          setTransportDetails((prev) => ({
            ...prev,
            days: String(diffDays + 1),
            nights: String(diffDays),
          }));
        }
      }
    }
  }, [customerDetails.travelDate, transportDetails.destinationDate, tripType]);

  // Calculation Logic Updated
  useEffect(() => {
    let total = 0;
    const rules = pricing[vehicleType];
    let breakup: FareItem[] = [];
    let msg = "";

    if (enquiryCategory === "General") {
      total = 0;
      breakup = [];
      msg = `Hello ${customerDetails.name || "Sir/Madam"},\nThank you for contacting OK BOZ. \n\nRegarding your enquiry:\n"${customerDetails.requirements || "General Requirement"}"\n\nWe have received your request and our team will get back to you shortly.\n\nRegards,\nOK BOZ Support Team`;
    } else if (tripType === "Local") {
      const base = rules.localBaseFare;
      const km = parseFloat(transportDetails.estKm) || 0;
      const extraKmVal = Math.max(0, km - rules.localBaseKm);
      const extraKmCost = extraKmVal * rules.localPerKmRate;
      const waitCost =
        (parseFloat(transportDetails.waitingMins) || 0) *
        rules.localWaitingRate;

      total = base + extraKmCost + waitCost;

      breakup.push({
        label: "Base Fare",
        value: base,
        description: `${rules.localBaseKm} KM Included`,
        type: "base",
      });
      if (extraKmCost > 0)
        breakup.push({
          label: "Extra KM",
          value: extraKmCost,
          description: `${extraKmVal.toFixed(1)} KM`,
          type: "extra",
        });
      if (waitCost > 0)
        breakup.push({
          label: "Waiting",
          value: waitCost,
          description: `${transportDetails.waitingMins} Mins`,
          type: "extra",
        });

      msg =
        `Hello ${customerDetails.name || "Customer"},\nHere is your *Local Trip* estimate from OK BOZ! 🚕\n\n` +
        `🚘 Vehicle: ${vehicleType}\n` +
        (customerDetails.travelDate
          ? `📅 Date: ${customerDetails.travelDate}${customerDetails.travelTime ? ` @ ${customerDetails.travelTime}` : ""}\n`
          : "") +
        `📍 Pickup: ${customerDetails.pickup || "TBD"}\n` +
        `${transportDetails.drops
          .filter((d) => d.address)
          .map((d, i) => `📍 Drop ${i + 1}: ${d.address}`)
          .join("\n")}\n\n` +
        `*Fare Breakdown:*\n` +
        `• Base Fare: ₹${base.toFixed(2)} (Upto ${rules.localBaseKm} KM)\n` +
        `• Extra KM: ₹${extraKmCost.toFixed(2)} (${extraKmVal.toFixed(1)} KM @ ₹${rules.localPerKmRate})\n` +
        `• Waiting: ₹${waitCost.toFixed(2)} (${transportDetails.waitingMins} Mins @ ₹${rules.localWaitingRate}/min)\n`;
    } else if (tripType === "Rental") {
      const pkg = rentalPackages.find(
        (p) => p.id === transportDetails.packageId,
      );
      if (pkg) {
        let pkgPrice = 0;
        if (vehicleType === "Sedan") pkgPrice = pkg.priceSedan;
        else if (vehicleType === "SUV") pkgPrice = pkg.priceSuv;
        else if (vehicleType === "3 Wheeler Auto") pkgPrice = pkg.priceAuto;
        else if (vehicleType === "Tata Ace") pkgPrice = pkg.priceAce;
        else if (vehicleType === "Pickup") pkgPrice = pkg.pricePickup;
        else if (vehicleType === "BADA DOST") pkgPrice = pkg.priceBadaDost;

        const extraKm = parseFloat(transportDetails.extraKm) || 0;
        const extraHr = parseFloat(transportDetails.extraHr) || 0;
        const extraKmRate = pkg.extraKmRate || rules.rentalExtraKmRate;
        const extraHrRate = pkg.extraHrRate || rules.rentalExtraHrRate;

        const extraKmCost = extraKm * extraKmRate;
        const extraHrCost = extraHr * extraHrRate;

        total = pkgPrice + extraKmCost + extraHrCost;

        breakup.push({
          label: "Package Rate",
          value: pkgPrice,
          description: pkg.name,
          type: "base",
        });
        if (extraKmCost > 0)
          breakup.push({
            label: "Extra KM",
            value: extraKmCost,
            description: `${extraKm} KM`,
            type: "extra",
          });
        if (extraHrCost > 0)
          breakup.push({
            label: "Extra Hours",
            value: extraHrCost,
            description: `${extraHr} Hr`,
            type: "extra",
          });

        msg =
          `Hello ${customerDetails.name || "Customer"},\nHere is your *Rental Package* estimate from OK BOZ! 🚕\n\n` +
          `🚘 Vehicle: ${vehicleType}\n` +
          (customerDetails.travelDate
            ? `📅 Date: ${customerDetails.travelDate}${customerDetails.travelTime ? ` @ ${customerDetails.travelTime}` : ""}\n`
            : "") +
          `📍 Pickup: ${customerDetails.pickup || "TBD"}\n` +
          `📦 Package: ${pkg.name}\n\n` +
          `*Fare Breakdown:*\n` +
          `• Package Price: ₹${pkgPrice.toFixed(2)}\n` +
          (extraKmCost > 0
            ? `• Extra KM: ₹${extraKmCost.toFixed(2)} (${extraKm} KM @ ₹${extraKmRate})\n`
            : "") +
          (extraHrCost > 0
            ? `• Extra Hours: ₹${extraHrCost.toFixed(2)} (${extraHr} Hr @ ₹${extraHrRate})\n`
            : "");
      }
    } else {
      const getCityName = (addr: string) =>
        addr ? addr.split(",")[0].trim() : "";
      const days = parseFloat(transportDetails.days) || 1;
      const km = parseFloat(transportDetails.estTotalKm) || 0;
      const driverAllowance = rules.outstationDriverAllowance * days;
      const perKmRate = rules.outstationExtraKmRate;
      const minKmPerDay = rules.outstationMinKmPerDay;
      const hillsAllowanceRate = rules.outstationHillsAllowance;
      const nightAllowanceRate = rules.outstationNightAllowance;

      if (outstationSubType === "RoundTrip") {
        const minKm = days * minKmPerDay;
        const chargeKm = Math.max(km, minKm);
        const kmCharges = chargeKm * perKmRate;
        const nightAllowance =
          (parseFloat(transportDetails.nights) || 0) * nightAllowanceRate;
        const hillsAllowance = transportDetails.isHillsTrip
          ? hillsAllowanceRate * days
          : 0;

        const extraKm = parseFloat(transportDetails.extraKm) || 0;
        let extraHr = parseFloat(transportDetails.extraHr) || 0;

        // Auto-calculate extraHr for Round Trip if totalTripHrs is provided
        if (outstationSubType === "RoundTrip" && transportDetails.totalTripHrs) {
          const totalHrs = parseFloat(transportDetails.totalTripHrs) || 0;
          const freeHrs = rules.outstationRoundTripFreeHours || 0;
          if (totalHrs > freeHrs && (extraHr === 0 || extraHr === null)) {
            extraHr = totalHrs - freeHrs;
          }
        }

        const extraKmCost = extraKm * perKmRate;
        const extraHrCost = extraHr * rules.outstationExtraHrRate;
        const tollCharge = parseFloat(transportDetails.tollCharge) || 0;

        total =
          kmCharges +
          driverAllowance +
          nightAllowance +
          hillsAllowance +
          extraKmCost +
          extraHrCost +
          tollCharge;

        breakup.push({
          label: "KM Charges",
          value: kmCharges,
          description: `${chargeKm.toFixed(1)} KM`,
          type: "base",
        });
        breakup.push({
          label: "Driver Allw",
          value: driverAllowance,
          description: `${days} Days`,
          type: "allowance",
        });
        if (nightAllowance > 0)
          breakup.push({
            label: "Night Allw",
            value: nightAllowance,
            description: `${transportDetails.nights} Nights`,
            type: "allowance",
          });
        if (hillsAllowance > 0)
          breakup.push({
            label: "Hills Allw",
            value: hillsAllowance,
            description: `${days} Days`,
            type: "allowance",
          });
        if (extraKmCost > 0)
          breakup.push({
            label: "Extra KM",
            value: extraKmCost,
            description: `${extraKm} KM`,
            type: "extra",
          });
        if (extraHrCost > 0) {
          const totalHrs = parseFloat(transportDetails.totalTripHrs) || 0;
          const freeHrs = rules.outstationRoundTripFreeHours || 0;
          breakup.push({
            label: "Extra Hours",
            value: extraHrCost,
            description: `${extraHr} Hr${totalHrs > 0 && freeHrs > 0 ? ` (${totalHrs}h - ${freeHrs}h free)` : ""}`,
            type: "extra",
          });
        }
        if (tollCharge > 0)
          breakup.push({
            label: "Toll & Parking",
            value: tollCharge,
            description: `Actuals`,
            type: "extra",
          });

        const kmBreakup =
          transportDetails.legDistances.length > 0
            ? `*Leg Wise Details:*\n` +
              transportDetails.legDistances
                .map((d, i) => {
                  let fromLabel = "";
                  let toLabel = "";
                  let dateInfo = "";
                  const numWaypoints =
                    transportDetails.outstationWaypoints.length;
                  if (i === 0) {
                    fromLabel = getCityName(customerDetails.pickup) || "Pickup City";
                    if (numWaypoints > 0) {
                      toLabel =
                        getCityName(
                          transportDetails.outstationWaypoints[0].address,
                        ) || "Waypoint City";
                      dateInfo = transportDetails.outstationWaypoints[0].date
                        ? ` [${transportDetails.outstationWaypoints[0].date}]`
                        : "";
                    } else {
                      toLabel =
                        getCityName(transportDetails.destination) ||
                        "Final Destination City";
                      dateInfo = transportDetails.destinationDate
                        ? ` [${transportDetails.destinationDate}]`
                        : "";
                    }
                  } else if (i <= numWaypoints) {
                    fromLabel =
                      getCityName(
                        transportDetails.outstationWaypoints[i - 1].address,
                      ) || `Waypoint City`;
                    if (i === numWaypoints) {
                      toLabel =
                        getCityName(transportDetails.destination) ||
                        "Final Destination City";
                      dateInfo = transportDetails.destinationDate
                        ? ` [${transportDetails.destinationDate}]`
                        : "";
                    } else {
                      toLabel =
                        getCityName(
                          transportDetails.outstationWaypoints[i].address,
                        ) || `Waypoint City`;
                      dateInfo = transportDetails.outstationWaypoints[i].date
                        ? ` [${transportDetails.outstationWaypoints[i].date}]`
                        : "";
                    }
                  } else if (
                    outstationSubType === "RoundTrip" &&
                    i === transportDetails.legDistances.length - 1
                  ) {
                    fromLabel =
                      getCityName(transportDetails.destination) ||
                      "Final Destination City";
                    toLabel = `Return to ${getCityName(customerDetails.pickup) || "Pickup City"}`;
                  }
                  return `• ${fromLabel} ➔ ${toLabel}: ${d.toFixed(1)} KM${dateInfo}`;
                })
                .join("\n") +
              "\n\n"
            : "";

        msg =
          `Hello ${customerDetails.name || "Customer"},\nHere is your *Outstation Round-Trip* estimate from OK BOZ! 🚕\n\n` +
          `🚘 Vehicle: ${vehicleType}\n` +
          (customerDetails.travelDate
            ? `📅 Date: ${customerDetails.travelDate}${customerDetails.travelTime ? ` @ ${customerDetails.travelTime}` : ""}\n`
            : "") +
          `📍 Pickup City: ${customerDetails.pickup || "TBD"}${customerDetails.travelDate ? ` (on ${customerDetails.travelDate})` : ""}\n` +
          `${transportDetails.outstationWaypoints
            .filter((w) => w.address)
            .map(
              (w) =>
                `📍 ${getCityName(w.address) || "Waypoint"} City: ${w.address}${w.date ? ` (on ${w.date})` : ""}`,
            )
            .join("\n")}\n` +
          `🌍 Final Destination City: ${transportDetails.destination}${transportDetails.destinationDate ? ` (on ${transportDetails.destinationDate})` : ""}\n\n` +
          kmBreakup +
          `*Trip Parameters:*\n` +
          `• Days: ${days}\n` +
          `• Approx KM: ${km} KM\n` +
          `• Min KM/Day: ${minKmPerDay} KM\n` +
          `• Per KM Rate: ₹${perKmRate.toFixed(2)}\n\n` +
          `*Fare Breakdown:*\n` +
          `• KM Charges: ₹${kmCharges.toFixed(2)} (${chargeKm.toFixed(1)} KM)\n` +
          `• Driver Allw.: ₹${driverAllowance.toFixed(2)} (${days} Days @ ₹${rules.outstationDriverAllowance})\n` +
          (nightAllowance > 0
            ? `• Night Allw.: ₹${nightAllowance.toFixed(2)} (${transportDetails.nights} Nights)\n`
            : "") +
          (hillsAllowance > 0
            ? `• Hills Allw.: ₹${hillsAllowance.toFixed(2)} (${days} Days @ ₹${hillsAllowanceRate})\n`
            : "") +
          (extraKmCost > 0
            ? `• Extra KM: ₹${extraKmCost.toFixed(2)} (${extraKm} KM)\n`
            : "") +
          (extraHrCost > 0
            ? `• Extra Hours: ₹${extraHrCost.toFixed(2)} (${extraHr} Hr${parseFloat(transportDetails.totalTripHrs) > 0 && rules.outstationRoundTripFreeHours > 0 ? ` [${transportDetails.totalTripHrs}h - ${rules.outstationRoundTripFreeHours}h free]` : ""})\n`
            : "") +
          (tollCharge > 0
            ? `• Toll & Parking: ₹${tollCharge.toFixed(2)}\n`
            : "");
      } else {
        const baseFare = rules.outstationBaseRate;
        const baseKm = rules.outstationBaseKm || 0;
        const perKmRate =
          rules.outstationOneWayExtraKmRate || rules.outstationExtraKmRate; // Use One Way Rate
        const extraKmVal = Math.max(0, km - baseKm);
        const kmCharges = extraKmVal * perKmRate;
        const hillsAllowance = transportDetails.isHillsTrip
          ? hillsAllowanceRate * days
          : 0;

        const extraKm = parseFloat(transportDetails.extraKm) || 0;
        const extraHr = parseFloat(transportDetails.extraHr) || 0;
        const extraKmCost = extraKm * perKmRate;
        const extraHrCost = extraHr * rules.outstationExtraHrRate;
        const tollCharge = parseFloat(transportDetails.tollCharge) || 0;

        total =
          baseFare +
          kmCharges +
          driverAllowance +
          hillsAllowance +
          extraKmCost +
          extraHrCost +
          tollCharge;

        if (baseFare > 0)
          breakup.push({
            label: "Base Fare",
            value: baseFare,
            description: `${baseKm} KM Included`,
            type: "base",
          });
        if (kmCharges > 0)
          breakup.push({
            label: "KM Charges",
            value: kmCharges,
            description: `${extraKmVal.toFixed(1)} KM`,
            type: "base",
          });
        breakup.push({
          label: "Driver Allw",
          value: driverAllowance,
          description: `${days} Days`,
          type: "allowance",
        });
        if (hillsAllowance > 0)
          breakup.push({
            label: "Hills Allw",
            value: hillsAllowance,
            description: `${days} Days`,
            type: "allowance",
          });
        if (extraKmCost > 0)
          breakup.push({
            label: "Extra KM",
            value: extraKmCost,
            description: `${extraKm} KM`,
            type: "extra",
          });
        if (extraHrCost > 0)
          breakup.push({
            label: "Extra Hours",
            value: extraHrCost,
            description: `${extraHr} Hr`,
            type: "extra",
          });
        if (tollCharge > 0)
          breakup.push({
            label: "Toll & Parking",
            value: tollCharge,
            description: `Actuals`,
            type: "extra",
          });

        const kmBreakup =
          transportDetails.legDistances.length > 0
            ? `*Leg Wise Details:*\n` +
              transportDetails.legDistances
                .map((d, i) => {
                  let fromLabel = "";
                  let toLabel = "";
                  let dateInfo = "";
                  const numWaypoints =
                    transportDetails.outstationWaypoints.length;
                  if (i === 0) {
                    fromLabel = getCityName(customerDetails.pickup) || "Pickup City";
                    if (numWaypoints > 0) {
                      toLabel =
                        getCityName(
                          transportDetails.outstationWaypoints[0].address,
                        ) || "Waypoint City";
                      dateInfo = transportDetails.outstationWaypoints[0].date
                        ? ` [${transportDetails.outstationWaypoints[0].date}]`
                        : "";
                    } else {
                      toLabel =
                        getCityName(transportDetails.destination) ||
                        "Final Destination City";
                      dateInfo = transportDetails.destinationDate
                        ? ` [${transportDetails.destinationDate}]`
                        : "";
                    }
                  } else if (i <= numWaypoints) {
                    fromLabel =
                      getCityName(
                        transportDetails.outstationWaypoints[i - 1].address,
                      ) || `Waypoint City`;
                    if (i === numWaypoints) {
                      toLabel =
                        getCityName(transportDetails.destination) ||
                        "Final Destination City";
                      dateInfo = transportDetails.destinationDate
                        ? ` [${transportDetails.destinationDate}]`
                        : "";
                    } else {
                      toLabel =
                        getCityName(
                          transportDetails.outstationWaypoints[i].address,
                        ) || `Waypoint City`;
                      dateInfo = transportDetails.outstationWaypoints[i].date
                        ? ` [${transportDetails.outstationWaypoints[i].date}]`
                        : "";
                    }
                  } else if (
                    outstationSubType === "RoundTrip" &&
                    i === transportDetails.legDistances.length - 1
                  ) {
                    fromLabel =
                      getCityName(transportDetails.destination) ||
                      "Final Destination City";
                    toLabel = `Return to ${getCityName(customerDetails.pickup) || "Pickup City"}`;
                  }
                  return `• ${fromLabel} ➔ ${toLabel}: ${d.toFixed(1)} KM${dateInfo}`;
                })
                .join("\n") +
              "\n\n"
            : "";

        msg =
          `Hello ${customerDetails.name || "Customer"},\nHere is your *Outstation One-Way* estimate from OK BOZ! 🚕\n\n` +
          `🚘 Vehicle: ${vehicleType}\n` +
          (customerDetails.travelDate
            ? `📅 Date: ${customerDetails.travelDate}${customerDetails.travelTime ? ` @ ${customerDetails.travelTime}` : ""}\n`
            : "") +
          `📍 Pickup City: ${customerDetails.pickup || "TBD"}${customerDetails.travelDate ? ` (on ${customerDetails.travelDate})` : ""}\n` +
          `${transportDetails.outstationWaypoints
            .filter((w) => w.address)
            .map(
              (w) =>
                `📍 ${getCityName(w.address) || "Waypoint"} City: ${w.address}${w.date ? ` (on ${w.date})` : ""}`,
            )
            .join("\n")}\n` +
          `🌍 Final Destination City: ${transportDetails.destination}${transportDetails.destinationDate ? ` (on ${transportDetails.destinationDate})` : ""}\n\n` +
          kmBreakup +
          `*Trip Parameters:*\n` +
          `• Approx KM: ${km} KM\n` +
          `• Base Fare: ₹${baseFare.toFixed(2)} (upto ${baseKm} KM)\n` +
          `• Extra KM Rate: ₹${perKmRate.toFixed(2)}/KM\n\n` +
          `*Fare Breakdown:*\n` +
          (baseFare > 0 ? `• Base Fare: ₹${baseFare.toFixed(2)}\n` : "") +
          (kmCharges > 0
            ? `• KM Charges: ₹${kmCharges.toFixed(2)} (${extraKmVal.toFixed(1)} KM)\n`
            : "") +
          `• Driver Allw.: ₹${driverAllowance.toFixed(2)} (${days} Days @ ₹${rules.outstationDriverAllowance})\n` +
          (hillsAllowance > 0
            ? `• Hills Allw.: ₹${hillsAllowance.toFixed(2)} (${days} Days @ ₹${hillsAllowanceRate})\n`
            : "") +
          (extraKmCost > 0
            ? `• Extra KM: ₹${extraKmCost.toFixed(2)} (${extraKm} KM)\n`
            : "") +
          (extraHrCost > 0
            ? `• Extra Hours: ₹${extraHrCost.toFixed(2)} (${extraHr} Hr${rules.outstationRoundTripFreeHours > 0 ? ` [after ${rules.outstationRoundTripFreeHours}h free]` : ""})\n`
            : "") +
          (tollCharge > 0
            ? `• Toll & Parking: ₹${tollCharge.toFixed(2)}\n`
            : "");
      }
    }

    if (total > 0) {
      if (tripType !== "Outstation") {
        const gst = Math.round(total * 0.05); // 5% GST
        breakup.push({ label: "GST (5%)", value: gst, type: "tax" });
        total += gst;
        msg += `• GST (5%): ₹${gst.toFixed(2)}\n\n`;
      }
      msg += `💰 *Total Estimate: ₹${total.toFixed(2)}*\n`;

      let footer = `(Tolls & Parking Charges Extra as per actuals.)\n`;
      if (tripType === "Outstation") {
        const currentRules = pricing[vehicleType];
        const kmRate =
          outstationSubType === "OneWay"
            ? currentRules.outstationOneWayExtraKmRate ||
              currentRules.outstationExtraKmRate
            : currentRules.perKmRate || currentRules.outstationExtraKmRate;
        footer += `*Extra KM Rate:* ₹${kmRate}/KM\n*Extra HR Rate:* ₹${currentRules.outstationExtraHrRate}/HR\n`;
      }
      msg += footer + `\nBook now with OK BOZ!`;
    }

    setEstimatedCost(total);
    setFareBreakup(breakup);
    setGeneratedMessage(msg);
  }, [
    estimatedCost,
    customerDetails,
    transportDetails,
    tripType,
    vehicleType,
    pricing,
    rentalPackages,
    enquiryCategory,
    outstationSubType,
  ]);

  const saveOrder = async (
    status: OrderStatus,
    scheduleInfo?: {
      date: string;
      time: string;
      priority?: "Hot" | "Warm" | "Cold";
    },
  ) => {
    if (!customerDetails.name || !customerDetails.phone) {
      alert("Please enter Customer Name and Phone.");
      return;
    }
    const detailsText =
      enquiryCategory === "Transport"
        ? `[${vehicleType} - ${tripType}] Estimate: ₹${estimatedCost}`
        : customerDetails.requirements;
    if (!detailsText.trim()) {
      alert("Please enter details.");
      return;
    }

    const newEnquiry: Enquiry = {
      id: editingOrderId || `ORD-${Date.now()}`,
      type: "Customer",
      initialInteraction: "Incoming",
      name: customerDetails.name,
      phone: customerDetails.phone,
      email: customerDetails.email,
      city: "Coimbatore",
      details: detailsText,
      status: status,
      assignedTo: isEmployee ? sessionId : assignment.staffId,
      assignedCorporate: isSuperAdmin ? assignment.corporateId : corporateEmail,
      assignedBranch: assignment.branchName,
      createdAt: new Date().toLocaleString(),
      history: [
        {
          id: Date.now(),
          type: "Note",
          message: `Order ${status}. Est: ₹${estimatedCost}`,
          date: new Date().toLocaleString(),
          outcome: "Completed",
        },
      ],
      date:
        customerDetails.travelDate ||
        (scheduleInfo
          ? scheduleInfo.date
          : new Date().toISOString().split("T")[0]),
      time: customerDetails.travelTime,
      nextFollowUp: scheduleInfo
        ? `${scheduleData.date}T${scheduleData.time}`
        : undefined,
      priority: scheduleInfo?.priority,
      enquiryCategory,
      tripType,
      vehicleType,
      outstationSubType,
      transportData:
        enquiryCategory === "Transport"
          ? {
              // Explicitly pick fields to avoid circular references from spread
              estKm: String(transportDetails.estKm || ""),
              waitingMins: String(transportDetails.waitingMins || ""),
              packageId: String(transportDetails.packageId || ""),
              extraHr: String(transportDetails.extraHr || ""),
              extraKm: String(transportDetails.extraKm || ""),
              tollCharge: String(transportDetails.tollCharge || ""),
              destination: String(transportDetails.destination || ""),
              days: String(transportDetails.days || "1"),
              estTotalKm: String(transportDetails.estTotalKm || ""),
              nights: String(transportDetails.nights || "0"),
              isHillsTrip: !!transportDetails.isHillsTrip,
              legDistances: Array.isArray(transportDetails.legDistances)
                ? [...transportDetails.legDistances]
                : [],
              drops: transportDetails.drops.map((d) => ({
                address: String(d.address || ""),
                coords: d.coords
                  ? { lat: Number(d.coords.lat), lng: Number(d.coords.lng) }
                  : null,
              })),
              outstationWaypoints: transportDetails.outstationWaypoints.map(
                (w) => ({
                  address: String(w.address || ""),
                  coords: w.coords
                    ? { lat: Number(w.coords.lat), lng: Number(w.coords.lng) }
                    : null,
                }),
              ),
              drop: transportDetails.drops[0]?.address,
            }
          : undefined,
      estimatedPrice: estimatedCost,
    };

    const updatedList = editingOrderId
      ? enquiries.map((e) => (e.id === editingOrderId ? newEnquiry : e))
      : [newEnquiry, ...enquiries];
    setEnquiries(updatedList);
    localStorage.setItem("global_enquiries_data", safeStringify(updatedList));
    syncToCloud();
    alert(`Success: ${status}`);
    handleCancelForm();
  };

  const handleCancelForm = () => {
    setCustomerDetails({
      name: "",
      phone: "",
      email: "",
      pickup: "",
      requirements: "",
      travelDate: "",
      travelTime: "",
    });
    setTransportDetails({
      drops: [{ address: "", coords: null }],
      outstationWaypoints: [],
      estKm: "",
      waitingMins: "",
      packageId: "",
      extraHr: "",
      extraKm: "",
      tollCharge: "",
      destination: "",
      days: "1",
      estTotalKm: "",
      nights: "0",
      isHillsTrip: false,
      legDistances: [],
    });
    setGeneratedMessage("");
    setEstimatedCost(0);
    setEditingOrderId(null);
  };

  const handleEditOrder = (order: Enquiry) => {
    setEditingOrderId(order.id);
    setCustomerDetails({
      name: order.name,
      phone: order.phone,
      email: order.email || "",
      pickup: "",
      requirements: order.enquiryCategory === "General" ? order.details : "",
      travelDate: order.date || "",
      travelTime: order.time || "",
    });
    setEnquiryCategory(order.enquiryCategory || "General");
    if (order.transportData) {
      setTripType(order.tripType || "Local");
      setVehicleType(order.vehicleType || "Sedan");
      const td = order.transportData;
      setTransportDetails({
        drops: td.drops || [{ address: "", coords: null }],
        outstationWaypoints: td.outstationWaypoints || [],
        estKm: String(td.estKm || ""),
        waitingMins: String(td.waitingMins || ""),
        packageId: String(td.packageId || ""),
        extraHr: String(td.extraHr || ""),
        extraKm: String(td.extraKm || ""),
        tollCharge: String(td.tollCharge || ""),
        destination: String(td.destination || ""),
        days: String(td.days || "1"),
        estTotalKm: String(td.estTotalKm || ""),
        nights: String(td.nights || "0"),
        isHillsTrip: !!td.isHillsTrip,
        legDistances: Array.isArray(td.legDistances)
          ? [...td.legDistances]
          : [],
      });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBookNow = () => saveOrder("Booked");

  const resetFilters = () => {
    setFilterStatus("All");
    setFilterSearch("");
    setFilterCorporate("All");
    setFilterBranch("All");
    setFilterDateType("Month");
    setFilterMonth(new Date().toISOString().slice(0, 7));
    setFilterDate(new Date().toISOString().split("T")[0]);
  };

  const filteredOrders = useMemo(() => {
    return enquiries.filter((order) => {
      // 1. Role-Based Access Control (RBAC)
      let hasAccess = false;
      if (isSuperAdmin) {
        hasAccess = true; // Admin sees all
      } else if (role === UserRole.CORPORATE) {
        // Franchise sees only their own corporate leads
        hasAccess = order.assignedCorporate === sessionId;
      } else if (role === UserRole.EMPLOYEE) {
        // Employee sees only leads assigned to them
        hasAccess = order.assignedTo === sessionId;
      } else if (role === UserRole.SUB_ADMIN) {
        // Sub-admin context check (Head Office sees all, others see their context)
        hasAccess =
          sessionId === "admin" || order.assignedCorporate === sessionId;
      }

      if (!hasAccess) return false;

      // 2. Filters
      const matchesSearch =
        order.name.toLowerCase().includes(filterSearch.toLowerCase()) ||
        order.phone.includes(filterSearch) ||
        order.id.toLowerCase().includes(filterSearch.toLowerCase());
      const matchesStatus =
        filterStatus === "All" || order.status === filterStatus;

      // Corporate Filter (only relevant for Super Admin)
      const matchesCorp = isSuperAdmin
        ? filterCorporate === "All" ||
          order.assignedCorporate === filterCorporate
        : true;

      const matchesBranch =
        filterBranch === "All" || order.assignedBranch === filterBranch;

      let matchesDate = true;
      if (filterDateType === "Date") {
        matchesDate = order.date === filterDate;
      } else if (filterDateType === "Month") {
        matchesDate = order.date?.startsWith(filterMonth) || false;
      }

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCorp &&
        matchesBranch &&
        matchesDate
      );
    });
  }, [
    enquiries,
    filterSearch,
    filterStatus,
    filterCorporate,
    filterBranch,
    filterDateType,
    filterDate,
    filterMonth,
    isSuperAdmin,
    role,
    sessionId,
  ]);

  const getAssignedStaff = (id?: string) => {
    if (!id) return null;
    return allStaff.find((s) => s.id === id);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Headset className="w-8 h-8 text-emerald-600" /> Customer Care
            (Bookings)
          </h2>
          <p className="text-gray-500">
            Create bookings and manage order lifecycle
          </p>
        </div>
        {!isEmployee && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showSettings ? "bg-slate-800 text-white" : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"}`}
            >
              <Settings className="w-4 h-4" />{" "}
              {showSettings ? "Hide Rates" : "Edit Rates"}
            </button>
          </div>
        )}
      </div>

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Edit2 className="w-4 h-4" /> Fare Configuration
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
              {isSuperAdmin && (
                <div className="mb-8 p-6 bg-indigo-50 rounded-3xl border border-indigo-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-black text-indigo-900 text-sm uppercase tracking-widest flex items-center gap-2">
                      <Building2 className="w-4 h-4" /> Account Scope
                    </h4>
                    <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider mt-1">
                      Configure global rates or select a franchise panel
                      override
                    </p>
                  </div>
                  <div className="relative min-w-[280px]">
                    <select
                      value={targetCorporateForRates}
                      onChange={(e) =>
                        setTargetCorporateForRates(e.target.value)
                      }
                      className="w-full pl-6 pr-12 py-3 bg-white border border-indigo-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-indigo-700 outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-sm appearance-none cursor-pointer"
                    >
                      <option value="admin">Global Admin Panel</option>
                      {JSON.parse(
                        localStorage.getItem("corporate_accounts") || "[]",
                      ).map((corp: CorporateAccount) => (
                        <option key={corp.email} value={corp.email}>
                          {corp.companyName} ({corp.email})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 pointer-events-none" />
                  </div>
                </div>
              )}

              <div className="space-y-4 mb-8">
                <div className="space-y-2">
                  <p className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.2em] ml-1">
                    TAXI FLEET
                  </p>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setSettingsVehicleType("Sedan")}
                      className={`flex-1 py-6 px-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${settingsVehicleType === "Sedan" ? "border-emerald-500 bg-emerald-50 shadow-xl shadow-emerald-500/10" : "border-gray-100 hover:border-gray-200 bg-white"}`}
                    >
                      <Car
                        className={`w-8 h-8 ${settingsVehicleType === "Sedan" ? "text-emerald-600" : "text-gray-300"}`}
                      />
                      <span
                        className={`text-xs font-black uppercase tracking-widest ${settingsVehicleType === "Sedan" ? "text-emerald-700" : "text-gray-400"}`}
                      >
                        Sedan
                      </span>
                    </button>
                    <button
                      onClick={() => setSettingsVehicleType("SUV")}
                      className={`flex-1 py-6 px-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${settingsVehicleType === "SUV" ? "border-emerald-500 bg-emerald-50 shadow-xl shadow-emerald-500/10" : "border-gray-100 hover:border-gray-200 bg-white"}`}
                    >
                      <Car
                        className={`w-8 h-8 ${settingsVehicleType === "SUV" ? "text-emerald-600" : "text-gray-300"}`}
                      />
                      <span
                        className={`text-xs font-black uppercase tracking-widest ${settingsVehicleType === "SUV" ? "text-emerald-700" : "text-gray-400"}`}
                      >
                        SUV
                      </span>
                    </button>
                    <div className="flex-[2]"></div> {/* Spacer */}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em] ml-1">
                    LOAD XPRESS
                  </p>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setSettingsVehicleType("3 Wheeler Auto")}
                      className={`flex-1 py-6 px-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${settingsVehicleType === "3 Wheeler Auto" ? "border-blue-500 bg-blue-50 shadow-xl shadow-blue-500/10" : "border-gray-100 hover:border-gray-200 bg-white"}`}
                    >
                      <Truck
                        className={`w-8 h-8 ${settingsVehicleType === "3 Wheeler Auto" ? "text-blue-600" : "text-gray-300"}`}
                      />
                      <span
                        className={`text-xs font-black uppercase tracking-widest ${settingsVehicleType === "3 Wheeler Auto" ? "text-blue-700" : "text-gray-400"}`}
                      >
                        Auto
                      </span>
                    </button>
                    <button
                      onClick={() => setSettingsVehicleType("Tata Ace")}
                      className={`flex-1 py-6 px-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${settingsVehicleType === "Tata Ace" ? "border-blue-500 bg-blue-50 shadow-xl shadow-blue-500/10" : "border-gray-100 hover:border-gray-200 bg-white"}`}
                    >
                      <Truck
                        className={`w-8 h-8 ${settingsVehicleType === "Tata Ace" ? "text-blue-600" : "text-gray-300"}`}
                      />
                      <span
                        className={`text-xs font-black uppercase tracking-widest ${settingsVehicleType === "Tata Ace" ? "text-blue-700" : "text-gray-400"}`}
                      >
                        Tata Ace
                      </span>
                    </button>
                    <button
                      onClick={() => setSettingsVehicleType("Pickup")}
                      className={`flex-1 py-6 px-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${settingsVehicleType === "Pickup" ? "border-blue-500 bg-blue-50 shadow-xl shadow-blue-500/10" : "border-gray-100 hover:border-gray-200 bg-white"}`}
                    >
                      <Truck
                        className={`w-8 h-8 ${settingsVehicleType === "Pickup" ? "text-blue-600" : "text-gray-300"}`}
                      />
                      <span
                        className={`text-xs font-black uppercase tracking-widest ${settingsVehicleType === "Pickup" ? "text-blue-700" : "text-gray-400"}`}
                      >
                        Pickup
                      </span>
                    </button>
                    <button
                      onClick={() => setSettingsVehicleType("BADA DOST")}
                      className={`flex-1 py-6 px-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${settingsVehicleType === "BADA DOST" ? "border-blue-500 bg-blue-50 shadow-xl shadow-blue-500/10" : "border-gray-100 hover:border-gray-200 bg-white"}`}
                    >
                      <Truck
                        className={`w-8 h-8 ${settingsVehicleType === "BADA DOST" ? "text-blue-600" : "text-gray-300"}`}
                      />
                      <span
                        className={`text-xs font-black uppercase tracking-widest ${settingsVehicleType === "BADA DOST" ? "text-blue-700" : "text-gray-400"}`}
                      >
                        BADA DOST
                      </span>
                    </button>
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
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">
                        Base Fare (₹)
                      </label>
                      <input
                        type="number"
                        name="localBaseFare"
                        value={pricing[settingsVehicleType].localBaseFare || 0}
                        onChange={handlePricingChange}
                        className="w-full p-3 border border-gray-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none text-sm shadow-inner"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">
                        Base Km Included
                      </label>
                      <input
                        type="number"
                        name="localBaseKm"
                        value={pricing[settingsVehicleType].localBaseKm || 0}
                        onChange={handlePricingChange}
                        className="w-full p-3 border border-gray-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none text-sm shadow-inner"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">
                        Extra Km Rate (₹/km)
                      </label>
                      <input
                        type="number"
                        name="localPerKmRate"
                        value={pricing[settingsVehicleType].localPerKmRate || 0}
                        onChange={handlePricingChange}
                        className="w-full p-3 border border-gray-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none text-sm shadow-inner"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">
                        Waiting Charge (₹/min)
                      </label>
                      <input
                        type="number"
                        name="localWaitingRate"
                        value={
                          pricing[settingsVehicleType].localWaitingRate || 0
                        }
                        onChange={handlePricingChange}
                        className="w-full p-3 border border-gray-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none text-sm shadow-inner"
                      />
                    </div>
                  </div>
                </div>

                {/* OUTSTATION RULES COLUMN */}
                <div className="space-y-6">
                  <h4 className="text-[11px] font-black text-orange-600 uppercase tracking-[0.2em] border-b-2 border-orange-100 pb-2 flex items-center gap-2">
                    <TrendingUpIcon className="w-3.5 h-3.5" /> Outstation Matrix
                  </h4>
                  <div className="space-y-6">
                    {/* Round Trip Section */}
                    <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100">
                      <h5 className="text-[10px] font-black text-orange-700 uppercase tracking-widest mb-3 flex items-center gap-1">
                        <RefreshCcw className="w-3 h-3" /> Round Trip
                      </h5>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">
                            Min Km / Day
                          </label>
                          <input
                            type="number"
                            name="outstationMinKmPerDay"
                            value={
                              pricing[settingsVehicleType]
                                .outstationMinKmPerDay || 0
                            }
                            onChange={handlePricingChange}
                            className="w-full p-2.5 border border-gray-200 rounded-lg font-bold focus:ring-2 focus:ring-orange-500 outline-none text-xs shadow-inner"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">
                            Rate (₹/km)
                          </label>
                          <input
                            type="number"
                            name="outstationExtraKmRate"
                            value={
                              pricing[settingsVehicleType]
                                .outstationExtraKmRate || 0
                            }
                            onChange={handlePricingChange}
                            className="w-full p-2.5 border border-gray-200 rounded-lg font-bold focus:ring-2 focus:ring-orange-500 outline-none text-xs shadow-inner"
                          />
                        </div>
                      </div>
                    </div>

                    {/* One Way Section */}
                    <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100">
                      <h5 className="text-[10px] font-black text-orange-700 uppercase tracking-widest mb-3 flex items-center gap-1">
                        <ArrowRight className="w-3 h-3" /> One Way
                      </h5>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">
                              Base Rate
                            </label>
                            <input
                              type="number"
                              name="outstationBaseRate"
                              value={
                                pricing[settingsVehicleType]
                                  .outstationBaseRate || 0
                              }
                              onChange={handlePricingChange}
                              className="w-full p-2.5 border border-gray-200 rounded-lg font-bold focus:ring-2 focus:ring-orange-500 outline-none text-xs shadow-inner"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">
                              Base Km
                            </label>
                            <input
                              type="number"
                              name="outstationBaseKm"
                              value={
                                pricing[settingsVehicleType].outstationBaseKm ||
                                0
                              }
                              onChange={handlePricingChange}
                              className="w-full p-2.5 border border-gray-200 rounded-lg font-bold focus:ring-2 focus:ring-orange-500 outline-none text-xs shadow-inner"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">
                            Extra Km Rate (₹/km)
                          </label>
                          <input
                            type="number"
                            name="outstationOneWayExtraKmRate"
                            value={
                              pricing[settingsVehicleType]
                                .outstationOneWayExtraKmRate ||
                              pricing[settingsVehicleType].outstationExtraKmRate
                            }
                            onChange={handlePricingChange}
                            className="w-full p-2.5 border border-gray-200 rounded-lg font-bold focus:ring-2 focus:ring-orange-500 outline-none text-xs shadow-inner"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Common Allowances */}
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">
                        Common Allowances
                      </p>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">
                              Extra Hr Rate (₹/hr)
                            </label>
                            <input
                              type="number"
                              name="outstationExtraHrRate"
                              value={
                                pricing[settingsVehicleType]
                                  .outstationExtraHrRate || 0
                              }
                              onChange={handlePricingChange}
                              className="w-full p-2.5 border border-gray-200 rounded-lg font-bold focus:ring-2 focus:ring-orange-500 outline-none text-xs shadow-inner"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">
                              Round Trip Free Hours
                            </label>
                            <input
                              type="number"
                              name="outstationRoundTripFreeHours"
                              value={
                                pricing[settingsVehicleType]
                                  .outstationRoundTripFreeHours || 0
                              }
                              onChange={handlePricingChange}
                              className="w-full p-2.5 border border-gray-200 rounded-lg font-bold focus:ring-2 focus:ring-orange-500 outline-none text-xs shadow-inner"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">
                            Driver Allowance (₹/day)
                          </label>
                          <input
                            type="number"
                            name="outstationDriverAllowance"
                            value={
                              pricing[settingsVehicleType]
                                .outstationDriverAllowance || 0
                            }
                            onChange={handlePricingChange}
                            className="w-full p-2.5 border border-gray-200 rounded-lg font-bold focus:ring-2 focus:ring-orange-500 outline-none text-xs shadow-inner"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">
                              Night (₹/night)
                            </label>
                            <input
                              type="number"
                              name="outstationNightAllowance"
                              value={
                                pricing[settingsVehicleType]
                                  .outstationNightAllowance || 0
                              }
                              onChange={handlePricingChange}
                              className="w-full p-2.5 border border-gray-200 rounded-lg font-bold focus:ring-2 focus:ring-orange-500 outline-none text-xs shadow-inner"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">
                              Hills (₹/day)
                            </label>
                            <input
                              type="number"
                              name="outstationHillsAllowance"
                              value={
                                pricing[settingsVehicleType]
                                  .outstationHillsAllowance || 0
                              }
                              onChange={handlePricingChange}
                              className="w-full p-2.5 border border-gray-200 rounded-lg font-bold focus:ring-2 focus:ring-orange-500 outline-none text-xs shadow-inner"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RENTAL PACKAGES COLUMN */}
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em] border-b-2 border-blue-100 pb-2 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" /> Rental Strategy
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">
                          Extra Km Rate (₹/km)
                        </label>
                        <input
                          type="number"
                          name="rentalExtraKmRate"
                          value={pricing[settingsVehicleType].rentalExtraKmRate}
                          onChange={handlePricingChange}
                          className="w-full p-2.5 border border-gray-200 rounded-lg font-bold focus:ring-2 focus:ring-blue-500 outline-none text-xs shadow-inner"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">
                          Extra Hr Rate (₹/hr)
                        </label>
                        <input
                          type="number"
                          name="rentalExtraHrRate"
                          value={pricing[settingsVehicleType].rentalExtraHrRate}
                          onChange={handlePricingChange}
                          className="w-full p-2.5 border border-gray-200 rounded-lg font-bold focus:ring-2 focus:ring-blue-500 outline-none text-xs shadow-inner"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-b-2 border-blue-100 pb-2 pt-2">
                    <h4 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
                      <ListIcon className="w-3.5 h-3.5" /> Package Fleet
                    </h4>
                    <button
                      onClick={() => setShowAddPackage(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 shadow-sm"
                    >
                      <Plus className="w-3 h-3" /> New
                    </button>
                  </div>
                  <div className="space-y-3">
                    {rentalPackages.map((pkg) => (
                      <div
                        key={pkg.id}
                        className="flex justify-between items-center p-4 bg-white rounded-xl border border-gray-100 shadow-sm group hover:border-blue-200 transition-all"
                      >
                        <div>
                          <p className="text-sm font-black text-gray-800">
                            {pkg.name}
                          </p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                            {pkg.hours}Hr / {pkg.km}km
                          </p>
                          <p className="text-[9px] text-blue-500 font-bold uppercase tracking-widest mt-1">
                            Extra: ₹
                            {pkg.extraHrRate ||
                              pricing[settingsVehicleType].rentalExtraHrRate}
                            /hr | ₹
                            {pkg.extraKmRate ||
                              pricing[settingsVehicleType].rentalExtraKmRate}
                            /km
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-mono font-black text-gray-900 text-base">
                            ₹
                            {settingsVehicleType === "Sedan"
                              ? pkg.priceSedan
                              : settingsVehicleType === "SUV"
                                ? pkg.priceSuv
                                : settingsVehicleType === "3 Wheeler Auto"
                                  ? pkg.priceAuto
                                  : settingsVehicleType === "Tata Ace"
                                    ? pkg.priceAce
                                    : settingsVehicleType === "Pickup"
                                      ? pkg.pricePickup
                                      : pkg.priceBadaDost}
                          </span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEditPackage(pkg)}
                              className="p-1.5 text-blue-400 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => removePackage(pkg.id, e)}
                              className="p-1.5 text-rose-400 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end">
              <button
                onClick={() => {
                  setShowSettings(false);
                  syncToCloud();
                }}
                className="px-10 py-3 bg-slate-900 text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-900/20"
              >
                Apply Configuration
              </button>
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
                {editingPackageId ? "Update Tier" : "New Strategic Tier"}
              </h4>
              <button
                onClick={handleCancelEditPackage}
                className="p-2 hover:bg-gray-200 rounded-lg text-gray-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-1.5 block ml-1">
                  Package Display Name
                </label>
                <input
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm font-bold shadow-inner"
                  value={newPackage.name}
                  onChange={(e) =>
                    setNewPackage({ ...newPackage, name: e.target.value })
                  }
                  placeholder="e.g. 4 Hours / 40 KM"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-1.5 block ml-1">
                    Hours
                  </label>
                  <input
                    type="number"
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm font-bold shadow-inner"
                    value={newPackage.hours}
                    onChange={(e) =>
                      setNewPackage({ ...newPackage, hours: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-1.5 block ml-1">
                    KM Limit
                  </label>
                  <input
                    type="number"
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm font-bold shadow-inner"
                    value={newPackage.km}
                    onChange={(e) =>
                      setNewPackage({ ...newPackage, km: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">
                  Multi-Vehicle Payout Logic
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-emerald-600 uppercase mb-1.5 block ml-1">
                      Sedan Price
                    </label>
                    <input
                      type="number"
                      className="w-full p-3 border border-emerald-100 bg-emerald-50/20 rounded-xl text-sm font-black shadow-inner"
                      value={newPackage.priceSedan}
                      onChange={(e) =>
                        setNewPackage({
                          ...newPackage,
                          priceSedan: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-emerald-600 uppercase mb-1.5 block ml-1">
                      SUV Price
                    </label>
                    <input
                      type="number"
                      className="w-full p-3 border border-emerald-100 bg-emerald-50/20 rounded-xl text-sm font-black shadow-inner"
                      value={newPackage.priceSuv}
                      onChange={(e) =>
                        setNewPackage({
                          ...newPackage,
                          priceSuv: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-blue-600 uppercase mb-1.5 block ml-1">
                      Auto
                    </label>
                    <input
                      type="number"
                      className="w-full p-3 border border-blue-100 bg-blue-50/20 rounded-xl text-sm font-black shadow-inner"
                      value={newPackage.priceAuto}
                      onChange={(e) =>
                        setNewPackage({
                          ...newPackage,
                          priceAuto: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-blue-600 uppercase mb-1.5 block ml-1">
                      Tata Ace
                    </label>
                    <input
                      type="number"
                      className="w-full p-3 border border-blue-100 bg-blue-50/20 rounded-xl text-sm font-black shadow-inner"
                      value={newPackage.priceAce}
                      onChange={(e) =>
                        setNewPackage({
                          ...newPackage,
                          priceAce: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-blue-600 uppercase mb-1.5 block ml-1">
                      Pickup
                    </label>
                    <input
                      type="number"
                      className="w-full p-3 border border-blue-100 bg-blue-50/20 rounded-xl text-sm font-black shadow-inner"
                      value={newPackage.pricePickup}
                      onChange={(e) =>
                        setNewPackage({
                          ...newPackage,
                          pricePickup: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-blue-600 uppercase mb-1.5 block ml-1">
                      BADA DOST
                    </label>
                    <input
                      type="number"
                      className="w-full p-3 border border-blue-100 bg-blue-50/20 rounded-xl text-sm font-black shadow-inner"
                      value={newPackage.priceBadaDost}
                      onChange={(e) =>
                        setNewPackage({
                          ...newPackage,
                          priceBadaDost: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                  <div>
                    <label className="text-[10px] font-black text-orange-600 uppercase mb-1.5 block ml-1">
                      Extra Hr Rate
                    </label>
                    <input
                      type="number"
                      className="w-full p-3 border border-orange-100 bg-orange-50/20 rounded-xl text-sm font-black shadow-inner"
                      value={newPackage.extraHrRate}
                      onChange={(e) =>
                        setNewPackage({
                          ...newPackage,
                          extraHrRate: e.target.value,
                        })
                      }
                      placeholder="Optional override"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-orange-600 uppercase mb-1.5 block ml-1">
                      Extra Km Rate
                    </label>
                    <input
                      type="number"
                      className="w-full p-3 border border-orange-100 bg-orange-50/20 rounded-xl text-sm font-black shadow-inner"
                      value={newPackage.extraKmRate}
                      onChange={(e) =>
                        setNewPackage({
                          ...newPackage,
                          extraKmRate: e.target.value,
                        })
                      }
                      placeholder="Optional override"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleAddPackage}
                className="w-full py-4 bg-blue-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-900/20 transform active:scale-95 transition-all"
              >
                {editingPackageId ? "Update Matrix" : "Commit Package"}
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
                <label className="text-[9px] font-black text-gray-400 uppercase ml-2">
                  Customer Name
                </label>
                <input
                  placeholder="Enter Name"
                  className="p-4 bg-gray-50 border-none rounded-2xl w-full font-bold shadow-inner outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={customerDetails.name}
                  onChange={(e) =>
                    setCustomerDetails({
                      ...customerDetails,
                      name: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-gray-400 uppercase ml-2">
                  Mobile Number
                </label>
                <input
                  placeholder="+91..."
                  className="p-4 bg-gray-50 border-none rounded-2xl w-full font-bold shadow-inner outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={customerDetails.phone}
                  onChange={(e) =>
                    setCustomerDetails({
                      ...customerDetails,
                      phone: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-gray-400 uppercase ml-2">
                  Travel Date
                </label>
                <input
                  type="date"
                  className="p-4 bg-gray-50 border-none rounded-2xl w-full font-bold shadow-inner outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={customerDetails.travelDate}
                  onChange={(e) =>
                    setCustomerDetails({
                      ...customerDetails,
                      travelDate: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-gray-400 uppercase ml-2">
                  Travel Time
                </label>
                <input
                  type="time"
                  className="p-4 bg-gray-50 border-none rounded-2xl w-full font-bold shadow-inner outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={customerDetails.travelTime}
                  onChange={(e) =>
                    setCustomerDetails({
                      ...customerDetails,
                      travelTime: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="flex gap-4 mb-8">
              <button
                onClick={() => setEnquiryCategory("Transport")}
                className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl border-2 transition-all flex items-center justify-center gap-2 ${enquiryCategory === "Transport" ? "bg-emerald-50 text-emerald-700 border-emerald-500 shadow-lg shadow-emerald-500/10" : "bg-white text-gray-400 border-gray-100 hover:bg-gray-50"}`}
              >
                <Car className="w-4 h-4" /> Transport Drive
              </button>
              <button
                onClick={() => setEnquiryCategory("General")}
                className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl border-2 transition-all flex items-center justify-center gap-2 ${enquiryCategory === "General" ? "bg-blue-50 text-blue-700 border-blue-500 shadow-lg shadow-blue-500/10" : "bg-white text-gray-400 border-gray-100 hover:bg-gray-50"}`}
              >
                <FileText className="w-4 h-4" /> General Lead
              </button>
            </div>

            {enquiryCategory === "General" ? (
              <div className="space-y-4 mt-2 animate-in fade-in duration-500">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">
                  Requirement Synthesis
                </label>
                <textarea
                  rows={8}
                  className="w-full p-6 bg-gray-50 border border-gray-100 rounded-[2.5rem] text-sm font-bold text-gray-700 shadow-inner outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                  placeholder="Draft specific requirements or meeting notes..."
                  value={customerDetails.requirements}
                  onChange={(e) =>
                    setCustomerDetails({
                      ...customerDetails,
                      requirements: e.target.value,
                    })
                  }
                />
              </div>
            ) : (
              <div className="space-y-8 mt-2 border-t border-gray-50 pt-8 animate-in fade-in duration-500">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <p className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.2em] ml-2">
                      TAXI FLEET
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setVehicleType("Sedan")}
                        className={`flex-1 py-4 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-2 ${vehicleType === "Sedan" ? "border-emerald-500 bg-emerald-50 shadow-lg text-emerald-700" : "border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200"}`}
                      >
                        <Car className="w-6 h-6" />
                        <span className="text-[10px] font-black uppercase">
                          Sedan
                        </span>
                      </button>
                      <button
                        onClick={() => setVehicleType("SUV")}
                        className={`flex-1 py-4 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-2 ${vehicleType === "SUV" ? "border-emerald-500 bg-emerald-50 shadow-lg text-emerald-700" : "border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200"}`}
                      >
                        <Car className="w-6 h-6" />
                        <span className="text-[10px] font-black uppercase">
                          SUV
                        </span>
                      </button>
                      <div className="flex-1"></div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em] ml-2">
                      LOAD XPRESS
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setVehicleType("3 Wheeler Auto")}
                        className={`flex-1 py-4 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-2 ${vehicleType === "3 Wheeler Auto" ? "border-blue-500 bg-blue-50 shadow-lg text-blue-700" : "border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200"}`}
                      >
                        <Truck className="w-6 h-6" />
                        <span className="text-[10px] font-black uppercase">
                          Auto
                        </span>
                      </button>
                      <button
                        onClick={() => setVehicleType("Tata Ace")}
                        className={`flex-1 py-4 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-2 ${vehicleType === "Tata Ace" ? "border-blue-500 bg-blue-50 shadow-lg text-blue-700" : "border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200"}`}
                      >
                        <Truck className="w-6 h-6" />
                        <span className="text-[10px] font-black uppercase">
                          Tata Ace
                        </span>
                      </button>
                      <button
                        onClick={() => setVehicleType("Pickup")}
                        className={`flex-1 py-4 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-2 ${vehicleType === "Pickup" ? "border-blue-500 bg-blue-50 shadow-lg text-blue-700" : "border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200"}`}
                      >
                        <Truck className="w-6 h-6" />
                        <span className="text-[10px] font-black uppercase">
                          Pickup
                        </span>
                      </button>
                      <button
                        onClick={() => setVehicleType("BADA DOST")}
                        className={`flex-1 py-4 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-2 ${vehicleType === "BADA DOST" ? "border-blue-500 bg-blue-50 shadow-lg text-blue-700" : "border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200"}`}
                      >
                        <Truck className="w-6 h-6" />
                        <span className="text-[10px] font-black uppercase">
                          BADA DOST
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex border-b border-gray-100">
                  {["Local", "Rental", "Outstation"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTripType(t as TripType)}
                      className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.3em] border-b-4 transition-all ${tripType === t ? "border-emerald-500 text-emerald-700" : "border-transparent text-gray-400 hover:text-gray-600"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">
                    Pickup Origin
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-[2]">
                      {isMapReady ? (
                        <Autocomplete
                          placeholder="Search Google Maps for Pickup"
                          onAddressSelect={(addr) =>
                            setCustomerDetails((prev) => ({
                              ...prev,
                              pickup: addr,
                            }))
                          }
                          setNewPlace={(place) => setPickupCoords(place)}
                          defaultValue={customerDetails.pickup}
                        />
                      ) : (
                        <div className="p-4 bg-gray-50 rounded-2xl border text-xs font-bold text-gray-400 animate-pulse">
                          CONNECTING TO SAT...
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="date"
                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-black shadow-inner focus:ring-2 focus:ring-emerald-500/20 outline-none"
                        value={customerDetails.travelDate}
                        onChange={(e) =>
                          setCustomerDetails((prev) => ({
                            ...prev,
                            travelDate: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  {tripType === "Outstation" &&
                    transportDetails.legDistances[0] !== undefined && (
                      <div className="flex items-center gap-2 px-8 py-2 animate-in fade-in slide-in-from-top-2">
                        <div className="h-6 w-0.5 border-l-2 border-dashed border-indigo-200 ml-2.5"></div>
                        <div className="bg-indigo-50 text-indigo-600 text-[9px] font-bold px-3 py-1 rounded-full border border-indigo-100 flex items-center gap-1 shadow-sm">
                          <ArrowRight className="w-3 h-3" />
                          Approx {transportDetails.legDistances[0].toFixed(
                            1,
                          )}{" "}
                          KM to next stop
                        </div>
                      </div>
                    )}
                  {mapError && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 animate-in fade-in slide-in-from-top-2">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-xs font-bold">{mapError}</span>
                    </div>
                  )}
                </div>

                {tripType === "Local" && (
                  <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">
                          Target Destination(s)
                        </label>
                        <button
                          onClick={handleAddDrop}
                          className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-all flex items-center gap-2"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Waypoint
                        </button>
                      </div>
                      {transportDetails.drops.map((drop, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 group animate-in slide-in-from-left-2 duration-200"
                        >
                          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px] mt-1.5 shrink-0 shadow-lg">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            {isMapReady ? (
                              <Autocomplete
                                placeholder={`Drop Destination ${idx + 1}`}
                                onAddressSelect={(addr) =>
                                  handleDropChange(idx, addr, drop.coords)
                                }
                                setNewPlace={(place) =>
                                  handleDropChange(idx, drop.address, place)
                                }
                                defaultValue={drop.address}
                              />
                            ) : (
                              <div className="p-3 bg-gray-50 border rounded-xl">
                                ...
                              </div>
                            )}
                          </div>
                          {transportDetails.drops.length > 1 && (
                            <button
                              onClick={() => handleRemoveDrop(idx)}
                              className="p-3 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2">
                          Estimated Total Distance
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            className="p-4 bg-gray-50 border-none rounded-2xl w-full text-sm font-black shadow-inner outline-none focus:ring-2 focus:ring-emerald-500/20"
                            value={transportDetails.estKm}
                            onChange={(e) =>
                              setTransportDetails({
                                ...transportDetails,
                                estKm: e.target.value,
                              })
                            }
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-300 uppercase">
                            KM
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2">
                          Staging Wait Time
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            className="p-4 bg-gray-50 border-none rounded-2xl w-full text-sm font-black shadow-inner outline-none focus:ring-2 focus:ring-emerald-500/20"
                            value={transportDetails.waitingMins}
                            onChange={(e) =>
                              setTransportDetails({
                                ...transportDetails,
                                waitingMins: e.target.value,
                              })
                            }
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-300 uppercase">
                            MINS
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {tripType === "Rental" && (
                  <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {rentalPackages.map((pkg) => {
                        let price = 0;
                        if (vehicleType === "Sedan") price = pkg.priceSedan;
                        else if (vehicleType === "SUV") price = pkg.priceSuv;
                        else if (vehicleType === "3 Wheeler Auto")
                          price = pkg.priceAuto;
                        else if (vehicleType === "Tata Ace")
                          price = pkg.priceAce;
                        else if (vehicleType === "Pickup")
                          price = pkg.pricePickup;
                        else if (vehicleType === "BADA DOST")
                          price = pkg.priceBadaDost;

                        return (
                          <button
                            key={pkg.id}
                            onClick={() =>
                              setTransportDetails({
                                ...transportDetails,
                                packageId: pkg.id,
                              })
                            }
                            className={`p-6 border-2 rounded-[2.5rem] text-left transition-all relative overflow-hidden group ${transportDetails.packageId === pkg.id ? "border-emerald-500 bg-emerald-50 shadow-xl shadow-emerald-500/10" : "border-gray-50 bg-gray-50/50 hover:bg-white hover:border-gray-200"}`}
                          >
                            <div className="relative z-10">
                              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                                {pkg.name}
                              </div>
                              <div className="text-2xl font-black text-gray-900 tracking-tighter">
                                ₹{price}
                              </div>
                            </div>
                            <Package
                              className={`absolute -right-4 -bottom-4 w-16 h-16 transition-all duration-500 ${transportDetails.packageId === pkg.id ? "text-emerald-500/10 scale-110" : "text-gray-100"}`}
                            />
                          </button>
                        );
                      })}
                    </div>

                    {transportDetails.packageId && (
                      <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-50 animate-in fade-in slide-in-from-top-2">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-gray-400 uppercase ml-2">
                            Extra Hours
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              className="p-4 bg-gray-50 border-none rounded-2xl w-full text-sm font-black shadow-inner outline-none focus:ring-2 focus:ring-emerald-500/20"
                              value={transportDetails.extraHr}
                              onChange={(e) =>
                                setTransportDetails({
                                  ...transportDetails,
                                  extraHr: e.target.value,
                                })
                              }
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-300 uppercase">
                              HR
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-gray-400 uppercase ml-2">
                            Extra KM
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              className="p-4 bg-gray-50 border-none rounded-2xl w-full text-sm font-black shadow-inner outline-none focus:ring-2 focus:ring-emerald-500/20"
                              value={transportDetails.extraKm}
                              onChange={(e) =>
                                setTransportDetails({
                                  ...transportDetails,
                                  extraKm: e.target.value,
                                })
                              }
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-300 uppercase">
                              KM
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {tripType === "Outstation" && (
                  <div className="space-y-8 animate-in slide-in-from-left-4 duration-300">
                    <div className="flex bg-gray-100 p-1.5 rounded-2xl border border-gray-200">
                      <button
                        onClick={() => setOutstationSubType("RoundTrip")}
                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${outstationSubType === "RoundTrip" ? "bg-white shadow-md text-emerald-600" : "text-gray-500"}`}
                      >
                        Round Trip
                      </button>
                      <button
                        onClick={() => setOutstationSubType("OneWay")}
                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${outstationSubType === "OneWay" ? "bg-white shadow-md text-emerald-600" : "text-gray-500"}`}
                      >
                        One Way
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">
                          Destination Waypoint(s)
                        </label>
                        <button
                          onClick={handleAddWaypoint}
                          className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-all flex items-center gap-2"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Waypoint
                        </button>
                      </div>
                      {transportDetails.outstationWaypoints.map((wp, idx) => (
                        <React.Fragment key={idx}>
                          <div className="flex flex-col gap-2 group animate-in slide-in-from-left-2 duration-200 p-4 bg-gray-50/50 rounded-3xl border border-gray-100">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[8px] shadow-lg">
                                  {idx + 1}
                                </div>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                  {wp.address || (transportDetails.outstationWaypoints[idx]?.address ? getCityName(transportDetails.outstationWaypoints[idx].address) : `Waypoint ${idx + 1}`)}
                                </span>
                              </div>
                              <button
                                onClick={() => handleRemoveWaypoint(idx)}
                                className="p-2 text-gray-300 hover:text-rose-500 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                              <div className="flex-[2]">
                                {isMapReady ? (
                                  <Autocomplete
                                    placeholder={`Waypoint City ${idx + 1}`}
                                    onAddressSelect={(addr) =>
                                      handleWaypointChange(idx, addr, wp.coords)
                                    }
                                    setNewPlace={(place) =>
                                      handleWaypointChange(
                                        idx,
                                        wp.address,
                                        place,
                                      )
                                    }
                                    defaultValue={wp.address}
                                  />
                                ) : (
                                  <div className="p-3 bg-white border rounded-[1.5rem] text-[10px] text-gray-300">
                                    ...
                                  </div>
                                )}
                              </div>
                              <div className="flex-1">
                                <input
                                  type="date"
                                  className="w-full p-3.5 bg-white border border-gray-100 rounded-[1.5rem] text-xs font-bold shadow-inner focus:ring-2 focus:ring-emerald-500/20 outline-none"
                                  value={wp.date || ""}
                                  onChange={(e) =>
                                    handleWaypointChange(
                                      idx,
                                      wp.address,
                                      wp.coords,
                                      e.target.value,
                                    )
                                  }
                                />
                              </div>
                            </div>
                          </div>
                          {transportDetails.legDistances[idx + 1] !==
                            undefined && (
                            <div className="flex items-center gap-2 px-8 py-2 animate-in fade-in slide-in-from-top-2">
                              <div className="h-6 w-0.5 border-l-2 border-dashed border-emerald-200 ml-2.5"></div>
                              <div className="bg-emerald-50 text-emerald-600 text-[9px] font-bold px-3 py-1 rounded-full border border-emerald-100 flex items-center gap-1 shadow-sm">
                                <ArrowRight className="w-3 h-3" />
                                Approx{" "}
                                {transportDetails.legDistances[idx + 1].toFixed(
                                  1,
                                )}{" "}
                                KM to next stop
                              </div>
                            </div>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">
                        Final Destination City
                      </label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-[2]">
                          {isMapReady ? (
                            <Autocomplete
                              placeholder="Search Destination Hub"
                              onAddressSelect={(addr) =>
                                setTransportDetails((prev) => ({
                                  ...prev,
                                  destination: addr,
                                }))
                              }
                              setNewPlace={(place) => setDestCoords(place)}
                              defaultValue={transportDetails.destination}
                            />
                          ) : (
                            <div className="p-4 border rounded-2xl bg-gray-50 text-[10px] font-black text-gray-300 animate-pulse">
                              HUB LOADING...
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <input
                            type="date"
                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-black shadow-inner focus:ring-2 focus:ring-emerald-500/20 outline-none"
                            value={transportDetails.destinationDate}
                            onChange={(e) =>
                              setTransportDetails((prev) => ({
                                ...prev,
                                destinationDate: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
                          Days
                        </label>
                        <input
                          type="number"
                          className="p-4 bg-gray-50 border-none rounded-2xl w-full text-sm font-black shadow-inner outline-none focus:ring-2 focus:ring-emerald-500/20"
                          value={transportDetails.days}
                          onChange={(e) =>
                            setTransportDetails({
                              ...transportDetails,
                              days: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
                          Approx KM
                        </label>
                        <input
                          type="number"
                          className="p-4 bg-gray-50 border-none rounded-2xl w-full text-sm font-black shadow-inner outline-none focus:ring-2 focus:ring-emerald-500/20"
                          value={transportDetails.estTotalKm}
                          onChange={(e) =>
                            setTransportDetails({
                              ...transportDetails,
                              estTotalKm: e.target.value,
                            })
                          }
                        />
                        {transportDetails.legDistances.length > 0 && (
                          <div className="mt-2 space-y-1 p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50">
                            <label className="block text-[8px] font-black text-emerald-700 uppercase tracking-tighter mb-1 select-none">
                              Leg Breakdown
                            </label>
                            {transportDetails.legDistances.map((d, i) => {
                              const numWaypoints =
                                transportDetails.outstationWaypoints.length;
                              let label = `Leg ${i + 1}`;
                              if (i === 0)
                                label = `${getCityName(customerDetails.pickup) || "Pickup City"} ➔ ${getCityName(transportDetails.outstationWaypoints[0]?.address) || "Waypoint 1 City"}`;
                              if (numWaypoints === 0 && i === 0)
                                label = `${getCityName(customerDetails.pickup) || "Pickup City"} ➔ ${getCityName(transportDetails.destination) || "Destination City"}`;
                              if (i > 0 && i < numWaypoints)
                                label = `${getCityName(transportDetails.outstationWaypoints[i - 1]?.address) || `Waypoint ${i} City`} ➔ ${getCityName(transportDetails.outstationWaypoints[i]?.address) || `Waypoint ${i + 1} City`}`;
                              if (i === numWaypoints && numWaypoints > 0)
                                label = `${getCityName(transportDetails.outstationWaypoints[i - 1]?.address) || `Waypoint ${i} City`} ➔ ${getCityName(transportDetails.destination) || "Destination City"}`;
                              if (
                                outstationSubType === "RoundTrip" &&
                                i === transportDetails.legDistances.length - 1
                              )
                                label = `Return ➔ ${getCityName(customerDetails.pickup) || "Pickup City"}`;

                              return (
                                <div
                                  key={i}
                                  className="flex justify-between items-center text-[9px] font-bold text-emerald-600/80"
                                >
                                  <span>{label}</span>
                                  <span className="font-black text-emerald-700">
                                    {d.toFixed(1)} KM
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
                          Nights
                        </label>
                        <input
                          type="number"
                          className="p-4 bg-gray-50 border-none rounded-2xl w-full text-sm font-black shadow-inner outline-none focus:ring-2 focus:ring-emerald-500/20"
                          value={transportDetails.nights}
                          onChange={(e) =>
                            setTransportDetails({
                              ...transportDetails,
                              nights: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
                          Total Trip Hrs
                        </label>
                        <input
                          type="number"
                          className="p-4 bg-gray-50 border-none rounded-2xl w-full text-sm font-black shadow-inner outline-none focus:ring-2 focus:ring-emerald-500/20"
                          value={transportDetails.totalTripHrs}
                          onChange={(e) =>
                            setTransportDetails({
                              ...transportDetails,
                              totalTripHrs: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
                          Extra Hours
                        </label>
                        <input
                          type="number"
                          className="p-4 bg-gray-50 border-none rounded-2xl w-full text-sm font-black shadow-inner outline-none focus:ring-2 focus:ring-emerald-500/20"
                          placeholder={
                            outstationSubType === "RoundTrip" &&
                            transportDetails.totalTripHrs &&
                            rules.outstationRoundTripFreeHours > 0
                              ? `Auto-calc after ${rules.outstationRoundTripFreeHours}h`
                              : ""
                          }
                          value={transportDetails.extraHr}
                          onChange={(e) =>
                            setTransportDetails({
                              ...transportDetails,
                              extraHr: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
                          Extra KM
                        </label>
                        <input
                          type="number"
                          className="p-4 bg-gray-50 border-none rounded-2xl w-full text-sm font-black shadow-inner outline-none focus:ring-2 focus:ring-emerald-500/20"
                          value={transportDetails.extraKm}
                          onChange={(e) =>
                            setTransportDetails({
                              ...transportDetails,
                              extraKm: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
                        Toll Charge (₹)
                      </label>
                      <input
                        type="number"
                        className="p-4 bg-gray-50 border-none rounded-2xl w-full text-sm font-black shadow-inner outline-none focus:ring-2 focus:ring-emerald-500/20"
                        value={transportDetails.tollCharge}
                        onChange={(e) =>
                          setTransportDetails({
                            ...transportDetails,
                            tollCharge: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div
                      onClick={() =>
                        setTransportDetails((prev) => ({
                          ...prev,
                          isHillsTrip: !prev.isHillsTrip,
                        }))
                      }
                      className={`flex items-center gap-5 p-6 border-2 rounded-[2.5rem] cursor-pointer transition-all ${transportDetails.isHillsTrip ? "bg-indigo-50 border-indigo-500 shadow-xl shadow-indigo-500/10" : "bg-gray-50/50 border-gray-100 hover:border-gray-200"}`}
                    >
                      <div
                        className={`p-4 rounded-2xl transition-all ${transportDetails.isHillsTrip ? "bg-indigo-500 text-white shadow-lg" : "bg-white text-gray-300 border border-gray-100"}`}
                      >
                        <Mountain className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <p
                          className={`text-sm font-black uppercase tracking-tight ${transportDetails.isHillsTrip ? "text-indigo-800" : "text-gray-800"}`}
                        >
                          Hill Station Drive
                        </p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                          Apply Gradient Allowance
                        </p>
                      </div>
                      <div
                        className={`w-14 h-8 rounded-full transition-all relative ${transportDetails.isHillsTrip ? "bg-indigo-500 shadow-inner" : "bg-gray-200"}`}
                      >
                        <div
                          className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${transportDetails.isHillsTrip ? "translate-x-6" : ""}`}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-4 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => saveOrder("Scheduled")}
                      className="py-5 border-2 border-indigo-100 text-indigo-600 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 transform active:scale-95"
                    >
                      <Calendar className="w-5 h-5" /> Schedule
                    </button>
                    <button
                      onClick={handleBookNow}
                      className="py-5 bg-emerald-600 text-white rounded-[2.5rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-emerald-700 transition-all shadow-2xl shadow-emerald-900/20 flex items-center justify-center gap-2 transform active:scale-95"
                    >
                      <ArrowRight className="w-5 h-5" /> Accept Order
                    </button>
                  </div>
                  <div className="flex justify-center">
                    <button
                      onClick={handleCancelForm}
                      className="px-10 py-3 text-gray-400 hover:text-rose-500 rounded-full font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 transform active:scale-90 hover:bg-rose-50"
                    >
                      <X className="w-4 h-4" /> Reset Application
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6 h-fit sticky top-24">
          <div className="bg-slate-900 text-white p-10 rounded-[4rem] shadow-2xl shadow-emerald-900/10 relative overflow-hidden group animate-in slide-in-from-right-8 duration-700">
            <div className="relative z-10">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mb-4">
                Financial Estimation Terminal
              </p>
              <h3 className="text-8xl font-black tracking-tighter mb-10 leading-none">
                ₹{estimatedCost.toLocaleString()}
              </h3>

              {enquiryCategory === "Transport" && fareBreakup.length > 0 && (
                <div className="space-y-5 border-t border-slate-800 pt-8 mb-10 animate-in fade-in slide-in-from-bottom-2">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] flex items-center gap-3">
                    <ListIcon className="w-4 h-4 text-emerald-500" /> Dispatch
                    Matrix
                  </h4>
                  <div className="space-y-4">
                    {fareBreakup.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-start group/item"
                      >
                        <div>
                          <p
                            className={`text-sm font-black tracking-tight ${item.type === "tax" ? "text-blue-400" : item.type === "allowance" ? "text-indigo-300" : "text-slate-100"}`}
                          >
                            {item.label}
                          </p>
                          {item.description && (
                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-0.5">
                              {item.description}
                            </p>
                          )}
                        </div>
                        <p
                          className={`font-mono text-sm font-black ${item.type === "tax" ? "text-blue-400" : "text-slate-100"}`}
                        >
                          ₹
                          {item.value.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    ))}
                    <div className="h-px bg-slate-800 my-4"></div>
                    <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl">
                      <p className="text-xs font-black text-emerald-400 uppercase tracking-[0.2em]">
                        Net Final Estimate
                      </p>
                      <p className="text-2xl font-black text-emerald-400 tracking-tighter">
                        ₹
                        {estimatedCost.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-amber-500/10 p-5 rounded-3xl border border-amber-500/20 flex items-start gap-4">
                <AlertCircle className="w-6 h-6 shrink-0 text-amber-500" />
                <p className="text-[10px] text-amber-200/80 font-bold italic leading-relaxed uppercase tracking-wider">
                  {enquiryCategory === "Transport"
                    ? "Base calculation generated. State taxes, tolls and parking are subject to actuals."
                    : "Lead processing mode. Estimated monetary conversion pending strategy."}
                </p>
              </div>
            </div>
            <div className="absolute -right-16 -bottom-16 opacity-[0.04] transform rotate-12 group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-1000">
              <DollarSign className="w-96 h-96 text-white" />
            </div>
          </div>

          <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-2xl shadow-emerald-900/5">
            <div className="flex justify-between items-center mb-8">
              <h4 className="font-black text-gray-800 text-[10px] uppercase tracking-[0.3em] flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-emerald-500" /> Outreach
                Synthesis
              </h4>
              <button
                onClick={() => {
                  if (messageTextareaRef.current) {
                    navigator.clipboard.writeText(generatedMessage);
                    alert("Synthesis Copied!");
                  }
                }}
                className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 hover:bg-blue-100 transition-all"
              >
                <Copy className="w-3.5 h-3.5 mr-2 inline" /> Copy
              </button>
            </div>
            <textarea
              ref={messageTextareaRef}
              className="w-full min-h-[250px] p-8 bg-gray-50 border border-gray-100 rounded-[2.5rem] text-sm font-bold text-gray-600 focus:outline-none resize-none mb-8 shadow-inner leading-relaxed"
              value={generatedMessage}
              readOnly
            />
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => setShowInvoice(true)}
                className="bg-slate-800 hover:bg-slate-900 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-slate-900/20 flex items-center justify-center gap-3 transform active:scale-95 transition-all"
              >
                <FileText className="w-5 h-5" /> Invoice
              </button>
              <button
                onClick={() =>
                  window.open(
                    `https://wa.me/${customerDetails.phone.replace(/\D/g, "")}?text=${encodeURIComponent(generatedMessage)}`,
                    "_blank",
                  )
                }
                className="bg-emerald-500 hover:bg-emerald-600 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-emerald-900/20 flex items-center justify-center gap-3 transform active:scale-95 transition-all"
              >
                <MessageCircle className="w-5 h-5" /> WhatsApp
              </button>
              <button className="bg-blue-500 hover:bg-blue-600 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-blue-900/20 flex items-center justify-center gap-3 transform active:scale-95 transition-all">
                <Mail className="w-5 h-5" /> Email
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-2xl shadow-indigo-900/5 overflow-hidden animate-in fade-in duration-700">
        <div className="p-8 md:p-12 border-b border-gray-50 flex flex-col md:flex-row justify-between items-center gap-8 bg-gray-50/30">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-4 bg-white p-3 rounded-[1.75rem] border border-gray-100 shadow-sm">
              <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                <button
                  onClick={() => setFilterDateType("Month")}
                  className={`px-5 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${filterDateType === "Month" ? "bg-white shadow text-indigo-600" : "text-gray-400 hover:text-gray-600"}`}
                >
                  Month
                </button>
                <button
                  onClick={() => setFilterDateType("Date")}
                  className={`px-5 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${filterDateType === "Date" ? "bg-white shadow text-indigo-600" : "text-gray-400 hover:text-gray-600"}`}
                >
                  Date
                </button>
              </div>
              {filterDateType === "Month" ? (
                <input
                  type="month"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="bg-transparent border-none outline-none font-black text-gray-800 text-sm appearance-none cursor-pointer pr-4"
                />
              ) : (
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="bg-transparent border-none outline-none font-black text-gray-800 text-sm appearance-none cursor-pointer pr-4"
                />
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
            <div className="relative flex-1 md:w-80 group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="text"
                placeholder="Search manifest..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="w-full pl-14 pr-6 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-black shadow-sm outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
              />
            </div>
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="pl-6 pr-12 py-4 bg-white border border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-sm appearance-none cursor-pointer min-w-[180px]"
              >
                <option value="All">All Status</option>
                <option>New</option>
                <option>Scheduled</option>
                <option>Booked</option>
                <option>Order Accepted</option>
                <option>Completed</option>
                <option>Cancelled</option>
              </select>
              <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            <button
              onClick={resetFilters}
              className="p-4 bg-white border border-gray-200 text-gray-400 hover:text-rose-500 rounded-[1.5rem] transition-all shadow-sm transform active:scale-90 hover:shadow-lg"
            >
              <RefreshCcw className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto min-h-[450px] custom-scrollbar">
          <table className="w-full text-left">
            <thead className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] border-b border-gray-50 bg-white sticky top-0 z-10">
              <tr>
                <th className="px-12 py-10">Client Identity</th>
                <th className="px-12 py-10">Dispatch Routing</th>
                <th className="px-12 py-10">Personnel Assigned</th>
                <th className="px-12 py-10 text-center">Status</th>
                <th className="px-12 py-10 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredOrders.map((order, i) => {
                const assigned = getAssignedStaff(order.assignedTo);
                return (
                  <tr
                    key={i}
                    className="hover:bg-gray-50/80 transition-all group animate-in slide-in-from-bottom-2 duration-300"
                  >
                    <td className="px-12 py-10">
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xl border border-indigo-100 shadow-inner">
                          {order.name.charAt(0)}
                        </div>
                        <div
                          className="cursor-pointer group/name"
                          onClick={() => handleEditOrder(order)}
                        >
                          <p className="font-black text-gray-900 text-lg tracking-tighter leading-none mb-2 group-hover/name:text-indigo-600 transition-colors">
                            {order.name}
                          </p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2 font-mono">
                            <Phone className="w-3 h-3" /> {order.phone}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-12 py-10">
                      <div className="max-w-xs space-y-2">
                        <p
                          className="text-sm text-gray-600 font-black line-clamp-1 truncate leading-tight uppercase tracking-tight"
                          title={order.details}
                        >
                          {order.details}
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {order.enquiryCategory === "Transport" && (
                            <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-[9px] font-black border border-emerald-100 tracking-tighter uppercase">
                              DISPATCHED
                            </span>
                          )}
                          {order.priority === "Hot" && (
                            <span className="bg-rose-50 text-rose-700 px-3 py-1 rounded-lg text-[9px] font-black border border-rose-100 tracking-tighter uppercase">
                              High Priority
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-12 py-10">
                      {assigned ? (
                        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-100 w-fit pr-4 shadow-sm">
                          <img
                            src={assigned.avatar}
                            className="w-8 h-8 rounded-xl border-2 border-white shadow-sm"
                            alt=""
                          />
                          <div className="text-[10px] font-black text-gray-700 uppercase tracking-widest">
                            {assigned.name}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] italic">
                            OPERATIONAL
                          </span>
                          <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] italic">
                            PENDING
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-12 py-10 text-center">
                      <span
                        className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm ${
                          order.status === "Completed"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : order.status === "Cancelled"
                              ? "bg-rose-50 text-rose-700 border-rose-100"
                              : "bg-indigo-50 text-indigo-700 border-indigo-100"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-12 py-10 text-right">
                      <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditOrder(order)}
                          className="p-3 bg-white border border-gray-100 text-gray-400 hover:text-indigo-600 rounded-2xl shadow-xl transition-all hover:scale-110 active:scale-95"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm("Delete Permanent?"))
                              setEnquiries(
                                enquiries.filter((e) => e.id !== order.id),
                              );
                          }}
                          className="p-3 bg-white border border-gray-100 text-gray-400 hover:text-rose-500 rounded-2xl shadow-xl transition-all hover:scale-110 active:scale-95"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <InvoiceModal
        isOpen={showInvoice}
        onClose={() => setShowInvoice(false)}
        customerDetails={customerDetails}
        transportDetails={transportDetails}
        tripType={tripType}
        vehicleType={vehicleType}
        outstationSubType={outstationSubType}
        fareBreakup={fareBreakup}
        estimatedCost={estimatedCost}
        corporateName={corporateName}
      />
    </div>
  );
};

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerDetails: {
    name: string;
    phone: string;
    pickup: string;
    travelDate?: string;
    travelTime?: string;
  };
  transportDetails: { destination: string };
  tripType: TripType;
  vehicleType: VehicleType;
  outstationSubType: OutstationSubType;
  fareBreakup: FareItem[];
  estimatedCost: number;
  corporateName: string;
}

const InvoiceModal = ({
  isOpen,
  onClose,
  customerDetails,
  transportDetails,
  tripType,
  vehicleType,
  outstationSubType,
  fareBreakup,
  estimatedCost,
  corporateName,
}: InvoiceModalProps) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-black text-gray-800 uppercase tracking-widest text-xs flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-500" /> Proforma Invoice
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-rose-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div
          className="flex-1 overflow-y-auto p-8 md:p-12 print:p-0"
          id="printable-invoice"
        >
          <div className="space-y-8">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-gray-100 pb-8">
              <div className="space-y-1">
                <p className="text-xs font-black text-indigo-600 uppercase tracking-[0.3em]">
                  www.okboz.com
                </p>
                <h1 className="text-2xl font-black text-gray-900 tracking-tighter uppercase">
                  OK BOZ SUPER APP
                </h1>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  operated by Jkrish private limited.
                </p>
                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mt-2">
                  GST : 33AAFCJ1772N1ZB
                </p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Provider
                </p>
                <p className="text-sm font-black text-gray-800 uppercase">
                  {corporateName}
                </p>
              </div>
            </div>

            {/* Customer & Trip Info */}
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                  Customer Details
                </p>
                <div className="space-y-1">
                  <p className="text-sm font-black text-gray-800">
                    {customerDetails.name}
                  </p>
                  <p className="text-xs font-bold text-gray-500">
                    {customerDetails.phone}
                  </p>
                </div>
              </div>
              <div className="space-y-4 text-right">
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                  Trip Summary
                </p>
                <div className="space-y-1">
                  <p className="text-sm font-black text-gray-800">
                    {tripType} - {vehicleType}
                  </p>
                  {tripType === "Outstation" && (
                    <p className="text-xs font-bold text-gray-500">
                      {outstationSubType}
                    </p>
                  )}
                  {customerDetails.travelDate && (
                    <p className="text-xs font-bold text-indigo-600">
                      {customerDetails.travelDate}{" "}
                      {customerDetails.travelTime &&
                        `@ ${customerDetails.travelTime}`}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Route Info */}
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                    Pickup
                  </p>
                  <p className="text-xs font-bold text-gray-700">
                    {customerDetails.pickup}
                  </p>
                </div>
                {tripType === "Outstation" && (
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                      Destination
                    </p>
                    <p className="text-xs font-bold text-gray-700">
                      {transportDetails.destination}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Fare Breakdown */}
            <div className="space-y-4">
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                Fare Breakdown
              </p>
              <div className="space-y-3">
                {fareBreakup.map((item: FareItem, idx: number) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center text-sm"
                  >
                    <span className="font-bold text-gray-600">
                      {item.label}
                      {item.description && (
                        <span className="text-[10px] text-gray-400 font-medium ml-1">
                          ({item.description})
                        </span>
                      )}
                    </span>
                    <span className="font-mono font-black text-gray-900">
                      ₹
                      {item.value.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                ))}
                <div className="h-px bg-gray-100 my-4"></div>
                <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                  <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">
                    Total Estimated Fare
                  </span>
                  <span className="text-xl font-black text-indigo-600">
                    ₹
                    {estimatedCost.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-8 border-t border-gray-100 text-center">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                This is a computer generated estimate and does not require a
                physical signature.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #printable-invoice, #printable-invoice * {
                        visibility: visible;
                    }
                    #printable-invoice {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                }
            `}</style>
    </div>
  );
};

export default CustomerCare;
