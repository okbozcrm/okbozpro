
import React, { useState, useEffect } from 'react';
import { Mail, Send, Users, Filter, Clock, CheckCircle, AlertCircle, RefreshCcw, ChevronRight, Target, Megaphone, Sparkles, Search, User, CheckSquare, Square, Building2, UserPlus, AtSign } from 'lucide-react';
import { generateGeminiResponse } from '../../services/geminiService';

interface Campaign {
  id: string;
  subject: string;
  audience: string;
  sentCount: number;
  totalCount: number;
  status: 'Draft' | 'Sending' | 'Completed' | 'Failed';
  date: string;
}

interface Contact {
  id: string;
  name: string;
  email: string;
  type: string;
  selected: boolean;
}

const EmailMarketing: React.FC = () => {
  // Sender Details
  const [senderName, setSenderName] = useState('OK BOZ Admin');
  const [senderEmail, setSenderEmail] = useState('admin@okboz.com');

  // Content
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  
  // Modes
  const [sendMode, setSendMode] = useState<'Bulk' | 'Individual'>('Bulk');

  // Audience - Bulk
  const [audienceSegment, setAudienceSegment] = useState('All Customers');
  
  // Audience - Individual
  const [individualName, setIndividualName] = useState('');
  const [individualEmail, setIndividualEmail] = useState('');

  // Status
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Contacts State for Manual Selection (Bulk)
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchContact, setSearchContact] = useState('');
  const [contactTypeFilter, setContactTypeFilter] = useState('All');

  // Mock Database Count
  const TOTAL_CUSTOMERS = 20450;
  const [targetCount, setTargetCount] = useState(TOTAL_CUSTOMERS);

  const [campaigns, setCampaigns] = useState<Campaign[]>([
    { id: '1', subject: 'New Year Sale - 50% Off', audience: 'All Customers', sentCount: 20450, totalCount: 20450, status: 'Completed', date: '2025-01-01' },
    { id: '2', subject: 'Exclusive Franchise Offer', audience: 'High Value Leads', sentCount: 1200, totalCount: 1200, status: 'Completed', date: '2025-02-15' }
  ]);

  // Load potential contacts from Leads, Staff & Corporate on mount
  useEffect(() => {
    const loadContacts = () => {
        const leadsStr = localStorage.getItem('leads_data');
        const staffStr = localStorage.getItem('staff_data');
        const corpsStr = localStorage.getItem('corporate_accounts');
        
        let loadedContacts: Contact[] = [];

        if (leadsStr) {
            try {
                const leads = JSON.parse(leadsStr);
                loadedContacts = [...loadedContacts, ...leads.map((l: any) => ({
                    id: l.id, name: l.name, email: l.email || 'No Email', type: 'Lead', selected: false
                }))];
            } catch (e) {}
        }

        if (staffStr) {
            try {
                const staff = JSON.parse(staffStr);
                loadedContacts = [...loadedContacts, ...staff.map((s: any) => ({
                    id: s.id, name: s.name, email: s.email || 'No Email', type: 'Staff', selected: false
                }))];
            } catch (e) {}
        }

        if (corpsStr) {
            try {
                const corps = JSON.parse(corpsStr);
                loadedContacts = [...loadedContacts, ...corps.map((c: any) => ({
                    id: c.id, name: c.companyName, email: c.email, type: 'Franchise', selected: false
                }))];
            } catch (e) {}
        }

        // Filter out those without valid emails
        loadedContacts = loadedContacts.filter(c => c.email && c.email !== 'No Email' && c.email.includes('@'));

        // If empty, add some mocks for demo
        if (loadedContacts.length === 0) {
            loadedContacts = [
                { id: 'm1', name: 'Alice Walker', email: 'alice@example.com', type: 'Customer', selected: false },
                { id: 'm2', name: 'Bob Stone', email: 'bob@example.com', type: 'Subscriber', selected: false },
                { id: 'm3', name: 'Charlie Day', email: 'charlie@example.com', type: 'Lead', selected: false },
                { id: 'm4', name: 'Dana White', email: 'dana@example.com', type: 'Staff', selected: false },
                { id: 'm5', name: 'Evan Peters', email: 'evan@example.com', type: 'Lead', selected: false },
                { id: 'm6', name: 'Global Franchise', email: 'franchise@example.com', type: 'Franchise', selected: false },
            ];
        }

        setContacts(loadedContacts);
    };
    loadContacts();
  }, []);

  // Calculate audience size based on segment or manual selection
  useEffect(() => {
    if (sendMode === 'Individual') {
        setTargetCount(individualEmail ? 1 : 0);
        return;
    }

    switch(audienceSegment) {
        case 'All Customers': setTargetCount(TOTAL_CUSTOMERS); break;
        case 'Active Subscribers': setTargetCount(15200); break;
        case 'Inactive (>30 days)': setTargetCount(4500); break;
        case 'VIP Clients': setTargetCount(750); break;
        case 'Manual Selection': 
            setTargetCount(contacts.filter(c => c.selected).length); 
            break;
        default: setTargetCount(TOTAL_CUSTOMERS);
    }
  }, [audienceSegment, contacts, sendMode, individualEmail]);

  const handleAiDraft = async () => {
    if (!subject) {
        alert("Please enter a subject or topic first.");
        return;
    }
    setIsGenerating(true);
    try {
        const prompt = `Write a marketing email body for a subject: "${subject}". 
        Audience: ${sendMode === 'Individual' ? 'A specific individual named ' + (individualName || 'Client') : audienceSegment}. 
        Sender: ${senderName}.
        Tone: Professional yet exciting. 
        Keep it concise.`;
        
        const response = await generateGeminiResponse(prompt);
        setBody(response);
    } catch (e) {
        console.error(e);
    }
    setIsGenerating(false);
  };

  const handleSend = () => {
    if (!senderName || !senderEmail) {
        alert("Please enter Sender Name and Email.");
        return;
    }
    if (!subject || !body) {
        alert("Please complete the email content.");
        return;
    }
    
    // --- Individual Mode ---
    if (sendMode === 'Individual') {
        if (!individualEmail) {
            alert("Please enter a recipient email.");
            return;
        }
        
        setIsSending(true);
        // Simulate quick send
        setTimeout(() => {
            const newCampaign: Campaign = {
                id: Date.now().toString(),
                subject,
                audience: `Single: ${individualName || individualEmail}`,
                sentCount: 1,
                totalCount: 1,
                status: 'Completed',
                date: new Date().toISOString().split('T')[0]
            };
            setCampaigns([newCampaign, ...campaigns]);
            setIsSending(false);
            alert(`Email sent to ${individualEmail} successfully!`);
            
            // Cleanup
            setSubject('');
            setBody('');
            setIndividualName('');
            setIndividualEmail('');
        }, 1500);
        return;
    }

    // --- Bulk Mode ---
    if (audienceSegment === 'Manual Selection' && targetCount === 0) {
        alert("Please select at least one recipient.");
        return;
    }

    if (!window.confirm(`Are you sure you want to send this to ${targetCount.toLocaleString()} people?`)) {
        return;
    }

    setIsSending(true);
    setProgress(0);

    // Simulate Batch Sending Process
    let sent = 0;
    const batchSize = audienceSegment === 'Manual Selection' ? Math.max(1, Math.floor(targetCount / 10)) : 500; 
    const interval = setInterval(() => {
        sent += batchSize;
        if (sent >= targetCount) {
            sent = targetCount;
            clearInterval(interval);
            setIsSending(false);
            
            const newCampaign: Campaign = {
                id: Date.now().toString(),
                subject,
                audience: audienceSegment === 'Manual Selection' ? `Manual (${targetCount})` : audienceSegment,
                sentCount: targetCount,
                totalCount: targetCount,
                status: 'Completed',
                date: new Date().toISOString().split('T')[0]
            };
            setCampaigns([newCampaign, ...campaigns]);
            alert("Campaign sent successfully!");
            setSubject('');
            setBody('');
            setProgress(0);
            
            if (audienceSegment === 'Manual Selection') {
                setContacts(prev => prev.map(c => ({ ...c, selected: false })));
            }
        }
        setProgress(Math.min(100, Math.round((sent / targetCount) * 100)));
    }, 200); 
  };

  // Manual Selection Handlers
  const toggleContact = (id: string) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, selected: !c.selected } : c));
  };

  const toggleAllVisible = () => {
    const visibleIds = filteredContacts.map(c => c.id);
    const allVisibleSelected = visibleIds.every(id => contacts.find(c => c.id === id)?.selected);
    
    setContacts(prev => prev.map(c => {
        if (visibleIds.includes(c.id)) {
            return { ...c, selected: !allVisibleSelected };
        }
        return c;
    }));
  };

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchContact.toLowerCase()) || 
                          c.email.toLowerCase().includes(searchContact.toLowerCase()) ||
                          c.type.toLowerCase().includes(searchContact.toLowerCase());
    const matchesType = contactTypeFilter === 'All' || c.type === contactTypeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-emerald-500" /> Email Centre
          </h2>
          <p className="text-gray-500 dark:text-gray-400">Manage bulk campaigns and individual communications</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Composer */}
        <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                
                {/* Sender Config */}
                <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-gray-100 dark:border-gray-700">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Sender Name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input 
                                type="text"
                                value={senderName}
                                onChange={(e) => setSenderName(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-gray-700 dark:text-white"
                                placeholder="Your Company Name"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Sender Email</label>
                        <div className="relative">
                            <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input 
                                type="email"
                                value={senderEmail}
                                onChange={(e) => setSenderEmail(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-gray-700 dark:text-white"
                                placeholder="info@company.com"
                            />
                        </div>
                    </div>
                </div>

                <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <Mail className="w-5 h-5 text-emerald-500" /> Compose Message
                </h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject Line</label>
                        <input 
                            type="text" 
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-gray-700 dark:text-white"
                            placeholder={sendMode === 'Individual' ? "Regarding your enquiry..." : "e.g. Summer Sale is Here!"}
                        />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Body</label>
                            <button 
                                onClick={handleAiDraft}
                                disabled={isGenerating || !subject}
                                className="text-xs flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-50"
                            >
                                <Sparkles className="w-3 h-3" /> {isGenerating ? 'Generating...' : 'Draft with AI'}
                            </button>
                        </div>
                        <textarea 
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            rows={12}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-gray-700 dark:text-white resize-y font-mono text-sm"
                            placeholder="Hi [Name], ..."
                        />
                    </div>
                </div>
            </div>
        </div>

        {/* Right: Audience & Actions */}
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col h-full">
                
                {/* Mode Toggle */}
                <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg mb-6">
                    <button
                        onClick={() => setSendMode('Bulk')}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${sendMode === 'Bulk' ? 'bg-white dark:bg-gray-600 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                    >
                        <Users className="w-4 h-4" /> Bulk Campaign
                    </button>
                    <button
                        onClick={() => setSendMode('Individual')}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${sendMode === 'Individual' ? 'bg-white dark:bg-gray-600 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                    >
                        <User className="w-4 h-4" /> Single Person
                    </button>
                </div>

                <div className="space-y-4 flex-1 flex flex-col">
                    
                    {/* BULK MODE UI */}
                    {sendMode === 'Bulk' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Audience Segment</label>
                                <select 
                                    value={audienceSegment}
                                    onChange={(e) => setAudienceSegment(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:text-white cursor-pointer"
                                >
                                    <option>All Customers</option>
                                    <option>Active Subscribers</option>
                                    <option>Inactive ({'>'}30 days)</option>
                                    <option>VIP Clients</option>
                                    <option>Manual Selection</option>
                                </select>
                            </div>

                            {/* Manual Selection List */}
                            {audienceSegment === 'Manual Selection' && (
                                <div className="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden flex flex-col min-h-[300px]">
                                    <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 space-y-2">
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                                                <input 
                                                    type="text" 
                                                    placeholder="Search..." 
                                                    value={searchContact}
                                                    onChange={(e) => setSearchContact(e.target.value)}
                                                    className="w-full pl-8 pr-2 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                                />
                                            </div>
                                            <select
                                                value={contactTypeFilter}
                                                onChange={(e) => setContactTypeFilter(e.target.value)}
                                                className="py-1.5 px-2 text-xs border border-gray-200 dark:border-gray-600 rounded-md outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                            >
                                                <option value="All">All</option>
                                                <option value="Lead">Leads</option>
                                                <option value="Staff">Staff</option>
                                                <option value="Franchise">Franchise</option>
                                            </select>
                                        </div>
                                        <div className="flex justify-between items-center px-1">
                                            <button 
                                                onClick={toggleAllVisible}
                                                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                            >
                                                <CheckSquare className="w-3 h-3" /> Select All Visible
                                            </button>
                                            <span className="text-xs text-gray-500">{contacts.filter(c => c.selected).length} selected</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[300px] custom-scrollbar">
                                        {filteredContacts.map(contact => (
                                            <div 
                                                key={contact.id} 
                                                onClick={() => toggleContact(contact.id)}
                                                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${contact.selected ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-transparent'}`}
                                            >
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${contact.selected ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300 bg-white'}`}>
                                                    {contact.selected && <CheckCircle className="w-3 h-3" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-xs font-medium truncate ${contact.selected ? 'text-blue-800 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>{contact.name}</p>
                                                    <p className="text-[10px] text-gray-500 dark:text-gray-500 truncate">{contact.email}</p>
                                                </div>
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase ${
                                                    contact.type === 'Franchise' ? 'bg-indigo-100 text-indigo-700' : 
                                                    contact.type === 'Staff' ? 'bg-purple-100 text-purple-700' :
                                                    'bg-gray-100 text-gray-500'
                                                }`}>
                                                    {contact.type === 'Franchise' && <Building2 className="w-2 h-2 inline mr-0.5" />}
                                                    {contact.type}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* INDIVIDUAL MODE UI */}
                    {sendMode === 'Individual' && (
                        <div className="space-y-4 flex-1">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 mb-2">
                                <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
                                    <UserPlus className="w-4 h-4" /> Recipient Details
                                </h4>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold text-blue-700 dark:text-blue-400 uppercase mb-1">To: Name</label>
                                        <input 
                                            type="text"
                                            value={individualName}
                                            onChange={(e) => setIndividualName(e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-blue-200 dark:border-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                            placeholder="Recipient Name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-blue-700 dark:text-blue-400 uppercase mb-1">To: Email Address</label>
                                        <input 
                                            type="email"
                                            value={individualEmail}
                                            onChange={(e) => setIndividualEmail(e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-blue-200 dark:border-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                            placeholder="recipient@example.com"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-gray-50 dark:bg-gray-900/30 p-4 rounded-lg border border-gray-100 dark:border-gray-800 mt-auto">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700 dark:text-gray-300">Recipient Count</span>
                            <Users className="w-4 h-4 text-emerald-500" />
                        </div>
                        <p className="text-3xl font-bold text-gray-800 dark:text-white mt-1">{targetCount.toLocaleString()}</p>
                        {sendMode === 'Individual' && (
                            <p className="text-xs text-gray-500 mt-1">Single Email Mode</p>
                        )}
                    </div>

                    {isSending ? (
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-300">Sending...</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">{progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-200" style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>
                    ) : (
                        <button 
                            onClick={handleSend}
                            disabled={!subject || !body || (sendMode === 'Individual' && !individualEmail) || (sendMode === 'Bulk' && audienceSegment === 'Manual Selection' && targetCount === 0)}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-emerald-200 dark:shadow-none"
                        >
                            <Send className="w-4 h-4" /> {sendMode === 'Bulk' ? 'Send Campaign' : 'Send Email'}
                        </button>
                    )}
                </div>
            </div>

            {/* Integration Note */}
            {sendMode === 'Bulk' && audienceSegment !== 'Manual Selection' && (
                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800 animate-in fade-in">
                    <div className="flex gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <div className="text-xs text-amber-800 dark:text-amber-300">
                            <p className="font-bold mb-1">System Note</p>
                            <p>To send 20k+ emails reliably, please configure your SMTP provider (AWS SES, SendGrid) in <strong>Settings &gt; Integrations</strong>. Currently using simulated delivery.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* History Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
         <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
               <Clock className="w-5 h-5 text-gray-400" /> Campaign History
            </h3>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-700">
                    <tr>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Subject</th>
                        <th className="px-6 py-4">Audience</th>
                        <th className="px-6 py-4">Delivery</th>
                        <th className="px-6 py-4">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-700 dark:text-gray-300">
                    {campaigns.map(camp => (
                        <tr key={camp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-6 py-4">{camp.date}</td>
                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{camp.subject}</td>
                            <td className="px-6 py-4">{camp.audience}</td>
                            <td className="px-6 py-4">
                                <span className="font-mono">{camp.sentCount.toLocaleString()}</span> / <span className="text-gray-400">{camp.totalCount.toLocaleString()}</span>
                            </td>
                            <td className="px-6 py-4">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                    <CheckCircle className="w-3 h-3" /> {camp.status}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};

export default EmailMarketing;
