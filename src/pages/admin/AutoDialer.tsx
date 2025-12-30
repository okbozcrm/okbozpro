
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Phone, PhoneForwarded, PhoneMissed, PhoneIncoming, PhoneOutgoing,
  Search, Filter, History, User, Building2, MapPin, Calendar, Clock,
  CheckCircle, XCircle, MoreVertical, Star
} from 'lucide-react';
import { UserRole } from '../../types';

interface Contact {
  id: string;
  name: string;
  phone: string;
  type: 'Lead' | 'Staff' | 'Vendor';
  role?: string;
  company?: string;
  lastCall?: string;
  status?: string;
  history?: Array<{
    timestamp: string;
    status: string; // 'Connected' | 'Missed' | 'Voicemail'
    duration?: string;
    note?: string;
  }>;
}

const AutoDialer: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [callStatus, setCallStatus] = useState<'Idle' | 'Calling' | 'Connected'>('Idle');
  const [callDuration, setCallDuration] = useState(0);

  // Load Contacts from LocalStorage
  useEffect(() => {
    const loadData = () => {
        let allContacts: Contact[] = [];

        // Leads
        try {
            const leads = JSON.parse(localStorage.getItem('leads_data') || '[]');
            allContacts = [...allContacts, ...leads.map((l: any) => ({
                id: l.id, name: l.name, phone: l.phone, type: 'Lead', role: 'Potential Franchise', status: l.status, history: []
            }))];
        } catch (e) {}

        // Staff
        try {
            const staff = JSON.parse(localStorage.getItem('staff_data') || '[]');
            allContacts = [...allContacts, ...staff.map((s: any) => ({
                id: s.id, name: s.name, phone: s.phone, type: 'Staff', role: s.role, status: s.status, history: []
            }))];
        } catch (e) {}

        // Vendors
        try {
            const vendors = JSON.parse(localStorage.getItem('vendor_data') || '[]');
            allContacts = [...allContacts, ...vendors.map((v: any) => ({
                id: v.id, name: v.ownerName, phone: v.phone, type: 'Vendor', role: 'Transport Partner', status: v.status, history: []
            }))];
        } catch (e) {}

        setContacts(allContacts);
    };
    loadData();
  }, []);

  // Filter Logic
  const filteredContacts = useMemo(() => {
      return contacts.filter(c => {
          const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm);
          const matchesType = filterType === 'All' || c.type === filterType;
          return matchesSearch && matchesType;
      });
  }, [contacts, searchTerm, filterType]);

  const handleCall = () => {
      if (!activeContact) return;
      setCallStatus('Calling');
      
      // Simulate connection
      setTimeout(() => {
          setCallStatus('Connected');
          // In a real app, this would integrate with Twilio/Exotel
          window.location.href = `tel:${activeContact.phone}`;
      }, 1500);
  };

  const endCall = () => {
      setCallStatus('Idle');
      if (activeContact) {
          // Add to history (local state for demo)
          const newHistory = {
              timestamp: new Date().toLocaleString(),
              status: 'Connected',
              duration: `${Math.floor(callDuration / 60)}m ${callDuration % 60}s`,
              note: 'Auto-logged call'
          };
          
          const updatedContact = { 
              ...activeContact, 
              history: [newHistory, ...(activeContact.history || [])] 
          };
          
          setActiveContact(updatedContact);
          setContacts(prev => prev.map(c => c.id === activeContact.id ? updatedContact : c));
      }
      setCallDuration(0);
  };

  // Timer for call duration
  useEffect(() => {
      let interval: any;
      if (callStatus === 'Connected') {
          interval = setInterval(() => {
              setCallDuration(prev => prev + 1);
          }, 1000);
      }
      return () => clearInterval(interval);
  }, [callStatus]);

  const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col md:flex-row gap-6">
        {/* Left List */}
        <div className="w-full md:w-1/3 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <PhoneForwarded className="w-5 h-5 text-emerald-600" /> Auto Dialer
                    </h3>
                    <div className="flex bg-white rounded-lg p-1 border border-gray-200">
                        {['All', 'Lead', 'Staff'].map(t => (
                            <button 
                                key={t} 
                                onClick={() => setFilterType(t)}
                                className={`px-2 py-1 text-xs font-bold rounded ${filterType === t ? 'bg-emerald-50 text-emerald-600' : 'text-gray-500'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input 
                        placeholder="Search contacts..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
                {filteredContacts.map(contact => (
                    <div 
                        key={contact.id} 
                        onClick={() => setActiveContact(contact)}
                        className={`p-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-all ${activeContact?.id === contact.id ? 'bg-emerald-50 border-l-4 border-l-emerald-500' : ''}`}
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-bold text-gray-800 text-sm">{contact.name}</h4>
                                <p className="text-xs text-gray-500">{contact.role}</p>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                contact.type === 'Lead' ? 'bg-blue-50 text-blue-600' : 
                                contact.type === 'Staff' ? 'bg-purple-50 text-purple-600' : 
                                'bg-orange-50 text-orange-600'
                            }`}>
                                {contact.type}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                            <Phone className="w-3 h-3" /> {contact.phone}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Right Panel - Active Call / Details */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
            {activeContact ? (
                <>
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xl">
                                {activeContact.name.charAt(0)}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">{activeContact.name}</h2>
                                <p className="text-sm text-gray-500">{activeContact.role} • {activeContact.phone}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"><Star className="w-5 h-5" /></button>
                            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"><MoreVertical className="w-5 h-5" /></button>
                        </div>
                    </div>

                    <div className="flex-1 p-8 flex flex-col items-center justify-center">
                        {callStatus === 'Idle' ? (
                            <div className="text-center space-y-6">
                                <div className="w-32 h-32 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-emerald-100">
                                    <Phone className="w-12 h-12 text-emerald-600" />
                                </div>
                                <button 
                                    onClick={handleCall}
                                    className="px-10 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-lg shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center gap-3 mx-auto"
                                >
                                    <Phone className="w-6 h-6 fill-current" /> Call Now
                                </button>
                                <p className="text-gray-400 text-sm font-medium">Ready to dial {activeContact.phone}</p>
                            </div>
                        ) : (
                            <div className="text-center space-y-8 animate-in zoom-in duration-300">
                                <div className="relative">
                                    <div className={`w-40 h-40 rounded-full flex items-center justify-center mx-auto border-4 ${callStatus === 'Connected' ? 'bg-green-50 border-green-500 text-green-600' : 'bg-yellow-50 border-yellow-500 text-yellow-600 animate-pulse'}`}>
                                        <Phone className="w-16 h-16 fill-current" />
                                    </div>
                                    {callStatus === 'Connected' && (
                                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-1 rounded-full text-sm font-mono">
                                            {formatTime(callDuration)}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-800">{callStatus === 'Calling' ? 'Calling...' : 'Connected'}</h3>
                                    <p className="text-gray-500 mt-1">{activeContact.name}</p>
                                </div>
                                <button 
                                    onClick={endCall}
                                    className="px-10 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold text-lg shadow-xl transition-all flex items-center gap-3 mx-auto"
                                >
                                    <PhoneMissed className="w-6 h-6" /> End Call
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="p-6 border-t border-gray-100 bg-gray-50 h-1/3 overflow-y-auto">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <History className="w-4 h-4" /> Call History
                        </h4>
                        <div className="space-y-3">
                            {(activeContact.history || []).length > 0 ? (
                                activeContact.history!.map((log, idx) => (
                                    <div key={idx} className="bg-white p-3 rounded-xl border border-gray-100 flex justify-between items-center shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-full ${log.status === 'Connected' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                                {log.status === 'Connected' ? <PhoneIncoming className="w-4 h-4" /> : <PhoneMissed className="w-4 h-4" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-700">{log.status}</p>
                                                <p className="text-xs text-gray-400">{log.timestamp}</p>
                                            </div>
                                        </div>
                                        {log.duration && <span className="text-xs font-mono font-medium text-gray-600">{log.duration}</span>}
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-gray-400 text-xs py-4">No recent history.</p>
                            )}
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                        <PhoneForwarded className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">Select a Contact</h3>
                    <p className="text-gray-500 mt-2 max-w-xs">Choose a lead, staff member, or vendor from the list to start dialing.</p>
                </div>
            )}
        </div>
    </div>
  );
};

export default AutoDialer;
