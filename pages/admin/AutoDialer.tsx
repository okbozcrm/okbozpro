import React, { useState, useMemo } from 'react';
import { 
  Phone, Cloud, Settings, FileText, Plus, Upload, 
  Search, Filter, Trash2, Play, MapPin, 
  User, Clock, Calendar
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

// --- Types ---
interface Lead {
  id: string;
  name: string;
  phone: string;
  location: string;
  addedBy: string;
  addedByEmail: string;
  status: 'PENDING' | 'CALLBACK' | 'INTERESTED' | 'NO_ANSWER' | 'NOT_INTERESTED' | 'NO_MATCH';
  schedule?: string;
  history: { date: string; note: string }[];
}

// --- Mock Data ---
const MOCK_LEADS: Lead[] = [
  {
    id: '1',
    name: 'SENTHIL KUMAR',
    phone: '9566348085',
    location: 'COIMBATORE',
    addedBy: 'shailaja',
    addedByEmail: 'okbozmadurai@gmail.com',
    status: 'CALLBACK',
    schedule: '21 Feb, 03:02',
    history: [
      { date: '2024-02-21', note: 'Requested a follow-up call at a later time.' }
    ]
  },
  {
    id: '2',
    name: 'SENTHIL KUMAR',
    phone: '95667348085',
    location: 'COIMBATORE',
    addedBy: 'shailaja',
    addedByEmail: 'okbozmadurai@gmail.com',
    status: 'PENDING',
    history: []
  },
  // Add more mock data if needed to fill the list
];

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#E5E7EB']; // Emerald, Amber, Red, Gray

const AutoDialer: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>('1');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Lead['status'] | 'ALL'>('ALL');
  const [locationFilter, setLocationFilter] = useState<string>('ALL');
  const [note, setNote] = useState('');

  const selectedLead = leads.find(l => l.id === selectedLeadId);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           lead.phone.includes(searchTerm);
      const matchesStatus = statusFilter === 'ALL' || lead.status === statusFilter;
      const matchesLocation = locationFilter === 'ALL' || lead.location === locationFilter;
      return matchesSearch && matchesStatus && matchesLocation;
    });
  }, [leads, searchTerm, statusFilter, locationFilter]);

  // Unique Locations for Filter
  const locations = useMemo(() => {
    const locs = Array.from(new Set(leads.map(l => l.location)));
    return ['ALL', ...locs];
  }, [leads]);

  // Stats Calculation
  const stats = useMemo(() => {
    const interested = leads.filter(l => l.status === 'INTERESTED').length;
    const callback = leads.filter(l => l.status === 'CALLBACK').length;
    const noMatch = leads.filter(l => l.status === 'NO_MATCH').length;
    const pending = leads.filter(l => l.status === 'PENDING').length;
    
    const total = leads.length;
    const handled = total - pending;
    const completionRate = total > 0 ? Math.round((handled / total) * 100) : 0;
    const conversionRate = handled > 0 ? Math.round((interested / handled) * 100) : 0;
    const callbackRate = handled > 0 ? Math.round((callback / handled) * 100) : 0;

    return {
      interested, callback, noMatch, pending, total, handled, completionRate,
      conversionRate, callbackRate,
      chartData: [
        { name: 'Interested', value: interested },
        { name: 'Callback', value: callback },
        { name: 'No Match', value: noMatch },
        { name: 'Pending', value: pending } // Added pending to complete the circle if needed, or just gray area
      ]
    };
  }, [leads]);

  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [newLead, setNewLead] = useState({ name: '', phone: '', location: '' });
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // --- Handlers ---
  const handleSyncCloud = () => {
    // Simulate cloud sync
    const btn = document.getElementById('sync-btn');
    if(btn) btn.innerText = 'Syncing...';
    setTimeout(() => {
        if(btn) btn.innerText = 'Sync Cloud';
        alert("Cloud Sync Completed Successfully!");
    }, 1500);
  };

  const handleDownloadSample = () => {
    const headers = "Name,Phone,Location\n";
    const sampleRow = "John Doe,9876543210,Chennai\nJane Smith,9123456789,Bangalore";
    const blob = new Blob([headers + sampleRow], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads_sample.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split('\n');
        const importedLeads: Lead[] = [];
        
        // Skip header if present (simple check)
        const startIndex = lines[0].toLowerCase().includes('name') ? 1 : 0;

        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const [name, phone, location] = line.split(',').map(s => s.trim());
            if (name && phone) {
                importedLeads.push({
                    id: `IMP-${Date.now()}-${i}`,
                    name,
                    phone,
                    location: location || 'Unknown',
                    addedBy: 'Import',
                    addedByEmail: 'admin@okboz.com',
                    status: 'PENDING',
                    history: []
                });
            }
        }
        
        if (importedLeads.length > 0) {
            setLeads(prev => [...prev, ...importedLeads]);
            alert(`Successfully imported ${importedLeads.length} leads.`);
        } else {
            alert("No valid leads found in file.");
        }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddLeadSubmit = () => {
    if (!newLead.name || !newLead.phone) {
        alert("Name and Phone are required.");
        return;
    }
    const lead: Lead = {
        id: `MAN-${Date.now()}`,
        name: newLead.name,
        phone: newLead.phone,
        location: newLead.location || 'Unknown',
        addedBy: 'Admin',
        addedByEmail: 'admin@okboz.com',
        status: 'PENDING',
        history: []
    };
    setLeads(prev => [lead, ...prev]);
    setIsAddLeadModalOpen(false);
    setNewLead({ name: '', phone: '', location: '' });
  };

  const [isCallbackModalOpen, setIsCallbackModalOpen] = useState(false);
  const [callbackDateTime, setCallbackDateTime] = useState('');

  const handleStatusUpdate = (status: Lead['status']) => {
    if (!selectedLead) return;
    
    if (status === 'CALLBACK') {
      setIsCallbackModalOpen(true);
      return;
    }

    updateLeadStatus(status);
  };

  const updateLeadStatus = (status: Lead['status'], schedule?: string) => {
    if (!selectedLead) return;
    const updatedLeads = leads.map(l => {
      if (l.id === selectedLead.id) {
        return {
          ...l,
          status,
          schedule: schedule || l.schedule,
          history: [...l.history, { date: new Date().toISOString().split('T')[0], note: note || `Marked as ${status}` }]
        };
      }
      return l;
    });
    setLeads(updatedLeads);
    setNote('');
  };

  const handleCallbackConfirm = () => {
    if (!callbackDateTime) {
      alert("Please select a date and time for the callback.");
      return;
    }
    // Format date nicely: "21 Feb, 03:02"
    const date = new Date(callbackDateTime);
    const formattedDate = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const formattedTime = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const scheduleStr = `${formattedDate}, ${formattedTime}`;

    updateLeadStatus('CALLBACK', scheduleStr);
    setIsCallbackModalOpen(false);
    setCallbackDateTime('');
  };

  // --- Templates State ---
  const [templates, setTemplates] = useState([
    { id: '1', name: 'Follow-up Template', content: "Hi [Name], this is from OK BOZ. Just checking in regarding your enquiry..." },
    { id: '2', name: 'Callback Template', content: "Hello [Name], we tried reaching you. Please call us back at your convenience." }
  ]);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', content: '' });

  const handleCreateTemplate = () => {
    if (!newTemplate.name || !newTemplate.content) {
        alert("Template Name and Content are required.");
        return;
    }
    setTemplates([...templates, { id: Date.now().toString(), ...newTemplate }]);
    setNewTemplate({ name: '', content: '' });
    setIsCreatingTemplate(false);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 space-y-6 font-sans text-slate-800">
      
      {/* Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Phone className="w-8 h-8 text-emerald-600" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Smart AutoDialer</h1>
          </div>
          <p className="text-slate-500 font-medium ml-11">Auto-dial, follow-up management, and instant messaging.</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button id="sync-btn" onClick={handleSyncCloud} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm active:scale-95 transform">
            <Cloud className="w-4 h-4" /> Sync Cloud
          </button>
          <button onClick={() => setIsTemplatesModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm active:scale-95 transform">
            <Settings className="w-4 h-4" /> Manage Templates
          </button>
          <button onClick={handleDownloadSample} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm active:scale-95 transform">
            <FileText className="w-4 h-4" /> Sample
          </button>
          <button onClick={() => setIsAddLeadModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold transition-colors shadow-lg shadow-emerald-500/20 active:scale-95 transform">
            <Plus className="w-4 h-4" /> Add Lead
          </button>
          <input type="file" ref={fileInputRef} accept=".csv" className="hidden" onChange={handleImport} />
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-colors shadow-lg shadow-indigo-600/20 active:scale-95 transform">
            <Upload className="w-4 h-4" /> Import
          </button>
        </div>
      </div>

      {/* --- Modals --- */}
      {isAddLeadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                <h3 className="text-xl font-black text-slate-800 mb-4">Add New Lead</h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Name</label>
                        <input type="text" value={newLead.name} onChange={e => setNewLead({...newLead, name: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20" placeholder="Enter Name" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Phone</label>
                        <input type="tel" value={newLead.phone} onChange={e => setNewLead({...newLead, phone: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20" placeholder="Enter Phone" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Location</label>
                        <input type="text" value={newLead.location} onChange={e => setNewLead({...newLead, location: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20" placeholder="Enter Location" />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button onClick={() => setIsAddLeadModalOpen(false)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest transition-all">Cancel</button>
                        <button onClick={handleAddLeadSubmit} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20">Add Lead</button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {isTemplatesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-black text-slate-800">Manage Templates</h3>
                    {!isCreatingTemplate && (
                        <button onClick={() => setIsCreatingTemplate(true)} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors">
                            <Plus className="w-3 h-3" /> New Template
                        </button>
                    )}
                </div>
                
                {isCreatingTemplate ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Template Name</label>
                            <input type="text" value={newTemplate.name} onChange={e => setNewTemplate({...newTemplate, name: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="e.g. Intro Message" autoFocus />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Content</label>
                            <textarea value={newTemplate.content} onChange={e => setNewTemplate({...newTemplate, content: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 h-32 resize-none" placeholder="Enter message content..." />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setIsCreatingTemplate(false)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest transition-all">Cancel</button>
                            <button onClick={handleCreateTemplate} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20">Save Template</button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {templates.map(t => (
                            <div key={t.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 group hover:border-indigo-100 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <p className="text-sm font-bold text-gray-700">{t.name}</p>
                                    <button onClick={() => setTemplates(templates.filter(temp => temp.id !== t.id))} className="text-gray-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                                <p className="text-xs text-gray-500 italic">&quot;{t.content}&quot;</p>
                            </div>
                        ))}
                        {templates.length === 0 && <p className="text-center text-gray-400 text-sm py-4">No templates found.</p>}
                        <button onClick={() => setIsTemplatesModalOpen(false)} className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest transition-all mt-2">Close</button>
                    </div>
                )}
            </div>
        </div>
      )}

      {isCallbackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
                <h3 className="text-xl font-black text-slate-800 mb-4">Schedule Callback</h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Select Date & Time</label>
                        <input 
                            type="datetime-local" 
                            value={callbackDateTime} 
                            onChange={e => setCallbackDateTime(e.target.value)} 
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 font-mono text-sm" 
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button onClick={() => setIsCallbackModalOpen(false)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest transition-all">Cancel</button>
                        <button onClick={handleCallbackConfirm} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20">Set Callback</button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* KPI Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Leads</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-black text-slate-900">{stats.total}</h3>
            <div className="p-2 bg-indigo-50 rounded-lg">
              <User className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Conversion Rate</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-black text-slate-900">{stats.conversionRate}%</h3>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Play className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Callback Rate</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-black text-slate-900">{stats.callbackRate}%</h3>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Pending Leads</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-black text-slate-900">{stats.pending}</h3>
            <div className="p-2 bg-amber-50 rounded-lg">
              <Filter className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div className="relative w-32 h-32">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={55}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {stats.chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
             </ResponsiveContainer>
             {/* Center Text overlay if needed, or just visual */}
          </div>
          <div className="space-y-3 flex-1 pl-6">
             <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> Interested ({stats.interested})
             </div>
             <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div> Callback ({stats.callback})
             </div>
             <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div> No Match ({stats.noMatch})
             </div>
          </div>
        </div>

        {/* Progress Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center space-y-6">
           <div className="flex justify-between items-end">
              <span className="text-sm font-bold text-gray-500">Daily Completion</span>
              <span className="text-2xl font-black text-emerald-600">{stats.completionRate}%</span>
           </div>
           <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${stats.completionRate}%` }}></div>
           </div>
           <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
              <span>{stats.handled} Handled</span>
              <span>{stats.total} Lead Base</span>
           </div>
        </div>

        {/* Action Center Card */}
        <div className="bg-gradient-to-br from-violet-600 to-indigo-700 p-6 rounded-2xl shadow-xl shadow-indigo-600/20 text-white relative overflow-hidden">
           <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4 opacity-90">
                 <Calendar className="w-4 h-4" />
                 <span className="text-[10px] font-black uppercase tracking-widest">Today&apos;s Action Center</span>
              </div>
              <div className="flex items-end gap-2 mb-1">
                 <span className="text-6xl font-black tracking-tighter leading-none">2</span>
              </div>
              <p className="text-sm font-medium opacity-80">Total Priority Items</p>
              
              <div className="mt-6 space-y-2">
                 <div className="flex items-center gap-2 text-xs font-bold">
                    <div className="w-2 h-2 rounded-full bg-amber-400"></div> 1 New Leads
                 </div>
                 <div className="flex items-center gap-2 text-xs font-bold">
                    <div className="w-2 h-2 rounded-full bg-blue-400"></div> 1 Callbacks
                 </div>
              </div>
           </div>
           {/* Decorative bg elements */}
           <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4">
              <Clock className="w-40 h-40" />
           </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-350px)] min-h-[600px]">
        
        {/* Left: Lead List */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
           {/* Toolbar */}
            <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                 <input 
                    type="text" 
                    placeholder="Search name or phone..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/10"
                 />
              </div>
              
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as Lead['status'] | 'ALL')}
                className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-600 outline-none focus:ring-2 focus:ring-indigo-500/10"
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="CALLBACK">Callback</option>
                <option value="INTERESTED">Interested</option>
                <option value="NO_ANSWER">No Answer</option>
                <option value="NOT_INTERESTED">Not Interested</option>
                <option value="NO_MATCH">No Match</option>
              </select>

              <select 
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-600 outline-none focus:ring-2 focus:ring-indigo-500/10"
              >
                {locations.map(loc => (
                  <option key={loc} value={loc}>{loc === 'ALL' ? 'All Locations' : loc}</option>
                ))}
              </select>

              <button onClick={() => {setSearchTerm(''); setStatusFilter('ALL'); setLocationFilter('ALL');}} className="p-2.5 bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50" title="Clear Filters"><Trash2 className="w-4 h-4" /></button>
           </div>

           {/* Table Header */}
           <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50/50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <div className="col-span-1 text-center">#</div>
              <div className="col-span-4">Lead Details</div>
              <div className="col-span-3">Current Status</div>
              <div className="col-span-2">Schedule</div>
              <div className="col-span-2">Added By</div>
           </div>

           {/* List Items */}
           <div className="flex-1 overflow-y-auto">
              {filteredLeads.map((lead, index) => (
                 <div 
                    key={lead.id}
                    onClick={() => setSelectedLeadId(lead.id)}
                    className={`grid grid-cols-12 gap-4 p-4 border-b border-gray-50 items-center cursor-pointer transition-colors ${selectedLeadId === lead.id ? 'bg-indigo-50/50' : 'hover:bg-gray-50'}`}
                 >
                    <div className="col-span-1 flex justify-center">
                       {selectedLeadId === lead.id ? (
                          <Play className="w-4 h-4 text-indigo-600 fill-current" />
                       ) : (
                          <span className="text-xs font-bold text-gray-400">{index + 1}</span>
                       )}
                    </div>
                    <div className="col-span-4">
                       <h4 className="text-sm font-black text-indigo-900">{lead.name}</h4>
                       <p className="text-[10px] font-bold text-gray-500 uppercase mt-0.5 flex items-center gap-1">
                          {lead.location} <span className="text-gray-300">•</span> {lead.phone}
                       </p>
                    </div>
                    <div className="col-span-3">
                       <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                          lead.status === 'CALLBACK' ? 'bg-blue-50 text-blue-600' :
                          lead.status === 'INTERESTED' ? 'bg-emerald-50 text-emerald-600' :
                          lead.status === 'PENDING' ? 'bg-gray-100 text-gray-500' :
                          'bg-gray-50 text-gray-600'
                       }`}>
                          {lead.status}
                       </span>
                    </div>
                    <div className="col-span-2">
                       {lead.schedule ? (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600">
                             <Calendar className="w-3 h-3" /> {lead.schedule}
                          </div>
                       ) : (
                          <span className="text-gray-400">-</span>
                       )}
                    </div>
                    <div className="col-span-2">
                       <p className="text-xs font-bold text-gray-700">{lead.addedBy}</p>
                       <p className="text-[10px] text-gray-400 truncate">{lead.addedByEmail}</p>
                    </div>
                 </div>
              ))}
           </div>
        </div>

        {/* Right: Detail Panel */}
        {selectedLead ? (
           <div className="w-full lg:w-[400px] bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 flex flex-col h-full">
              <div className="p-6 border-b border-gray-100">
                 <h2 className="text-2xl font-black text-slate-900 tracking-tight">{selectedLead.name}</h2>
                 <p className="text-lg font-mono text-slate-500 mt-1 tracking-wide">{selectedLead.phone}</p>
                 
                 <div className="flex items-center gap-4 mt-4 text-xs font-bold text-gray-500">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {selectedLead.location}</span>
                    <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> Added by: {selectedLead.addedBy}</span>
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                 {/* History Section */}
                 <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                       <Clock className="w-3 h-3" /> Previous History
                    </div>
                    {selectedLead.history.length > 0 ? (
                       selectedLead.history.map((h, i) => (
                          <div key={i} className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm text-gray-600 italic">
                             &quot;{h.note}&quot;
                          </div>
                       ))
                    ) : (
                       <div className="text-xs text-gray-400 italic">No previous history</div>
                    )}
                 </div>

                 {/* Current Note Input */}
                 <div className="space-y-3">
                    <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                       Current Interaction Note
                    </div>
                    <textarea 
                       value={note}
                       onChange={(e) => setNote(e.target.value)}
                       placeholder="Summarize the interaction..."
                       className="w-full h-32 p-4 bg-white border border-emerald-100 rounded-xl focus:ring-4 focus:ring-emerald-500/10 outline-none resize-none text-sm shadow-inner"
                    />
                 </div>

                 {/* Action Buttons */}
                 <div className="grid grid-cols-2 gap-3">
                    <button 
                       onClick={() => handleStatusUpdate('INTERESTED')}
                       className="flex items-center justify-between px-4 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors group"
                    >
                       Interested 
                       <span className="w-5 h-5 bg-emerald-200 group-hover:bg-emerald-300 rounded flex items-center justify-center text-emerald-800"><Plus className="w-3 h-3" /></span>
                    </button>
                    <button 
                       onClick={() => handleStatusUpdate('CALLBACK')}
                       className="flex items-center justify-between px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors group"
                    >
                       Callback 
                       <span className="w-5 h-5 bg-blue-200 group-hover:bg-blue-300 rounded flex items-center justify-center text-blue-800"><Plus className="w-3 h-3" /></span>
                    </button>
                    <button 
                       onClick={() => handleStatusUpdate('NO_ANSWER')}
                       className="flex items-center justify-between px-4 py-3 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors group"
                    >
                       No Ans 
                       <span className="w-5 h-5 bg-amber-200 group-hover:bg-amber-300 rounded flex items-center justify-center text-amber-800"><Plus className="w-3 h-3" /></span>
                    </button>
                    <button 
                       onClick={() => handleStatusUpdate('NOT_INTERESTED')}
                       className="flex items-center justify-between px-4 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors group"
                    >
                       Not Intr. 
                       <span className="w-5 h-5 bg-rose-200 group-hover:bg-rose-300 rounded flex items-center justify-center text-rose-800"><Plus className="w-3 h-3" /></span>
                    </button>
                 </div>
              </div>
           </div>
        ) : (
           <div className="w-full lg:w-[400px] bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center text-gray-400">
              <div className="text-center">
                 <User className="w-12 h-12 mx-auto mb-2 opacity-20" />
                 <p className="text-sm font-medium">Select a lead to view details</p>
              </div>
           </div>
        )}

      </div>
    </div>
  );
};

export default AutoDialer;
