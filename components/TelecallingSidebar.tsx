
import React, { useState, useEffect, useMemo } from 'react';
import { Phone, Search, X, MessageSquare, History, User, Clock, ChevronRight, Save, PhoneCall, PhoneForwarded, MessageCircle, AlertCircle, Calendar } from 'lucide-react';
import { Enquiry, HistoryLog } from '../types';

interface TelecallingSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const TelecallingSidebar: React.FC<TelecallingSidebarProps> = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [callNote, setCallNote] = useState('');
  const [callOutcome, setCallOutcome] = useState('Interested');
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const loadEnquiries = () => {
      try {
        const saved = localStorage.getItem('global_enquiries_data');
        if (saved) {
          setEnquiries(JSON.parse(saved));
        }
      } catch (e) {
        console.error("Failed to load enquiries", e);
      }
    };
    loadEnquiries();
    window.addEventListener('storage', loadEnquiries);
    return () => window.removeEventListener('storage', loadEnquiries);
  }, []);

  const filteredEnquiries = useMemo(() => {
    if (!searchTerm) return enquiries.slice(0, 10).filter(e => e.status !== 'Converted' && e.status !== 'Closed');
    return enquiries.filter(e => 
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      e.phone.includes(searchTerm)
    ).slice(0, 20);
  }, [enquiries, searchTerm]);

  const handleSaveNote = () => {
    if (!selectedEnquiry || !callNote.trim()) return;

    const newLog: HistoryLog = {
      id: Date.now(),
      type: 'Call',
      message: callNote,
      date: new Date().toISOString(),
      outcome: callOutcome
    };

    const updatedEnquiry = {
      ...selectedEnquiry,
      history: [newLog, ...selectedEnquiry.history],
      status: callOutcome === 'Closed' ? 'Closed' : (callOutcome === 'Converted' ? 'Converted' : selectedEnquiry.status)
    };

    try {
      const allEnquiries = enquiries.map(e => e.id === selectedEnquiry.id ? updatedEnquiry : e);
      localStorage.setItem('global_enquiries_data', JSON.stringify(allEnquiries));
      window.dispatchEvent(new Event('storage'));
      setSelectedEnquiry(updatedEnquiry);
      setCallNote('');
      alert("Call note saved successfully!");
    } catch (e) {
      console.error("Failed to save call note", e);
    }
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/91${cleanPhone.length === 10 ? cleanPhone : phone}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-[60] w-80 bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-800 flex flex-col animate-in slide-in-from-right duration-300">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-emerald-600 text-white">
        <div className="flex items-center gap-2">
          <PhoneCall className="w-5 h-5" />
          <h2 className="font-bold">Telecalling Workspace</h2>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-emerald-700 rounded-lg transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {!selectedEnquiry ? (
          <div className="p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search name or mobile..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Recent Lead / Enquiries</h3>
              {filteredEnquiries.length > 0 ? (
                filteredEnquiries.map((enq) => (
                  <button
                    key={enq.id}
                    onClick={() => setSelectedEnquiry(enq)}
                    className="w-full text-left p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-sm text-gray-800 dark:text-gray-100">{enq.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        enq.priority === 'Hot' ? 'bg-red-100 text-red-600' : 
                        enq.priority === 'Warm' ? 'bg-orange-100 text-orange-600' : 
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {enq.priority || 'Cold'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <Phone className="w-3 h-3" />
                      <span>{enq.phone}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px]">
                      <span className="text-gray-400">{new Date(enq.createdAt).toLocaleDateString()}</span>
                      <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-emerald-500 transition-colors" />
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No matching leads found</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="p-4 bg-gray-50 dark:bg-gray-850 border-b border-gray-200 dark:border-gray-800">
              <button 
                onClick={() => setSelectedEnquiry(null)}
                className="text-xs font-medium text-emerald-600 mb-3 flex items-center gap-1 hover:underline"
              >
                ← Back to List
              </button>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-black text-lg text-gray-800 dark:text-white leading-tight">{selectedEnquiry.name}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                    <Phone className="w-3 h-3" /> {selectedEnquiry.phone}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleCall(selectedEnquiry.phone)}
                    className="p-2 bg-emerald-500 text-white rounded-full shadow-lg shadow-emerald-900/20 hover:scale-110 active:scale-95 transition-all"
                  >
                    <PhoneForwarded className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleWhatsApp(selectedEnquiry.phone)}
                    className="p-2 bg-green-500 text-white rounded-full shadow-lg shadow-green-900/20 hover:scale-110 active:scale-95 transition-all"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Category</p>
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-200">{selectedEnquiry.enquiryCategory || '-'}</p>
                </div>
                <div className="p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Trip Type</p>
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-200">{selectedEnquiry.tripType || '-'}</p>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-4 flex-1">
              <div className="flex gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                <button 
                  onClick={() => setShowHistory(false)}
                  className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-bold transition-all ${!showHistory ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                >
                  <MessageSquare className="w-3 h-3" /> Log Call
                </button>
                <button 
                  onClick={() => setShowHistory(true)}
                  className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-bold transition-all ${showHistory ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                >
                  <History className="w-3 h-3" /> History
                </button>
              </div>

              {!showHistory ? (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Quick Note</label>
                    <textarea 
                      rows={3}
                      placeholder="What was the discussion about?"
                      className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                      value={callNote}
                      onChange={(e) => setCallNote(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Call Outcome</label>
                    <select 
                      className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none font-bold text-gray-700 dark:text-gray-200"
                      value={callOutcome}
                      onChange={(e) => setCallOutcome(e.target.value)}
                    >
                      <option value="Interested">Interested</option>
                      <option value="Warm">Warm / Followup</option>
                      <option value="Cold">Cold / Not Interested</option>
                      <option value="Converted">Converted to Booking</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>

                  {callOutcome === 'Warm' && (
                    <div className="animate-in slide-in-from-top-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Follow-up Date</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="date" className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-200 outline-none" />
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={handleSaveNote}
                    disabled={!callNote.trim()}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
                  >
                    <Save className="w-4 h-4" /> Save Call & Note
                  </button>
                </div>
              ) : (
                <div className="space-y-3 animate-in fade-in duration-300 overflow-y-auto max-h-[400px] pr-1 custom-scrollbar">
                  {selectedEnquiry.history.length > 0 ? (
                    selectedEnquiry.history.map((log) => (
                      <div key={log.id} className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-750 shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase ${
                            log.type === 'Call' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {log.type}
                          </span>
                          <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {new Date(log.date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 dark:text-gray-300">{log.message}</p>
                        {log.outcome && (
                           <p className="mt-2 text-[10px] font-bold text-emerald-600">Outcome: {log.outcome}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-xs text-gray-400">No interaction history found</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-850">
        <div className="flex items-center gap-3 text-xs">
          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
            <User className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-gray-700 dark:text-gray-200">Boz Caller ID</p>
            <p className="text-gray-400">Ready for next call</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelecallingSidebar;
