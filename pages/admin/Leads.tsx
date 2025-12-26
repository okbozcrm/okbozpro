
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Search, Filter, Download, MoreVertical, 
  MapPin, IndianRupee, Calendar, Clock, Sparkles,
  X, Briefcase, Mail, Phone, Calculator, Target, User,
  Pencil, Trash2, MessageCircle, Send, Loader2, FileText, Upload,
  LayoutGrid, List, ThumbsUp, ThumbsDown, PhoneOff, BookOpen, 
  Zap, Building, Activity, TrendingUp, BadgeCheck,
  Layers, Settings, Users, CheckCircle, Edit2, BrainCircuit,
  PhoneCall, LayoutDashboard, ChevronDown, History, Save, Copy, Check
} from 'lucide-react';
import { generateGeminiResponse } from '../../services/geminiService';
import { UserRole } from '../../types';
import { syncToCloud } from '../../services/cloudService';

interface LeadHistory {
  id: string;
  date: string;
  message: string;
  type: 'Note' | 'Status' | 'Outreach';
}

interface Lead {
  id: string;
  name: string;
  role: string;
  location: string;
  totalValue: number;
  status: 'New' | 'Contacted' | 'Qualified' | 'Converted' | 'Lost' | 'Booked';
  priority: 'Hot' | 'Warm' | 'Cold';
  nextFollowUp?: string; 
  notes: string; 
  history: LeadHistory[];
  email?: string;
  phone?: string;
  source: string;
  createdAt: string;
  outcome?: 'Interested' | 'Rejected' | 'Callback' | 'No Ans';
}

const Leads = () => {
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const role = localStorage.getItem('user_role') as UserRole;

  const [leads, setLeads] = useState<Lead[]>(() => {
    const saved = localStorage.getItem('leads_data');
    if (saved) return JSON.parse(saved);
    
    return [
      { id: 'L1', name: 'Suresh Kumar', role: 'ENTREPRENEUR', location: 'Chennai', totalValue: 500000, status: 'Qualified', priority: 'Hot', nextFollowUp: '2025-12-26T10:00', notes: '', history: [{id: 'h1', date: '2025-11-20T10:00:00Z', message: 'Interested in Erode cluster franchise.', type: 'Note'}], phone: '9876543210', source: 'Instagram Ads', createdAt: '2025-11-20' },
      { id: 'L2', name: 'Priya Verma', role: 'INVESTOR', location: 'Bangalore', totalValue: 1200000, status: 'New', priority: 'Warm', nextFollowUp: '2025-12-27T14:30', notes: '', history: [{id: 'h2', date: '2025-11-21T11:30:00Z', message: 'Requested ROI sheet for multi-unit model.', type: 'Note'}], phone: '9123456780', source: 'LinkedIn', createdAt: '2025-11-21' },
    ];
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [priorityFilter, setPriorityFilter] = useState('All Priority');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Message Settings State
  const [messageSettings, setMessageSettings] = useState(() => {
    const saved = localStorage.getItem('leads_message_settings');
    return saved ? JSON.parse(saved) : {
      waPrefix: "Hi [Name]! Hope you are doing well.",
      waTemplate: "Thank you for showing interest in OK BOZ Franchise opportunity. I would love to schedule a brief call to discuss the potential for the [Location] region and share our detailed ROI projections.",
      emailSubject: "OK BOZ Franchise Opportunity - Follow up & ROI Sheet"
    };
  });

  // Modal Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    role: 'LEAD',
    priority: 'Warm' as 'Hot' | 'Warm' | 'Cold',
    outcome: 'Interested' as 'Interested' | 'Rejected' | 'Callback' | 'No Ans',
    followUpDate: '2025-12-26',
    followUpTime: '10:00',
    notes: '',
    location: ''
  });

  // AI State
  const [aiText, setAiText] = useState('');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    localStorage.setItem('leads_data', JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    localStorage.setItem('leads_message_settings', JSON.stringify(messageSettings));
  }, [messageSettings]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setFormData({
      name: '', phone: '', role: 'LEAD', priority: 'Warm',
      outcome: 'Interested', followUpDate: '2025-12-26',
      followUpTime: '10:00', notes: '', location: ''
    });
    setAiText('');
    setEditingId(null);
    setIsModalOpen(false);
  };

  const handleEdit = (lead: Lead) => {
    setEditingId(lead.id);
    const followUp = lead.nextFollowUp || '';
    const [date, time] = followUp.includes('T') ? followUp.split('T') : [followUp, '10:00'];
    setFormData({
      name: lead.name,
      phone: lead.phone || '',
      role: lead.role,
      priority: lead.priority,
      outcome: (lead.outcome as any) || 'Interested',
      followUpDate: date || '2025-12-26',
      followUpTime: time || '10:00',
      notes: '', 
      location: lead.location
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.name || !formData.phone) {
      alert("Required fields missing.");
      return;
    }

    const currentLead = leads.find(l => l.id === editingId);
    let updatedHistory = currentLead ? [...currentLead.history] : [];

    if (formData.notes.trim()) {
        updatedHistory.unshift({
            id: `h-${Date.now()}`,
            date: new Date().toISOString(),
            message: formData.notes.trim(),
            type: 'Note'
        });
    }

    if (currentLead && currentLead.outcome !== formData.outcome) {
        updatedHistory.unshift({
            id: `s-${Date.now()}`,
            date: new Date().toISOString(),
            message: `Interaction outcome updated to: ${formData.outcome}`,
            type: 'Status'
        });
    }

    const leadData: Lead = {
      id: editingId || `L${Date.now()}`,
      name: formData.name,
      role: formData.role.toUpperCase(),
      location: formData.location || 'Unknown',
      phone: formData.phone,
      priority: formData.priority,
      status: formData.outcome === 'Interested' ? 'Qualified' : 'New',
      outcome: formData.outcome,
      nextFollowUp: `${formData.followUpDate}T${formData.followUpTime}`,
      notes: '', 
      history: updatedHistory,
      totalValue: editingId ? (leads.find(l => l.id === editingId)?.totalValue || 0) : 0,
      source: editingId ? (leads.find(l => l.id === editingId)?.source || 'Manual Entry') : 'Manual Entry',
      createdAt: editingId ? (leads.find(l => l.id === editingId)?.createdAt || '') : new Date().toISOString()
    };

    let updatedLeads: Lead[];
    if (editingId) {
      updatedLeads = leads.map(l => l.id === editingId ? leadData : l);
    } else {
      updatedLeads = [leadData, ...leads];
    }

    setLeads(updatedLeads);
    localStorage.setItem('leads_data', JSON.stringify(updatedLeads));

    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('cloud-sync-immediate'));
    
    await syncToCloud();
    resetForm();
  };

  const handleSynthesize = async () => {
    if (!formData.name) return;
    setIsSynthesizing(true);
    setAiText('');
    
    const leadContext = leads.find(l => l.id === editingId);
    const historySummary = leadContext?.history.slice(0, 3).map(h => h.message).join(' | ') || 'No prior interaction.';
    
    const prompt = `Act as an expert Franchise Sales Consultant for OK BOZ. 
    Task: Write a highly persuasive and professional outreach message based on the following context.
    
    Lead Name: ${formData.name}
    Franchise Location Interest: ${formData.location || 'Not Specified'}
    Last Outcome: ${formData.outcome}
    Previous Interaction History: ${historySummary}
    Current Manager Notes: ${formData.notes || 'No new notes'}
    
    GUIDELINES:
    1. Start with the prefix: "${messageSettings.waPrefix.replace('[Name]', formData.name)}"
    2. Use this base template context: "${messageSettings.waTemplate.replace('[Location]', formData.location || 'your area')}"
    3. Keep the tone sophisticated, inviting, and professional.
    4. Focus on scheduling a call to discuss growth and ROI.
    5. Ensure the message is suitable for both WhatsApp and Email body.`;
    
    try {
      const res = await generateGeminiResponse(prompt, "You are an expert business communication AI for OK BOZ.");
      setAiText(res);
    } catch (e) {
      setAiText("Unable to generate outreach message. Please check API connection.");
    }
    setIsSynthesizing(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(aiText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      total: leads.length,
      followUps: leads.filter(l => l.nextFollowUp?.startsWith(today)).length,
      qualified: leads.filter(l => l.status === 'Qualified').length,
      valuation: leads.reduce((sum, l) => sum + (Number(l.totalValue) || 0), 0)
    };
  }, [leads]);

  const filteredLeads = leads.filter(l => {
    const matchesSearch = (l.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           l.phone?.includes(searchTerm) || 
                           l.location?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'All Status' || l.status === statusFilter;
    const matchesPriority = priorityFilter === 'All Priority' || l.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20"><Layers className="w-6 h-6" /></div>
          <div><h2 className="text-3xl font-black text-gray-900 tracking-tighter">Franchisee Leads</h2><p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Growth Pipeline & Outreach Intelligence</p></div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="bg-white border border-gray-200 text-gray-600 px-5 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-widest flex items-center gap-2 hover:bg-gray-50 transition-all shadow-sm"
          >
            <Settings className="w-4 h-4" /> Message Templates
          </button>
          <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-[#00a86b] hover:bg-[#008f5b] text-white px-6 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-[#00a86b]/20 transition-all transform active:scale-95"><Plus className="w-5 h-5" /> Add Lead</button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 items-center">
          <div className="relative flex-1 group w-full"><Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5 transition-colors group-focus-within:text-indigo-500" /><input type="text" placeholder="Search by name, city, or phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-14 pr-4 py-4 bg-white border border-gray-100 rounded-full text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-200 transition-all shadow-sm placeholder:text-gray-300" /></div>
          <div className="flex gap-4 items-center w-full lg:w-auto">
             <div className="flex bg-white rounded-full border border-gray-100 p-1.5 shadow-sm">
               <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-transparent text-[11px] font-black uppercase text-gray-500 px-4 outline-none cursor-pointer"><option>All Status</option><option>New</option><option>Qualified</option><option>Contacted</option><option>Converted</option></select>
               <div className="w-px h-4 bg-gray-200 self-center"></div>
               <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="bg-transparent text-[11px] font-black uppercase text-gray-500 px-4 outline-none cursor-pointer"><option>All Priority</option><option>Hot</option><option>Warm</option><option>Cold</option></select>
             </div>
          </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-between h-44 group hover:border-indigo-500/30 transition-all">
             <div><div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4"><Users className="w-5 h-5" /></div><p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Active Pipeline</p><h3 className="text-4xl font-black text-gray-900 mt-2">{stats.total}</h3></div>
          </div>
          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-between h-44 group hover:border-rose-500/30 transition-all">
             <div><div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-4"><PhoneCall className="w-5 h-5" /></div><p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Calls Today</p><h3 className="text-4xl font-black text-rose-600 mt-2">{stats.followUps}</h3></div>
          </div>
          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-between h-44 group hover:border-emerald-500/30 transition-all">
             <div><div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4"><ThumbsUp className="w-5 h-5" /></div><p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Qualified</p><h3 className="text-4xl font-black text-emerald-600 mt-2">{stats.qualified}</h3></div>
          </div>
          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-between h-44 group hover:border-purple-500/30 transition-all">
             <div><div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4"><Calculator className="w-5 h-5" /></div><p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Pipeline Value</p><h3 className="text-4xl font-black text-purple-600 mt-2">₹{(stats.valuation / 100000).toFixed(1)}L</h3></div>
          </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-2xl shadow-gray-200/50 overflow-hidden">
          <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-white text-gray-400 text-[11px] font-black uppercase tracking-[0.2em] border-b border-gray-50">
                      <tr><th className="px-10 py-8">Lead Identity</th><th className="px-10 py-8">Contact</th><th className="px-10 py-8">Location</th><th className="px-10 py-8">Status</th><th className="px-10 py-8">Follow-up</th><th className="px-10 py-8 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                      {filteredLeads.map((lead) => (
                          <tr key={lead.id} className="group hover:bg-indigo-50/20 transition-all cursor-pointer" onClick={() => handleEdit(lead)}>
                              <td className="px-10 py-6"><div className="flex items-center gap-4"><div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black shadow-sm ${lead.priority === 'Hot' ? 'bg-rose-500' : lead.priority === 'Warm' ? 'bg-orange-500' : 'bg-slate-500'}`}>{lead.name.charAt(0).toUpperCase()}</div><div><p className="font-extrabold text-gray-900 text-base tracking-tight">{lead.name}</p><p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">{lead.role}</p></div></div></td>
                              <td className="px-10 py-6 font-bold text-gray-500"><div className="flex items-center gap-3"><Phone className="w-3.5 h-3.5 text-gray-300" />{lead.phone}</div></td>
                              <td className="px-10 py-6"><div className="flex items-center gap-2.5 text-gray-500 font-bold"><MapPin className="w-3.5 h-3.5 text-gray-300" />{lead.location}</div></td>
                              <td className="px-10 py-6"><span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border shadow-sm ${lead.status === 'Qualified' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-gray-50 text-gray-700 border-gray-100'}`}>{lead.status}</span></td>
                              <td className="px-10 py-6"><div className="flex items-center gap-2 text-[10px] font-black text-rose-500 bg-rose-50 px-2.5 py-1.5 rounded-xl border border-rose-100 w-fit"><Calendar className="w-3 h-3 opacity-60" /> {lead.nextFollowUp?.split('T')[0]}</div></td>
                              <td className="px-10 py-6 text-right"><div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button className="p-2.5 bg-white text-indigo-600 rounded-xl border border-gray-100 hover:bg-indigo-50 hover:border-indigo-200 shadow-sm transition-all"><Edit2 className="w-4 h-4"/></button><button onClick={(e) => { e.stopPropagation(); if(window.confirm('Delete lead?')) setLeads(prev => prev.filter(l => l.id !== lead.id)); }} className="p-2.5 bg-white text-rose-600 rounded-xl border border-gray-100 hover:bg-rose-50 hover:border-rose-200 shadow-sm transition-all"><Trash2 className="w-4 h-4"/></button></div></td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>

      {/* Main Lead Management Modal */}
      {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0a0a0c]/40 backdrop-blur-xl animate-in fade-in duration-300">
              <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-white">
                  <div className="p-8 border-b border-gray-50 flex justify-between items-start bg-gray-50/30 shrink-0">
                      <div className="flex items-center gap-5">
                          <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-indigo-600 shadow-xl shadow-indigo-600/10 border border-gray-100"><User className="w-8 h-8" /></div>
                          <div><h3 className="text-4xl font-black text-slate-800 tracking-tighter">{editingId ? 'Modify Opportunity' : 'New Franchisee Lead'}</h3><p className="text-gray-400 text-xs font-black uppercase tracking-[0.4em] mt-2">Unique Strategic ID: {editingId || 'Auto-Generating...'}</p></div>
                      </div>
                      <button onClick={resetForm} className="p-4 hover:bg-gray-100 rounded-3xl transition-all text-gray-300 hover:text-slate-800"><X className="w-8 h-8"/></button>
                  </div>

                  <div className="flex-1 flex overflow-hidden">
                      <div className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-12">
                          {/* Outcome Selector */}
                          <div className="space-y-6">
                            <h4 className="text-[11px] font-black text-[#00a86b] uppercase tracking-[0.3em] flex items-center gap-3"><Activity className="w-4 h-4" /> Interaction Outcome</h4>
                            <div className="grid grid-cols-4 gap-4">
                                {[
                                    { id: 'Interested', label: 'INTERESTED', icon: ThumbsUp },
                                    { id: 'Rejected', label: 'REJECTED', icon: ThumbsDown },
                                    { id: 'Callback', label: 'CALLBACK', icon: Clock },
                                    { id: 'No Ans', label: 'NO ANS', icon: PhoneOff }
                                ].map(item => (
                                    <button key={item.id} type="button" onClick={() => setFormData({...formData, outcome: item.id as any})} className={`py-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-4 group ${formData.outcome === item.id ? 'border-[#00a86b] bg-[#00a86b]/5 shadow-lg shadow-[#00a86b]/10' : 'border-gray-50 bg-gray-50/30 hover:border-gray-200'}`}><item.icon className={`w-8 h-8 ${formData.outcome === item.id ? 'text-[#00a86b] scale-110' : 'text-gray-300 group-hover:text-[#00a86b]/50'} transition-all`} /><span className={`text-[10px] font-black tracking-widest ${formData.outcome === item.id ? 'text-[#008f5b]' : 'text-gray-400'}`}>{item.label}</span></button>
                                ))}
                            </div>
                          </div>

                          {/* Personal Details */}
                          <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase ml-3">Full Identity Name</label><input name="name" required value={formData.name} onChange={handleInputChange} className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 font-bold text-slate-800 transition-all text-lg" placeholder="Full Name" /></div>
                                <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase ml-3">Mobile Outreach Number</label><input name="phone" required value={formData.phone} onChange={handleInputChange} className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 font-bold text-slate-800 transition-all text-lg" placeholder="+91..." /></div>
                                <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase ml-3">Target Franchise Location</label><input name="location" value={formData.location} onChange={handleInputChange} className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 font-bold text-slate-800 transition-all text-lg" placeholder="City / Region" /></div>
                                <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase ml-3">Lead Priority</label><div className="flex gap-2 p-1.5 bg-gray-50 rounded-2xl border border-gray-100">
                                    {['Hot', 'Warm', 'Cold'].map(p => (<button key={p} type="button" onClick={() => setFormData({...formData, priority: p as any})} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all ${formData.priority === p ? 'bg-slate-900 text-white shadow-xl' : 'text-gray-400 hover:text-gray-600'}`}>{p.toUpperCase()}</button>))}
                                </div></div>
                          </div>

                          {/* Scheduling */}
                          <div className="space-y-6">
                            <h4 className="text-[11px] font-black text-[#f2426e] uppercase tracking-[0.3em] flex items-center gap-3"><Calendar className="w-4 h-4" /> Next Strategic Follow-up</h4>
                            <div className="bg-gray-50/50 p-8 rounded-[2rem] border border-gray-100 grid grid-cols-2 gap-8">
                                <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase ml-3">Date</label><input type="date" name="followUpDate" value={formData.followUpDate} onChange={handleInputChange} className="w-full px-6 py-4 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-rose-500/5 font-bold text-slate-800 transition-all" /></div>
                                <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase ml-3">Time Slot</label><input type="time" name="followUpTime" value={formData.followUpTime} onChange={handleInputChange} className="w-full px-6 py-4 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-rose-500/5 font-bold text-slate-800 transition-all" /></div>
                            </div>
                          </div>

                          {/* Current Interaction Notes */}
                          <div className="space-y-6">
                            <h4 className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.3em] flex items-center gap-3"><Send className="w-4 h-4" /> Add Current Interaction Note</h4>
                            <textarea name="notes" rows={5} value={formData.notes} onChange={handleInputChange} className="w-full p-8 bg-gray-50 border border-gray-100 rounded-[2.5rem] outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white font-medium text-slate-700 transition-all italic leading-relaxed shadow-inner placeholder:text-gray-300" placeholder="Type specific requirements or conversation points for THIS interaction..." />
                          </div>

                          {/* Modal Footer Actions */}
                          <div className="flex gap-5 pt-8 border-t border-gray-50">
                              <button onClick={resetForm} type="button" className="flex-1 py-5 bg-gray-100 text-gray-500 rounded-3xl font-black text-xs uppercase tracking-[0.2em] hover:bg-gray-200 transition-all">Dismiss</button>
                              <button onClick={() => handleSubmit()} type="button" className="flex-[2] py-5 bg-slate-900 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-slate-900/20 hover:bg-black transition-all transform active:scale-95">Save Lead State</button>
                          </div>
                      </div>

                      {/* RIGHT SIDEBAR: AI OUTREACH & HISTORY */}
                      <div className="w-[450px] bg-gray-50/50 border-l border-gray-100 p-8 space-y-10 overflow-y-auto shrink-0 custom-scrollbar">
                          {/* AI Synthesis Section */}
                          <div className="space-y-6">
                              <div className="flex justify-between items-center">
                                  <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /> AI Outreach Synthesis</h4>
                                  <button onClick={handleSynthesize} disabled={isSynthesizing || !formData.name} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-[10px] font-black flex items-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-indigo-600/20">
                                      {isSynthesizing ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3" />}
                                      Synthesize
                                  </button>
                              </div>
                              <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-indigo-900/5 border border-white min-h-[300px] flex flex-col justify-between group relative overflow-hidden">
                                  {isSynthesizing && (
                                      <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-3">
                                          <BrainCircuit className="w-10 h-10 text-indigo-500 animate-pulse" />
                                          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Crafting Professional Message...</p>
                                      </div>
                                  )}

                                  {aiText ? (
                                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                                          <div className="relative">
                                              <p className="text-sm text-slate-600 leading-relaxed italic border-l-2 border-indigo-100 pl-4">"{aiText}"</p>
                                              <button onClick={handleCopy} className="absolute -top-6 -right-2 p-1.5 text-gray-300 hover:text-indigo-600 transition-colors">
                                                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                              </button>
                                          </div>
                                          <div className="grid grid-cols-2 gap-3">
                                              <button 
                                                onClick={() => window.open(`https://wa.me/${formData.phone.replace(/\D/g,'')}?text=${encodeURIComponent(aiText)}`, '_blank')} 
                                                className="py-4 bg-[#25D366] text-white rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 shadow-lg shadow-green-600/10 transition-all font-black text-[10px] uppercase tracking-widest"
                                              >
                                                <MessageCircle className="w-4 h-4"/> WhatsApp
                                              </button>
                                              <button 
                                                onClick={() => window.location.href=`mailto:${formData.name}?subject=${encodeURIComponent(messageSettings.emailSubject)}&body=${encodeURIComponent(aiText)}`} 
                                                className="py-4 bg-indigo-600 text-white rounded-2xl flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-600/10 transition-all font-black text-[10px] uppercase tracking-widest"
                                              >
                                                <Mail className="w-4 h-4"/> Email
                                              </button>
                                          </div>
                                      </div>
                                  ) : (
                                      <div className="flex flex-col items-center justify-center py-16 opacity-30 text-center space-y-4">
                                          <Zap className="w-12 h-12 text-indigo-400 mb-2" />
                                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] leading-relaxed max-w-[220px]">Click Synthesize to generate a personalized outreach based on Lead details & History.</p>
                                      </div>
                                  )}
                              </div>
                          </div>

                          {/* Historical Timeline */}
                          <div className="space-y-6 pt-4 border-t border-gray-100">
                              <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2"><History className="w-4 h-4 text-indigo-500" /> Interaction Timeline</h4>
                              <div className="space-y-6">
                                  {leads.find(l => l.id === editingId)?.history.length ? leads.find(l => l.id === editingId)?.history.map((log, hIdx) => (
                                      <div key={log.id} className="relative pl-8 group">
                                          {hIdx !== (leads.find(l => l.id === editingId)?.history.length || 0) - 1 && (
                                              <div className="absolute left-3.5 top-8 bottom-0 w-0.5 bg-gray-200 group-hover:bg-indigo-200 transition-colors"></div>
                                          )}
                                          <div className={`absolute left-0 top-1 w-7 h-7 rounded-full border-4 border-white shadow-sm flex items-center justify-center transition-all ${log.type === 'Status' ? 'bg-indigo-500' : 'bg-[#00a86b]'}`}>
                                              {log.type === 'Status' ? <Activity className="w-3 h-3 text-white" /> : <FileText className="w-3 h-3 text-white" />}
                                          </div>
                                          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 group-hover:shadow-md group-hover:border-indigo-100 transition-all">
                                              <div className="flex justify-between items-start mb-2">
                                                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">{log.type}</span>
                                                  <span className="text-[9px] font-bold text-slate-400">{new Date(log.date).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</span>
                                              </div>
                                              <p className="text-xs text-slate-600 leading-relaxed font-medium">"{log.message}"</p>
                                          </div>
                                      </div>
                                  )) : (
                                      <div className="py-12 text-center bg-white/50 rounded-3xl border border-dashed border-gray-200">
                                          <History className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Initiate conversation to build history</p>
                                      </div>
                                  )}
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Message Settings Modal */}
      {isSettingsOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#0a0a0c]/60 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden border border-white">
                  <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                      <h3 className="text-2xl font-black text-slate-800 tracking-tighter">Outreach Logic</h3>
                      <button onClick={() => setIsSettingsOpen(false)} className="text-gray-300 hover:text-slate-800"><X className="w-6 h-6"/></button>
                  </div>
                  <div className="p-10 space-y-6">
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">WhatsApp/Email Greeting</label>
                          <input 
                            value={messageSettings.waPrefix} 
                            onChange={e => setMessageSettings({...messageSettings, waPrefix: e.target.value})}
                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 font-bold text-gray-800 shadow-inner" 
                            placeholder="Hi [Name]..."
                          />
                      </div>
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">AI Context & Template</label>
                          <textarea 
                            rows={4}
                            value={messageSettings.waTemplate} 
                            onChange={e => setMessageSettings({...messageSettings, waTemplate: e.target.value})}
                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 font-medium text-sm text-gray-700 shadow-inner resize-none" 
                            placeholder="Define base franchise marketing text..."
                          />
                      </div>
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Email Subject Header</label>
                          <input 
                            value={messageSettings.emailSubject} 
                            onChange={e => setMessageSettings({...messageSettings, emailSubject: e.target.value})}
                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-gray-800 shadow-inner" 
                            placeholder="Subject Line"
                          />
                      </div>
                      <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                          <BrainCircuit className="w-5 h-5 text-amber-600" />
                          <p className="text-[9px] font-black text-amber-800 leading-relaxed uppercase tracking-wider">AI will intelligently merge these templates with specific Lead history during synthesis.</p>
                      </div>
                  </div>
                  <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-end">
                      <button onClick={() => setIsSettingsOpen(false)} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-900/20 hover:bg-black transition-all transform active:scale-95">Lock Strategy</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Leads;
