
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Building2, Mail, Phone, Lock, Trash2, X, MapPin, Eye, EyeOff, Download, Upload, AlertTriangle, Edit2, Percent, Users, UserPlus } from 'lucide-react';
import { CorporateAccount, Partner } from '../../types';

const Corporate: React.FC = () => {
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

  const initialFormState = {
    companyName: '',
    email: '',
    password: '',
    phone: '',
    city: '',
    status: 'Active',
    partners: [] as { name: string; share: string }[] 
  };
  const [formData, setFormData] = useState(initialFormState);

  const firstRender = useRef(true);

  useEffect(() => {
    const saved = localStorage.getItem('corporate_accounts');
    if (saved && accounts.length === 0) {
        try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                setAccounts(parsed);
            }
        } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (accounts.length === 0) {
        const currentStorage = localStorage.getItem('corporate_accounts');
        if (currentStorage && currentStorage.length > 20) return;
    }
    localStorage.setItem('corporate_accounts', JSON.stringify(accounts));
  }, [accounts]);

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

  const handleAddPartner = () => {
      setFormData(prev => ({ ...prev, partners: [...prev.partners, { name: '', share: '' }] }));
  };

  const handleRemovePartner = (index: number) => {
      setFormData(prev => ({ ...prev, partners: prev.partners.filter((_, i) => i !== index) }));
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

    const totalShare = calculateTotalShare();
    if (totalShare > 100) {
        alert("Total partner share cannot exceed 100%.");
        return;
    }

    const partnersPayload: Partner[] = formData.partners.map(p => ({
        name: p.name,
        share: parseFloat(p.share) || 0
    })).filter(p => p.name); 

    if (editingId) {
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
                    profitSharingPercentage: totalShare,
                    partners: partnersPayload
                };
            }
            return acc;
        }));
    } else {
        if (accounts.some(acc => acc.email.toLowerCase() === formData.email.toLowerCase())) {
            alert("Already exists.");
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

    window.dispatchEvent(new Event('cloud-sync-immediate'));
    setIsModalOpen(false);
    setFormData(initialFormState);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure?")) {
      setAccounts(prevAccounts => prevAccounts.filter(acc => acc.id !== id));
      window.dispatchEvent(new Event('cloud-sync-immediate'));
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredAccounts = accounts.filter(acc => 
    acc.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (acc.city && acc.city.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div><h2 className="text-2xl font-bold text-gray-800">Corporate Management</h2><p className="text-gray-500">Manage franchise entities</p></div>
        <div className="flex gap-3"><button onClick={handleOpenAdd} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"><Plus className="w-5 h-5" /> Add Corporate</button></div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" /><input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div></div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAccounts.map(account => (
          <div key={account.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4"><div className="p-3 rounded-lg bg-indigo-50"><Building2 className="w-6 h-6 text-indigo-600" /></div><span className={`px-2 py-1 rounded-full text-xs font-bold border ${account.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>{account.status}</span></div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">{account.companyName}</h3>
              <div className="space-y-3 border-t border-gray-50 pt-4"><div className="flex items-center gap-2 text-sm text-gray-600"><Mail className="w-4 h-4 text-gray-400" /> {account.email}</div><div className="flex items-center gap-2 text-sm text-gray-600"><MapPin className="w-4 h-4 text-gray-400" /> {account.city}</div></div>
            </div>
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-between items-center"><span className="text-xs text-gray-500">Since {account.createdAt}</span><div className="flex gap-1"><button onClick={() => handleEdit(account)} className="text-gray-400 hover:text-blue-600 p-1.5"><Edit2 className="w-4 h-4" /></button><button onClick={() => handleDelete(account.id)} className="text-gray-400 hover:text-red-500 p-1.5"><Trash2 className="w-4 h-4" /></button></div></div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"><div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8 flex flex-col max-h-[90vh]"><div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0"><h3 className="font-bold text-gray-800">Entity Form</h3><button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button></div><form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1"><div><label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label><input required name="companyName" value={formData.companyName} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none" /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input required type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">City</label><input required name="city" value={formData.city} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-1">Password</label><input required={!editingId} type="password" name="password" value={formData.password} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div></div><div className="pt-2"><button type="submit" className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium shadow-sm">Save Account</button></div></form></div></div>
      )}
    </div>
  );
};

export default Corporate;
