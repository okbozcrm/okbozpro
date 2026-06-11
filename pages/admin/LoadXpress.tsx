
import React, { useState, useEffect, useRef } from 'react';
import { Package, Search, Plus, Filter, Truck, ChevronRight, Download, ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, Edit2, X, Cloud, Loader2, RefreshCw, Map as MapIcon, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';
import Autocomplete from '../../components/Autocomplete';
import { HARDCODED_MAPS_API_KEY, syncToCloud } from '../../services/cloudService';

interface Shipment {
    id: string;
    trackingId: string;
    customerName: string;
    customerPhone: string;
    driverName?: string;
    driverPhone?: string;
    tripType: 'Local' | 'Rental' | 'Outstation';
    outstationSubType?: 'One Way' | 'Round Trip';
    rentalPackageName?: string;
    origin: string;
    destination: string;
    distanceKm: number;
    estimatedFare: number;
    status: 'Pending' | 'In Transit' | 'Delivered' | 'Cancelled';
    date: string;
    type: string;
    weight: string;
    priority: 'Normal' | 'High' | 'Express';
    startKm: number;
    startDate: string;
    startTime: string;
    startProof?: string;
    endKm?: number;
    endDate?: string;
    endTime?: string;
    endProof?: string;
}

interface PriceConfig {
    local: {
        baseFare: number;
        baseKm: number;
        extraKmRate: number;
        waitingCharge: number;
    };
    outstation: {
        roundTrip: { minKm: number; rate: number };
        oneWay: { baseRate: number; baseKm: number; extraKmRate: number };
        allowances: {
            extraHrRate: number;
            freeHours: number;
            driverAllowance: number;
            night: number;
            hills: number;
        };
    };
    rental: {
        extraKmRate: number;
        extraHrRate: number;
        packages: { name: string; hours: number; km: number; price: number; extraHr: number; extraKm: number }[];
    };
}

const VEHICLE_TYPES = ['AUTO', 'TATA ACE', 'PICKUP', 'BADA DOST'];

const DEFAULT_CONFIG: PriceConfig = {
    local: { baseFare: 200, baseKm: 2.5, extraKmRate: 22, waitingCharge: 2 },
    outstation: {
        roundTrip: { minKm: 130, rate: 13 },
        oneWay: { baseRate: 1800, baseKm: 130, extraKmRate: 13 },
        allowances: { extraHrRate: 150, freeHours: 0, driverAllowance: 300, night: 300, hills: 500 }
    },
    rental: {
        extraKmRate: 15,
        extraHrRate: 100,
        packages: [
            { name: '1 Hr / 10 km', hours: 1, km: 10, price: 200, extraHr: 100, extraKm: 15 },
            { name: '2 Hr / 20 km', hours: 2, km: 20, price: 400, extraHr: 100, extraKm: 15 },
            { name: '4 Hr / 40 km', hours: 4, km: 40, price: 800, extraHr: 100, extraKm: 15 },
            { name: '8 Hr / 80 km', hours: 8, km: 80, price: 1600, extraHr: 100, extraKm: 15 },
            { name: '12 hours package', hours: 12, km: 370, price: 777, extraHr: 100, extraKm: 15 },
        ]
    }
};

const LoadXpress: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<string>('All');
    const [showConfig, setShowConfig] = useState(false);
    const [showNewShipment, setShowNewShipment] = useState(false);
    const [activeVehicle, setActiveVehicle] = useState('AUTO');
    const [isSyncing, setIsSyncing] = useState(false);
    
    // Google Maps State
    const mapRef = useRef<HTMLDivElement>(null);
    const [isMapReady, setIsMapReady] = useState(false);
    const [mapError, setMapError] = useState<string | null>(null);
    const [mapInstance, setMapInstance] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
    const [directionsRenderer, setDirectionsRenderer] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

    // Pricing Config State
    const [pricing, setPricing] = useState<Record<string, PriceConfig>>(() => {
        const saved = localStorage.getItem('load_xpress_pricing_v1');
        if (saved) return JSON.parse(saved);
        return VEHICLE_TYPES.reduce((acc, v) => ({ ...acc, [v]: DEFAULT_CONFIG }), {});
    });

    const currentPricing = pricing[activeVehicle] || DEFAULT_CONFIG;

    // New Shipment Form State
    const [newShipment, setNewShipment] = useState<Partial<Shipment>>({
        tripType: 'Local',
        status: 'Pending',
        date: new Date().toISOString().split('T')[0],
        startTime: new Date().toTimeString().slice(0, 5),
        priority: 'Normal',
        estimatedFare: 0
    });

    const calculateFare = (shipment: Partial<Shipment>, pricing: PriceConfig) => {
        if (!shipment.tripType) return 0;
        
        let fare = 0;
        const dist = shipment.distanceKm || 0;

        if (shipment.tripType === 'Local') {
            const extraKm = Math.max(0, dist - pricing.local.baseKm);
            fare = pricing.local.baseFare + (extraKm * pricing.local.extraKmRate);
        } else if (shipment.tripType === 'Outstation') {
            if (shipment.outstationSubType === 'One Way') {
                const extraKm = Math.max(0, dist - pricing.outstation.oneWay.baseKm);
                fare = pricing.outstation.oneWay.baseRate + (extraKm * pricing.outstation.oneWay.extraKmRate);
            } else {
                // Round Trip
                const minKm = pricing.outstation.roundTrip.minKm;
                const effectiveKm = Math.max(dist, minKm);
                fare = effectiveKm * pricing.outstation.roundTrip.rate;
            }
            fare += pricing.outstation.allowances.driverAllowance;
        } else if (shipment.tripType === 'Rental') {
            const pkg = pricing.rental.packages.find(p => p.name === shipment.rentalPackageName);
            if (pkg) {
                fare = pkg.price;
                const extraKm = Math.max(0, dist - pkg.km);
                fare += extraKm * pricing.rental.extraKmRate;
            }
        }

        return Math.round(fare);
    };

    useEffect(() => {
        const fare = calculateFare(newShipment as Shipment, currentPricing);
        if (fare !== newShipment.estimatedFare) {
            setNewShipment(prev => ({ ...prev, estimatedFare: fare }));
        }
    }, [newShipment.tripType, newShipment.outstationSubType, newShipment.rentalPackageName, newShipment.distanceKm, activeVehicle, pricing]);

    // Load Google Maps Script
    useEffect(() => {
        if (window.gm_authFailure_detected) {
            setMapError("Billing Not Enabled: Please enable billing on your Google Cloud Project.");
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
            setMapError("Billing Not Enabled: Map functionality requires an active billing account on Google Cloud.");
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

    // Initialize Map
    useEffect(() => {
        if (showNewShipment && isMapReady && mapRef.current && !mapInstance) {
            const map = new window.google.maps.Map(mapRef.current, {
                center: { lat: 11.0168, lng: 76.9558 },
                zoom: 12,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
            });
            const renderer = new window.google.maps.DirectionsRenderer({ map });
            setMapInstance(map);
            setDirectionsRenderer(renderer);
        }
    }, [showNewShipment, isMapReady, mapInstance]);

    // Update Route when origin/destination change
    useEffect(() => {
        if (!directionsRenderer || !newShipment.origin || !newShipment.destination || !window.google) return;

        const directionsService = new window.google.maps.DirectionsService();
        directionsService.route(
            {
                origin: newShipment.origin,
                destination: newShipment.destination,
                travelMode: window.google.maps.TravelMode.DRIVING,
            },
            (result, status) => {
                if (status === window.google.maps.DirectionsStatus.OK && result) {
                    directionsRenderer.setDirections(result);
                    const route = (result as any).routes[0].legs[0]; // eslint-disable-line @typescript-eslint/no-explicit-any
                    if (route.distance) {
                        const distKm = parseFloat((route.distance.value / 1000).toFixed(1));
                        setNewShipment(prev => ({ 
                            ...prev, 
                            distanceKm: Math.round(distKm)
                        }));
                    }
                }
            }
        );
    }, [newShipment.origin, newShipment.destination, directionsRenderer]);

    // End KM State
    const [selectedShipmentForEnd, setSelectedShipmentForEnd] = useState<Shipment | null>(null);
    const [endKmDetails, setEndKmDetails] = useState({
        km: 0,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().slice(0, 5)
    });

    const [shipments, setShipments] = useState<Shipment[]>([
        {
            id: '1',
            trackingId: 'LX-100234',
            customerName: 'Aman Kumar',
            customerPhone: '9876543210',
            tripType: 'Outstation',
            outstationSubType: 'One Way',
            origin: 'Coimbatore, TN',
            destination: 'Bangalore, KA',
            distanceKm: 360,
            status: 'In Transit',
            date: '2026-06-04',
            type: 'Industrial Parts',
            weight: '450 kg',
            priority: 'High',
            startKm: 12450,
            startDate: '2026-06-04',
            startTime: '08:30'
        },
        // ... other initial data if needed
    ]);

    const handleAddShipment = () => {
        const id = Math.random().toString(36).substr(2, 9);
        const trackingId = `LX-${Math.floor(100000 + Math.random() * 900000)}`;
        const finalShipment = { 
            customerName: '',
            customerPhone: '',
            origin: '',
            destination: '',
            type: 'General Cargo',
            weight: '0 kg',
            distanceKm: 0,
            ...newShipment, 
            id, 
            trackingId 
        } as Shipment;
        setShipments(prev => [finalShipment, ...prev]);
        setShowNewShipment(false);
        setNewShipment({
            tripType: 'Local',
            status: 'Pending',
            date: new Date().toISOString().split('T')[0],
            startTime: new Date().toTimeString().slice(0, 5),
            priority: 'Normal',
            estimatedFare: 0
        });
    };

    const handleUpdatePricing = (path: string, value: string | number) => {
        const keys = path.split('.');
        const updatedPricing = { ...pricing };
        const vehicleConfig = { ...updatedPricing[activeVehicle] };
        
        let current: Record<string, any> = vehicleConfig; // eslint-disable-line @typescript-eslint/no-explicit-any
        for (let i = 0; i < keys.length - 1; i++) {
            current[keys[i]] = { ...current[keys[i]] };
            current = current[keys[i]] as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
        }
        current[keys[keys.length - 1]] = value;
        
        updatedPricing[activeVehicle] = vehicleConfig as PriceConfig;
        setPricing(updatedPricing);
    };

    const savePricing = () => {
        localStorage.setItem('load_xpress_pricing_v1', JSON.stringify(pricing));
        setShowConfig(false);
        alert('Configuration saved successfully!');
    };

    const handleRecordEndKm = () => {
        if (!selectedShipmentForEnd) return;
        
        setShipments(prev => prev.map(s => 
            s.id === selectedShipmentForEnd.id 
            ? { 
                ...s, 
                endKm: endKmDetails.km, 
                endDate: endKmDetails.date, 
                endTime: endKmDetails.time, 
                status: 'Delivered' 
            } 
            : s
        ));
        setSelectedShipmentForEnd(null);
        alert('End KM recorded. Trip marked as Delivered.');
    };

    const filteredShipments = shipments.filter(s => {
        const matchesSearch = (s.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (s.trackingId || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = selectedStatus === 'All' || s.status === selectedStatus;
        return matchesSearch && matchesStatus;
    });

    const stats = [
        { label: 'Total Shipments', value: '1,280', icon: Package, color: 'indigo', trend: '+12% from last month', isUp: true },
        { label: 'In Transit', value: '45', icon: Truck, color: 'emerald', trend: '8 vehicles live', isUp: true },
        { label: 'Pending Pickups', value: '12', icon: Clock, color: 'orange', trend: '3 express deliveries', isUp: false },
        { label: 'Delivery Rate', value: '98.5%', icon: CheckCircle2, color: 'blue', trend: '+0.5% vs avg', isUp: true },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                            <Package className="w-6 h-6" />
                        </div>
                        Load Xpress
                    </h2>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Manage Logistics and Freight Services</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setShowConfig(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 transition-all active:scale-95 shadow-sm"
                    >
                        <Edit2 className="w-4 h-4" /> Fare Config
                    </button>
                    <button className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50 transition-all active:scale-95 shadow-sm">
                        <Download className="w-4 h-4" /> Export Data
                    </button>
                    <button 
                        onClick={() => setShowNewShipment(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95"
                    >
                        <Plus className="w-4 h-4" /> New Shipment
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, idx) => (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        key={stat.label} 
                        className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className={`w-12 h-12 rounded-2xl bg-${stat.color}-50 flex items-center justify-center text-${stat.color}-600 group-hover:scale-110 transition-transform`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <div className={`flex items-center gap-1 ${stat.isUp ? 'text-emerald-500' : 'text-orange-500'} text-[10px] font-black uppercase tracking-wider`}>
                                {stat.isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                {stat.trend.split(' ')[0]}
                            </div>
                        </div>
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">{stat.label}</h3>
                        <div className="text-3xl font-black text-gray-900 mt-1">{stat.value}</div>
                        <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-wide">{stat.trend}</p>
                    </motion.div>
                ))}
            </div>

            {/* Management Section */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
                {/* Table Header/Filter */}
                <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                                type="text"
                                placeholder="Search Shipment ID or Customer..."
                                className="pl-12 pr-6 py-4 bg-gray-50 border-0 rounded-2xl text-[11px] font-bold w-full md:w-80 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex bg-gray-50 p-1 rounded-2xl">
                            {['All', 'Pending', 'In Transit', 'Delivered'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => setSelectedStatus(status)}
                                    className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                        selectedStatus === status ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                                    }`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button className="flex items-center gap-2 px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-100 transition-all">
                        <Filter className="w-4 h-4" /> Filter By Date
                    </button>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Shipment Details</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Type & Routing</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Milestones & KM</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredShipments.map((shipment) => (
                                <tr key={shipment.id} className="hover:bg-gray-50/80 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${
                                                shipment.priority === 'Express' ? 'bg-orange-50 text-orange-600' : 
                                                shipment.priority === 'High' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                                            }`}>
                                                {shipment.priority.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="text-sm font-black text-gray-900 leading-tight">{shipment.trackingId}</div>
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{shipment.customerName}</div>
                                                <div className="text-[9px] font-bold text-gray-400 flex items-center gap-2">
                                                    <span>👤 {shipment.driverName || 'No Driver'}</span>
                                                    <span>📞 {shipment.driverPhone || '-'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="space-y-1.5">
                                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase rounded-md tracking-tighter">
                                                {shipment.tripType} {shipment.outstationSubType && `| ${shipment.outstationSubType}`}
                                            </span>
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-600 overflow-hidden text-ellipsis whitespace-nowrap max-w-[200px]">
                                                <span className="text-emerald-500 font-black">FROM:</span> {shipment.origin}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-600 overflow-hidden text-ellipsis whitespace-nowrap max-w-[200px]">
                                                <span className="text-rose-500 font-black">TO:</span> {shipment.destination}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="space-y-1">
                                            <div className="text-[10px] font-black text-gray-800 uppercase tracking-tighter">
                                                START: {shipment.startKm} KM 
                                                <span className="text-gray-400 ml-2">({shipment.startDate} {shipment.startTime})</span>
                                            </div>
                                            {shipment.endKm ? (
                                                <div className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">
                                                    END: {shipment.endKm} KM
                                                    <span className="text-gray-400 ml-2">({shipment.endDate} {shipment.endTime})</span>
                                                </div>
                                            ) : (
                                                <div className="text-[9px] font-black text-orange-400 uppercase tracking-widest animate-pulse">Waiting for End KM...</div>
                                            )}
                                            <div className="text-[9px] font-bold text-indigo-500 uppercase">
                                                {shipment.type} | {shipment.weight} | {shipment.distanceKm} KM
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                            shipment.status === 'Delivered' ? 'bg-emerald-50 text-emerald-600' :
                                            shipment.status === 'In Transit' ? 'bg-indigo-50 text-indigo-600' :
                                            shipment.status === 'Pending' ? 'bg-orange-50 text-orange-600' :
                                            'bg-gray-50 text-gray-500'
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                                shipment.status === 'Delivered' ? 'bg-emerald-500' :
                                                shipment.status === 'In Transit' ? 'bg-indigo-500' :
                                                shipment.status === 'Pending' ? 'bg-orange-500' :
                                                'bg-gray-500'
                                            }`}></span>
                                            {shipment.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex flex-col items-end gap-2">
                                            <div className="text-sm font-black text-gray-900 leading-tight">₹{shipment.estimatedFare}</div>
                                            <div className="flex items-center justify-end gap-2">
                                                {!shipment.endKm && shipment.status === 'In Transit' && (
                                                    <button 
                                                        onClick={() => {
                                                            setSelectedShipmentForEnd(shipment);
                                                            setEndKmDetails({
                                                                km: shipment.startKm + 10, // Default suggestion
                                                                date: new Date().toISOString().split('T')[0],
                                                                time: new Date().toTimeString().slice(0, 5)
                                                            });
                                                        }}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all"
                                                    >
                                                        <CheckCircle2 className="w-3 h-3" /> Record End
                                                    </button>
                                                )}
                                                <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-all">
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Placeholder */}
                <div className="p-8 border-t border-gray-50 flex items-center justify-between">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Showing 4 of 1,280 Shipments</p>
                    <div className="flex items-center gap-2">
                        <button className="px-4 py-2 border border-gray-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 cursor-not-allowed">Previous</button>
                        <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100">1</button>
                        <button className="px-4 py-2 border border-gray-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50">2</button>
                        <button className="px-4 py-2 border border-gray-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50">Next</button>
                    </div>
                </div>
            </div>

            {/* Fare Configuration Overlay */}
            {showConfig && (
                <div className="fixed inset-0 z-[100] bg-white flex flex-col font-sans overflow-hidden">
                    {/* Header */}
                    <div className="h-20 px-8 bg-[#F8F9FA] border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Edit2 className="w-5 h-5 text-gray-600" />
                            <h2 className="text-lg font-black text-gray-800 uppercase tracking-tight">Fare Configuration</h2>
                        </div>
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={async () => {
                                    setIsSyncing(true);
                                    const result = await syncToCloud();
                                    setIsSyncing(false);
                                    if (result.success) {
                                        alert("Cloud connectivity verified and repository synced successfully.");
                                    } else {
                                        alert(`Sync failed: ${result.message}\nClick again to retry.`);
                                    }
                                }}
                                disabled={isSyncing}
                                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all disabled:opacity-50"
                            >
                                {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
                                {isSyncing ? "SYNCING..." : "CLOUD CONNECTED"}
                            </button>
                            <button 
                                onClick={() => setShowConfig(false)}
                                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6 text-gray-500" />
                            </button>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-white p-12">
                        <div className="max-w-7xl mx-auto">
                            <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-8">Load Xpress</h3>

                            {/* Vehicle Tabs */}
                            <div className="grid grid-cols-4 gap-6 mb-16">
                                {VEHICLE_TYPES.map(vt => (
                                    <button
                                        key={vt}
                                        onClick={() => setActiveVehicle(vt)}
                                        className={`p-10 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-4 ${
                                            activeVehicle === vt 
                                            ? 'border-emerald-500 bg-white shadow-2xl shadow-emerald-100 -translate-y-1' 
                                            : 'border-gray-100 bg-white hover:border-gray-300 opacity-60 grayscale'
                                        }`}
                                    >
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${activeVehicle === vt ? 'text-emerald-500' : 'text-gray-400'}`}>
                                            <Truck className="w-10 h-10" />
                                        </div>
                                        <span className="text-[11px] font-black tracking-widest text-gray-500 uppercase">{vt}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
                                {/* COLUMN 1: LOCAL STRATEGY */}
                                <div className="space-y-10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                        <h4 className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.2em]">Local Strategy</h4>
                                    </div>
                                    <div className="w-full h-px bg-emerald-100"></div>

                                    <div className="space-y-8">
                                        {[
                                            { label: 'Base Fare (₹)', path: 'local.baseFare' },
                                            { label: 'Base KM Included', path: 'local.baseKm' },
                                            { label: 'Extra KM Rate (₹/KM)', path: 'local.extraKmRate' },
                                            { label: 'Waiting Charge (₹/MIN)', path: 'local.waitingCharge' },
                                        ].map(field => (
                                            <div key={field.path} className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{field.label}</label>
                                                <input 
                                                    type="number"
                                                    value={field.path.split('.').reduce((obj: Record<string, any>, key) => obj?.[key], currentPricing)} // eslint-disable-line @typescript-eslint/no-explicit-any
                                                    onChange={(e) => handleUpdatePricing(field.path, parseFloat(e.target.value) || 0)}
                                                    className="w-full px-6 py-4 bg-[#F8F9FA] border-0 rounded-2xl text-[13px] font-bold text-gray-800 outline-none focus:ring-4 focus:ring-emerald-500/10 shadow-sm"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* COLUMN 2: OUTSTATION MATRIX */}
                                <div className="space-y-10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                                        <h4 className="text-[11px] font-black text-orange-600 uppercase tracking-[0.2em]">Outstation Matrix</h4>
                                    </div>
                                    <div className="w-full h-px bg-orange-100"></div>

                                    {/* Round Trip Box */}
                                    <div className="p-8 bg-[#FFF9F5] rounded-[2rem] border border-orange-100/50 space-y-6">
                                        <div className="flex items-center gap-2 text-[10px] font-black text-orange-600 uppercase tracking-widest">
                                            <RefreshCw className="w-3.5 h-3.5" /> Round Trip
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[8px] font-black text-orange-400 uppercase tracking-widest">Min KM / Day</label>
                                                <input 
                                                    type="number"
                                                    value={currentPricing.outstation.roundTrip.minKm}
                                                    onChange={(e) => handleUpdatePricing('outstation.roundTrip.minKm', parseFloat(e.target.value) || 0)}
                                                    className="w-full px-5 py-3.5 bg-white border border-orange-100 rounded-xl text-[12px] font-bold"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[8px] font-black text-orange-400 uppercase tracking-widest">Rate (₹/KM)</label>
                                                <input 
                                                    type="number"
                                                    value={currentPricing.outstation.roundTrip.rate}
                                                    onChange={(e) => handleUpdatePricing('outstation.roundTrip.rate', parseFloat(e.target.value) || 0)}
                                                    className="w-full px-5 py-3.5 bg-white border border-orange-100 rounded-xl text-[12px] font-bold"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* One Way Box */}
                                    <div className="p-8 bg-[#FFF9F5] rounded-[2rem] border border-orange-100/50 space-y-6">
                                        <div className="flex items-center gap-2 text-[10px] font-black text-orange-600 uppercase tracking-widest">
                                            <ArrowUpRight className="w-3.5 h-3.5" /> One Way
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[8px] font-black text-orange-400 uppercase tracking-widest">Base Rate</label>
                                                <input 
                                                    type="number"
                                                    value={currentPricing.outstation.oneWay.baseRate}
                                                    onChange={(e) => handleUpdatePricing('outstation.oneWay.baseRate', parseFloat(e.target.value) || 0)}
                                                    className="w-full px-5 py-3.5 bg-white border border-orange-100 rounded-xl text-[12px] font-bold"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[8px] font-black text-orange-400 uppercase tracking-widest">Base KM</label>
                                                <input 
                                                    type="number"
                                                    value={currentPricing.outstation.oneWay.baseKm}
                                                    onChange={(e) => handleUpdatePricing('outstation.oneWay.baseKm', parseFloat(e.target.value) || 0)}
                                                    className="w-full px-5 py-3.5 bg-white border border-orange-100 rounded-xl text-[12px] font-bold"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[8px] font-black text-orange-400 uppercase tracking-widest">Extra KM Rate (₹/KM)</label>
                                            <input 
                                                type="number"
                                                value={currentPricing.outstation.oneWay.extraKmRate}
                                                onChange={(e) => handleUpdatePricing('outstation.oneWay.extraKmRate', parseFloat(e.target.value) || 0)}
                                                className="w-full px-5 py-3.5 bg-white border border-orange-100 rounded-xl text-[12px] font-bold"
                                            />
                                        </div>
                                    </div>

                                    {/* Common Allowances */}
                                    <div className="space-y-6">
                                        <div className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Common Allowances</div>
                                        {[
                                            { label: 'Extra HR Rate (₹/HR)', path: 'outstation.allowances.extraHrRate' },
                                            { label: 'Round Trip Free Hours', path: 'outstation.allowances.freeHours' },
                                            { label: 'Driver Allowance (₹/DAY)', path: 'outstation.allowances.driverAllowance' },
                                            { label: 'Night (₹/NIGHT)', path: 'outstation.allowances.night' },
                                            { label: 'Hills (₹/DAY)', path: 'outstation.allowances.hills' },
                                        ].map(field => (
                                            <div key={field.path} className="space-y-2">
                                                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">{field.label}</label>
                                                <input 
                                                    type="number"
                                                    value={field.path.split('.').reduce((obj: Record<string, any>, key) => obj?.[key], currentPricing)} // eslint-disable-line @typescript-eslint/no-explicit-any
                                                    onChange={(e) => handleUpdatePricing(field.path, parseFloat(e.target.value) || 0)}
                                                    className="w-full px-5 py-3.5 bg-[#F8F9FA] border-0 rounded-2xl text-[12px] font-bold"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* COLUMN 3: RENTAL STRATEGY */}
                                <div className="space-y-10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                        <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em]">Rental Strategy</h4>
                                    </div>
                                    <div className="w-full h-px bg-indigo-100"></div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Extra KM Rate (₹/KM)</label>
                                            <input 
                                                type="number"
                                                value={currentPricing.rental.extraKmRate}
                                                onChange={(e) => handleUpdatePricing('rental.extraKmRate', parseFloat(e.target.value) || 0)}
                                                className="w-full px-5 py-3.5 bg-[#F8F9FA] rounded-2xl text-[12px] font-bold"
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Extra HR Rate (₹/HR)</label>
                                            <input 
                                                type="number"
                                                value={currentPricing.rental.extraHrRate}
                                                onChange={(e) => handleUpdatePricing('rental.extraHrRate', parseFloat(e.target.value) || 0)}
                                                className="w-full px-5 py-3.5 bg-[#F8F9FA] rounded-2xl text-[12px] font-bold"
                                            />
                                        </div>
                                    </div>

                                    {/* Package Fleet Section */}
                                    <div className="mt-12 space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                                                <Package className="w-4 h-4" /> Package Fleet
                                            </div>
                                            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100">
                                                <Plus className="w-3 h-3" /> New
                                            </button>
                                        </div>

                                        <div className="space-y-4">
                                            {currentPricing.rental.packages.map((pkg, idx) => (
                                                <div key={idx} className="p-6 bg-white border border-gray-100 rounded-[2rem] flex items-center justify-between group hover:border-indigo-200 transition-all shadow-sm hover:shadow-lg">
                                                    <div>
                                                        <h5 className="text-sm font-black text-gray-800 tracking-tight">{pkg.name}</h5>
                                                        <div className="flex items-center gap-3 mt-1.5">
                                                            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{pkg.hours}HR / {pkg.km}KM</div>
                                                            <div className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">Extra: ₹{pkg.extraHr}/HR | ₹{pkg.extraKm}/KM</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-lg font-black text-gray-900 group-hover:scale-110 transition-transform">₹{pkg.price}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="h-24 bg-[#F8F9FA] border-t border-gray-100 px-12 flex items-center justify-end">
                        <button 
                            onClick={savePricing}
                            className="px-10 py-5 bg-[#0F172A] text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 hover:bg-black"
                        >
                            Apply Configuration
                        </button>
                    </div>
                </div>
            )}

            {/* New Shipment Modal */}
            {showNewShipment && (
                <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
                    >
                        {/* Modal Header */}
                        <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                            <div>
                                <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">Register New Shipment</h2>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Fill in the logistics details for cargo dispatch</p>
                            </div>
                            <button onClick={() => setShowNewShipment(false)} className="p-3 hover:bg-white rounded-2xl transition-all shadow-sm">
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-10 overflow-y-auto custom-scrollbar space-y-10">
                             {/* Customer & Basic Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Customer Name</label>
                                    <input 
                                        type="text"
                                        placeholder="Full Name"
                                        className="w-full px-6 py-4 bg-gray-50 border-0 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10"
                                        value={newShipment.customerName || ''}
                                        onChange={(e) => setNewShipment(prev => ({ ...prev, customerName: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                                    <input 
                                        type="tel"
                                        placeholder="+91 XXXXX XXXXX"
                                        className="w-full px-6 py-4 bg-gray-50 border-0 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10"
                                        value={newShipment.customerPhone || ''}
                                        onChange={(e) => setNewShipment(prev => ({ ...prev, customerPhone: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-3 font-sans">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Driver Name</label>
                                    <input 
                                        type="text"
                                        placeholder="Driver Full Name"
                                        className="w-full px-6 py-4 bg-gray-50 border-0 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10"
                                        value={newShipment.driverName || ''}
                                        onChange={(e) => setNewShipment(prev => ({ ...prev, driverName: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Driver Phone</label>
                                    <input 
                                        type="tel"
                                        placeholder="Driver Phone"
                                        className="w-full px-6 py-4 bg-gray-50 border-0 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all focus:bg-white"
                                        value={newShipment.driverPhone || ''}
                                        onChange={(e) => setNewShipment(prev => ({ ...prev, driverPhone: e.target.value }))}
                                    />
                                </div>
                            </div>

                            {/* Trip Configuration */}
                            <div className="p-8 bg-indigo-50/30 rounded-[2rem] border border-indigo-100/50 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Trip Selection</label>
                                        <select 
                                            className="w-full px-6 py-4 bg-white border-2 border-indigo-50 rounded-2xl text-sm font-bold outline-none focus:border-indigo-200"
                                            value={newShipment.tripType}
                                            onChange={(e) => setNewShipment(prev => ({ ...prev, tripType: e.target.value as 'Local' | 'Rental' | 'Outstation' }))}
                                        >
                                            <option value="Local">LOCAL SERVICE</option>
                                            <option value="Rental">RENTAL PACKAGE</option>
                                            <option value="Outstation">OUTSTATION FREIGHT</option>
                                        </select>
                                    </div>
                                    {newShipment.tripType === 'Outstation' && (
                                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
                                            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Way Type</label>
                                            <select 
                                                className="w-full px-6 py-4 bg-white border-2 border-indigo-50 rounded-2xl text-sm font-bold outline-none focus:border-indigo-200"
                                                value={newShipment.outstationSubType}
                                                onChange={(e) => setNewShipment(prev => ({ ...prev, outstationSubType: e.target.value as 'One Way' | 'Round Trip' }))}
                                            >
                                                <option value="One Way">ONE WAY TRIP</option>
                                                <option value="Round Trip">ROUND TRIP</option>
                                            </select>
                                        </motion.div>
                                    )}
                                    {newShipment.tripType === 'Rental' && (
                                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
                                            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Select Package</label>
                                            <select 
                                                className="w-full px-6 py-4 bg-white border-2 border-indigo-50 rounded-2xl text-sm font-bold outline-none focus:border-indigo-200"
                                                value={newShipment.rentalPackageName}
                                                onChange={(e) => setNewShipment(prev => ({ ...prev, rentalPackageName: e.target.value }))}
                                            >
                                                <option value="">Choose Package</option>
                                                {currentPricing.rental.packages.map(p => (
                                                    <option key={p.name} value={p.name}>{p.name} - ₹{p.price}</option>
                                                ))}
                                            </select>
                                        </motion.div>
                                    )}
                                </div>

                                {/* Routing */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Pickup Point</label>
                                            <Autocomplete 
                                                placeholder="Enter origin location"
                                                defaultValue={newShipment.origin}
                                                onAddressSelect={(address) => {
                                                    setNewShipment(prev => ({ ...prev, origin: address }));
                                                }}
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Drop Point</label>
                                            <Autocomplete 
                                                placeholder="Enter destination location"
                                                defaultValue={newShipment.destination}
                                                onAddressSelect={(address) => {
                                                    setNewShipment(prev => ({ ...prev, destination: address }));
                                                }}
                                            />
                                        </div>
                                        {newShipment.distanceKm && (
                                            <div className="flex items-center gap-3 px-6 py-3 bg-white rounded-xl border border-indigo-100 w-fit">
                                                <Truck className="w-4 h-4 text-indigo-500" />
                                                <span className="text-xs font-black text-indigo-600">ESTIMATED AUTOMATIC DISTANCE: {newShipment.distanceKm} KM</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Map Preview Section */}
                                    <div className="space-y-3 h-full flex flex-col">
                                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                            <MapIcon className="w-3 h-3" /> Route Preview
                                        </label>
                                        <div className="flex-1 min-h-[250px] bg-indigo-50/50 rounded-[2rem] border-2 border-indigo-50 overflow-hidden relative">
                                            {!isMapReady ? (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
                                                    <Loader2 className="w-8 h-8 text-indigo-300 animate-spin" />
                                                    <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Loading Satellite View</span>
                                                </div>
                                            ) : mapError ? (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center bg-rose-50/50">
                                                    <AlertTriangle className="w-8 h-8 text-rose-300" />
                                                    <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest leading-relaxed">{mapError}</span>
                                                </div>
                                            ) : (
                                                <div ref={mapRef} className="w-full h-full" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Initial Statistics */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cargo Type</label>
                                    <input type="text" placeholder="e.g. Textiles, Steel" className="w-full px-6 py-4 bg-gray-50 border-0 rounded-2xl text-sm font-bold" value={newShipment.type || ''} onChange={e => setNewShipment(p => ({...p, type: e.target.value}))} />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Total Weight</label>
                                    <input type="text" placeholder="e.g. 500 KG" className="w-full px-6 py-4 bg-gray-50 border-0 rounded-2xl text-sm font-bold" value={newShipment.weight || ''} onChange={e => setNewShipment(p => ({...p, weight: e.target.value}))}/>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Priority</label>
                                    <select className="w-full px-6 py-4 bg-gray-50 border-0 rounded-2xl text-sm font-bold" value={newShipment.priority} onChange={e => setNewShipment(p => ({...p, priority: e.target.value as 'Normal' | 'High' | 'Express'}))}>
                                        <option value="Normal">NORMAL</option>
                                        <option value="High">HIGH ALERT</option>
                                        <option value="Express">EXPRESS DELIVERY</option>
                                    </select>
                                </div>
                            </div>

                            {/* Milestone Section: Start KM */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="px-3 py-1 bg-indigo-500 text-white text-[10px] font-black uppercase rounded-lg">STARTING MILESTONE</div>
                                    <div className="flex-1 h-px bg-gray-100 font-sans"></div>
                                    <div className="px-6 py-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 flex items-center gap-2 shadow-sm font-sans">
                                        <span className="text-[9px] font-black uppercase tracking-widest">Estimated Fare:</span>
                                        <span className="text-sm font-black">₹{newShipment.estimatedFare}</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Starting KM</label>
                                        <input type="number" className="w-full px-5 py-3 bg-gray-50 border-0 rounded-xl text-sm font-bold" value={newShipment.startKm || ''} onChange={e => setNewShipment(p => ({...p, startKm: parseInt(e.target.value) || 0}))} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Start Date</label>
                                        <input type="date" className="w-full px-5 py-3 bg-gray-50 border-0 rounded-xl text-sm font-bold uppercase" value={newShipment.startDate || ''} onChange={e => setNewShipment(p => ({...p, startDate: e.target.value}))}/>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Start Time</label>
                                        <input type="time" className="w-full px-5 py-3 bg-gray-50 border-0 rounded-xl text-sm font-bold" value={newShipment.startTime || ''} onChange={e => setNewShipment(p => ({...p, startTime: e.target.value}))}/>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 text-center block">Proof Attachment</label>
                                        <label className="flex items-center justify-center gap-2 w-full px-5 py-3 bg-indigo-50 border border-dashed border-indigo-200 rounded-xl cursor-pointer hover:bg-indigo-100 transition-all">
                                            <Download className="w-4 h-4 text-indigo-400" />
                                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter">UPLOAD PROOF</span>
                                            <input type="file" className="hidden" />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-8 border-t border-gray-50 bg-gray-50/50 flex items-center justify-end gap-4">
                            <button onClick={() => setShowNewShipment(false)} className="px-8 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-gray-700">Cancel</button>
                            <button 
                                onClick={handleAddShipment}
                                className="px-10 py-4 bg-indigo-600 text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                            >
                                Dispatch Shipment
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Record End KM Modal */}
            {selectedShipmentForEnd && (
                <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden"
                    >
                        <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-black text-gray-900 tracking-tight uppercase">Record Trip End</h3>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{selectedShipmentForEnd.trackingId} Milestone</p>
                            </div>
                            <button onClick={() => setSelectedShipmentForEnd(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="p-4 bg-emerald-50 rounded-2xl flex items-center justify-between">
                                <div className="text-[10px] font-black text-emerald-600 uppercase">Start KM Recorded</div>
                                <div className="text-lg font-black text-emerald-700">{selectedShipmentForEnd.startKm} KM</div>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Ending Kilometre</label>
                                    <input 
                                        type="number" 
                                        className="w-full px-6 py-4 bg-gray-50 border-0 rounded-2xl text-lg font-black outline-none focus:ring-4 focus:ring-emerald-500/10"
                                        value={endKmDetails.km}
                                        onChange={e => setEndKmDetails(p => ({...p, km: parseInt(e.target.value) || 0}))}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">End Date (DD/MM/YYYY)</label>
                                        <input 
                                            type="date" 
                                            className="w-full px-5 py-3 bg-gray-50 border-0 rounded-xl text-sm font-bold"
                                            value={endKmDetails.date || ''}
                                            onChange={e => setEndKmDetails(p => ({...p, date: e.target.value}))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">End Time</label>
                                        <input 
                                            type="time" 
                                            className="w-full px-5 py-3 bg-gray-50 border-0 rounded-xl text-sm font-bold"
                                            value={endKmDetails.time}
                                            onChange={e => setEndKmDetails(p => ({...p, time: e.target.value}))}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block text-center">End Proof Attachment</label>
                                    <label className="flex flex-col items-center justify-center gap-3 w-full p-8 bg-emerald-50/50 border-2 border-dashed border-emerald-200 rounded-[2rem] cursor-pointer hover:bg-emerald-50 transition-all">
                                        <Download className="w-8 h-8 text-emerald-300" />
                                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Upload Closing Proof</span>
                                        <input type="file" className="hidden" />
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className="p-8 border-t border-gray-50 bg-gray-50/50 flex gap-4">
                            <button onClick={() => setSelectedShipmentForEnd(null)} className="flex-1 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Cancel</button>
                            <button 
                                onClick={handleRecordEndKm}
                                className="flex-1 py-4 bg-emerald-600 text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest shadow-xl shadow-emerald-100 hover:bg-emerald-700"
                            >
                                Finish Trip
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default LoadXpress;
