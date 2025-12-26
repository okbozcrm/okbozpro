
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Search, MapPin, IndianRupee, Calendar, Clock, Sparkles,
  X, User, Pencil, Trash2, MessageCircle, Send, Loader2, FileText, 
  Upload, TrendingUp, BarChart3, Edit2, Share2, AtSign, Wand2, Paperclip, 
  Settings, CheckCircle, Filter, ArrowUpRight, ChevronDown, Users, 
  Activity, Building2, PhoneOutgoing, Wallet, ArrowRight, ThumbsUp, 
  ThumbsDown, PhoneMissed, Timer, AlertCircle, LayoutGrid, List as ListIcon,
  Target, Phone, ChevronRight
} from 'lucide-react';
import { generateGeminiResponse } from '../../services/geminiService';
import { uploadFileToCloud } from '../../services/cloudService';
import ContactDisplay from '../../components/ContactDisplay';

interface HistoryLog {
  date: string;
  note: string;
  outcome: string;
}

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
  history: HistoryLog[];
  outcome?: 'Interest' | 'Not Interest' | 'Call Back' | 'No Answer';
}

interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  fileUrl?: string;
  fileName?: string;
}

const Leads = () => {
  const [leads, setLeads] = useState<Lead[]>(() => {
    const saved = localStorage.getItem('leads_data');
    return saved ? JSON.parse(saved) : [];
  });

  const [templates, setTemplates] = useState<MessageTemplate[]>(() => {
    const saved = localStorage.getItem('leads_message_templates');
    return saved ? JSON.parse(saved) : [];
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'Grid' | 'List'>('List');
  const [kpiRefDate, setKpiRefDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [outreachMessage, setOutreachMessage] = useState('');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setFilterStatus] = useState('All');
  const [priorityFilter, setFilterPriority] = useState('All');

  // Template Management State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isUploadingTemplateFile, setIsUploadingTemplateFile] = useState(false);
  const [templateFormData, setTemplateFormData] = useState<Partial<MessageTemplate>>({ name: '', content: '' });
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const templateFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('leads_data', JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    localStorage.setItem('leads_message_templates', JSON.stringify(templates));
  }, [templates]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const initialFormState = {
    name: '',
    role: '', 
    city: '',
    phone: '',
    email: '',
    billValue: '',
    franchiseValue: '',
    adFee: '',
    source: 'Google Ads',
    priority: 'Warm' as 'Hot' | 'Warm' | 'Cold',
    nextCallDate: new Date().toISOString().split('T')[0],
    nextCallTime: '10:00',
    notes: '',
    outcome: 'Interest' as 'Interest' | 'Not Interest' | 'Call Back' | 'No Answer',
    currentInteractionNote: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setEditingId(null);
    setIsModalOpen(false);
    setOutreachMessage('');
  };

  const handleEdit = (lead: Lead) => {
    setFormData({
      name: lead.name,
      role: lead.role,
      city: lead.location,
      phone: lead.phone || '',
      email: lead.email || '',
      billValue: lead.billValue?.toString() || '0',
      franchiseValue: lead.franchiseValue?.toString() || '0',
      adFee: lead.adFee?.toString() || '0',
      source: lead.source,
      priority: lead.priority,
      nextCallDate: lead.nextCallDate || new Date().toISOString().split('T')[0],
      nextCallTime: lead.nextCallTime || '10:00',
      notes: lead.notes,
      outcome: lead.outcome || 'Interest',
      currentInteractionNote: ''
    });
    setEditingId(lead.id);
    setIsModalOpen(true);
  };

  const handleAiFillMessage = async (isNoAnswer?: boolean) => {
      setIsAiGenerating(true);
      try {
          const prompt = isNoAnswer 
          ? `Create a very short WhatsApp message for a lead named ${formData.name} who didn't answer our call. Mention you are from OK BOZ Franchise team and ask for a callback time. Keep it under 30 words.`
          : `You are a professional franchise recruiter for OK BOZ. Create a short, highly engaging personalized outreach message for a lead named ${formData.name}.
          Context: Interaction Outcome: ${formData.outcome}, Priority: ${formData.priority}.
          Tone: Professional and motivating. Max 50 words.`;
          
          const response = await generateGeminiResponse(prompt, "You are an expert recruitment AI assistant.");
          setOutreachMessage(response);
      } catch (err) {
          console.error("AI Error", err);
      } finally {
          setIsAiGenerating(false);
      }
  };

  // Trigger auto-message logic based on outcome selection
  useEffect(() => {
    if (formData.outcome === 'No Answer' && !outreachMessage) {
        handleAiFillMessage(true);
    }
    if (formData.outcome === 'Not Interest') {
        setOutreachMessage('');
    }
  }, [formData.outcome]);

  const handleApplyTemplate = (template: MessageTemplate) => {
      let content = template.content.replace(/\[Name\]/g, formData.name || 'Prospect');
      if (template.fileUrl) {
          content += `\n\nView Document: ${template.fileUrl}`;
      }
      setOutreachMessage(content);
  };

  const sendOutreach = (channel: 'WhatsApp' | 'Email') => {
      if (!outreachMessage) {
          alert("Please generate or select a message content first.");
          return;
      }

      const phone = formData.phone;
      const email = formData.email;

      if (channel === 'WhatsApp') {
          const cleanPhone = phone.replace(/\D/g, '');
          if (!cleanPhone) { alert("No valid phone number found."); return; }
          window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(outreachMessage)}`, '_blank');
      } else {
          if (!email) { alert("No email address found."); return; }
          window.location.href = `mailto:${email}?subject=OK BOZ Franchise Opportunity&body=${encodeURIComponent(outreachMessage)}`;
      }
  };

  const handleTemplateFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingTemplateFile(true);
    try {
        const url = await uploadFileToCloud(file, `templates/leads/${Date.now()}_${file.name}`);
        setTemplateFormData(prev => ({ ...prev, fileUrl: url || '', fileName: file.name }));
    } catch (err) {
        console.error("File upload failed", err);
    } finally {
        setIsUploadingTemplateFile(false);
    }
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateFormData.name || !templateFormData.content) return;

    if (editingTemplateId) {
        setTemplates(prev => prev.map(t => t.id === editingTemplateId ? { ...t, ...templateFormData as MessageTemplate } : t));
        setEditingTemplateId(null);
    } else {
        const newT: MessageTemplate = {
            id: `TMP-${Date.now()}`,
            name: templateFormData.name!,
            content: templateFormData.content!,
            fileUrl: templateFormData.fileUrl,
            fileName: templateFormData.fileName
        };
        setTemplates(prev => [...prev, newT]);
    }
    setTemplateFormData({ name: '', content: '' });
  };

  const deleteTemplate = (id: string) => {
      if (window.confirm("Remove this template?")) {
          setTemplates(prev => prev.filter(t => t.id !== id));
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let newStatus: Lead['status'] = 'Contacted';
    if (formData.outcome === 'Interest') newStatus = 'Qualified';
    if (formData.outcome === 'Not Interest') newStatus = 'Lost';

    const newHistoryEntry: HistoryLog = {
      date: new Date().toLocaleString(),
      note: formData.currentInteractionNote || 'Outcome updated',
      outcome: formData.outcome
    };

    if (editingId) {
      setLeads(prev => prev.map(lead => {
        if (lead.id === editingId) {
          const totalValue = (parseFloat(formData.billValue) || 0) + (parseFloat(formData.franchiseValue) || 0) + (parseFloat(formData.adFee) || 0);
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
            priority: formData.outcome === 'Not Interest' ? 'Cold' : formData.priority,
            nextCallDate: formData.outcome === 'Not Interest' ? '' : formData.nextCallDate,
            nextCallTime: formData.outcome === 'Not Interest' ? '' : formData.nextCallTime,
            status: newStatus,
            outcome: formData.outcome,
            history: [newHistoryEntry, ...(lead.history || [])]
          };
        }
        return lead;
      }));
    } else {
        const totalValue = (parseFloat(formData.billValue) || 0) + (parseFloat(formData.franchiseValue) || 0) + (parseFloat(formData.adFee) || 0);
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
            status: newStatus,
            source: formData.source,
            priority: formData.outcome === 'Not Interest' ? 'Cold' : formData.priority,
            nextCallDate: formData.outcome === 'Not Interest' ? '' : formData.nextCallDate,
            nextCallTime: formData.outcome === 'Not Interest' ? '' : formData.nextCallTime,
            notes: formData.notes,
            tags: [formData.priority],
            createdAt: new Date().toISOString().split('T')[0],
            history: [newHistoryEntry],
            outcome: formData.outcome
        };
        setLeads([newLead, ...leads]);
    }
    resetForm();
  };

  const filteredLeads = useMemo(() => {
      return leads.filter(l => {
          const matchesSearch = l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                               l.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                               l.phone?.includes(searchTerm);
          const matchesStatus = statusFilter === 'All' || l.status === statusFilter;
          const matchesPriority = priorityFilter === 'All' || l.priority === priorityFilter;
          return matchesSearch && matchesStatus && matchesPriority;
      });
  }, [leads, searchTerm, statusFilter, priorityFilter]);

  const stats = useMemo(() => {
      const total = leads.length;
      const interested = leads.filter(l => l.status === 'Qualified').length;
      // Follow-up refers to the selected kpiRefDate
      const dueCount = leads.filter(l => l.status !== 'Lost' && l.status !== 'Converted' && l.nextCallDate === kpiRefDate).length;
      const pipelineValue = leads.filter(l => l.status !== 'Lost').reduce((sum, l) => sum + (l.totalValue || 0), 0);
      return { total, interested, dueCount, pipelineValue };
  }, [leads, kpiRefDate]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
            <h2 className="text-3xl font-black text-gray-800 tracking-tighter flex items-center gap-3">
                <Target className="w-10 h-10 text-indigo-500" /> Franchisee Leads
            </h2>
            <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-1 opacity-70">Engagement Terminal & Pipeline Strategy</p>
        </div>
        <div className="flex gap-3">
            <button 
                onClick={() => setIsTemplateModalOpen(true)}
                className="bg-white border border-gray-200 text-gray-600 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-gray-50 transition-all shadow-sm active:scale-95"
            >
                <Settings className="w-4 h-4" /> Message Settings
            </button>
            <button 
                onClick={() => { resetForm(); setIsModalOpen(true); }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center gap-2 shadow-xl shadow-emerald-900/20 transition-all transform active:scale-95"
            >
                <Plus className="w-5 h-5" /> New Lead
            </button>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-xl shadow-indigo-900/5 flex flex-col lg:flex-row gap-4 items-center animate-in fade-in slide-in-from-top-4">
         <div className="relative flex-1 w-full">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
                type="text" 
                placeholder="Search leads by name, phone or city..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full pl-14 pr-6 py-4 bg-gray-50 border-none rounded-3xl focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm font-bold text-gray-700 transition-all" 
            />
         </div>
         <div className="flex flex-wrap gap-2 items-center w-full lg:w-auto">
             <div className="relative group min-w-[140px]">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select 
                    value={statusFilter} 
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full pl-10 pr-10 py-4 bg-gray-50 border-none rounded-3xl text-xs font-black uppercase text-gray-500 outline-none focus:ring-4 focus:ring-indigo-500/10 appearance-none cursor-pointer"
                >
                    <option value="All">All Status</option>
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Converted">Converted</option>
                    <option value="Lost">Lost</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
             </div>
             <div className="relative group min-w-[140px]">
                <Plus className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 rotate-45" />
                <select 
                    value={priorityFilter} 
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="w-full pl-10 pr-10 py-4 bg-gray-50 border-none rounded-3xl text-xs font-black uppercase text-gray-500 outline-none focus:ring-4 focus:ring-indigo-500/10 appearance-none cursor-pointer"
                >
                    <option value="All">All Priority</option>
                    <option value="Hot">Hot</option>
                    <option value="Warm">Warm</option>
                    <option value="Cold">Cold</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
             </div>
             <div className="h-10 w-px bg-gray-100 mx-2 hidden lg:block"></div>
             <div className="flex bg-gray-100 p-1.5 rounded-2xl border border-gray-200">
                <button onClick={() => setViewMode('Grid')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'Grid' ? 'bg-white shadow-lg text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}><LayoutGrid className="w-5 h-5"/></button>
                <button onClick={() => setViewMode('List')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'List' ? 'bg-white shadow-lg text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}><ListIcon className="w-5 h-5"/></button>
            </div>
         </div>
      </div>

      {/* 3. Colorful KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-[2.5rem] p-7 text-white shadow-xl shadow-indigo-900/10 relative overflow-hidden group hover:scale-[1.02] transition-all">
              <div className="relative z-10 space-y-2">
                  <div className="p-3 bg-white/20 rounded-2xl w-fit"><Users className="w-6 h-6" /></div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Active Lead Base</p>
                  <h3 className="text-4xl font-black tracking-tighter">{stats.total}</h3>
                  <div className="flex items-center gap-1.5 pt-2 text-[10px] font-bold text-indigo-100">
                      <TrendingUp className="w-3 h-3" /> System capacity optimized
                  </div>
              </div>
              <Activity className="absolute -right-6 -bottom-6 w-32 h-32 opacity-[0.08] group-hover:scale-110 transition-transform duration-700" />
          </div>

          <div className="bg-gradient-to-br from-rose-500 to-rose-700 rounded-[2.5rem] p-7 text-white shadow-xl shadow-rose-900/10 relative overflow-hidden group hover:scale-[1.02] transition-all">
              <div className="relative z-10 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="p-3 bg-white/20 rounded-2xl w-fit"><PhoneOutgoing className="w-6 h-6" /></div>
                    <div className="bg-white/20 px-2 py-1 rounded-lg border border-white/20">
                        <input 
                            type="date" 
                            value={kpiRefDate} 
                            onChange={(e) => setKpiRefDate(e.target.value)} 
                            className="bg-transparent border-none outline-none text-[10px] font-black cursor-pointer text-white" 
                        />
                    </div>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Follow-up Due</p>
                  <h3 className="text-4xl font-black tracking-tighter">{stats.dueCount}</h3>
                  <div className="flex items-center gap-1.5 pt-2 text-[10px] font-bold text-rose-100">
                      <Timer className="w-3 h-3" /> Targeted on selected date
                  </div>
              </div>
              <Calendar className="absolute -right-6 -bottom-6 w-32 h-32 opacity-[0.08] group-hover:scale-110 transition-transform duration-700" />
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-[2.5rem] p-7 text-white shadow-xl shadow-emerald-900/10 relative overflow-hidden group hover:scale-[1.02] transition-all">
              <div className="relative z-10 space-y-2">
                  <div className="p-3 bg-white/20 rounded-2xl w-fit"><ThumbsUp className="w-6 h-6" /></div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Qualified Prospects</p>
                  <h3 className="text-4xl font-black tracking-tighter">{stats.interested}</h3>
                  <div className="flex items-center gap-1.5 pt-2 text-[10px] font-bold text-emerald-100">
                      <CheckCircle className="w-3 h-3" /> Converging to partners
                  </div>
              </div>
              <Building2 className="absolute -right-6 -bottom-6 w-32 h-32 opacity-[0.08] group-hover:scale-110 transition-transform duration-700" />
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-[2.5rem] p-7 text-white shadow-xl shadow-purple-900/10 relative overflow-hidden group hover:scale-[1.02] transition-all">
              <div className="relative z-10 space-y-2">
                  <div className="p-3 bg-white/20 rounded-2xl w-fit"><Wallet className="w-6 h-6" /></div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Pipeline Valuation</p>
                  <h3 className="text-4xl font-black tracking-tighter">₹{(stats.pipelineValue/100000).toFixed(1)}L</h3>
                  <div className="flex items-center gap-1.5 pt-2 text-[10px] font-bold text-purple-100">
                      <ArrowUpRight className="w-3 h-3" /> Projected franchise revenue
                  </div>
              </div>
              <TrendingUp className="absolute -right-6 -bottom-6 w-32 h-32 opacity-[0.08] group-hover:scale-110 transition-transform duration-700" />
          </div>
      </div>

      {/* 4. Leads Content Area */}
      {viewMode === 'Grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in duration-700">
            {filteredLeads.map(lead => (
                <div key={lead.id} className={`bg-white rounded-[3rem] border shadow-sm p-8 hover:shadow-2xl transition-all group relative overflow-hidden flex flex-col h-full ${lead.status === 'Lost' ? 'border-rose-400 ring-4 ring-rose-50 grayscale-[0.3]' : 'border-gray-100'}`}>
                {lead.status === 'Lost' && <div className="absolute top-0 right-0 bg-rose-500 text-white px-6 py-2 rounded-bl-[2rem] text-[10px] font-black uppercase tracking-[0.2em] z-10 shadow-lg">Closed • Discarded</div>}
                <div className="flex justify-between items-start mb-8">
                    <div className="flex items-center gap-5">
                        <div className={`w-16 h-16 rounded-3xl flex items-center justify-center font-black text-2xl text-white shadow-xl ${lead.status === 'Lost' ? 'bg-rose-400' : lead.priority === 'Hot' ? 'bg-rose-500' : 'bg-indigo-600'}`}>{lead.name.charAt(0)}</div>
                        <div>
                            <div className={`text-[10px] font-black uppercase tracking-[0.3em] mb-1 ${lead.status === 'Lost' ? 'text-rose-500' : 'text-indigo-600'}`}>{lead.status}</div>
                            <h3 className="text-xl font-black text-gray-900 tracking-tighter leading-none">{lead.name}</h3>
                        </div>
                    </div>
                    <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 ${lead.status === 'Lost' ? 'bg-rose-50 text-rose-500 border-rose-200' : lead.priority === 'Hot' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{lead.priority}</div>
                </div>
                <div className="space-y-5 mb-8 flex-1">
                    <div className="flex items-center gap-4 text-sm text-gray-600 font-bold"><div className="p-3 bg-gray-50 rounded-2xl"><MapPin className="w-4 h-4 text-gray-400" /></div> {lead.location}</div>
                    <div className="flex items-center gap-4 text-sm text-gray-800 font-black"><div className="p-3 bg-emerald-50 rounded-2xl"><IndianRupee className="w-4 h-4 text-emerald-600" /></div> ₹{lead.totalValue.toLocaleString()}</div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 font-bold"><div className="p-3 bg-indigo-50 rounded-2xl"><Phone className="w-4 h-4 text-indigo-500" /></div> <ContactDisplay type="phone" value={lead.phone || ''} /></div>
                </div>
                <div className="pt-6 border-t border-gray-50 flex justify-between items-center">
                    <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${lead.nextCallDate === kpiRefDate ? 'text-rose-600' : 'text-gray-400'}`}>
                        <Calendar className="w-3.5 h-3.5" /> {lead.nextCallDate || 'N/A'}
                    </div>
                    <button onClick={() => handleEdit(lead)} className="text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:underline flex items-center gap-1.5 group/btn">
                        Manage <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                </div>
                </div>
            ))}
          </div>
      ) : (
          <div className="bg-white rounded-[3rem] border border-gray-100 shadow-2xl shadow-indigo-900/5 overflow-hidden animate-in fade-in duration-700">
              <div className="overflow-x-auto min-h-[400px]">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-gray-50 border-b border-gray-100">
                          <tr>
                              <th className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Lead Identity</th>
                              <th className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone Number</th>
                              <th className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Location</th>
                              <th className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Value (INR)</th>
                              <th className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                              <th className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Follow-up</th>
                              <th className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                          {filteredLeads.map(lead => (
                              <tr key={lead.id} className={`hover:bg-gray-50/50 transition-all ${lead.status === 'Lost' ? 'bg-rose-50/20' : ''}`}>
                                  <td className="px-10 py-8">
                                      <div className="flex items-center gap-4">
                                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-white text-sm shadow-lg ${lead.status === 'Lost' ? 'bg-rose-400' : lead.priority === 'Hot' ? 'bg-rose-500' : 'bg-indigo-600'}`}>{lead.name.charAt(0)}</div>
                                          <div>
                                              <p className={`font-black text-base tracking-tight ${lead.status === 'Lost' ? 'text-rose-500' : 'text-gray-900'}`}>{lead.name}</p>
                                              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{lead.role}</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td className="px-10 py-8 font-mono text-gray-600 font-bold">
                                      <ContactDisplay type="phone" value={lead.phone || ''} />
                                  </td>
                                  <td className="px-10 py-8 text-gray-600 font-bold flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-300" /> {lead.location}</td>
                                  <td className="px-10 py-8 text-right font-black text-gray-900 text-base">₹{lead.totalValue.toLocaleString()}</td>
                                  <td className="px-10 py-8 text-center">
                                      <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 ${
                                          lead.status === 'Qualified' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                                          lead.status === 'Lost' ? 'bg-rose-500 text-white border-rose-500' : 
                                          'bg-gray-50 text-gray-500 border-gray-100'
                                      }`}>
                                          {lead.status}
                                      </span>
                                  </td>
                                  <td className="px-10 py-8">
                                      <div className={`flex items-center gap-2 text-xs font-black uppercase ${lead.nextCallDate === kpiRefDate ? 'text-rose-600 animate-pulse' : 'text-gray-400'}`}>
                                          <Calendar className="w-3.5 h-3.5" /> {lead.nextCallDate || 'N/A'}
                                      </div>
                                  </td>
                                  <td className="px-10 py-8 text-right">
                                      <div className="flex justify-end gap-3">
                                          <button onClick={() => handleEdit(lead)} className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 hover:bg-indigo-100 transition-all"><Edit2 className="w-5 h-5"/></button>
                                          <button onClick={() => setLeads(prev => prev.filter(l => l.id !== lead.id))} className="p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 hover:bg-rose-100 transition-all"><Trash2 className="w-5 h-5"/></button>
                                      </div>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* Main Lead Engagement Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col animate-in fade-in zoom-in duration-300 border border-gray-100">
              <div className="p-10 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
                 <div>
                    <h3 className="font-black text-gray-900 text-3xl tracking-tighter">{editingId ? 'Refine Prospect Strategy' : 'Onboard New Opportunity'}</h3>
                    <p className="text-gray-400 text-xs font-black uppercase mt-1 tracking-widest opacity-60">Strategic ID: {editingId || 'Pending Deployment'}</p>
                 </div>
                 <button onClick={resetForm} className="p-4 hover:bg-white rounded-3xl transition-all text-gray-400 hover:text-gray-900"><X className="w-8 h-8"/></button>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="flex flex-col lg:flex-row h-full">
                  <form onSubmit={handleSubmit} className="flex-1 p-12 space-y-12 lg:border-r border-gray-100">
                     <section className="space-y-6">
                        <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-3"><Target className="w-4 h-4" /> Interaction Outcome</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <button type="button" onClick={() => setFormData({...formData, outcome: 'Interest'})} className={`flex flex-col items-center gap-3 p-6 rounded-[2rem] border-2 transition-all ${formData.outcome === 'Interest' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xl shadow-emerald-500/10' : 'bg-white border-gray-100 hover:bg-gray-50 text-gray-400'}`}><ThumbsUp className="w-8 h-8" /><span className="text-[10px] font-black uppercase tracking-widest">Interested</span></button>
                            <button type="button" onClick={() => setFormData({...formData, outcome: 'Not Interest'})} className={`flex flex-col items-center gap-3 p-6 rounded-[2rem] border-2 transition-all ${formData.outcome === 'Not Interest' ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-xl shadow-rose-500/10' : 'bg-white border-gray-100 hover:bg-gray-50 text-gray-400'}`}><ThumbsDown className="w-8 h-8" /><span className="text-[10px] font-black uppercase tracking-widest">Rejected</span></button>
                            <button type="button" onClick={() => setFormData({...formData, outcome: 'Call Back'})} className={`flex flex-col items-center gap-3 p-6 rounded-[2rem] border-2 transition-all ${formData.outcome === 'Call Back' ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xl shadow-blue-500/10' : 'bg-white border-gray-100 hover:bg-gray-50 text-gray-400'}`}><Clock className="w-8 h-8" /><span className="text-[10px] font-black uppercase tracking-widest">Callback</span></button>
                            <button type="button" onClick={() => setFormData({...formData, outcome: 'No Answer'})} className={`flex flex-col items-center gap-3 p-6 rounded-[2rem] border-2 transition-all ${formData.outcome === 'No Answer' ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-xl shadow-amber-500/10' : 'bg-white border-gray-100 hover:bg-gray-50 text-gray-400'}`}><PhoneMissed className="w-8 h-8" /><span className="text-[10px] font-black uppercase tracking-widest">No Ans</span></button>
                        </div>
                     </section>

                     <section className="space-y-6">
                        <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-3"><User className="w-4 h-4" /> identity & contact</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase ml-2">Full Name</label><input required name="name" value={formData.name} onChange={handleInputChange} className="w-full px-6 py-4 bg-gray-100 border-none rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold text-gray-800 shadow-inner" /></div>
                            <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase ml-2">Primary Mobile</label><input name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-6 py-4 bg-gray-100 border-none rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold text-gray-800 shadow-inner" /></div>
                        </div>
                     </section>

                     {formData.outcome !== 'Not Interest' && (
                         <section className="space-y-8 animate-in fade-in slide-in-from-top-2">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                 {formData.outcome === 'Interest' && (
                                     <div className="space-y-4">
                                         <h4 className="text-[10px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-3"><ArrowUpRight className="w-4 h-4" /> Lead Priority</h4>
                                         <div className="flex gap-2">
                                             {['Hot', 'Warm', 'Cold'].map(p => (
                                                 <button key={p} type="button" onClick={() => setFormData({...formData, priority: p as any})} className={`flex-1 py-4 text-xs font-black uppercase rounded-2xl border-2 transition-all ${formData.priority === p ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'}`}>{p}</button>
                                             ))}
                                         </div>
                                     </div>
                                 )}
                                 <div className="space-y-4 col-span-1 md:col-span-2">
                                     <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-3"><Calendar className="w-4 h-4" /> Next Follow-up Strategy</h4>
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-6 rounded-3xl shadow-inner border border-gray-100">
                                         <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase ml-2">Scheduled Date</label><input type="date" name="nextCallDate" value={formData.nextCallDate} onChange={handleInputChange} className="w-full p-4 border border-gray-200 bg-white rounded-2xl text-sm font-bold focus:ring-4 focus:ring-rose-500/10 outline-none shadow-sm" /></div>
                                         <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase ml-2">Time Slot</label><input type="time" name="nextCallTime" value={formData.nextCallTime} onChange={handleInputChange} className="w-full p-4 border border-gray-200 bg-white rounded-2xl text-sm font-bold focus:ring-4 focus:ring-rose-500/10 outline-none shadow-sm" /></div>
                                     </div>
                                 </div>
                             </div>
                         </section>
                     )}

                     <section className="space-y-6">
                        <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-3"><Send className="w-4 h-4" /> conversation brief (notes)</h4>
                        <textarea 
                            name="currentInteractionNote" 
                            value={formData.currentInteractionNote} 
                            onChange={handleInputChange} 
                            rows={4}
                            placeholder="Detail requirements, budget constraints, or specific interests expressed during the call..."
                            className="w-full p-8 border border-gray-200 bg-gray-50 rounded-[3rem] text-sm font-bold text-gray-700 focus:ring-4 focus:ring-blue-500/10 outline-none resize-none transition-all shadow-inner leading-relaxed"
                        />
                     </section>

                     <div className="flex gap-6 pt-6">
                        <button type="button" onClick={resetForm} className="flex-1 py-5 bg-gray-100 text-gray-500 font-black uppercase tracking-widest rounded-2xl hover:bg-gray-200 transition-all text-xs">Dismiss</button>
                        <button type="submit" className="flex-[2] py-5 bg-indigo-600 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-indigo-900/20 hover:bg-indigo-700 transition-all transform active:scale-95 text-xs">{editingId ? 'Save Strategy' : 'Deploy Opportunity'}</button>
                     </div>
                  </form>

                  {/* RIGHT PANEL: OUTREACH & TEMPLATES */}
                  <div className="lg:w-[40%] bg-gray-50/50 p-12 flex flex-col border-l border-gray-100 overflow-y-auto custom-scrollbar h-full">
                     <div className="space-y-10">
                         {formData.outcome !== 'Not Interest' ? (
                             <>
                                <div>
                                    <div className="flex justify-between items-center mb-8">
                                        <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-3"><FileText className="w-5 h-5 text-emerald-500" /> Strategic Assets</h4>
                                        <button onClick={() => setIsTemplateModalOpen(true)} className="text-[10px] font-black text-emerald-600 hover:underline uppercase tracking-widest">Library</button>
                                    </div>
                                    <div className="space-y-4">
                                        {templates.map(t => (
                                            <button 
                                                key={t.id} 
                                                onClick={() => handleApplyTemplate(t)}
                                                className="w-full p-6 bg-white border border-gray-200 rounded-[2rem] text-left hover:border-emerald-500 hover:shadow-xl transition-all group flex justify-between items-center"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-black text-gray-800 truncate mb-1">{t.name}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase truncate tracking-tighter opacity-60">Message Template</p>
                                                </div>
                                                {t.fileUrl ? <Paperclip className="w-4 h-4 text-emerald-500 ml-4" /> : <ChevronRight className="w-4 h-4 text-gray-300" />}
                                            </button>
                                        ))}
                                        {templates.length === 0 && <p className="text-xs text-gray-400 italic text-center py-10 bg-white/50 rounded-3xl border border-dashed border-gray-300">Library is currently empty.</p>}
                                    </div>
                                </div>

                                <div className="pt-10 border-t border-gray-200">
                                    <div className="flex justify-between items-center mb-8">
                                        <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-3"><Sparkles className="w-5 h-5 text-indigo-500" /> AI Outreach Synthesis</h4>
                                        <button 
                                            type="button"
                                            onClick={() => handleAiFillMessage(formData.outcome === 'No Answer')}
                                            disabled={isAiGenerating || (!formData.name && !editingId)}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
                                        >
                                            {isAiGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                            Synthesize
                                        </button>
                                    </div>

                                    <div className="bg-white rounded-[3rem] border border-gray-100 shadow-2xl p-8 relative group overflow-hidden">
                                        <textarea 
                                            value={outreachMessage}
                                            onChange={(e) => setOutreachMessage(e.target.value)}
                                            placeholder="Apply a template or use AI to synthesize a personalized communication..."
                                            className="w-full h-56 p-2 bg-transparent border-none text-sm font-bold text-gray-700 outline-none resize-none placeholder:text-gray-300 relative z-10 leading-relaxed custom-scrollbar"
                                        />
                                        <div className="flex gap-3 pt-6 border-t border-gray-50 relative z-10">
                                            <button 
                                                type="button" 
                                                onClick={() => sendOutreach('WhatsApp')}
                                                className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl shadow-emerald-500/10 transform active:scale-95"
                                            >
                                                <MessageCircle className="w-5 h-5" /> WhatsApp
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={() => sendOutreach('Email')}
                                                className="flex-1 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl shadow-blue-500/10 transform active:scale-95"
                                            >
                                                <AtSign className="w-5 h-5" /> Email
                                            </button>
                                        </div>
                                    </div>
                                </div>
                             </>
                         ) : (
                             <div className="flex flex-col items-center justify-center h-full text-center p-10 animate-in fade-in zoom-in">
                                 <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mb-6">
                                     <ThumbsDown className="w-10 h-10" />
                                 </div>
                                 <h4 className="text-xl font-black text-gray-900 tracking-tighter">Engagement Terminated</h4>
                                 <p className="text-sm text-gray-500 mt-2">Lead marked as 'Not Interested'. No further outreach assets are available for this status to maintain compliance.</p>
                             </div>
                         )}
                     </div>
                  </div>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* Template Management Modal */}
      {isTemplateModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col animate-in fade-in zoom-in duration-300 overflow-hidden border border-gray-100">
                  <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                      <h3 className="text-2xl font-black text-gray-900 tracking-tighter flex items-center gap-3">
                        <Settings className="w-8 h-8 text-emerald-500" /> Manage Message Templates
                      </h3>
                      <button onClick={() => setIsTemplateModalOpen(false)} className="p-3 hover:bg-gray-200 rounded-2xl transition-all text-gray-400 hover:text-gray-900"><X className="w-6 h-6"/></button>
                  </div>
                  
                  <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                      {/* Left: Form */}
                      <form onSubmit={handleSaveTemplate} className="w-full md:w-1/2 p-10 space-y-8 border-r border-gray-100 overflow-y-auto custom-scrollbar">
                          <div>
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3 px-1">Template Asset Name</label>
                              <input 
                                required
                                value={templateFormData.name}
                                onChange={e => setTemplateFormData({...templateFormData, name: e.target.value})}
                                placeholder="e.g. Investors Presentation"
                                className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 font-black text-gray-800 shadow-inner"
                              />
                          </div>
                          <div>
                              <div className="flex justify-between items-center mb-3 px-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Message Content</label>
                                <span className="text-[9px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-lg">Use [Name] for auto-fill</span>
                              </div>
                              <textarea 
                                required
                                rows={8}
                                value={templateFormData.content}
                                onChange={e => setTemplateFormData({...templateFormData, content: e.target.value})}
                                placeholder="Hi [Name], great speaking with you. Here is the requested document..."
                                className="w-full p-6 bg-gray-50 border border-gray-100 rounded-[2.5rem] outline-none focus:ring-4 focus:ring-emerald-500/10 text-sm font-bold text-gray-700 resize-none shadow-inner leading-relaxed"
                              />
                          </div>
                          <div>
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3 px-1">Attached PDF / Image Link</label>
                              <input type="file" ref={templateFileRef} className="hidden" onChange={handleTemplateFileChange} />
                              <div 
                                onClick={() => templateFileRef.current?.click()}
                                className={`p-8 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all ${templateFormData.fileUrl ? 'border-emerald-500 bg-emerald-50 shadow-inner' : 'border-gray-200 hover:bg-gray-50'}`}
                              >
                                  {isUploadingTemplateFile ? (
                                      <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                                  ) : templateFormData.fileUrl ? (
                                      <div className="flex flex-col items-center text-emerald-700">
                                          <CheckCircle className="w-8 h-8 mb-2" />
                                          <span className="text-[10px] font-black uppercase truncate max-w-[250px]">{templateFormData.fileName}</span>
                                          <button type="button" onClick={(e) => { e.stopPropagation(); setTemplateFormData({...templateFormData, fileUrl: '', fileName: ''}); }} className="mt-3 text-[9px] font-black uppercase tracking-widest underline decoration-2 underline-offset-4">Remove Asset</button>
                                      </div>
                                  ) : (
                                      <div className="flex flex-col items-center text-gray-400">
                                          <Upload className="w-8 h-8 mb-2" />
                                          <span className="text-[10px] font-black uppercase tracking-widest">Attach Dynamic Document</span>
                                      </div>
                                  )}
                              </div>
                          </div>
                          <button 
                            type="submit"
                            className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-900/20 hover:bg-emerald-700 transition-all transform active:scale-95"
                          >
                              {editingTemplateId ? 'Update Asset' : 'Register Asset'}
                          </button>
                      </form>

                      {/* Right: List */}
                      <div className="w-full md:w-1/2 p-10 bg-gray-50/50 overflow-y-auto custom-scrollbar">
                          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-8 px-1">Registered Assets ({templates.length})</h4>
                          <div className="space-y-4">
                              {templates.map(t => (
                                  <div key={t.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm relative group hover:shadow-xl transition-all">
                                      <div className="flex justify-between items-start mb-3">
                                          <div className="min-w-0">
                                              <p className="text-base font-black text-gray-800 truncate pr-16 leading-none">{t.name}</p>
                                              <p className="text-[9px] text-gray-400 font-black uppercase tracking-tighter mt-1.5 opacity-60">{t.fileName || 'Static Content'}</p>
                                          </div>
                                          <div className="flex gap-2 shrink-0">
                                              <button onClick={() => { setEditingTemplateId(t.id); setTemplateFormData(t); }} className="p-2.5 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-colors"><Edit2 className="w-4 h-4"/></button>
                                              <button onClick={() => deleteTemplate(t.id)} className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"><Trash2 className="w-4 h-4"/></button>
                                          </div>
                                      </div>
                                      <p className="text-xs text-gray-600 line-clamp-2 italic font-bold leading-relaxed opacity-70">"{t.content}"</p>
                                  </div>
                              ))}
                              {templates.length === 0 && <p className="text-center py-32 text-gray-300 font-black uppercase text-xs tracking-[0.3em]">No registered assets</p>}
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
