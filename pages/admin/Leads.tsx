
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Search, Filter, Download, MoreVertical, 
  MapPin, IndianRupee, Calendar, Clock, Sparkles,
  X, Briefcase, Mail, Phone, Calculator, Target, User,
  Pencil, Trash2, MessageCircle, Send, Loader2, FileText, Upload
} from 'lucide-react';
import { generateGeminiResponse } from '../../services/geminiService';
import ContactDisplay from '../../components/ContactDisplay';

interface Lead {
  id: string;
  name: string;
  role: string;
  location: string;
  totalValue: number;
  billValue: number;
  franchiseValue: number;
  adFee: number;
  status: 'New' | 'Contacted' | 'Qualified' | 'Converted' | 'Lost';
  source: string;
  priority: 'Hot' | 'Warm' | 'Cold';
  nextCallDate: string;
  nextCallTime: string;
  notes: string;
  email?: string;
  phone?: string;
  tags: string[];
  createdAt: string;
}

const MOCK_LEADS: Lead[] = [];

const Leads = () => {
  const [leads, setLeads] = useState<Lead[]>(() => {
    const saved = localStorage.getItem('leads_data');
    return saved ? JSON.parse(saved) : MOCK_LEADS;
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('leads_data', JSON.stringify(leads));
  }, [leads]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const initialFormState = {
    name: '',
    role: '', // Job Title
    city: '',
    phone: '',
    email: '',
    billValue: '',
    franchiseValue: '',
    adFee: '',
    source: 'Google Ads',
    priority: 'Warm',
    nextCallDate: '',
    nextCallTime: '',
    notes: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  // AI Communication State
  const [communicationText, setCommunicationText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const totalValue = useMemo(() => {
    const bill = parseFloat(formData.billValue) || 0;
    const franchise = parseFloat(formData.franchiseValue) || 0;
    const ad = parseFloat(formData.adFee) || 0;
    return bill + franchise + ad;
  }, [formData.billValue, formData.franchiseValue, formData.adFee]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setCommunicationText('');
    setEditingId(null);
    setIsModalOpen(false);
  };

  const handleEdit = (lead: Lead) => {
    setFormData({
      name: lead.name,
      role: lead.role,
      city: lead.location,
      phone: lead.phone || '',
      email: lead.email || '',
      // SAFE GUARD: Handle potentially undefined numeric values before toString()
      billValue: (lead.billValue !== undefined && lead.billValue !== null) ? lead.billValue.toString() : '0',
      franchiseValue: (lead.franchiseValue !== undefined && lead.franchiseValue !== null) ? lead.franchiseValue.toString() : '0',
      adFee: (lead.adFee !== undefined && lead.adFee !== null) ? lead.adFee.toString() : '0',
      source: lead.source,
      priority: lead.priority,
      nextCallDate: lead.nextCallDate,
      nextCallTime: lead.nextCallTime,
      notes: lead.notes
    });
    setEditingId(lead.id);
    setCommunicationText(''); // Reset AI text on new edit
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this lead?")) {
      setLeads(leads.filter(l => l.id !== id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
      // Update existing lead
      setLeads(prev => prev.map(lead => {
        if (lead.id === editingId) {
          return {
            ...lead,
            name: formData.name,
            role: formData.role,
            location: formData.city,
            phone: formData.phone,
            email: formData.email,
            billValue: parseFloat(formData.billValue) || 0,
            franchiseValue: parseFloat(formData.franchiseValue) || 0,
            adFee: parseFloat(formData.adFee) || 0,
            totalValue: totalValue,
            source: formData.source,
            priority: formData.priority as any,
            nextCallDate: formData.nextCallDate,
            nextCallTime: formData.nextCallTime,
            notes: formData.notes,
          };
        }
        return lead;
      }));
    } else {
      // Create new lead
      const newLead: Lead = {
        id: `L${Date.now()}`,
        name: formData.name,
        role: formData.role,
        location: formData.city,
        phone: formData.phone,
        email: formData.email,
        billValue: parseFloat(formData.billValue) || 0,
        franchiseValue: parseFloat(formData.franchiseValue) || 0,
        adFee: parseFloat(formData.adFee) || 0,
        totalValue: totalValue,
        status: 'New',
        source: formData.source,
        priority: formData.priority as any,
        nextCallDate: formData.nextCallDate,
        nextCallTime: formData.nextCallTime,
        notes: formData.notes,
        tags: [formData.priority],
        createdAt: new Date().toISOString().split('T')[0]
      };
      setLeads([newLead, ...leads]);
    }

    resetForm();
  };

  // --- Import & Sample Functions ---
  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split('\n');
        if (lines.length < 2) {
            alert("Invalid CSV. Please use the sample format.");
            return;
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
        const newLeads: Lead[] = [];

        for(let i = 1; i < lines.length; i++) {
            if(!lines[i].trim()) continue;
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            const data: any = {};
            headers.forEach((h, idx) => { data[h] = values[idx] });

            if (data.name) {
                // Handle potential missing fields safely
                const total = parseFloat(data.totalvalue || '0');
                newLeads.push({
                    id: `L${Date.now() + i}`,
                    name: data.name,
                    role: data.role || 'Lead',
                    location: data.location || data.city || 'Unknown',
                    phone: data.phone || '',
                    email: data.email || '',
                    totalValue: total,
                    billValue: total, // Simplify for import
                    franchiseValue: 0,
                    adFee: 0,
                    status: 'New',
                    source: data.source || 'Import',
                    priority: (['Hot', 'Warm', 'Cold'].includes(data.priority) ? data.priority : 'Warm') as any,
                    nextCallDate: new Date().toISOString().split('T')[0],
                    nextCallTime: '10:00',
                    notes: 'Imported via CSV',
                    tags: ['Imported'],
                    createdAt: new Date().toISOString().split('T')[0]
                });
            }
        }
        
        if (newLeads.length > 0) {
            setLeads(prev => [...newLeads, ...prev]);
            alert(`Successfully imported ${newLeads.length} leads.`);
        } else {
            alert("No valid leads found in file.");
        }
    };
    reader.readAsText(file);
    if(fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadSampleCSV = () => {
    const headers = "Name,Role,Location,Phone,Email,TotalValue,Source,Priority";
    const row1 = "John Doe,Manager,Mumbai,9876543210,john@example.com,50000,LinkedIn,Hot";
    const row2 = "Jane Smith,Director,Delhi,9123456780,jane@example.com,100000,Referral,Warm";
    const csvContent = "data:text/csv;charset=utf-8," + [headers, row1, row2].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "leads_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // AI Handlers
  const handleGenerateMessage = async (type: 'Proposal' | 'Follow-up' | 'Intro') => {
    if (!formData.name) {
        alert("Please enter lead name first.");
        return;
    }
    setIsGenerating(true);
    
    const prompt = `Write a professional sales ${type} message for a potential client.
    Lead Name: ${formData.name}
    Lead Role: ${formData.role}
    Lead Location: ${formData.city}
    Context/Notes: ${formData.notes}
    My Product: "OK BOZ" (A staff management and payroll platform).
    Tone: Professional, persuasive, and concise.
    Format: Plain text, ready to copy.`;

    try {
        const text = await generateGeminiResponse(prompt);
        setCommunicationText(text);
    } catch (error) {
        console.error(error);
        setCommunicationText("Failed to generate message. Please try again.");
    }
    setIsGenerating(false);
  };

  const handleCall = () => {
      if (formData.phone) window.location.href = `tel:${formData.phone}`;
  };

  const handleWhatsApp = () => {
      if (formData.phone) {
          const cleanPhone = formData.phone.replace(/\D/g, '');
          const text = encodeURIComponent(communicationText);
          window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
      }
  };

  const handleEmail = () => {
      if (formData.email) {
          const subject = encodeURIComponent("Proposal from OK BOZ");
          const body = encodeURIComponent(communicationText);
          window.location.href = `mailto:${formData.email}?subject=${subject}&body=${body}`;
      }
  };

  // Stats
  const pipelineValue = leads.reduce((sum, l) => sum + l.totalValue, 0);
  const activeLeads = leads.filter(l => l.status !== 'Converted' && l.status !== 'Lost').length;
  const hotLeads = leads.filter(l => l.priority === 'Hot').length;
  const conversionRate = Math.round((leads.filter(l => l.status === 'Converted').length / (leads.length || 1)) * 100);

  const filteredLeads = leads.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch(status) {
        case 'New': return 'bg-blue-500';
        case 'Contacted': return 'bg-purple-500';
        case 'Qualified': return 'bg-yellow-500';
        case 'Converted': return 'bg-emerald-500';
        default: return 'bg-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Franchisee Leads</h2>
        <div className="flex gap-3 items-center">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                    type="text" 
                    placeholder="Search..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm w-64"
                />
            </div>
            <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full">
               <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            </button>
            <div className="w-8 h-8 bg-blue-500 rounded-full text-white flex items-center justify-center font-bold">A</div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pipeline Value</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">₹{(pipelineValue/100000).toFixed(1)}L</h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                <IndianRupee className="w-5 h-5" />
            </div>
         </div>
         <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Leads</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{activeLeads}</h3>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg text-purple-600">
                <Target className="w-5 h-5" />
            </div>
         </div>
         <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Hot Leads</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{hotLeads}</h3>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg text-orange-600">
                <Sparkles className="w-5 h-5" />
            </div>
         </div>
         <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Conversion</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{conversionRate}%</h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
                <Briefcase className="w-5 h-5" />
            </div>
         </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-2 items-center justify-between">
         <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
                type="text" 
                placeholder="Search leads..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg focus:ring-0 text-sm"
            />
         </div>
         <div className="flex gap-2">
            <button 
                onClick={downloadSampleCSV}
                className="px-3 py-2 hover:bg-gray-100 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium flex items-center gap-2"
                title="Download Sample CSV"
            >
                <FileText className="w-4 h-4" /> Sample
            </button>
            
            <input 
                type="file" 
                accept=".csv" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleCSVImport} 
            />
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 hover:bg-gray-100 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium flex items-center gap-2"
            >
                <Upload className="w-4 h-4" /> Import
            </button>

            <button className="p-2 hover:bg-gray-100 rounded-lg border border-gray-200 text-gray-600"><Filter className="w-4 h-4" /> Filter</button>
            <button className="px-4 py-2 hover:bg-gray-100 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium flex items-center gap-2"><Download className="w-4 h-4" /> Export</button>
            <button 
                onClick={() => { resetForm(); setIsModalOpen(true); }}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
            >
                <Plus className="w-4 h-4" /> Add New Lead
            </button>
         </div>
      </div>

      {/* Leads Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {filteredLeads.map(lead => (
            <div key={lead.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow group relative">
               <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                     <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(lead.status)}`}></div>
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{lead.status}</span>
                     <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px] font-mono">
                        {lead.priority === 'Hot' ? '🔥' : lead.priority === 'Warm' ? '👍' : '❄️'}
                     </span>
                  </div>
                  <div className="flex gap-1">
                    <button 
                        onClick={() => handleEdit(lead)} 
                        className="text-gray-400 hover:text-blue-600 p-1 hover:bg-blue-50 rounded transition-colors"
                        title="Edit Lead"
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => handleDelete(lead.id)} 
                        className="text-gray-400 hover:text-red-600 p-1 hover:bg-red-50 rounded transition-colors"
                        title="Delete Lead"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
               </div>

               <h3 className="text-lg font-bold text-gray-900">{lead.name}</h3>
               <p className="text-gray-500 text-sm mb-3">{lead.role}</p>

               <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                     <MapPin className="w-4 h-4 text-gray-400" /> {lead.location}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                     <IndianRupee className="w-4 h-4 text-gray-400" /> {lead.totalValue.toLocaleString()}
                  </div>
               </div>
               
               <div className="space-y-1 mb-4 border-t border-gray-50 pt-2">
                  <div className="text-sm">
                      <ContactDisplay type="phone" value={lead.phone || ''} />
                  </div>
                  <div className="text-sm">
                      <ContactDisplay type="email" value={lead.email || ''} />
                  </div>
               </div>

               <div className="flex flex-wrap gap-2 mb-4">
                  {lead.tags.map((tag, i) => (
                     <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-medium border border-gray-200">
                        {tag}
                     </span>
                  ))}
               </div>

               <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                     lead.name.startsWith('R') ? 'bg-blue-500' : lead.name.startsWith('S') ? 'bg-emerald-500' : 'bg-purple-500'
                  }`}>
                     {lead.name.charAt(0)}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                     <Calendar className="w-3 h-3" /> {new Date(lead.nextCallDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
               </div>
            </div>
         ))}
         {filteredLeads.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
               <Target className="w-12 h-12 mx-auto text-gray-300 mb-3" />
               <p>No leads found matching your search.</p>
            </div>
         )}
      </div>

      {/* Add/Edit Lead Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl shrink-0">
                 <h3 className="font-bold text-gray-800 text-lg">{editingId ? 'Edit Lead' : 'Add New Lead'}</h3>
                 <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                <div className="flex flex-col lg:flex-row h-full">
                  
                  {/* Left Column: Details Form */}
                  <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-5 lg:border-r border-gray-100">
                     {/* Basic Info */}
                     <div>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input 
                                required
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                placeholder="Full Name"
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div className="relative">
                            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input 
                                name="role"
                                value={formData.role}
                                onChange={handleInputChange}
                                placeholder="Job Title"
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input 
                                name="city"
                                value={formData.city}
                                onChange={handleInputChange}
                                placeholder="City"
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input 
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                placeholder="Phone"
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input 
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                placeholder="Email"
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                     </div>

                     {/* Financial Value Section */}
                     <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                           <IndianRupee className="w-3 h-3" /> Financial Value
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                           <div>
                              <label className="text-xs text-gray-500 block mb-1">Bill Value</label>
                              <input 
                                 type="number"
                                 name="billValue"
                                 value={formData.billValue}
                                 onChange={handleInputChange}
                                 placeholder="0.00"
                                 className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                              />
                           </div>
                           <div>
                              <label className="text-xs text-gray-500 block mb-1">Franchise</label>
                              <input 
                                 type="number"
                                 name="franchiseValue"
                                 value={formData.franchiseValue}
                                 onChange={handleInputChange}
                                 placeholder="0.00"
                                 className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                              />
                           </div>
                           <div>
                              <label className="text-xs text-gray-500 block mb-1">Ad Fee</label>
                              <input 
                                 type="number"
                                 name="adFee"
                                 value={formData.adFee}
                                 onChange={handleInputChange}
                                 placeholder="0.00"
                                 className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                              />
                           </div>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-2">
                           <div className="flex items-center gap-2 text-indigo-700 font-medium text-sm">
                              <Calculator className="w-4 h-4" /> Total Value
                           </div>
                           <div className="font-bold text-indigo-700 text-lg">
                              ${totalValue.toLocaleString()}
                           </div>
                        </div>
                     </div>

                     {/* Meta Info */}
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1"><Target className="w-3 h-3" /> Source</label>
                           <select 
                              name="source"
                              value={formData.source}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                           >
                              <option>Google Ads</option>
                              <option>LinkedIn</option>
                              <option>Referral</option>
                              <option>Cold Call</option>
                           </select>
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Priority</label>
                           <select 
                              name="priority"
                              value={formData.priority}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                           >
                              <option>Hot</option>
                              <option>Warm</option>
                              <option>Cold</option>
                           </select>
                        </div>
                     </div>

                     {/* Schedule */}
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1"><Calendar className="w-3 h-3" /> Next Call Date</label>
                           <input 
                              type="date"
                              name="nextCallDate"
                              value={formData.nextCallDate}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                           />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1"><Clock className="w-3 h-3" /> Time</label>
                           <input 
                              type="time"
                              name="nextCallTime"
                              value={formData.nextCallTime}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                           />
                        </div>
                     </div>

                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Initial Notes</label>
                        <textarea 
                           name="notes"
                           rows={3}
                           value={formData.notes}
                           onChange={handleInputChange}
                           placeholder="Add any context or notes here..."
                           className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        />
                     </div>

                     <div className="flex gap-4 pt-2">
                        <button 
                           type="button"
                           onClick={resetForm}
                           className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                        >
                           Cancel
                        </button>
                        <button 
                           type="submit"
                           className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md transition-colors"
                        >
                           {editingId ? 'Update Lead' : 'Create Lead'}
                        </button>
                     </div>
                  </form>

                  {/* Right Column: Engagement / AI */}
                  <div className="lg:w-[40%] bg-gray-50 p-6 flex flex-col">
                     <div className="mb-6">
                        <h4 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                           <Sparkles className="w-4 h-4 text-indigo-600" /> AI Sales Assistant
                        </h4>
                        <div className="grid grid-cols-3 gap-2 mb-4">
                           <button 
                              onClick={() => handleGenerateMessage('Proposal')}
                              disabled={isGenerating}
                              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium hover:border-indigo-300 hover:text-indigo-700 transition-colors shadow-sm"
                           >
                              Draft Proposal
                           </button>
                           <button 
                              onClick={() => handleGenerateMessage('Follow-up')}
                              disabled={isGenerating}
                              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium hover:border-indigo-300 hover:text-indigo-700 transition-colors shadow-sm"
                           >
                              Draft Follow-up
                           </button>
                           <button 
                              onClick={() => handleGenerateMessage('Intro')}
                              disabled={isGenerating}
                              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium hover:border-indigo-300 hover:text-indigo-700 transition-colors shadow-sm"
                           >
                              Draft Intro
                           </button>
                        </div>
                        
                        <div className="relative">
                           <textarea 
                              value={communicationText}
                              onChange={(e) => setCommunicationText(e.target.value)}
                              placeholder="Select an option above to generate a message or type here..."
                              className="w-full p-3 pb-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none shadow-sm h-40"
                           />
                           <button 
                              onClick={() => {navigator.clipboard.writeText(communicationText);}}
                              className="absolute bottom-3 right-3 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                              title="Copy Message"
                           >
                              <Send className="w-4 h-4" />
                           </button>
                        </div>
                     </div>

                     {/* Quick Actions based on generated text */}
                     <div className="mt-auto space-y-3">
                        <button onClick={handleCall} className="w-full py-3 border border-gray-300 text-gray-700 font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-white transition-colors">
                           <Phone className="w-4 h-4" /> Call Lead
                        </button>
                        <div className="grid grid-cols-2 gap-3">
                           <button onClick={handleWhatsApp} className="py-3 bg-green-50 text-green-700 font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-green-100 transition-colors border border-green-200">
                              <MessageCircle className="w-4 h-4" /> WhatsApp
                           </button>
                           <button onClick={handleEmail} className="py-3 bg-blue-50 text-blue-700 font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors border border-blue-200">
                              <Mail className="w-4 h-4" /> Email
                           </button>
                        </div>
                     </div>
                  </div>
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Leads;
