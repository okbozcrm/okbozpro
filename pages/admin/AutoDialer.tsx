
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Phone, Upload, Download, Play, Pause, SkipForward, 
  CheckCircle, XCircle, Clock, AlertCircle, FileSpreadsheet, 
  Trash2, RefreshCcw, Search, MessageSquare, Save, UserPlus, X,
  Settings, Mail, Calendar, MapPin, PieChart as PieIcon, BarChart3, Edit2, RotateCcw, Filter
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface CallHistoryLog {
  timestamp: string;
  status: string;
  note: string;
}

interface CallContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  city?: string;
  status: 'Pending' | 'Interested' | 'Not Interested' | 'No Answer' | 'Callback' | 'Completed';
  note: string;
  lastCalled?: string;
  nextFollowUp?: string; // ISO Date String
  history?: CallHistoryLog[];
}

interface MessageTemplates {
  whatsappNoAnswer: string;
  emailNoAnswer: string;
  whatsappIntro: string;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

const AutoDialer: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // -- State --
  const [contacts, setContacts] = useState<CallContact[]>(() => {
    const saved = localStorage.getItem('auto_dialer_data');
    return saved ? JSON.parse(saved) : [];
  });

  const [templates, setTemplates] = useState<MessageTemplates>(() => {
    const saved = localStorage.getItem('dialer_templates');
    return saved ? JSON.parse(saved) : {
      whatsappNoAnswer: "Hi [Name], we tried calling you from OK BOZ regarding your enquiry. Please let us know when you are free.",
      emailNoAnswer: "Missed Call - OK BOZ Support",
      whatsappIntro: "Hello [Name], greetings from OK BOZ! We have a special offer for you."
    };
  });
  
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filters
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterCity, setFilterCity] = useState('All');
  const [filterDateType, setFilterDateType] = useState<'All' | 'Today' | 'Month'>('All'); // New date filter
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isCallbackModalOpen, setIsCallbackModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Forms
  const [manualContact, setManualContact] = useState({ name: '', phone: '', email: '', city: '' });
  const [editFormData, setEditFormData] = useState({ id: '', name: '', phone: '', email: '', city: '' });
  const [callbackDate, setCallbackDate] = useState('');
  const [callbackTime, setCallbackTime] = useState('');

  // -- Persistence --
  useEffect(() => {
    localStorage.setItem('auto_dialer_data', JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    localStorage.setItem('dialer_templates', JSON.stringify(templates));
  }, [templates]);

  // -- Derived State & Analytics --
  const activeContact = contacts[activeIndex];
  
  const cities = useMemo(() => Array.from(new Set(contacts.map(c => c.city || 'Unknown').filter(Boolean))), [contacts]);

  const stats = useMemo(() => {
    const total = contacts.length;
    const completed = contacts.filter(c => c.status !== 'Pending').length;
    const interested = contacts.filter(c => c.status === 'Interested').length;
    const callback = contacts.filter(c => c.status === 'Callback').length;
    const notInterested = contacts.filter(c => c.status === 'Not Interested').length;
    const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
    
    // Today's Follow-ups
    const todayStr = new Date().toISOString().split('T')[0];
    const todaysFollowUps = contacts.filter(c => c.nextFollowUp && c.nextFollowUp.startsWith(todayStr));

    return { total, completed, interested, callback, notInterested, progress, todaysFollowUps };
  }, [contacts]);

  const pieData = [
    { name: 'Interested', value: stats.interested },
    { name: 'Callback', value: stats.callback },
    { name: 'Not Interested', value: stats.notInterested },
    { name: 'Pending', value: stats.total - stats.completed },
  ].filter(d => d.value > 0);

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm);
    const matchesStatus = filterStatus === 'All' || c.status === filterStatus;
    const matchesCity = filterCity === 'All' || (c.city || 'Unknown') === filterCity;
    
    // Date Filtering Logic
    let matchesDate = true;
    if (filterDateType === 'Today') {
        const todayStr = new Date().toISOString().split('T')[0];
        // Match if Last Called is Today OR Next Follow Up is Today
        const lastCalledToday = c.lastCalled ? c.lastCalled.startsWith(new Date().toLocaleDateString()) : false; // Note: toLocaleString format varies, strict ISO check better if stored as ISO
        const followUpToday = c.nextFollowUp ? c.nextFollowUp.startsWith(todayStr) : false;
        matchesDate = lastCalledToday || followUpToday;
    } else if (filterDateType === 'Month') {
        // Match if Last Called in Month
        // Simple check string includes month part of locale date is tricky, usually better to store ISO. 
        // Assuming c.lastCalled is locale string from previous code, let's use c.nextFollowUp for reliability if available, or loose match
        // Ideally we should store ISO. For now, let's rely on nextFollowUp for month filter primarily or if lastCalled contains partial match
        // Or simplified: Just show all if Month selected but rely on explicit nextFollowUp
        if (c.nextFollowUp) matchesDate = c.nextFollowUp.startsWith(filterMonth);
        else matchesDate = true; // Show all if no date data to filter out strictly
    }

    return matchesSearch && matchesStatus && matchesCity && matchesDate;
  });

  // -- Handlers --

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualContact.name || !manualContact.phone) {
        alert("Please enter Name and Phone Number");
        return;
    }

    const newContact: CallContact = {
        id: `C-MAN-${Date.now()}`,
        name: manualContact.name,
        phone: manualContact.phone,
        email: manualContact.email,
        city: manualContact.city || 'Unknown',
        status: 'Pending',
        note: '',
        history: []
    };

    setContacts(prev => [...prev, newContact]);
    setManualContact({ name: '', phone: '', email: '', city: '' });
    setIsAddModalOpen(false);
  };

  const handleEditContact = (contact: CallContact) => {
      setEditFormData({
          id: contact.id,
          name: contact.name,
          phone: contact.phone,
          email: contact.email || '',
          city: contact.city || ''
      });
      setIsEditModalOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
      e.preventDefault();
      setContacts(prev => prev.map(c => c.id === editFormData.id ? {
          ...c,
          name: editFormData.name,
          phone: editFormData.phone,
          email: editFormData.email,
          city: editFormData.city
      } : c));
      setIsEditModalOpen(false);
  };

  const handleDeleteContact = (id: string) => {
      if(window.confirm("Are you sure you want to delete this contact?")) {
          setContacts(prev => prev.filter(c => c.id !== id));
          if (activeContact?.id === id) setActiveIndex(0);
      }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const newContacts: CallContact[] = [];
      
      let startIndex = 0;
      if (lines[0].toLowerCase().includes('name')) startIndex = 1;

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(',');
        const name = cols[0]?.trim().replace(/"/g, '') || 'Unknown';
        const phone = cols[1]?.trim().replace(/"/g, '') || '';
        const city = cols[2]?.trim().replace(/"/g, '') || 'Unknown'; // Assuming Col 3 is City
        
        if (phone) {
          newContacts.push({
            id: `C-${Date.now()}-${i}`,
            name, phone, city,
            status: 'Pending',
            note: '',
            history: []
          });
        }
      }

      if (newContacts.length > 0) {
        if (window.confirm(`Imported ${newContacts.length} contacts. Append or Replace? OK to Append, Cancel to Replace.`)) {
             setContacts(prev => [...prev, ...newContacts]);
        } else {
             setContacts(newContacts);
             setActiveIndex(0);
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExport = () => {
    const headers = "Name,Phone,City,Status,Note,Last Called,Next FollowUp\n";
    const rows = contacts.map(c => 
      `"${c.name}","${c.phone}","${c.city}","${c.status}","${c.note}","${c.lastCalled || ''}","${c.nextFollowUp || ''}"`
    ).join("\n");
    const csvContent = "data:text/csv;charset=utf-8," + encodeURI(headers + rows);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", `dialer_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Call Logic ---

  const handleCall = () => {
    if (!activeContact) return;
    window.location.href = `tel:${activeContact.phone}`;
    setIsSessionActive(true);
  };

  const handleOutcome = (status: CallContact['status']) => {
    if (!activeContact) return;

    // Compulsory Notes Validation
    if (!activeContact.note || !activeContact.note.trim()) {
        alert("Please enter a note describing the conversation before selecting a status.");
        return;
    }

    if (status === 'Callback') {
        setIsCallbackModalOpen(true);
        return; 
    }

    updateContactStatus(status);
  };

  const saveCallback = () => {
      if (!callbackDate || !callbackTime) {
          alert("Please select date and time");
          return;
      }
      updateContactStatus('Callback', `${callbackDate}T${callbackTime}`);
      setIsCallbackModalOpen(false);
      setCallbackDate(''); setCallbackTime('');
  };

  const updateContactStatus = (status: CallContact['status'], nextFollowUp?: string) => {
    const updatedContacts = [...contacts];
    const timestamp = new Date().toLocaleString();
    
    // Create History Log
    const newLog: CallHistoryLog = {
        timestamp,
        status,
        note: activeContact.note
    };

    updatedContacts[activeIndex] = {
      ...activeContact,
      status,
      lastCalled: timestamp,
      nextFollowUp: nextFollowUp || activeContact.nextFollowUp,
      history: [newLog, ...(activeContact.history || [])], // Prepend new log
      note: '' // Clear current note after logging to history
    };
    setContacts(updatedContacts);

    // Auto-advance logic
    if (isSessionActive) {
       let nextIndex = -1;
       // Prioritize finding next 'Pending' contact
       for (let i = activeIndex + 1; i < contacts.length; i++) {
           if (contacts[i].status === 'Pending') {
               nextIndex = i;
               break;
           }
       }
       if (nextIndex !== -1) {
           setActiveIndex(nextIndex);
       } else {
           setIsSessionActive(false);
           // Optional: Alert end of list
       }
    }
  };

  const cancelNote = () => {
      if(!activeContact) return;
      const updated = [...contacts];
      updated[activeIndex] = { ...activeContact, note: '' };
      setContacts(updated);
  };

  // --- Message Logic ---

  const prepareMessage = (templateKey: keyof MessageTemplates) => {
      let text = templates[templateKey];
      text = text.replace('[Name]', activeContact.name);
      return text;
  };

  const sendWhatsApp = (type: 'NoAnswer' | 'Intro') => {
      if (!activeContact) return;
      const text = prepareMessage(type === 'NoAnswer' ? 'whatsappNoAnswer' : 'whatsappIntro');
      const cleanPhone = activeContact.phone.replace(/\D/g, '');
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const sendEmail = () => {
      if (!activeContact?.email) {
          alert("No email address for this contact.");
          return;
      }
      const subject = "Regarding your enquiry - OK BOZ"; // Could be templated too
      const body = prepareMessage('emailNoAnswer'); // Using No Answer template as body base
      window.location.href = `mailto:${activeContact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleClearAll = () => {
      if (window.confirm("Delete ALL contacts? This cannot be undone.")) {
          setContacts([]);
          setActiveIndex(0);
      }
  };

  const selectContact = (index: number) => {
      // Must map filtered index to real index
      const id = filteredContacts[index].id;
      const realIndex = contacts.findIndex(c => c.id === id);
      if (realIndex !== -1) setActiveIndex(realIndex);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 flex flex-col h-[calc(100vh-6rem)]">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
             <Phone className="w-8 h-8 text-emerald-600" /> Smart AutoDialer
          </h2>
          <p className="text-gray-500">Auto-dial, follow-up management, and instant messaging.</p>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setIsTemplateModalOpen(true)} className="bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-gray-50">
                <Settings className="w-4 h-4" /> Templates
            </button>
            <button onClick={() => setIsAddModalOpen(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm">
                <UserPlus className="w-4 h-4" /> Add Lead
            </button>
            <input type="file" ref={fileInputRef} accept=".csv" className="hidden" onChange={handleFileUpload} />
            <button onClick={() => fileInputRef.current?.click()} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm">
                <Upload className="w-4 h-4" /> Import
            </button>
        </div>
      </div>

      {/* Dashboard Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
          
          {/* Today's Focus Card */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-5 text-white shadow-lg flex flex-col relative overflow-hidden cursor-pointer" onClick={() => { setFilterDateType('Today'); }}>
              <div className="relative z-10">
                  <h3 className="font-bold flex items-center gap-2 text-indigo-100 mb-4">
                      <Calendar className="w-5 h-5" /> Today's Focus
                  </h3>
                  <div className="flex justify-between items-end">
                      <div>
                          <p className="text-4xl font-bold">{stats.todaysFollowUps.length}</p>
                          <p className="text-sm text-indigo-200">Follow-ups Due Today</p>
                      </div>
                      <div className="text-right">
                          <p className="text-2xl font-bold">{stats.total - stats.completed}</p>
                          <p className="text-sm text-indigo-200">Total Pending</p>
                      </div>
                  </div>
              </div>
              <div className="absolute right-0 bottom-0 opacity-10">
                  <BarChart3 className="w-32 h-32 text-white" />
              </div>
          </div>

          {/* Outcome Chart */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center">
              <div className="flex-1 h-32">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={25} outerRadius={40} paddingAngle={5} dataKey="value">
                              {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                      </PieChart>
                  </ResponsiveContainer>
              </div>
              <div className="flex-1 text-sm space-y-1">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Interested ({stats.interested})</div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Callback ({stats.callback})</div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div> Not Intr ({stats.notInterested})</div>
              </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center gap-4">
              <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm font-medium">Completion</span>
                  <span className="text-emerald-600 font-bold">{stats.progress}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full transition-all duration-500" style={{ width: `${stats.progress}%` }}></div>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                  <span>{stats.completed} Done</span>
                  <span>{stats.total} Total</span>
              </div>
          </div>
      </div>

      {/* Workspace */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
          
          {/* Active Caller Card */}
          <div className="lg:w-1/3 flex flex-col">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-lg flex-1 flex flex-col overflow-hidden relative">
                  <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
                  
                  {activeContact ? (
                      <div className="p-6 flex-1 flex flex-col overflow-y-auto">
                          <div className="flex justify-between items-start mb-6">
                              <div>
                                  <span className="inline-block px-2 py-1 rounded bg-gray-100 text-gray-500 text-xs font-bold mb-2">
                                      #{activeIndex + 1} / {contacts.length}
                                  </span>
                                  <h3 className="text-3xl font-bold text-gray-900 leading-tight flex items-center gap-2">
                                      {activeContact.name}
                                      <button 
                                        onClick={() => handleEditContact(activeContact)}
                                        className="text-gray-400 hover:text-blue-500 transition-colors"
                                        title="Edit Contact"
                                      >
                                          <Edit2 className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteContact(activeContact.id)}
                                        className="text-gray-400 hover:text-red-500 transition-colors"
                                        title="Delete Contact"
                                      >
                                          <Trash2 className="w-4 h-4" />
                                      </button>
                                  </h3>
                                  <p className="text-lg text-gray-500 font-mono mt-1">{activeContact.phone}</p>
                                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-400">
                                      <MapPin className="w-3 h-3" /> {activeContact.city || 'Unknown City'}
                                  </div>
                              </div>
                              <div className={`w-3 h-3 rounded-full shadow-sm ${activeContact.status === 'Pending' ? 'bg-orange-400' : 'bg-green-500'}`}></div>
                          </div>

                          {/* Call Button */}
                          <button 
                              onClick={handleCall}
                              className="w-full py-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all flex flex-col items-center justify-center gap-1 mb-6 group"
                          >
                              <Phone className="w-8 h-8 fill-current group-hover:scale-110 transition-transform" />
                              <span className="text-lg font-bold tracking-wide">DIAL NOW</span>
                          </button>

                          {/* Outcome Actions */}
                          <div className="space-y-4">
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Outcome & Next Step</p>
                              <div className="grid grid-cols-2 gap-3">
                                  <button onClick={() => handleOutcome('Interested')} className="py-2.5 bg-green-50 text-green-700 font-bold rounded-xl border border-green-200 hover:bg-green-100 flex items-center justify-center gap-2">
                                      <CheckCircle className="w-4 h-4" /> Interested
                                  </button>
                                  <button onClick={() => handleOutcome('Callback')} className="py-2.5 bg-blue-50 text-blue-700 font-bold rounded-xl border border-blue-200 hover:bg-blue-100 flex items-center justify-center gap-2">
                                      <Clock className="w-4 h-4" /> Callback
                                  </button>
                                  <button onClick={() => handleOutcome('No Answer')} className="py-2.5 bg-orange-50 text-orange-700 font-bold rounded-xl border border-orange-200 hover:bg-orange-100 flex items-center justify-center gap-2">
                                      <AlertCircle className="w-4 h-4" /> No Ans
                                  </button>
                                  <button onClick={() => handleOutcome('Not Interested')} className="py-2.5 bg-red-50 text-red-700 font-bold rounded-xl border border-red-200 hover:bg-red-100 flex items-center justify-center gap-2">
                                      <XCircle className="w-4 h-4" /> Not Intr.
                                  </button>
                              </div>
                          </div>

                          {/* Auto Messages (Only visible if No Answer or manually triggered) */}
                          <div className="mt-6 pt-4 border-t border-gray-100">
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</p>
                              <div className="flex gap-2">
                                  <button onClick={() => sendWhatsApp('NoAnswer')} className="flex-1 py-2 bg-green-100 text-green-700 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-green-200 transition-colors">
                                      <MessageSquare className="w-3 h-3" /> WA: No Ans
                                  </button>
                                  <button onClick={() => sendWhatsApp('Intro')} className="flex-1 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-indigo-200 transition-colors">
                                      <MessageSquare className="w-3 h-3" /> WA: Intro
                                  </button>
                                  <button onClick={sendEmail} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors">
                                      <Mail className="w-3 h-3" /> Email
                                  </button>
                              </div>
                          </div>

                          {/* Notes */}
                          <div className="mt-4 pt-4 border-t border-gray-100">
                              <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-bold text-gray-400 uppercase">
                                    Current Note <span className="text-red-500">*</span>
                                </label>
                                <div className="flex gap-2">
                                    <button onClick={cancelNote} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                                        <X className="w-3 h-3" /> Clear
                                    </button>
                                </div>
                              </div>
                              <textarea 
                                  value={activeContact.note}
                                  onChange={(e) => {
                                      const updated = [...contacts];
                                      updated[activeIndex] = { ...activeContact, note: e.target.value };
                                      setContacts(updated);
                                  }}
                                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-20"
                                  placeholder="Describe conversation (compulsory for status update)..."
                              />
                          </div>

                          {/* Conversation History */}
                          {activeContact.history && activeContact.history.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-gray-100">
                                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Conversation History</p>
                                  <div className="space-y-3 max-h-40 overflow-y-auto custom-scrollbar">
                                      {activeContact.history.map((log, i) => (
                                          <div key={i} className="bg-gray-50 p-3 rounded-lg text-xs border border-gray-100">
                                              <div className="flex justify-between items-center mb-1 text-gray-500">
                                                  <span>{log.timestamp}</span>
                                                  <span className="font-bold">{log.status}</span>
                                              </div>
                                              <p className="text-gray-700">{log.note}</p>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          )}
                      </div>
                  ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400">
                          <FileSpreadsheet className="w-16 h-16 mb-4 opacity-50" />
                          <h3 className="text-lg font-bold text-gray-600 mb-2">List Empty</h3>
                          <p className="text-sm">Import CSV or add manually to start.</p>
                      </div>
                  )}
              </div>
          </div>

          {/* Right: List View */}
          <div className="lg:w-2/3 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-3 border-b border-gray-100 bg-gray-50 flex flex-wrap gap-3 items-center">
                  <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input 
                          type="text" 
                          placeholder="Search list..." 
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                  </div>
                  
                  {/* Date Filter */}
                  <div className="flex bg-white rounded-lg border border-gray-200 p-1">
                      <button onClick={() => setFilterDateType('All')} className={`px-3 py-1 text-xs rounded transition-colors ${filterDateType === 'All' ? 'bg-gray-100 font-bold text-gray-800' : 'text-gray-500'}`}>All</button>
                      <button onClick={() => setFilterDateType('Today')} className={`px-3 py-1 text-xs rounded transition-colors ${filterDateType === 'Today' ? 'bg-emerald-50 font-bold text-emerald-700' : 'text-gray-500'}`}>Today</button>
                      <button onClick={() => setFilterDateType('Month')} className={`px-3 py-1 text-xs rounded transition-colors ${filterDateType === 'Month' ? 'bg-blue-50 font-bold text-blue-700' : 'text-gray-500'}`}>Month</button>
                  </div>
                  {filterDateType === 'Month' && (
                      <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs" />
                  )}

                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white">
                      <option value="All">All Status</option>
                      <option value="Pending">Pending</option>
                      <option value="Callback">Callback</option>
                      <option value="Interested">Interested</option>
                  </select>
                  <select value={filterCity} onChange={(e) => setFilterCity(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white">
                      <option value="All">All Cities</option>
                      {cities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button onClick={handleExport} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-100" title="Export CSV">
                      <Download className="w-4 h-4 text-gray-600" />
                  </button>
                  <button onClick={handleClearAll} className="p-2 border border-gray-200 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                  </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                  <table className="w-full text-left text-sm">
                      <thead className="bg-white text-gray-500 font-semibold border-b border-gray-200 sticky top-0 z-10">
                          <tr>
                              <th className="px-6 py-3 w-12 text-center">#</th>
                              <th className="px-6 py-3">Name / Location</th>
                              <th className="px-6 py-3">Status</th>
                              <th className="px-6 py-3">Next Action</th>
                              <th className="px-6 py-3 text-right">Action</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {filteredContacts.map((contact, idx) => {
                              const isSelected = activeContact?.id === contact.id;
                              const isToday = contact.nextFollowUp && contact.nextFollowUp.startsWith(new Date().toISOString().split('T')[0]);
                              return (
                                  <tr 
                                      key={contact.id} 
                                      className={`hover:bg-gray-50 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50/50' : ''} ${isToday ? 'bg-yellow-50/30' : ''}`}
                                      onClick={() => selectContact(idx)}
                                  >
                                      <td className="px-6 py-4 text-center text-gray-400 text-xs">
                                          {isSelected ? <Play className="w-3 h-3 text-emerald-500 fill-current mx-auto"/> : idx + 1}
                                      </td>
                                      <td className="px-6 py-4">
                                          <div className="font-medium text-gray-900">{contact.name}</div>
                                          <div className="text-xs text-gray-500">{contact.city} • {contact.phone}</div>
                                      </td>
                                      <td className="px-6 py-4">
                                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                              contact.status === 'Interested' ? 'bg-green-100 text-green-700' :
                                              contact.status === 'Callback' ? 'bg-blue-100 text-blue-700' :
                                              contact.status === 'No Answer' ? 'bg-orange-100 text-orange-700' :
                                              'bg-gray-100 text-gray-600'
                                          }`}>
                                              {contact.status}
                                          </span>
                                      </td>
                                      <td className="px-6 py-4 text-xs">
                                          <div className="flex flex-col">
                                              {contact.lastCalled && (
                                                  <span className="text-[10px] text-gray-400 mb-1">
                                                      Called: {new Date(contact.lastCalled).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                  </span>
                                              )}
                                              {contact.nextFollowUp ? (
                                                  <span className={`flex items-center gap-1 ${isToday ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                                                      <Calendar className="w-3 h-3" /> {new Date(contact.nextFollowUp).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}
                                                  </span>
                                              ) : '-'}
                                          </div>
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                          {isSelected ? (
                                              <span className="text-xs font-bold text-emerald-600 animate-pulse">ACTIVE</span>
                                          ) : (
                                              <div className="flex justify-end gap-1">
                                                  <button 
                                                      onClick={(e) => { e.stopPropagation(); handleEditContact(contact); }}
                                                      className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
                                                      title="Edit"
                                                  >
                                                      <Edit2 className="w-3.5 h-3.5" />
                                                  </button>
                                                  <button 
                                                      onClick={(e) => { e.stopPropagation(); handleDeleteContact(contact.id); }}
                                                      className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                                                      title="Delete"
                                                  >
                                                      <Trash2 className="w-3.5 h-3.5" />
                                                  </button>
                                              </div>
                                          )}
                                      </td>
                                  </tr>
                              );
                          })}
                          {filteredContacts.length === 0 && (
                              <tr><td colSpan={5} className="py-10 text-center text-gray-400">No contacts found.</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>

      {/* Modals */}
      
      {/* 1. Add Contact Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                 <h3 className="font-bold text-gray-800">Add Lead Manually</h3>
                 <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
              </div>
              <form onSubmit={handleManualAdd} className="p-6 space-y-4">
                 <input className="w-full px-3 py-2 border rounded-lg" placeholder="Name" value={manualContact.name} onChange={e => setManualContact({...manualContact, name: e.target.value})} required />
                 <input className="w-full px-3 py-2 border rounded-lg" placeholder="Phone" value={manualContact.phone} onChange={e => setManualContact({...manualContact, phone: e.target.value})} required />
                 <input className="w-full px-3 py-2 border rounded-lg" placeholder="Email (Optional)" value={manualContact.email} onChange={e => setManualContact({...manualContact, email: e.target.value})} />
                 <input className="w-full px-3 py-2 border rounded-lg" placeholder="City" value={manualContact.city} onChange={e => setManualContact({...manualContact, city: e.target.value})} />
                 <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-lg shadow-sm">Add to List</button>
              </form>
           </div>
        </div>
      )}

      {/* 2. Template Modal */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                 <h3 className="font-bold text-gray-800">Configure Message Templates</h3>
                 <button onClick={() => setIsTemplateModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
              </div>
              <div className="p-6 space-y-4">
                 <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">WhatsApp (No Answer)</label>
                    <textarea className="w-full p-2 border rounded-lg text-sm h-20" value={templates.whatsappNoAnswer} onChange={e => setTemplates({...templates, whatsappNoAnswer: e.target.value})} />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Email Body (No Answer)</label>
                    <textarea className="w-full p-2 border rounded-lg text-sm h-20" value={templates.emailNoAnswer} onChange={e => setTemplates({...templates, emailNoAnswer: e.target.value})} />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">WhatsApp (Intro)</label>
                    <textarea className="w-full p-2 border rounded-lg text-sm h-20" value={templates.whatsappIntro} onChange={e => setTemplates({...templates, whatsappIntro: e.target.value})} />
                 </div>
                 <div className="flex justify-end pt-2">
                    <button onClick={() => setIsTemplateModalOpen(false)} className="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold text-sm">Save Templates</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* 3. Callback Scheduler Modal */}
      {isCallbackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                 <h3 className="font-bold text-gray-800">Schedule Callback</h3>
                 <button onClick={() => setIsCallbackModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
              </div>
              <div className="p-6 space-y-4">
                 <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Date</label>
                    <input type="date" className="w-full p-2 border rounded-lg" value={callbackDate} onChange={e => setCallbackDate(e.target.value)} />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Time</label>
                    <input type="time" className="w-full p-2 border rounded-lg" value={callbackTime} onChange={e => setCallbackTime(e.target.value)} />
                 </div>
                 <button onClick={saveCallback} className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-lg shadow-sm">Set Reminder</button>
              </div>
           </div>
        </div>
      )}

      {/* 4. Edit Contact Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                 <h3 className="font-bold text-gray-800">Edit Contact Details</h3>
                 <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
              </div>
              <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input className="w-full px-3 py-2 border rounded-lg" value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})} required />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input className="w-full px-3 py-2 border rounded-lg" value={editFormData.phone} onChange={e => setEditFormData({...editFormData, phone: e.target.value})} required />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input className="w-full px-3 py-2 border rounded-lg" value={editFormData.email} onChange={e => setEditFormData({...editFormData, email: e.target.value})} />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input className="w-full px-3 py-2 border rounded-lg" value={editFormData.city} onChange={e => setEditFormData({...editFormData, city: e.target.value})} />
                 </div>
                 <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-lg shadow-sm">Save Changes</button>
              </form>
           </div>
        </div>
      )}

    </div>
  );
};

export default AutoDialer;
