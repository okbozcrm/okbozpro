
import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Maximize, Crosshair, Loader2, AlertTriangle, Building, Trash2, Settings, Building2, Pencil, X, QrCode, Download, ExternalLink, Filter } from 'lucide-react';
import { Branch } from '../types';
import { useNavigate } from 'react-router-dom';
import Autocomplete from './Autocomplete';
import { HARDCODED_MAPS_API_KEY } from '../services/cloudService';

const BranchForm: React.FC = () => {
  const navigate = useNavigate();
  const [branchName, setBranchName] = useState('');
  const [address, setAddress] = useState('');
  const [radius, setRadius] = useState('100');
  
  // Edit Mode State
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Determine Session Context
  const userRole = localStorage.getItem('user_role');
  const isSuperAdminUser = userRole === 'ADMIN';
  const isCorporateUser = userRole === 'CORPORATE';

  const getSessionKey = () => {
    const sessionId = localStorage.getItem('app_session_id') || 'admin';
    return sessionId === 'admin' ? 'branches_data' : `branches_data_${sessionId}`;
  };

  const isSuperAdmin = (localStorage.getItem('app_session_id') || 'admin') === 'admin';

  // --- Corporate Selection State (Super Admin Only) ---
  const [corporates, setCorporates] = useState<any[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<string>('admin'); // Default to admin/head office
  const [filterOwner, setFilterOwner] = useState<string>('All'); // For Admin List View

  useEffect(() => {
    if (isSuperAdmin) {
       const savedCorps = localStorage.getItem('corporate_accounts');
       if (savedCorps) {
          try { setCorporates(JSON.parse(savedCorps)); } catch(e) {}
       }
       setSelectedOwner('admin');
    } else {
       // For franchise users, the owner is always themselves
       setSelectedOwner(localStorage.getItem('app_session_id') || '');
    }
  }, [isSuperAdmin]);

  // Branch List State - Aggregated for Admin
  const [branches, setBranches] = useState<any[]>(() => {
    if (isSuperAdmin) {
        // --- SUPER ADMIN AGGREGATION ---
        let allBranches: any[] = [];
        
        // 1. Admin Data (Head Office)
        const adminData = localStorage.getItem('branches_data');
        if (adminData) {
            try { 
                const parsed = JSON.parse(adminData);
                allBranches = [...allBranches, ...parsed.map((b: any) => ({...b, owner: 'admin', ownerName: 'Head Office'}))];
            } catch (e) {}
        }

        // 2. Corporate Data
        const corporates = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        corporates.forEach((corp: any) => {
            const cData = localStorage.getItem(`branches_data_${corp.email}`);
            if (cData) {
                try {
                    const parsed = JSON.parse(cData);
                    const tagged = parsed.map((b: any) => ({...b, owner: corp.email, ownerName: corp.companyName}));
                    allBranches = [...allBranches, ...tagged];
                } catch (e) {}
            }
        });
        return allBranches;
    } else {
        const key = getSessionKey();
        const saved = localStorage.getItem(key);
        if (saved) return JSON.parse(saved);
        return [];
    }
  });
  
  // Save Logic - Handles distributed saving for Super Admin
  useEffect(() => {
    if (isSuperAdmin) {
        // Save Head Office Branches
        const adminBranches = branches.filter(b => b.owner === 'admin');
        // Strip metadata before saving
        const cleanAdmin = adminBranches.map(({owner, ownerName, ...rest}) => rest);
        localStorage.setItem('branches_data', JSON.stringify(cleanAdmin));

        // Save Corporate Branches (Iterate corporates to find their branches in state)
        const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        corps.forEach((c: any) => {
             const cBranches = branches.filter(b => b.owner === c.email);
             const cleanC = cBranches.map(({owner, ownerName, ...rest}) => rest);
             localStorage.setItem(`branches_data_${c.email}`, JSON.stringify(cleanC));
        });
    } else {
        // Normal User Save
        const key = getSessionKey();
        localStorage.setItem(key, JSON.stringify(branches));
    }
  }, [branches, isSuperAdmin]);
  
  // Map State
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [markerInstance, setMarkerInstance] = useState<any>(null);
  const [location, setLocation] = useState<any>({ lat: 11.0168, lng: 76.9558 }); // Default: Coimbatore
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(false);

  // Callback from Autocomplete component when a place is selected
  const handleNewPlaceSelected = (newPos: any) => {
    setLocation(newPos);
    if (mapInstance && markerInstance) {
      mapInstance.panTo(newPos);
      markerInstance.setPosition(newPos);
      mapInstance.setZoom(17);
    }
  };

  // Load Google Maps Script
  useEffect(() => {
    // 1. Check global failure flag
    if ((window as any).gm_authFailure_detected) {
      setMapError("Billing Not Enabled: Please enable billing on your Google Cloud Project.");
      return;
    }
    // 2. Handle Missing API Key
    const apiKey = HARDCODED_MAPS_API_KEY || localStorage.getItem('maps_api_key');
    if (!apiKey) {
      setMapError("API Key is missing. Please add it in Settings > Integrations.");
      return;
    }
    // 3. Global Auth Failure Handler
    const originalAuthFailure = (window as any).gm_authFailure;
    (window as any).gm_authFailure = () => {
      (window as any).gm_authFailure_detected = true;
      setMapError("Billing Not Enabled: Map functionality requires an active billing account on Google Cloud.");
      if (originalAuthFailure) originalAuthFailure();
    };

    // 4. Validate Existing Script
    const scriptId = 'google-maps-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    // Check if script is already fully loaded AND includes the 'places' library
    if ((window as any).google && (window as any).google.maps && (window as any).google.maps.places) {
      setIsMapReady(true);
      return;
    }

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`; // Ensure libraries=places
      script.async = true;
      script.defer = true;
      script.onload = () => {
        // Double check after script is loaded that `places` library is truly available
        if ((window as any).google && (window as any).google.maps && (window as any).google.maps.places) {
          setIsMapReady(true);
        } else {
          setMapError("Google Maps 'places' library failed to load.");
        }
      };
      script.onerror = () => setMapError("Network error: Failed to load Google Maps script.");
      document.head.appendChild(script);
    } else {
        // If script already exists but might not have finished loading 'places' library,
        // attach load listener just in case.
        script.addEventListener('load', () => {
          if ((window as any).google && (window as any).google.maps && (window as any).google.maps.places) {
            setIsMapReady(true);
          }
        });
        // If script is already present and theoretically loaded, but `isMapReady` is false,
        // manually trigger check if `places` is there.
        if ((window as any).google && (window as any).google.maps && (window as any).google.maps.places) {
            setIsMapReady(true);
        }
    }
  }, []);

  // Initialize Map
  useEffect(() => {
    if (mapError) return;
    if (isMapReady && mapRef.current && !mapInstance && (window as any).google && (window as any).google.maps) {
      try {
        const map = new (window as any).google.maps.Map(mapRef.current, {
          center: location,
          zoom: 15,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          zoomControl: true,
        });
        const marker = new (window as any).google.maps.Marker({
          position: location,
          map: map,
          draggable: true,
          animation: (window as any).google.maps.Animation.DROP,
        });
        marker.addListener("dragend", (e: any) => {
          const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          setLocation(newPos);
          map.panTo(newPos);
        });
        map.addListener("click", (e: any) => {
          const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          marker.setPosition(newPos);
          setLocation(newPos);
          map.panTo(newPos);
        });
        setMapInstance(map);
        setMarkerInstance(marker);
      } catch (e) {
        setMapError("Error initializing map interface. Check Settings.");
      }
    }
  }, [isMapReady, mapError, location]);

  const handleGetAddress = () => {
    if (!isMapReady || !(window as any).google || !(window as any).google.maps || !(window as any).google.maps.Geocoder || mapError) {
      alert("Map services are currently unavailable. Please enter address manually.");
      return;
    }
    setLoadingAddress(true);
    try {
      const geocoder = new (window as any).google.maps.Geocoder();
      geocoder.geocode({ location }, (results: any, status: any) => {
        setLoadingAddress(false);
        if (status === "OK" && results[0]) {
          setAddress(results[0].formatted_address);
        } else if (status === 'REQUEST_DENIED') {
          // Alert user instead of setting mapError to keep map visible for manual pinning
          alert("Geocoding API not authorized. Please enable it in Google Cloud Console or enter address manually.");
        } else if (status === 'OVER_QUERY_LIMIT') {
          alert("Map quota exceeded. Please enter address manually.");
        } else {
          alert(`Could not fetch address (${status}). Please enter manually.`);
        }
      });
    } catch (e) {
      setLoadingAddress(false);
      alert("Error accessing Geocoding service.");
    }
  };

  const handleCurrentLocation = () => {
    if (mapError) return;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setLocation(pos);
          if (mapInstance && markerInstance) {
            mapInstance.setCenter(pos);
            markerInstance.setPosition(pos);
            mapInstance.setZoom(17);
          }
        },
        (error) => {
          alert(`Error: ${error.message || "The Geolocation service failed or is disabled."}`);
        }
      );
    } else {
      alert("Error: Your browser doesn't support geolocation.");
    }
  };

  const handleEditBranch = (branch: any) => {
    setEditingId(branch.id);
    setBranchName(branch.name);
    setAddress(branch.address);
    setRadius(branch.radius.toString());
    const newLoc = { lat: branch.lat, lng: branch.lng };
    setLocation(newLoc);
    
    // For Admin: Set the dropdown to the branch's current owner so it shows correctly
    if(isSuperAdmin) setSelectedOwner(branch.owner || 'admin');

    if (mapInstance && markerInstance) {
        mapInstance.panTo(newLoc);
        markerInstance.setPosition(newLoc);
        mapInstance.setZoom(17);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setBranchName('');
    setAddress('');
    setRadius('100');
    // Reset owner selection to default if admin
    if (isSuperAdmin) setSelectedOwner('admin');
  };

  const handleSaveBranch = () => {
    if (!branchName.trim() || !address.trim()) {
      alert("Please enter both branch name and address.");
      return;
    }

    const currentSession = localStorage.getItem('app_session_id') || 'admin';

    // Limit check for franchise
    if (!isSuperAdmin && !editingId && branches.length >= 2) {
        alert("Franchise Plan Limit: You can only create a maximum of 2 branches. Please contact Super Admin to upgrade.");
        return;
    }

    // Determine Owner & Name for Admin Context
    let ownerId = isSuperAdmin ? selectedOwner : currentSession;
    let ownerDisplayName = 'Head Office';
    
    if (ownerId !== 'admin') {
         const corp = corporates.find(c => c.email === ownerId);
         ownerDisplayName = corp ? corp.companyName : ownerId;
    } else if (!isSuperAdmin) {
         ownerDisplayName = 'My Branch';
    }

    if (editingId) {
        // UPDATE EXISTING
        const updatedBranches = branches.map(b => {
            if (b.id === editingId) {
                // If Admin is editing, allow re-assignment of owner
                const finalOwnerId = isSuperAdmin ? ownerId : b.owner;
                const finalOwnerName = isSuperAdmin ? ownerDisplayName : b.ownerName;

                return {
                    ...b,
                    name: branchName,
                    address: address,
                    radius: parseInt(radius) || 100,
                    lat: location.lat,
                    lng: location.lng,
                    owner: finalOwnerId,
                    ownerName: finalOwnerName
                };
            }
            return b;
        });
        setBranches(updatedBranches);
        handleCancelEdit();
        alert("Branch updated successfully!");
    } else {
        // CREATE NEW
        const newBranch = {
          id: `B${Date.now()}`,
          name: branchName,
          address: address,
          radius: parseInt(radius) || 100,
          lat: location.lat,
          lng: location.lng,
          owner: ownerId,
          ownerName: ownerDisplayName
        };

        setBranches([...branches, newBranch]);
        alert(isSuperAdmin && ownerId !== 'admin' ? `Branch added to ${ownerDisplayName}!` : "Branch added successfully!");
        setBranchName('');
        setAddress('');
        setRadius('100');
    }
  };

  const handleDeleteBranch = (id: string) => {
    if (window.confirm("Are you sure you want to delete this branch?")) {
      setBranches(branches.filter(b => b.id !== id));
      if (editingId === id) handleCancelEdit();
    }
  };

  // QR Code format must match validation logic in UserAttendance (contains branch name)
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`OK BOZ - ${branchName || 'BRANCH'}`)}`;

  // Filter branches for view
  const displayedBranches = branches.filter(b => {
      if (!isSuperAdmin) return true; // Corporate sees all (which is only their own due to init logic)
      if (filterOwner === 'All') return true;
      return b.owner === filterOwner;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Form Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-medium text-gray-800">{editingId ? 'Edit Branch' : 'Create New Branch'}</h2>
            {!isSuperAdmin && !editingId && (
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${branches.length >= 2 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                    {branches.length} / 2 Branches Used
                </span>
            )}
        </div>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
                {/* Corporate Selection (Super Admin Only) */}
                {isSuperAdmin && (
                    <div className={`${editingId ? 'bg-blue-50 p-4 rounded-lg border border-blue-100' : ''}`}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {editingId ? 'Re-assign to Corporate' : 'Assign to Corporate'}
                        </label>
                        <div className="relative">
                            <select 
                                value={selectedOwner} 
                                onChange={(e) => setSelectedOwner(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-4 py-3 pl-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white appearance-none"
                            >
                                <option value="admin">Head Office (My Branches)</option>
                                {corporates.map(corp => (
                                    <option key={corp.id} value={corp.email}>{corp.companyName} ({corp.city})</option>
                                ))}
                            </select>
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                        </div>
                        {editingId && (
                            <p className="text-xs text-blue-600 mt-1">Warning: Changing this will move the branch to another account.</p>
                        )}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name</label>
                    <input 
                    type="text" 
                    placeholder="Enter Branch Name"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Branch Address</label>
                    <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder={mapError ? "Enter address manually" : "Select location on map or enter manually"}
                        className={`flex-1 border border-gray-300 rounded-md px-4 py-3 transition-colors ${mapError ? 'bg-white' : 'bg-gray-50 focus:bg-white'}`}
                    />
                    <button 
                        onClick={handleGetAddress}
                        disabled={loadingAddress || !isMapReady || !!mapError}
                        className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-2 rounded-md font-medium transition-colors shadow-sm whitespace-nowrap flex items-center gap-2"
                    >
                        {loadingAddress ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                        Get Address
                    </button>
                    </div>
                    {mapError && (
                    <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>{mapError}</span>
                    </p>
                    )}
                </div>
            </div>

            <div className="md:col-span-1">
                {branchName ? (
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center text-center h-full justify-center">
                        <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <QrCode className="w-4 h-4 text-emerald-600" /> Attendance QR
                        </h4>
                        <div className="bg-white p-2 border border-gray-100 rounded-lg shadow-inner mb-3">
                            <img src={qrCodeUrl} alt="QR Code" className="w-32 h-32 object-contain" />
                        </div>
                        <p className="text-xs text-gray-500 mb-3 px-2">
                            Scan to mark attendance at <br/><span className="font-semibold text-gray-800">{branchName}</span>
                        </p>
                        <button 
                            type="button"
                            onClick={() => window.open(qrCodeUrl, '_blank')}
                            className="text-xs flex items-center gap-1 text-blue-600 hover:underline border border-blue-100 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
                        >
                            <Download className="w-3 h-3" /> Print QR
                        </button>
                    </div>
                ) : (
                    <div className="bg-gray-50 p-4 rounded-xl border border-dashed border-gray-300 h-full flex flex-col items-center justify-center text-gray-400 text-center min-h-[200px]">
                        <QrCode className="w-10 h-10 mb-2 opacity-30" />
                        <p className="text-xs font-medium">Enter Branch Name<br/>to generate QR Code</p>
                    </div>
                )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Radius (in metre)</label>
            <input 
              type="number" 
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Pin Location on Map</label>
            
            {!mapError && isMapReady && (
              <div className="relative z-20"> 
                <Autocomplete 
                    setNewPlace={handleNewPlaceSelected} 
                    onAddressSelect={(addr) => setAddress(addr)}
                />
              </div>
            )}
            
            <div className={`border border-gray-300 rounded-lg overflow-hidden shadow-sm ${mapError ? 'bg-gray-50' : ''} relative h-96 w-full`}>
              {mapError ? (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500 bg-gray-50 p-6 text-center z-10">
                  <div className="flex flex-col items-center gap-3 max-w-sm">
                    <AlertTriangle className="w-10 h-10 text-red-400" />
                    <h3 className="font-medium text-gray-900">Map Loading Failed</h3>
                    <p className="text-sm text-gray-600">{mapError}</p>
                    {isCorporateUser ? (
                      <p className="text-xs text-gray-500 mt-1">
                        Contact your Super Admin to enable billing on the Google Cloud Project.
                      </p>
                    ) : (
                      <>
                        <div className="bg-red-50 border border-red-100 p-2 rounded text-xs text-red-800 text-left w-full mt-2">
                            <strong>Action Required:</strong>
                            <ul className="list-disc list-inside mt-1">
                                <li>Enable Billing on Google Cloud Project</li>
                                <li>Ensure 'Maps JavaScript API', 'Places API', & 'Geocoding API' are enabled</li>
                            </ul>
                        </div>
                        <a 
                          href="https://console.cloud.google.com/project/_/billing/enable"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 text-xs flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" /> Enable Billing
                        </a>
                        <button 
                          onClick={() => navigate('/admin/settings')} 
                          className="mt-2 text-xs flex items-center gap-1 bg-white border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <Settings className="w-3 h-3" /> Check API Key
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {!isMapReady && (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-500 bg-gray-50">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <span>Loading Google Maps...</span>
                      </div>
                    </div>
                  )}
                  <div ref={mapRef} className="w-full h-full" />
                  
                  {isMapReady && (
                    <div className="absolute top-2 right-2 z-10 flex flex-col gap-2">
                        <button 
                          onClick={handleCurrentLocation}
                          className="p-2 bg-white rounded-lg text-gray-600 shadow-md hover:bg-gray-50"
                          title="Use Current Location"
                        >
                          <Crosshair className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => mapInstance?.setZoom(mapInstance.getZoom() + 1)}
                          className="p-2 bg-white rounded-lg text-gray-600 shadow-md hover:bg-gray-50"
                          title="Zoom In"
                        >
                            <Maximize className="w-5 h-5" />
                        </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
              {editingId && (
                  <button 
                    onClick={handleCancelEdit}
                    className="px-6 py-3 border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
              )}
              <button 
                onClick={handleSaveBranch}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-md font-medium shadow-md transition-all flex items-center gap-2"
              >
                {editingId ? 'Update Branch' : 'Save Branch'}
              </button>
          </div>
        </div>
      </div>

      {/* Branch List Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800">
                {isSuperAdmin ? 'All Branches (Head Office & Franchise)' : 'Existing Branches'}
            </h3>
            {isSuperAdmin && (
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <select 
                        value={filterOwner} 
                        onChange={(e) => setFilterOwner(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    >
                        <option value="All">All Corporates</option>
                        <option value="admin">Head Office</option>
                        {corporates.map(corp => (
                            <option key={corp.id} value={corp.email}>{corp.companyName}</option>
                        ))}
                    </select>
                </div>
            )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedBranches.map(branch => (
                <div key={branch.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex justify-between items-start hover:shadow-md transition-shadow relative">
                    {/* Owner Badge for Admin */}
                    {isSuperAdmin && branch.owner !== 'admin' && (
                        <div className="absolute top-3 right-12 bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-100 flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {branch.ownerName}
                        </div>
                    )}
                    
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="bg-emerald-100 p-2 rounded-lg">
                                <Building className="w-5 h-5 text-emerald-600" />
                            </div>
                            <h4 className="font-bold text-gray-800 text-lg">{branch.name}</h4>
                        </div>
                        <p className="text-sm text-gray-500 mb-3 flex items-start gap-2 leading-relaxed">
                            <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
                            {branch.address}
                        </p>
                        <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-medium border border-gray-200">
                            Geofence Radius: {branch.radius}m
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => handleEditBranch(branch)}
                            className="text-gray-400 hover:text-blue-500 p-2 hover:bg-blue-50 rounded-full transition-colors"
                            title="Edit Branch"
                        >
                            <Pencil className="w-5 h-5" />
                        </button>
                        <button 
                            onClick={() => handleDeleteBranch(branch.id)}
                            className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-full transition-colors"
                            title="Delete Branch"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            ))}
            
            {displayedBranches.length === 0 && (
                <div className="col-span-2 text-center py-8 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                    No branches found. Create one above.
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default BranchForm;
