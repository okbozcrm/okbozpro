
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Building2, Mail, Phone, Lock, Trash2, X, MapPin, Eye, EyeOff, Download, Upload, AlertTriangle, Edit2, Percent, Users, UserPlus } from 'lucide-react';
import { CorporateAccount, Partner } from '../../types';

const Corporate: React.FC = () => {
  // 1. Safe Initialization
  const [accounts, setAccounts] = useState<CorporateAccount[]>(() => {
    try {
      const saved = localStorage.getItem('corporate_accounts');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Failed to parse corporate accounts", e);
      return [];
    }
  });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedImportFile, setSelectedImportFile] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Form State
  const initialFormState = {
    companyName: '',
    email: '',
    password: '',
    phone: '',
    city: '',
    status: 'Active',
    partners: [] as { name: string; share: string }[] // string for input handling
  };
  const [formData, setFormData] = useState(initialFormState);

  // Ref to track first render to prevent overwriting localStorage on mount
  const firstRender = useRef(true);

  // 2. Self-Healing: Double check storage on mount to ensure we didn't miss data
  useEffect(() => {
    const saved = localStorage.getItem('corporate_accounts');
    if (saved && accounts.length === 0) {
        try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                console.log("Restored corporate accounts from storage mismatch.");
                setAccounts(parsed);
            }
        } catch (e) {}
    }
  }, []);

  // 3. Persist to LocalStorage with SAFETY GUARD
  useEffect(() => {
    // Skip the first render
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    // CRITICAL DATA PROTECTION:
    if (accounts.length === 0) {
        const currentStorage = localStorage.getItem('corporate_accounts');
        if (currentStorage && currentStorage.length > 20) {
            console.warn("Safety Guard: Prevented wiping of Corporate Accounts data.");
            return;
        }
    }

    localStorage.setItem('corporate_accounts', JSON.stringify(accounts));
  }, [accounts]);

  // 4. Cross-Tab Synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'corporate_accounts' && e.newValue) {
        try {
          const newValue = JSON.parse(e.newValue);
          if (Array.isArray(newValue)) {
            setAccounts(newValue);
          }
        } catch (err) {
          console.error("Error syncing corporate accounts from storage", err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const handleEdit = (account: CorporateAccount) => {
    setEditingId(account.id);
    
    // Convert existing partners (number share) to form format (string share)
    // SAFE GUARD: Check if p.share is defined before calling toString()
    const partners = account.partners?.map(p => ({
        name: p.name,
        share: (p.share !== undefined && p.share !== null) ? p.share.toString() : '0'
    })) || [];

    setFormData({
        companyName: account.companyName,
        email: account.email,
        password: account.password,
        phone: account.phone,
        city: account.city,
        status: account.status,
        partners: partners
    });
    setIsModalOpen(true);
  };

  // --- Partner Management Handlers ---
  const handleAddPartner = () => {
      setFormData(prev => ({
          ...prev,
          partners: [...prev.partners, { name: '', share: '' }]
      }));
  };

  const handleRemovePartner = (index: number) => {
      setFormData(prev => ({
          ...prev,
          partners: prev.partners.filter((_, i) => i !== index)
      }));
  };

  const handlePartnerChange = (index: number, field: 'name' | 'share', value: string) => {
      const updatedPartners = [...formData.partners];
      updatedPartners[index] = { ...updatedPartners[index], [field]: value };
      setFormData(prev => ({ ...prev, partners: updatedPartners }));
  };

  const calculateTotalShare = () => {
      return formData.partners.reduce((sum, p) => sum + (parseFloat(p.share) || 0), 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName || !formData.email || !formData.password || !formData.city) return;

    // Calculate total share from partners
    const totalShare = calculateTotalShare();
    if (totalShare > 100) {
        alert("Total partner share cannot exceed 100%.");
        return;
    }

    const partnersPayload: Partner[] = formData.partners.map(p => ({
        name: p.name,
        share: parseFloat(p.share) || 0
    })).filter(p => p.name); // Filter out empty named partners

    if (editingId) {
        // Update Existing
        setAccounts(prev => prev.map(acc => {
            if (acc.id === editingId) {
                return {
                    ...acc,
                    companyName: formData.companyName,
                    email: formData.email,
                    password: formData.password,
                    phone: formData.phone,
                    city: formData.city,
                    status: formData.status as 'Active' | 'Inactive',
                    profitSharingPercentage: totalShare, // Update main percentage based on partners
                    partners: partnersPayload
                };
            }
            return acc;
        }));
    } else {
        // Create New
        if (accounts.some(acc => acc.email.toLowerCase() === formData.email.toLowerCase())) {
            alert("A corporate account with this email already exists.");
            return;
        }

        const newAccount: CorporateAccount = {
          id: `CORP-${Date.now()}`,
          companyName: formData.companyName,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          city: formData.city,
          status: formData.status as 'Active' | 'Inactive',
          createdAt: new Date().toISOString().split('T')[0],
          profitSharingPercentage: totalShare,
          partners: partnersPayload
        };
        setAccounts(prev => [newAccount, ...prev]);
    }

    setIsModalOpen(false);
    setFormData(initialFormState);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this franchise account? This action cannot be undone.")) {
      setAccounts(prevAccounts => prevAccounts.filter(acc => acc.id !== id));
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const filteredAccounts = accounts.filter(acc => 
    acc.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (acc.city && acc.city.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // --- Export/Import Handlers ---
  const handleExportAccounts = () => {
    const jsonString = JSON.stringify(accounts, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `corporate_accounts_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImportFile(e.target.files[0]);
    } else {
      setSelectedImportFile(null);
    }
  };

  const processImport = () => {
    if (!selectedImportFile) {
      alert("Please select a file to import.");
      return;
    }

    if (!window.confirm("Importing accounts will overwrite all existing corporate accounts. Are you sure you want to proceed?")) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData: CorporateAccount[] = JSON.parse(event.target?.result as string);
        if (Array.isArray(importedData) && importedData.every(item => item.id && item.companyName)) {
          setAccounts(importedData);
          alert("Corporate accounts imported successfully!");
          setIsImportModalOpen(false);
          setSelectedImportFile(null);
        } else {
          throw new Error("Invalid JSON structure.");
        }
      } catch (error) {
        alert(`Failed to import accounts: ${error instanceof Error ? error.message : String(error)}`);
      }
    };
    reader.readAsText(selectedImportFile);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Corporate Management</h2>
          <p className="text-gray-500">Create and manage Franchise/Corporate accounts</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
            <button 
                onClick={handleOpenAdd}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors"
            >
                <Plus className="w-5 h-5" />
                Add Corporate
            </button>
            <button 
                onClick={handleExportAccounts}
                className="bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors border border-gray-300"
            >
                <Download className="w-5 h-5" />
                Backup Data
            </button>
            <button 
                onClick={() => setIsImportModalOpen(true)}
                className="bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors border border-gray-300"
            >
                <Upload className="w-5 h-5" />
                Restore
            </button>
        </div>
      </div>

      {/* Data Safety Warning (Visible if no accounts) */}
      {accounts.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-3 text-amber-800 text-sm">
              <AlertTriangle className="w-5 h-5" />
              <span>
                  No corporate accounts visible. If you believe data is missing, try reloading the page or use the "Restore" button.
                  Data is stored in your browser's local storage.
              </span>
          </div>
      )}

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search by company name, email, or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Accounts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAccounts.map(account => (
          <div key={account.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow group ${account.status === 'Inactive' ? 'opacity-75 border-gray-200' : 'border-gray-200'}`}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-lg ${account.status === 'Inactive' ? 'bg-gray-100' : 'bg-indigo-50'}`}>
                  <Building2 className={`w-6 h-6 ${account.status === 'Inactive' ? 'text-gray-400' : 'text-indigo-600'}`} />
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-bold border ${
                   account.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'
                }`}>
                   {account.status}
                </span>
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 mb-1">{account.companyName}</h3>
              <p className="text-xs text-gray-500 mb-4 font-mono">ID: {account.id}</p>
              
              <div className="space-y-3 border-t border-gray-50 pt-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                   <Mail className="w-4 h-4 text-gray-400" /> {account.email}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                   <Phone className="w-4 h-4 text-gray-400" /> {account.phone || 'N/A'}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                   <MapPin className="w-4 h-4 text-gray-400" /> {account.city || 'N/A'}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                   <Percent className="w-4 h-4 text-gray-400" /> 
                   <span className="font-medium">Total Profit Share: {account.profitSharingPercentage || 0}%</span>
                </div>
                {/* Show partners summary if any */}
                {account.partners && account.partners.length > 0 && (
                     <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                        <Users className="w-3 h-3 mt-0.5" /> 
                        <div className="flex-1 flex flex-wrap gap-1">
                            {account.partners.map((p, idx) => (
                                <span key={idx} className="bg-white border border-gray-200 px-1 rounded">{p.name}: {p.share}%</span>
                            ))}
                        </div>
                     </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                   <Lock className="w-4 h-4 text-gray-400" /> 
                   <span className="font-mono min-w-[80px]">
                      {visiblePasswords[account.id] ? account.password : '••••••••'}
                   </span>
                   <button 
                     type="button"
                     onClick={() => togglePasswordVisibility(account.id)}
                     className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-indigo-600 transition-colors"
                     title={visiblePasswords[account.id] ? "Hide Password" : "Show Password"}
                   >
                     {visiblePasswords[account.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                   </button>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-between items-center">
               <span className="text-xs text-gray-500">Created: {account.createdAt}</span>
               <div className="flex gap-1">
                   <button 
                      onClick={() => handleEdit(account)}
                      className="text-gray-400 hover:text-blue-600 transition-colors p-1.5 rounded-full hover:bg-blue-50"
                      title="Edit Account"
                   >
                      <Edit2 className="w-4 h-4" />
                   </button>
                   <button 
                      onClick={() => handleDelete(account.id)} 
                      className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-full hover:bg-red-50"
                      title="Delete Account"
                   >
                      <Trash2 className="w-4 h-4" />
                   </button>
               </div>
            </div>
          </div>
        ))}

        {filteredAccounts.length === 0 && accounts.length > 0 && (
            <div className="col-span-full py-12 text-center text-gray-500">
                <Search className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p>No accounts match your search.</p>
            </div>
        )}

        {filteredAccounts.length === 0 && accounts.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
               <Building2 className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-lg font-medium">No corporate accounts found.</p>
            <p className="text-sm mt-1">Create a new franchise account to get started.</p>
          </div>
        )}
      </div>

      {/* Add/Edit Account Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8 animate-in fade-in zoom-in duration-200 relative flex flex-col max-h-[90vh]">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0 rounded-t-2xl">
                 <h3 className="font-bold text-gray-800">{editingId ? 'Edit Corporate Account' : 'Create Corporate Account'}</h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                    <input 
                      required 
                      name="companyName" 
                      value={formData.companyName} 
                      onChange={handleInputChange} 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" 
                      placeholder="e.g. Acme Corp" 
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email (Username)</label>
                      <input 
                        required 
                        type="email"
                        name="email" 
                        value={formData.email} 
                        onChange={handleInputChange} 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" 
                        placeholder="franchise@company.com" 
                      />
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input 
                        required 
                        name="city" 
                        value={formData.city} 
                        onChange={handleInputChange} 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" 
                        placeholder="e.g. Mumbai" 
                      />
                   </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                      <input 
                        required={!editingId} // Only required for new accounts
                        type="password"
                        name="password" 
                        value={formData.password} 
                        onChange={handleInputChange} 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" 
                        placeholder={editingId ? "Leave blank to keep current" : "••••••••"} 
                      />
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input 
                        name="phone" 
                        value={formData.phone} 
                        onChange={handleInputChange} 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" 
                        placeholder="+91..." 
                      />
                   </div>
                 </div>

                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select 
                        name="status" 
                        value={formData.status} 
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-indigo-500"
                    >
                        <option>Active</option>
                        <option>Inactive</option>
                    </select>
                 </div>

                 {/* Partnership Configuration Section */}
                 <div className="border border-gray-200 rounded-xl bg-gray-50 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white">
                        <div className="flex items-center gap-2">
                             <Users className="w-4 h-4 text-gray-500" />
                             <h4 className="font-bold text-gray-700 text-sm">Partnership Configuration</h4>
                        </div>
                        <button 
                            type="button"
                            onClick={handleAddPartner}
                            className="text-xs bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-50 transition-colors flex items-center gap-1"
                        >
                            <Plus className="w-3 h-3" /> Add Partner
                        </button>
                    </div>
                    
                    <div className="p-4 space-y-3">
                        {formData.partners.length === 0 ? (
                             <p className="text-sm text-gray-400 italic text-center py-2">No partners added.</p>
                        ) : (
                             formData.partners.map((partner, idx) => (
                                 <div key={idx} className="flex gap-2 items-center">
                                     <input 
                                        placeholder="Partner Name"
                                        value={partner.name}
                                        onChange={(e) => handlePartnerChange(idx, 'name', e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                                     />
                                     <div className="relative w-24">
                                         <input 
                                            type="number"
                                            placeholder="%"
                                            value={partner.share}
                                            onChange={(e) => handlePartnerChange(idx, 'share', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500 pr-6"
                                         />
                                         <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
                                     </div>
                                     <button 
                                        type="button"
                                        onClick={() => handleRemovePartner(idx)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-white rounded-full transition-colors"
                                     >
                                         <Trash2 className="w-4 h-4" />
                                     </button>
                                 </div>
                             ))
                        )}
                        
                        <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-200">
                             <span className="text-xs text-gray-500 font-medium uppercase">Total Share</span>
                             <span className={`text-sm font-bold ${calculateTotalShare() > 100 ? 'text-red-600' : calculateTotalShare() > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                 {calculateTotalShare()}%
                             </span>
                        </div>
                        {calculateTotalShare() > 100 && (
                            <p className="text-xs text-red-500 text-right">Total share cannot exceed 100%</p>
                        )}
                    </div>
                 </div>
                 
                 <div className="pt-2">
                    <button type="submit" className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm">
                       {editingId ? 'Update Account' : 'Create Account'}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Import Accounts Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800">Import Corporate Accounts</h3>
              <button onClick={() => {setIsImportModalOpen(false); setSelectedImportFile(null);}} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select JSON File</label>
                  <input 
                    type="file" 
                    accept=".json"
                    onChange={handleImportFileChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white" 
                  />
                  {selectedImportFile && (
                    <p className="text-xs text-gray-500 mt-2">Selected: {selectedImportFile.name}</p>
                  )}
               </div>
               <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                 <span className="font-bold">Warning:</span> Importing will replace all existing corporate accounts. Make sure you have a backup if needed.
               </p>
               <div className="pt-4 flex justify-end">
                  <button 
                    type="button" 
                    onClick={processImport}
                    disabled={!selectedImportFile}
                    className="bg-indigo-600 text-white py-2.5 px-6 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     Import Now
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Corporate;
