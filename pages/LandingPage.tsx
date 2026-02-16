import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Phone, ArrowRight, Menu, X, MapPin, Calendar, Clock, 
  Car, Briefcase, Plane, ChevronRight, CheckCircle2, 
  Search, ShieldCheck, Heart, User, Star, MapIcon,
  Plus, Trash2, Info, MessageCircle, Copy, Mail,
  Mountain, Loader2, Sparkles, Navigation,
  DollarSign, AlertCircle, Send, ChevronDown, Check
} from 'lucide-react';
import { useBranding } from '../context/BrandingContext';
import Autocomplete from '../components/Autocomplete';
import { HARDCODED_MAPS_API_KEY } from '../services/cloudService';

// --- Pricing Logic Constants ---
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
  outstationExtraKmRate: number;
  outstationDriverAllowance: number;
  outstationNightAllowance: number;
  outstationHillsAllowance: number;
}

const RENTAL_PACKAGES: RentalPackage[] = [
  { id: '1hr', name: '1 Hour', hours: 1, km: 10, priceSedan: 378, priceSuv: 450, extraKmRate: 17 },
  { id: '2hr', name: '2 Hours', hours: 2, km: 20, priceSedan: 628, priceSuv: 750, extraKmRate: 17 },
  { id: '4hr', name: '4 Hours', hours: 4, km: 40, priceSedan: 1128, priceSuv: 1350, extraKmRate: 17 },
  { id: '8hr', name: '8 Hours', hours: 8, km: 80, priceSedan: 2128, priceSuv: 2550, extraKmRate: 14 },
  { id: '12hr', name: '12 Hours', hours: 12, km: 100, priceSedan: 2678, priceSuv: 3150, extraKmRate: 14 },
];

const PRICING: Record<VehicleType, PricingRules> = {
  Sedan: {
    localBaseFare: 200, localBaseKm: 5, localPerKmRate: 20, localWaitingRate: 2,
    rentalExtraKmRate: 17, rentalExtraHrRate: 100,
    outstationMinKmPerDay: 300, outstationBaseRate: 0, outstationExtraKmRate: 13,
    outstationDriverAllowance: 400, outstationNightAllowance: 300,
    outstationHillsAllowance: 500
  },
  SUV: {
    localBaseFare: 300, localBaseKm: 5, localPerKmRate: 25, localWaitingRate: 3,
    rentalExtraKmRate: 18, rentalExtraHrRate: 150,
    outstationMinKmPerDay: 300, outstationBaseRate: 0, outstationExtraKmRate: 17,
    outstationDriverAllowance: 500, outstationNightAllowance: 400,
    outstationHillsAllowance: 700
  }
};

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { logoUrl, companyName } = useBranding();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- Map & Autocomplete State ---
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);

  // --- Booking Form State ---
  const [tripType, setTripType] = useState<TripType>('Local');
  const [vehicleType, setVehicleType] = useState<VehicleType>('Sedan');
  const [outstationSubType, setOutstationSubType] = useState<OutstationSubType>('RoundTrip');
  const [customer, setCustomer] = useState({ name: '', phone: '', pickup: '', requirements: '' });
  const [transportDetails, setTransportDetails] = useState({
    drops: [{ address: '', coords: null }] as { address: string; coords: { lat: number; lng: number } | null }[], 
    estKm: '', waitingMins: '', packageId: '1hr',
    destination: '', days: '1', estTotalKm: '', nights: '0',
    isHillsTrip: false 
  });
  const [estimatedCost, setEstimatedCost] = useState(0);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // --- Google Maps Script ---
  useEffect(() => {
    if (window.google && window.google.maps && window.google.maps.places) {
      setIsMapReady(true);
      return;
    }
    const scriptId = 'google-maps-script-landing-v2';
    let script = document.getElementById(scriptId) as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${HARDCODED_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.onload = () => setIsMapReady(true);
      script.onerror = () => setMapError("Map Load Error");
      document.head.appendChild(script);
    }
  }, []);

  // --- Calculations ---
  useEffect(() => {
    let total = 0;
    const rules = PRICING[vehicleType];

    if (tripType === 'Local') {
        const base = rules.localBaseFare;
        const km = parseFloat(transportDetails.estKm) || 0;
        const extraKm = Math.max(0, km - rules.localBaseKm) * rules.localPerKmRate;
        const wait = (parseFloat(transportDetails.waitingMins) || 0) * rules.localWaitingRate;
        total = base + extraKm + wait;
    } else if (tripType === 'Rental') {
        const pkg = RENTAL_PACKAGES.find(p => p.id === transportDetails.packageId);
        if (pkg) {
            total = vehicleType === 'Sedan' ? pkg.priceSedan : pkg.priceSuv;
        }
    } else {
        const days = parseFloat(transportDetails.days) || 1;
        const km = parseFloat(transportDetails.estTotalKm) || 0;
        const driver = rules.outstationDriverAllowance * days;
        if (outstationSubType === 'RoundTrip') {
            const minKm = days * rules.outstationMinKmPerDay;
            const chargeKm = Math.max(km, minKm);
            total = (chargeKm * rules.outstationExtraKmRate) + driver + (parseFloat(transportDetails.nights) || 0) * rules.outstationNightAllowance;
            if (transportDetails.isHillsTrip) total += (rules.outstationHillsAllowance * days);
        } else {
            total = rules.outstationBaseRate + (km * rules.outstationExtraKmRate) + driver;
            if (transportDetails.isHillsTrip) total += (rules.outstationHillsAllowance * days);
        }
    }
    setEstimatedCost(total);
  }, [customer, transportDetails, tripType, vehicleType]);

  // Distance calculation using Sequential Matrix
  useEffect(() => {
    if (!isMapReady || !window.google || !pickupCoords) return;
    const service = new window.google.maps.DistanceMatrixService();
    const calculateDist = async () => {
        let totalKm = 0;
        const locations = [pickupCoords];
        if (tripType === 'Local') transportDetails.drops.forEach(d => { if (d.coords) locations.push(d.coords); });
        else if (tripType === 'Outstation' && destCoords) locations.push(destCoords);
        if (locations.length < 2) return;
        for (let i = 0; i < locations.length - 1; i++) {
            const response: any = await new Promise(r => service.getDistanceMatrix({
                origins: [locations[i]], destinations: [locations[i+1]], travelMode: window.google.maps.TravelMode.DRIVING, unitSystem: window.google.maps.UnitSystem.METRIC
            }, r));
            if (response.rows[0].elements[0].status === "OK") totalKm += response.rows[0].elements[0].distance.value / 1000;
        }
        if (tripType === 'Outstation' && outstationSubType === 'RoundTrip') totalKm *= 2;
        setTransportDetails(prev => ({ ...prev, [tripType === 'Outstation' ? 'estTotalKm' : 'estKm']: totalKm.toFixed(1) }));
    };
    calculateDist();
  }, [pickupCoords, transportDetails.drops, destCoords, isMapReady, tripType, outstationSubType]);

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 overflow-x-hidden">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white shadow-md py-2' : 'bg-white/90 backdrop-blur-md py-4'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              {logoUrl ? <img src={logoUrl} alt="Logo" className="h-10 w-auto" /> : <div className="h-10 w-10 rounded bg-emerald-600 flex items-center justify-center text-white font-bold text-xl">B</div>}
              <span className="text-2xl font-black tracking-tighter uppercase"><span className="text-emerald-600">OK</span> BOZ</span>
            </div>

            <div className="hidden lg:flex items-center space-x-10 text-sm font-bold text-gray-600">
              <a href="#" className="hover:text-emerald-600 transition-colors uppercase tracking-widest text-[10px]">Home</a>
              <a href="#services" className="hover:text-emerald-600 transition-colors uppercase tracking-widest text-[10px]">Services</a>
              <a href="#fleet" className="hover:text-emerald-600 transition-colors uppercase tracking-widest text-[10px]">Fleet</a>
              <a href="#" className="hover:text-emerald-600 transition-colors uppercase tracking-widest text-[10px]">About</a>
              <a href="#" className="hover:text-emerald-600 transition-colors uppercase tracking-widest text-[10px]">Contact</a>
              <button onClick={() => window.location.href = 'tel:8110013001'} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-emerald-600/20 transform active:scale-95">Call Now</button>
              <button onClick={() => navigate('/login')} className="ml-2 border-2 border-slate-200 hover:border-emerald-600 hover:text-emerald-600 px-5 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] transition-all">Login</button>
            </div>

            <button className="lg:hidden p-2 text-gray-600" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center pt-24 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src="https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?auto=format&fit=crop&q=80&w=2400" alt="Hero Background" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 py-12">
            <div className="max-w-3xl space-y-8 animate-in fade-in slide-in-from-left-8 duration-1000">
              <h1 className="text-6xl lg:text-8xl font-black text-white leading-[1.1] tracking-tighter uppercase">
                <span className="text-emerald-400 block mb-4 text-3xl lg:text-4xl tracking-[0.3em] font-black">LOCAL • RENTAL • OUTSTATION</span>
                BOOK YOUR <span className="text-emerald-500">OK BOZ</span><br/>
                IN SECONDS.
              </h1>
              <p className="text-xl text-white/80 max-w-xl font-medium leading-relaxed">
                Experience the safest and most transparent travel across India. 
                Professional drivers, real-time tracking, and zero hidden costs.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-8 pt-4">
                <button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-[0.3em] shadow-2xl shadow-emerald-600/30 transition-all transform hover:scale-105 active:scale-95">Explore Services</button>
                <div className="flex items-center gap-4 text-white">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-xl border border-white/20 shadow-lg"><Phone className="w-6 h-6 text-emerald-500" /></div>
                  <div><p className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mb-1">Customer Support</p><p className="text-2xl font-black font-mono text-emerald-400">81 1001 3001</p></div>
                </div>
              </div>
            </div>
        </div>
      </section>

      {/* Stats Section */}
      <div className="bg-white border-y border-gray-100 relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
            {[
                { label: 'HAPPY CUSTOMERS', value: '1M+' },
                { label: 'TAXIS ON ROAD', value: '5000+' },
                { label: 'CITIES COVERED', value: '15+' },
                { label: 'LIVE SUPPORT', value: '24/7' },
            ].map((stat, i) => (
              <div key={i} className="text-center space-y-1 group">
                <p className="text-3xl lg:text-4xl font-black text-emerald-600 tracking-tighter group-hover:scale-110 transition-transform">{stat.value}</p>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Services Section */}
      <section id="services" className="py-24 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-20">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Our Specialized Services</h2>
            <div className="w-20 h-2 bg-emerald-600 mx-auto rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
                { title: 'Outstation', desc: 'Comfortable long-distance travel at fixed economical rates.', icon: Car },
                { title: 'Local Rental', desc: 'Book by the hour. Perfect for shopping and city chores.', icon: Clock },
                { title: 'Airport Transfer', desc: 'Punctual pickups and drops to and from all major airports.', icon: Plane },
                { title: 'Corporate Travel', desc: 'Tailored solutions for business meetings and staff commutes.', icon: Briefcase },
            ].map((service, i) => (
              <div key={i} className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-xl shadow-slate-900/5 hover:shadow-emerald-600/10 transition-all duration-500 hover:-translate-y-2 group">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors mb-8 shadow-inner">
                  <service.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-4 tracking-tight">{service.title}</h3>
                <p className="text-sm text-gray-500 font-medium leading-relaxed">
                  {service.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Instant Fare Estimate Section (The requested Card design) */}
      <section className="py-24 bg-white relative overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute top-1/2 left-0 w-64 h-64 bg-emerald-50 rounded-full blur-[100px] -translate-y-1/2 -translate-x-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-50 rounded-full blur-[100px] translate-y-1/2 translate-x-1/2"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-20">
            
            <div className="flex-1 space-y-8 text-center lg:text-left">
                <h2 className="text-5xl lg:text-6xl font-black text-slate-900 tracking-tighter leading-tight">
                    GET AN <span className="text-emerald-600">INSTANT</span><br/>
                    FARE QUOTE.
                </h2>
                <p className="text-lg text-gray-500 font-medium max-w-lg mx-auto lg:mx-0 leading-relaxed">
                    Plan your journey with total transparency. Choose your vehicle, enter your route, and see your fare breakdown immediately.
                </p>
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100 flex flex-col gap-2">
                        <DollarSign className="w-6 h-6 text-emerald-600" />
                        <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest">Fixed Pricing</h4>
                        <p className="text-xs text-gray-400 font-bold uppercase">No Hidden Surcharges</p>
                    </div>
                    <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100 flex flex-col gap-2">
                        <MapIcon className="w-6 h-6 text-blue-600" />
                        <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest">GPS Verified</h4>
                        <p className="text-xs text-gray-400 font-bold uppercase">Accurate Distance Calcs</p>
                    </div>
                </div>
            </div>

            {/* THE ATTACHED CARD UI IMPLEMENTATION */}
            <div className="w-full max-w-xl bg-white rounded-[3.5rem] shadow-[0_50px_100px_-20px_rgba(15,23,42,0.2)] overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-700">
                {/* Card Header (Black/Slate part) */}
                <div className="bg-[#0f172a] text-white p-10 pb-12 relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-slate-400 text-[10px] uppercase font-black tracking-[0.3em] mb-3 ml-1">Estimated Fare</p>
                        <h3 className="text-8xl font-black tracking-tighter leading-none">₹{estimatedCost.toLocaleString()}</h3>
                    </div>
                    {/* Watermark Dollar Sign */}
                    <div className="absolute -right-8 -bottom-12 opacity-[0.04] transform rotate-12">
                        <DollarSign className="w-80 h-80 text-white" />
                    </div>
                </div>

                {/* Card Content (White part) */}
                <div className="p-10 space-y-10">
                    {/* Trip Type Selection */}
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Trip Type Selection</span>
                            <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                                {['Sedan', 'SUV'].map(v => (
                                    <button 
                                        key={v} 
                                        onClick={() => setVehicleType(v as any)} 
                                        className={`px-6 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${vehicleType === v ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Large Main Tabs */}
                        <div className="flex border-b border-gray-200">
                            {['LOCAL', 'RENTAL', 'OUTSTATION'].map(t => (
                                <button 
                                    key={t} 
                                    onClick={() => setTripType(t.charAt(0) + t.slice(1).toLowerCase() as any)} 
                                    className={`flex-1 py-4 text-xs font-black tracking-[0.3em] border-b-[5px] transition-all ${tripType === (t.charAt(0) + t.slice(1).toLowerCase()) ? 'border-emerald-500 text-slate-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Input Fields Container */}
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Pick up Location</label>
                            {!isMapReady ? <div className="p-4 bg-gray-50 rounded-[1.5rem] border border-gray-100 text-xs font-bold text-gray-400 animate-pulse">Loading Map Services...</div> : (
                                <div className="relative group">
                                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-emerald-500 transition-colors" />
                                    <Autocomplete 
                                        placeholder="Pollachi, Tamil Nadu, India" 
                                        onAddressSelect={(addr, coords) => { setCustomer(p => ({ ...p, pickup: addr })); setPickupCoords(coords); }} 
                                        setNewPlace={(c) => setPickupCoords(c)}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Round Trip / One Way for Outstation */}
                        {tripType === 'Outstation' && (
                            <div className="bg-gray-100 p-1.5 rounded-[1.5rem] border border-gray-200 flex gap-1 animate-in fade-in">
                                <button 
                                    onClick={() => setOutstationSubType('RoundTrip')} 
                                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all ${outstationSubType === 'RoundTrip' ? 'bg-white shadow-md text-emerald-600' : 'text-gray-500'}`}
                                >
                                    Round Trip
                                </button>
                                <button 
                                    onClick={() => setOutstationSubType('OneWay')} 
                                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all ${outstationSubType === 'OneWay' ? 'bg-white shadow-md text-emerald-600' : 'text-gray-500'}`}
                                >
                                    One Way
                                </button>
                            </div>
                        )}

                        {/* Destination for Outstation */}
                        {tripType === 'Outstation' && (
                            <div className="space-y-2 animate-in slide-in-from-left-4">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Destination</label>
                                <div className="relative group">
                                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-emerald-500 transition-colors" />
                                    <Autocomplete 
                                        placeholder="Search Destination City" 
                                        onAddressSelect={(addr, coords) => { setTransportDetails(p => ({ ...p, destination: addr })); setDestCoords(coords); }} 
                                        setNewPlace={(c) => setDestCoords(c)}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Numerical Inputs Grid */}
                        {tripType === 'Outstation' && (
                            <div className="grid grid-cols-3 gap-4 animate-in fade-in">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Days</label>
                                    <input type="number" value={transportDetails.days} onChange={e => setTransportDetails({...transportDetails, days: e.target.value})} className="w-full p-4 bg-white border border-gray-100 rounded-2xl shadow-inner font-black text-gray-700 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Total KM</label>
                                    <input type="number" placeholder="0" value={transportDetails.estTotalKm} onChange={e => setTransportDetails({...transportDetails, estTotalKm: e.target.value})} className="w-full p-4 bg-white border border-gray-100 rounded-2xl shadow-inner font-black text-gray-700 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nights</label>
                                    <input type="number" value={transportDetails.nights} onChange={e => setTransportDetails({...transportDetails, nights: e.target.value})} className="w-full p-4 bg-white border border-gray-100 rounded-2xl shadow-inner font-black text-gray-700 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all" />
                                </div>
                            </div>
                        )}

                        {/* Local specific inputs */}
                        {tripType === 'Local' && (
                             <div className="grid grid-cols-2 gap-4 animate-in fade-in">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Estimated KM</label>
                                    <input type="number" value={transportDetails.estKm} onChange={e => setTransportDetails({...transportDetails, estKm: e.target.value})} className="w-full p-4 bg-white border border-gray-100 rounded-2xl shadow-inner font-black text-gray-700 focus:ring-4 focus:ring-emerald-500/10 outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Wait Time (Mins)</label>
                                    <input type="number" value={transportDetails.waitingMins} onChange={e => setTransportDetails({...transportDetails, waitingMins: e.target.value})} className="w-full p-4 bg-white border border-gray-100 rounded-2xl shadow-inner font-black text-gray-700 focus:ring-4 focus:ring-emerald-500/10 outline-none" />
                                </div>
                             </div>
                        )}

                        {/* Hills Trip Toggle */}
                        <div className="p-6 bg-gray-50 border border-gray-100 rounded-[2rem] flex items-center justify-between group transition-all hover:bg-white hover:shadow-xl hover:shadow-indigo-500/5">
                            <div className="flex items-center gap-4">
                                <div className={`p-4 rounded-2xl transition-all ${transportDetails.isHillsTrip ? 'bg-indigo-100 text-indigo-600' : 'bg-white border border-gray-100 text-gray-300'}`}>
                                    <Mountain className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-black text-slate-800 text-sm tracking-tight">Hills Station Trip</h4>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Extra Hills Allowance Applies</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setTransportDetails(p => ({...p, isHillsTrip: !p.isHillsTrip}))}
                                className={`w-14 h-8 rounded-full transition-all relative ${transportDetails.isHillsTrip ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-gray-200 shadow-inner'}`}
                            >
                                <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${transportDetails.isHillsTrip ? 'translate-x-6' : ''}`} />
                            </button>
                        </div>
                    </div>

                    {/* Bottom Info & Button */}
                    <div className="space-y-6 pt-6 border-t border-gray-50">
                        <div className="bg-emerald-50 p-5 rounded-3xl border border-emerald-100 flex items-start gap-4">
                            <AlertCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                            <p className="text-xs text-emerald-900 font-bold italic leading-relaxed opacity-80">
                                This is a base calculation. Government taxes (GST), Toll fees, and Parking charges will be additional as per actuals.
                            </p>
                        </div>

                        <button className="w-full py-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[2.5rem] font-black text-sm uppercase tracking-[0.3em] shadow-2xl shadow-emerald-900/30 flex items-center justify-center gap-3 transform transition-all active:scale-95 group">
                            <Send className="w-5 h-5 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
                            Request Booking Now
                        </button>
                    </div>
                </div>
            </div>

          </div>
        </div>
      </section>

      {/* Fleet Section */}
      <section id="fleet" className="py-24 bg-gray-50/50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Our Premium Fleet</h2>
            <p className="text-gray-500 font-medium max-w-xl mx-auto uppercase tracking-widest text-[10px]">Choose from a wide range of well-maintained vehicles for a safe journey.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
                { name: 'OK BOZ Sedan', type: 'Prime', price: '₹14/km', image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=800', seats: '4 Seats', desc: 'Perfect for business trips and comfortable family city rides.' },
                { name: 'OK BOZ Hatch', type: 'Mini', price: '₹11/km', image: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&q=80&w=800', seats: '4 Seats', desc: 'Economical city travels with air conditioning.' },
                { name: 'OK BOZ SUV', type: 'XL', price: '₹19/km', image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800', seats: '7 Seats', desc: 'Spacious 7-seater for group outings and long travels.' }
            ].map((car, i) => (
              <div key={i} className="bg-white rounded-[3rem] border border-gray-100 shadow-2xl shadow-slate-900/5 overflow-hidden group hover:shadow-emerald-600/10 transition-all duration-500">
                <div className="relative h-64 overflow-hidden">
                  <img src={car.image} alt={car.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute top-6 right-6 bg-emerald-600 text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">{car.type}</div>
                </div>
                <div className="p-10 space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">{car.name}</h3>
                      <div className="flex items-center gap-3 mt-3">
                        <span className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest"><User className="w-3.5 h-3.5" /> {car.seats}</span>
                        <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-500 uppercase tracking-widest"><ShieldCheck className="w-3.5 h-3.5" /> Insured</span>
                      </div>
                    </div>
                    <p className="text-2xl font-black text-emerald-600">{car.price}</p>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed font-medium">
                    {car.desc}
                  </p>
                  <button className="w-full py-4 border-2 border-slate-100 group-hover:border-emerald-600 text-slate-400 group-hover:text-emerald-600 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] transition-all">
                    View Full Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-white py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-20">
            <div className="col-span-1 md:col-span-2 space-y-8">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-emerald-900/40">B</div>
                <span className="text-3xl font-black tracking-tighter uppercase">OK BOZ</span>
              </div>
              <p className="text-gray-400 max-w-sm leading-relaxed font-medium text-lg">
                Leading the digital transformation of transport logistics in India. 
                Connecting millions with safe, transparent travel.
              </p>
              <div className="flex items-center gap-6">
                 <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-emerald-600 hover:scale-110 transition-all cursor-pointer shadow-lg"><Star className="w-5 h-5" /></div>
                 <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-emerald-600 hover:scale-110 transition-all cursor-pointer shadow-lg"><Heart className="w-5 h-5" /></div>
                 <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-emerald-600 hover:scale-110 transition-all cursor-pointer shadow-lg"><MapIcon className="w-5 h-5" /></div>
              </div>
            </div>
            
            <div className="space-y-8">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Quick Links</h4>
              <ul className="space-y-5 text-sm font-bold text-gray-400">
                <li><a href="#" className="hover:text-emerald-500 transition-colors uppercase tracking-widest">Our Fleet</a></li>
                <li><a href="#" className="hover:text-emerald-500 transition-colors uppercase tracking-widest">Special Services</a></li>
                <li><a href="#" className="hover:text-emerald-500 transition-colors uppercase tracking-widest">Corporate Login</a></li>
                <li><a href="#" className="hover:text-emerald-500 transition-colors uppercase tracking-widest">Driver Attachment</a></li>
              </ul>
            </div>

            <div className="space-y-8">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Support</h4>
              <ul className="space-y-5 text-sm font-bold text-gray-400">
                <li><a href="#" className="hover:text-emerald-500 transition-colors uppercase tracking-widest">Help Center</a></li>
                <li><a href="#" className="hover:text-emerald-500 transition-colors uppercase tracking-widest">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-emerald-500 transition-colors uppercase tracking-widest">Terms of Service</a></li>
                <li><a href="#" className="hover:text-emerald-500 transition-colors uppercase tracking-widest">Safety Guidelines</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-12 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-8 text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
            <p>© 2025 OK BOZ TECHNOLOGIES. ALL RIGHTS RESERVED.</p>
            <div className="flex gap-10">
               <span className="flex items-center gap-3 uppercase tracking-widest"><ShieldCheck className="w-4 h-4" /> PCI Compliant</span>
               <span className="flex items-center gap-3 uppercase tracking-widest"><CheckCircle2 className="w-4 h-4" /> Secure Protocol</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
