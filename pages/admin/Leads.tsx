
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Search, Filter, Download, MoreVertical, 
  MapPin, IndianRupee, Calendar, Clock, Sparkles,
  X, Briefcase, Mail, Phone, Calculator, Target, User,
  Pencil, Trash2, MessageCircle, Send, Loader2, FileText, Upload,
  LayoutGrid, List, ThumbsUp, ThumbsDown, PhoneOff, BookOpen, 
  Zap, Building, Activity, TrendingUp, BadgeCheck,
  Layers, Settings, Users, CheckCircle, Edit2, BrainCircuit,
  PhoneCall, LayoutDashboard, ChevronDown
} from 'lucide-react';
import { generateGeminiResponse } from '../../services/geminiService';
import { UserRole } from '../../types';

interface Lead {
  id: string;
  name: string;
  role: string;
  location: string;
  totalValue: number;
  status: 'New' | 'Contacted' | 'Qualified' | 'Converted' | 'Lost' | 'Booked';
  priority: 'Hot' | 'Warm' | 'Cold';
  nextFollowUp?: string; // ISO String or YYYY-MM-DD
  notes: string;
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
    return saved ? JSON.parse(saved) : [
      { id: 'L1', name: 'John Doe', role: 'MANAGER', location: 'Mumbai', totalValue: 50000, status: 'Qualified', priority: 'Hot', nextFollowUp: '2025-12-26T10:00', notes: 'Interested in Erode branch.', phone: '9876543210', source: 'Google Ads', createdAt: '2025-11-20' },
      { id: 'L2', name: 'Jane Smith', role: 'DIRECTOR', location: 'Delhi', totalValue: 100000, status: 'New', priority: 'Warm', nextFollowUp: '2025-12-26T14:30', notes: 'Needs pricing package.', phone: '9123456780', source: 'LinkedIn', createdAt: '2025-11-21' },
      { id: 'L3', name: 'rajan', role: 'LEAD', location: 'salem', totalValue: 0, status: 'New', priority: 'Cold', nextFollowUp: '2025-12-26T11:00', notes: '', phone: '9150449959', source: 'Direct', createdAt: '2025-12-01' }
    ];
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [priorityFilter, setPriorityFilter] = useState('All Priority');
  const [editingId, setEditingId] = useState<string | null>(null);

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

  useEffect(() => {
    localStorage.setItem('leads_data', JSON.stringify(leads));
  }, [leads]);

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
      notes: lead.notes,
      location: lead.location
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.name || !formData.phone) {
      alert("Required fields missing.");
      return;
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
      notes: formData.notes,
      totalValue: editingId ? (leads.find(l => l.id === editingId)?.totalValue || 0) : 0,
      source: 'Internal CRM',
      createdAt: editingId ? (leads.find(l => l.id === editingId)?.createdAt || '') : new Date().toISOString()
    };

    if (editingId) {
      setLeads(prev => prev.map(l => l.id === editingId ? leadData : l));
    } else {
      setLeads([leadData, ...leads]);
    }

    window.dispatchEvent(new Event('cloud-sync-immediate'));
    resetForm();
  };

  const handleSynthesize = async () => {
    if (!formData.name) return;
    setIsSynthesizing(true);
    const prompt = `Synthesize a highly personalized follow-up outreach for a franchisee lead.
    Name: ${formData.name}
    Interaction Outcome: ${formData.outcome}
    Conversation Notes: ${formData.notes}
    Goal: Professional, strategic, and encouraging. Keep it short for WhatsApp/Email.`;
    
    try {
      const res = await generateGeminiResponse(prompt);
      setAiText(res);
    } catch (e) {
      setAiText("Failed to generate outreach. Please try again.");
    }
    setIsSynthesizing(false);
  };

  // Safe Stats Calculation
  const stats = useMemo(() => {
    const today = "2025-12-26"; // Mocked to match screenshot date context
    return {
      total: leads.length,
      followUps: leads.filter(l => l.nextFollowUp?.startsWith(today)).length,
      qualified: leads.filter(l => l.status === 'Qualified').length,
      valuation: leads.reduce((sum, l) => sum + (Number(l.totalValue) || 0), 0)
    };
  }, [leads]);

  // Safe Filter Logic
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
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
             <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tighter">Franchisee Leads</h2>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Engagement Terminal & Pipeline Strategy</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-gray-100 text-gray-600 px-5 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-widest flex items-center gap-2 hover:bg-gray-50 transition-all shadow-sm">
             <Settings className="w-4 h-4" /> Message Settings
          </button>
          <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-[#00a86b] hover:bg-[#008f5b] text-white px-6 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-[#00a86b]/20 transition-all transform active:scale-95">
             <Plus className="w-5 h-5" /> New Lead
          </button>
        </div>
      </div>

      {/* Strategic Command Bar */}
      <div className="flex flex-col lg:flex-row gap-4 items-center">
          <div className="relative flex-1 group w-full">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5 transition-colors group-focus-within:text-indigo-500" />
            <input 
                type="text" 
                placeholder="Search leads by name, phone or city..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-14 pr-4 py-4 bg-white border border-gray-100 rounded-full text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-200 transition-all shadow-sm placeholder:text-gray-300"
            />
          </div>
          <div className="flex gap-4 items-center w-full lg:w-auto">
             <div className="flex bg-white rounded-full border border-gray-100 p-1.5 shadow-sm">
               <select 
                 value={statusFilter} 
                 onChange={e => setStatusFilter(e.target.value)} 
                 className="bg-transparent text-[11px] font-black uppercase text-gray-500 px-4 outline-none cursor-pointer"
               >
                  <option>All Status</option>
                  <option>New</option>
                  <option>Qualified</option>
                  <option>Contacted</option>
               </select>
               <div className="w-px h-4 bg-gray-200 self-center"></div>
               <select 
                 value={priorityFilter} 
                 onChange={e => setPriorityFilter(e.target.value)} 
                 className="bg-transparent text-[11px] font-black uppercase text-gray-500 px-4 outline-none cursor-pointer"
               >
                  <option>All Priority</option>
                  <option>Hot</option>
                  <option>Warm</option>
                  <option>Cold</option>
               </select>
             </div>
             <div className="flex bg-white rounded-xl border border-gray-100 p-1.5 shadow-sm">
                <button className="p-2 rounded-lg text-gray-300 hover:text-gray-500"><LayoutDashboard className="w-5 h-5" /></button>
                <button className="p-2 rounded-lg bg-indigo-50 text-indigo-600 shadow-inner"><List className="w-5 h-5" /></button>
             </div>
          </div>
      </div>

      {/* KPI Visualizers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Active Lead Base */}
          <div className="bg-gradient-to-br from-[#5c67f2] to-[#424ad1] p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
             <div className="relative z-10">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6"><Users className="w-6 h-6" /></div>
                <p className="text-white/70 text-[11px] font-black uppercase tracking-widest">Active Lead Base</p>
                <h3 className="text-5xl font-black mt-2 tracking-tighter">{stats.total}</h3>
                <div className="mt-6 pt-6 border-t border-white/10 flex items-center gap-2 text-[10px] font-bold text-white/60">
                   <Activity className="w-3.5 h-3.5" /> System capacity optimized
                </div>
             </div>
             <TrendingUp className="absolute -right-10 -bottom-10 w-48 h-48 opacity-10 group-hover:scale-110 transition-transform duration-700" />
          </div>

          {/* Follow-up Due */}
          <div className="bg-gradient-to-br from-[#f2426e] to-[#d1355c] p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
             <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                   <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center"><PhoneCall className="w-6 h-6" /></div>
                   <div className="bg-white/10 px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-2 border border-white/10">
                      <Calendar className="w-3.5 h-3.5"/> 26/12/2025
                   </div>
                </div>
                <p className="text-white/70 text-[11px] font-black uppercase tracking-widest">Follow-up Due</p>
                <h3 className="text-5xl font-black mt-2 tracking-tighter">{stats.followUps}</h3>
                <div className="mt-6 pt-6 border-t border-white/10 flex items-center gap-2 text-[10px] font-bold text-white/60">
                   <Clock className="w-3.5 h-3.5" /> Targeted on selected date
                </div>
             </div>
             <div className="absolute right-4 bottom-4 w-24 h-24 bg-white/5 rounded-3xl rotate-12"></div>
          </div>

          {/* Qualified Prospects */}
          <div className="bg-gradient-to-br from-[#00a86b] to-[#008f5b] p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
             <div className="relative z-10">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6"><ThumbsUp className="w-6 h-6" /></div>
                <p className="text-white/70 text-[11px] font-black uppercase tracking-widest">Qualified Prospects</p>
                <h3 className="text-5xl font-black mt-2 tracking-tighter">{stats.qualified}</h3>
                <div className="mt-6 pt-6 border-t border-white/10 flex items-center gap-2 text-[10px] font-bold text-white/60">
                   <BadgeCheck className="w-3.5 h-3.5" /> Converging to partners
                </div>
             </div>
          </div>

          {/* Pipeline Valuation */}
          <div className="bg-gradient-to-br from-[#8a5cf6] to-[#7c3aed] p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
             <div className="relative z-10">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6"><Calculator className="w-6 h-6" /></div>
                <p className="text-white/70 text-[11px] font-black uppercase tracking-widest">Pipeline Valuation</p>
                <h3 className="text-5xl font-black mt-2 tracking-tighter">₹{(stats.valuation / 100000).toFixed(1)}L</h3>
                <div className="mt-6 pt-6 border-t border-white/10 flex items-center gap-2 text-[10px] font-bold text-white/60">
                   <TrendingUp className="w-3.5 h-3.5" /> Projected franchise revenue
                </div>
             </div>
          </div>
      </div>

      {/* Main Registry Table */}
      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-2xl shadow-gray-200/50 overflow-hidden">
          <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-white text-gray-400 text-[11px] font-black uppercase tracking-[0.2em] border-b border-gray-50">
                      <tr>
                          <th className="px-10 py-10">Lead Identity</th>
                          <th className="px-10 py-10">Phone Number</th>
                          <th className="px-10 py-10">Location</th>
                          <th className="px-10 py-10">Value (INR)</th>
                          <th className="px-10 py-10">Status</th>
                          <th className="px-10 py-10">Follow-up</th>
                          <th className="px-10 py-10 text-right">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                      {filteredLeads.map((lead) => (
                          <tr key={lead.id} className="group hover:bg-indigo-50/20 transition-all cursor-pointer" onClick={() => handleEdit(lead)}>
                              <td className="px-10 py-8">
                                  <div className="flex items-center gap-5">
                                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-sm ${
                                          lead.name.toLowerCase() === 'john doe' ? 'bg-[#ff5a5f]' : 
                                          lead.name.toLowerCase() === 'jane smith' ? 'bg-[#5c67f2]' : 'bg-slate-400'
                                      }`}>
                                          {lead.name.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                          <p className="font-extrabold text-gray-900 text-lg group-hover:text-indigo-600 transition-colors tracking-tight">{lead.name}</p>
                                          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{lead.role}</p>
                                      </div>
                                  </div>
                              </td>
                              <td className="px-10 py-8 font-bold text-gray-500">
                                  <div className="flex items-center gap-3">
                                      <Phone className="w-4 h-4 text-gray-200" />
                                      {lead.phone}
                                  </div>
                              </td>
                              <td className="px-10 py-8">
                                  <div className="flex items-center gap-2.5 text-gray-500 font-bold">
                                      <MapPin className="w-4 h-4 text-gray-200" />
                                      {lead.location}
                                  </div>
                              </td>
                              <td className="px-10 py-8 font-black text-gray-900 text-lg">
                                  ₹{lead.totalValue.toLocaleString()}
                              </td>
                              <td className="px-10 py-8">
                                  <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border shadow-sm ${
                                      lead.status === 'Qualified' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                      'bg-gray-50 text-gray-500 border-gray-100'
                                  }`}>
                                      {lead.status}
                                  </span>
                              </td>
                              <td className="px-10 py-8">
                                  <div className="flex items-center gap-2 text-[11px] font-black text-rose-500 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100 w-fit">
                                      <Calendar className="w-3.5 h-3.5 opacity-60" /> {lead.nextFollowUp?.split('T')[0]}
                                  </div>
                              </td>
                              <td className="px-10 py-8 text-right">
                                  <div className="flex justify-end gap-3">
                                      <button className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 hover:bg-indigo-100 transition-all"><Edit2 className="w-5 h-5"/></button>
                                      <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Delete lead?')) setLeads(prev => prev.filter(l => l.id !== lead.id)); }} className="p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 hover:bg-rose-100 transition-all"><Trash2 className="w-5 h-5"/></button>
                                  </div>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>

      {/* Strategic Onboarding Modal */}
      {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0a0a0c]/40 backdrop-blur-xl animate-in fade-in duration-300">
              <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-white">
                  {/* Modal Header */}
                  <div className="p-12 border-b border-gray-50 flex justify-between items-start bg-gray-50/30 shrink-0">
                      <div>
                        <h3 className="text-5xl font-black text-slate-800 tracking-tighter">Onboard New Opportunity</h3>
                        <p className="text-gray-400 text-xs font-black uppercase tracking-[0.4em] mt-3">Strategic ID: {editingId || 'Pending Deployment'}</p>
                      </div>
                      <button onClick={resetForm} className="p-4 hover:bg-gray-100 rounded-3xl transition-all text-gray-300 hover:text-slate-800"><X className="w-10 h-10"/></button>
                  </div>

                  <div className="flex-1 flex overflow-hidden">
                      {/* Left Side: Interaction & Core Details */}
                      <div className="flex-1 overflow-y-auto custom-scrollbar p-12 space-y-16">
                          
                          {/* Outcome Segment */}
                          <div className="space-y-8">
                            <h4 className="text-[12px] font-black text-[#00a86b] uppercase tracking-[0.3em] flex items-center gap-3">
                                <Activity className="w-5 h-5" /> Interaction Outcome
                            </h4>
                            <div className="grid grid-cols-4 gap-6">
                                {[
                                    { id: 'Interested', label: 'INTERESTED', icon: ThumbsUp },
                                    { id: 'Rejected', label: 'REJECTED', icon: ThumbsDown },
                                    { id: 'Callback', label: 'CALLBACK', icon: Clock },
                                    { id: 'No Ans', label: 'NO ANS', icon: PhoneOff }
                                ].map(item => (
                                    <button 
                                        key={item.id}
                                        type="button"
                                        onClick={() => setFormData({...formData, outcome: item.id as any})}
                                        className={`py-8 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-5 group ${formData.outcome === item.id ? 'border-[#00a86b] bg-[#00a86b]/5 shadow-xl shadow-[#00a86b]/10' : 'border-gray-50 bg-gray-50/30 hover:border-gray-200'}`}
                                    >
                                        <item.icon className={`w-10 h-10 ${formData.outcome === item.id ? 'text-[#00a86b] scale-110' : 'text-gray-300 group-hover:text-[#00a86b]/50'} transition-all`} />
                                        <span className={`text-[11px] font-black tracking-[0.2em] ${formData.outcome === item.id ? 'text-[#008f5b]' : 'text-gray-400'}`}>{item.label}</span>
                                    </button>
                                ))}
                            </div>
                          </div>

                          {/* Identity & Contact */}
                          <div className="space-y-8">
                            <h4 className="text-[12px] font-black text-indigo-500 uppercase tracking-[0.3em] flex items-center gap-3">
                                <User className="w-5 h-5" /> Identity & Contact
                            </h4>
                            <div className="grid grid-cols-2 gap-10">
                                <div className="space-y-3">
                                    <label className="text-[11px] font-black text-gray-400 uppercase ml-2">Full Name</label>
                                    <input 
                                      name="name" 
                                      required 
                                      value={formData.name} 
                                      onChange={handleInputChange} 
                                      className="w-full px-8 py-6 bg-gray-50 border border-gray-100 rounded-[2rem] outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 font-bold text-slate-800 transition-all text-lg placeholder:text-gray-300" 
                                      placeholder="Lead Name" 
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[11px] font-black text-gray-400 uppercase ml-2">Primary Mobile</label>
                                    <input 
                                      name="phone" 
                                      required 
                                      value={formData.phone} 
                                      onChange={handleInputChange} 
                                      className="w-full px-8 py-6 bg-gray-50 border border-gray-100 rounded-[2rem] outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 font-bold text-slate-800 transition-all text-lg placeholder:text-gray-300" 
                                      placeholder="Contact Number" 
                                    />
                                </div>
                            </div>
                          </div>

                          {/* Lead Priority Segment */}
                          <div className="space-y-8">
                            <h4 className="text-[12px] font-black text-[#ff8c00] uppercase tracking-[0.3em] flex items-center gap-3">
                                <TrendingUp className="w-5 h-5" /> Lead Priority
                            </h4>
                            <div className="flex gap-6 p-3 bg-gray-50 rounded-[2.5rem] w-fit">
                                {['HOT', 'WARM', 'COLD'].map(p => (
                                    <button 
                                        key={p}
                                        type="button"
                                        onClick={() => setFormData({...formData, priority: p.charAt(0) + p.slice(1).toLowerCase() as any})}
                                        className={`px-12 py-4 rounded-[2rem] text-[12px] font-black tracking-[0.3em] transition-all ${formData.priority.toUpperCase() === p ? 'bg-slate-900 text-white shadow-2xl' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                          </div>

                          {/* Follow-up Strategy */}
                          <div className="space-y-8">
                            <h4 className="text-[12px] font-black text-[#f2426e] uppercase tracking-[0.3em] flex items-center gap-3">
                                <Calendar className="w-5 h-5" /> Next Follow-up Strategy
                            </h4>
                            <div className="bg-gray-50/50 p-10 rounded-[3rem] border border-gray-100 grid grid-cols-2 gap-10 shadow-inner">
                                <div className="space-y-3">
                                    <label className="text-[11px] font-black text-gray-400 uppercase ml-2">Scheduled Date</label>
                                    <div className="relative group">
                                        <input type="date" name="followUpDate" value={formData.followUpDate} onChange={handleInputChange} className="w-full pl-14 pr-8 py-5 bg-white border border-gray-100 rounded-3xl outline-none focus:ring-4 focus:ring-rose-500/10 font-bold text-slate-800 transition-all" />
                                        <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-rose-400 group-focus-within:text-rose-600 transition-colors" />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[11px] font-black text-gray-400 uppercase ml-2">Time Slot</label>
                                    <div className="relative group">
                                        <input type="time" name="followUpTime" value={formData.followUpTime} onChange={handleInputChange} className="w-full pl-14 pr-8 py-5 bg-white border border-gray-100 rounded-3xl outline-none focus:ring-4 focus:ring-rose-500/10 font-bold text-slate-800 transition-all" />
                                        <Clock className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-rose-400 group-focus-within:text-rose-600 transition-colors" />
                                    </div>
                                </div>
                            </div>
                          </div>

                          {/* Notes Textarea */}
                          <div className="space-y-8">
                            <h4 className="text-[12px] font-black text-indigo-500 uppercase tracking-[0.3em] flex items-center gap-3">
                                <Send className="w-5 h-5" /> Conversation Brief (Notes)
                            </h4>
                            <textarea 
                              name="notes" 
                              rows={6} 
                              value={formData.notes} 
                              onChange={handleInputChange} 
                              className="w-full p-10 bg-gray-50 border border-gray-100 rounded-[3rem] outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white font-medium text-slate-700 transition-all italic leading-relaxed shadow-inner placeholder:text-gray-300" 
                              placeholder="Detail requirements, budget constraints, or specific interests expressed during the call..." 
                            />
                          </div>

                          {/* Modal Actions */}
                          <div className="flex gap-6 pt-12 border-t border-gray-50">
                              <button onClick={resetForm} type="button" className="flex-1 py-6 bg-gray-100 text-gray-500 rounded-[2.5rem] font-black text-sm uppercase tracking-widest hover:bg-gray-200 transition-all">Dismiss</button>
                              <button onClick={() => handleSubmit()} type="button" className="flex-[2] py-6 bg-indigo-600 text-white rounded-[2.5rem] font-black text-sm uppercase tracking-[0.3em] shadow-2xl shadow-indigo-600/30 hover:bg-indigo-700 transition-all transform active:scale-95">Deploy Opportunity</button>
                          </div>
                      </div>

                      {/* Right Side: Strategy & AI */}
                      <div className="w-[450px] bg-gray-50/50 border-l border-gray-100 p-12 space-y-12 overflow-y-auto shrink-0">
                          
                          {/* Strategic Assets Section */}
                          <div className="space-y-8">
                              <div className="flex justify-between items-center">
                                  <h4 className="text-[12px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
                                      <FileText className="w-5 h-5 text-indigo-500" /> Strategic Assets
                                  </h4>
                                  <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Library</button>
                              </div>
                              <div className="border-2 border-dashed border-gray-200 rounded-[2.5rem] p-12 text-center bg-white/50 shadow-inner">
                                  <p className="text-sm text-gray-400 italic">Library is currently empty.</p>
                              </div>
                          </div>

                          {/* AI Synthesis Section */}
                          <div className="space-y-8">
                              <div className="flex justify-between items-center">
                                  <h4 className="text-[12px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
                                      <Zap className="w-5 h-5 text-indigo-500" /> AI Outreach Synthesis
                                  </h4>
                                  <button 
                                    onClick={handleSynthesize} 
                                    disabled={isSynthesizing || !formData.name}
                                    className="bg-indigo-400 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-2xl text-[11px] font-black flex items-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/20"
                                  >
                                      {isSynthesizing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4" />}
                                      Synthesize
                                  </button>
                              </div>
                              
                              <div className="bg-white rounded-[3rem] p-10 shadow-2xl shadow-indigo-900/5 border border-white min-h-[350px] flex flex-col justify-between group">
                                  {aiText ? (
                                      <div className="space-y-8">
                                          <p className="text-sm text-slate-600 leading-relaxed italic animate-in fade-in slide-in-from-bottom-3">"{aiText}"</p>
                                          <div className="grid grid-cols-2 gap-4">
                                              <button onClick={() => window.open(`https://wa.me/${formData.phone.replace(/\D/g,'')}?text=${encodeURIComponent(aiText)}`, '_blank')} className="py-5 bg-[#00a86b] text-white rounded-2xl flex items-center justify-center gap-3 hover:bg-[#008f5b] shadow-xl shadow-[#00a86b]/10 transition-all transform active:scale-95 font-bold text-xs uppercase tracking-widest"><MessageCircle className="w-5 h-5"/> Whatsapp</button>
                                              <button onClick={() => window.location.href=`mailto:?subject=Franchise Opportunity&body=${encodeURIComponent(aiText)}`} className="py-5 bg-[#424ad1] text-white rounded-2xl flex items-center justify-center gap-3 hover:bg-indigo-700 shadow-xl shadow-indigo-500/10 transition-all transform active:scale-95 font-bold text-xs uppercase tracking-widest"><Mail className="w-5 h-5"/> Email</button>
                                          </div>
                                      </div>
                                  ) : (
                                      <div className="flex flex-col items-center justify-center py-16 opacity-30 text-center space-y-6">
                                          <Sparkles className="w-14 h-14 text-indigo-400 mb-2" />
                                          <p className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] leading-loose max-w-[200px]">Apply a template or use AI to synthesize a personalized communication...</p>
                                      </div>
                                  )}
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
