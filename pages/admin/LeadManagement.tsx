
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Search, Plus, MoreHorizontal, 
  Phone, MessageSquare, Edit2, Eye, Calendar, 
  Facebook, Globe, Share2, 
  Flame, Thermometer, Snowflake, Clock, IndianRupee,
  ChevronLeft, ChevronRight, X, Mail,
  FileText, Upload, MessageCircle, Send, ChevronDown, Download
} from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  mobile: string;
  city: string;
  source: string;
  franchiseInterest: string;
  investmentCapacity: string;
  score: number;
  status: 'Hot Lead' | 'Warm Lead' | 'Cold Lead' | 'Converted' | 'Lost' | 'New' | 'Qualified' | 'Proposal Sent';
  assignedStaff: {
    name: string;
    avatar?: string;
  };
  nextFollowUp: string;
  email?: string;
  state: string;
  leadId: string;
}

const MOCK_LEADS: Lead[] = [
  {
    id: '1',
    leadId: 'OKB000123',
    name: 'Kumar S',
    mobile: '9876543210',
    city: 'Salem',
    source: 'Facebook Ads',
    franchiseInterest: 'Taxi Franchise',
    investmentCapacity: '₹5 - 10 Lakhs',
    score: 85,
    status: 'Hot Lead',
    assignedStaff: { name: 'Arun Kumar' },
    nextFollowUp: 'Today 10:30 AM',
    email: 'kumar.s@gmail.com',
    state: 'Tamil Nadu'
  },
  {
    id: '2',
    leadId: 'OKB000124',
    name: 'Raja M',
    mobile: '9876543211',
    city: 'Madurai',
    source: 'Franchise Expo',
    franchiseInterest: 'Load Xpress Franchise',
    investmentCapacity: '₹10 - 30 Lakhs',
    score: 65,
    status: 'Warm Lead',
    assignedStaff: { name: 'Priya Natarajan' },
    nextFollowUp: 'Tomorrow',
    email: 'raja.m@gmail.com',
    state: 'Tamil Nadu'
  },
  {
    id: '3',
    leadId: 'OKB000125',
    name: 'Suresh Babu',
    mobile: '9876543212',
    city: 'Coimbatore',
    source: 'Referral',
    franchiseInterest: 'Taxi Franchise',
    investmentCapacity: '₹5 - 10 Lakhs',
    score: 90,
    status: 'Hot Lead',
    assignedStaff: { name: 'Senthil Kumar' },
    nextFollowUp: 'Today 02:00 PM',
    email: 'suresh.b@gmail.com',
    state: 'Tamil Nadu'
  },
  {
    id: '4',
    leadId: 'OKB000126',
    name: 'Priya R',
    mobile: '9876543213',
    city: 'Tiruchy',
    source: 'Telecalling',
    franchiseInterest: 'Bike Delivery Franchise',
    investmentCapacity: '₹3 - 5 Lakhs',
    score: 60,
    status: 'Warm Lead',
    assignedStaff: { name: 'Karthik R' },
    nextFollowUp: '22 May 2024',
    email: 'priya.r@gmail.com',
    state: 'Tamil Nadu'
  },
  {
    id: '5',
    leadId: 'OKB000127',
    name: 'Manikandan',
    mobile: '9876543214',
    city: 'Tirunelveli',
    source: 'Website',
    franchiseInterest: 'Load Xpress Franchise',
    investmentCapacity: '₹10 - 30 Lakhs',
    score: 30,
    status: 'Cold Lead',
    assignedStaff: { name: 'Suresh Babu' },
    nextFollowUp: '23 May 2024',
    email: 'mani.k@gmail.com',
    state: 'Tamil Nadu'
  },
  {
    id: '6',
    leadId: 'OKB000128',
    name: 'Vijayakumar',
    mobile: '9876543215',
    city: 'Salem',
    source: 'WhatsApp Campaign',
    franchiseInterest: 'Taxi Franchise',
    investmentCapacity: '₹5 - 10 Lakhs',
    score: 58,
    status: 'Warm Lead',
    assignedStaff: { name: 'Priya Natarajan' },
    nextFollowUp: 'Today 11:00 AM',
    email: 'vijay.k@gmail.com',
    state: 'Tamil Nadu'
  }
];

const LeadManagement = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [leads] = useState<Lead[]>(MOCK_LEADS);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [activeTab, setActiveTab] = useState('All Leads');

  const filteredLeads = useMemo(() => {
    return leads.filter(l => 
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.leadId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.mobile.includes(searchTerm)
    );
  }, [searchTerm, leads]);

  const stats = [
    { label: 'Total Leads', value: '12,746', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50', change: '18.6%', trend: 'up' },
    { label: 'New Leads Today', value: '256', icon: Plus, color: 'text-blue-600', bg: 'bg-blue-50', change: '12.4%', trend: 'up' },
    { label: 'Hot Leads', value: '1,652', icon: Flame, color: 'text-rose-600', bg: 'bg-rose-50', change: '15.3%', trend: 'up' },
    { label: 'Warm Leads', value: '3,245', icon: Thermometer, color: 'text-orange-600', bg: 'bg-orange-50', change: '10.8%', trend: 'up' },
    { label: 'Cold Leads', value: '7,849', icon: Snowflake, color: 'text-sky-600', bg: 'bg-sky-50', change: '3.2%', trend: 'down' },
    { label: 'Follow-Ups Due', value: '312', icon: Clock, color: 'text-indigo-600', bg: 'bg-indigo-50', change: '8.7%', trend: 'up' },
    { label: 'Revenue Generated', value: '₹48,75,000', icon: IndianRupee, color: 'text-emerald-700', bg: 'bg-emerald-50', change: '23.5%', trend: 'up' },
  ];

  const LeadSourceIcon = ({ source }: { source: string }) => {
    if (source.includes('Facebook')) return <Facebook className="w-4 h-4 text-blue-600" />;
    if (source.includes('Website')) return <Globe className="w-4 h-4 text-emerald-600" />;
    if (source.includes('WhatsApp')) return <MessageCircle className="w-4 h-4 text-emerald-500" />;
    if (source.includes('Google')) return <div className="w-4 h-4 text-rose-500 font-bold text-[10px] flex items-center justify-center border border-rose-500 rounded-px">G</div>;
    return <Share2 className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 sticky top-0 z-30 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
             <span>Admin</span>
             <span>/</span>
             <span className="text-emerald-600">Lead Management</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
             <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-600" />
             </div>
             Lead Management
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Search leads..."
              className="pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs w-60 focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="h-8 w-px bg-gray-100 mx-1 hidden lg:block"></div>

          <div className="flex items-center gap-2 bg-gray-50/50 p-1.5 rounded-2xl border border-gray-100">
             <button 
               onClick={() => navigate('/admin/leads/add')}
               className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-[0.15em] shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center gap-2"
             >
               <Plus className="w-4 h-4" /> Add Lead
             </button>
             
             <div className="h-6 w-px bg-gray-200 mx-1"></div>

             <button className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all group flex items-center gap-2 px-3">
               <Upload className="w-4 h-4 text-gray-400 group-hover:text-emerald-600" />
               <span className="text-[9px] font-black text-gray-400 group-hover:text-emerald-600 uppercase tracking-widest">Import</span>
             </button>

             <button className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all group flex items-center gap-2 px-3 border-x border-gray-100/50">
               <FileText className="w-4 h-4 text-gray-400 group-hover:text-emerald-600" />
               <span className="text-[9px] font-black text-gray-400 group-hover:text-emerald-600 uppercase tracking-widest">Report</span>
             </button>

             <button className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all group flex items-center gap-2 px-3">
               <Send className="w-4 h-4 text-gray-400 group-hover:text-emerald-600" />
               <span className="text-[9px] font-black text-gray-400 group-hover:text-emerald-600 uppercase tracking-widest">Assign</span>
             </button>

             <div className="h-6 w-px bg-gray-200 mx-1"></div>

             <button className="p-2 bg-emerald-50 text-emerald-600 rounded-xl flex items-center gap-2 px-4 font-bold text-[9px] uppercase tracking-widest hover:bg-emerald-100 transition-all">
                <MessageSquare className="w-4 h-4"/> WhatsApp
             </button>
             <button className="p-2 bg-blue-50 text-blue-600 rounded-xl flex items-center gap-2 px-4 font-bold text-[9px] uppercase tracking-widest hover:bg-blue-100 transition-all">
                <Send className="w-4 h-4"/> SMS
             </button>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">{stat.label}</p>
                <div className={`p-2 ${stat.bg} rounded-xl`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{stat.value}</h3>
                <div className="flex items-center gap-1 mt-1">
                  <span className={`text-[10px] font-bold ${stat.trend === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {stat.trend === 'up' ? '▲' : '▼'} {stat.change}
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium">vs last 30 days</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs & Table Container */}
        <div className="bg-white rounded-[2rem] border border-gray-200 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
          {/* Main Tabs */}
          <div className="px-8 border-b border-gray-100 flex items-center gap-8 overflow-x-auto no-scrollbar pt-4">
            {['All Leads', 'New Leads', 'Contacted', 'Qualified', 'Hot Leads', 'Warm Leads', 'Cold Leads', 'Proposal Sent', 'Converted', 'Lost Leads'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-4 text-xs font-bold transition-all relative border-b-2 ${
                  activeTab === tab 
                  ? 'text-emerald-600 border-emerald-600' 
                  : 'text-gray-400 border-transparent hover:text-gray-600'
                }`}
              >
                {tab} {tab === 'All Leads' && <span className="text-[10px] opacity-70 ml-1">(12,746)</span>}
              </button>
            ))}
          </div>

          {/* Filters Bar */}
          <div className="p-6 border-b border-gray-100 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 bg-gray-50/30">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Lead Source</label>
              <select className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500">
                <option>All Sources</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Franchise Type</label>
              <select className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500">
                <option>All Types</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Investment Capacity</label>
              <select className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500">
                <option>All Ranges</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Staff Name</label>
              <select className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500">
                <option>All Staff</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Lead Status</label>
              <select className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500">
                <option>All Status</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Date Range</label>
              <button className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none flex items-center justify-between">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <span>21 May 24 - 21 May 24</span>
              </button>
            </div>
          </div>

          <div className="p-6 border-b border-gray-100 grid grid-cols-2 lg:grid-cols-5 gap-4 bg-gray-50/10 items-end">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">City</label>
              <select className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500">
                <option>All Cities</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">State</label>
              <select className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500">
                <option>All States</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Search Lead Name</label>
              <input type="text" placeholder="Enter lead name" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Search Mobile Number</label>
              <input type="text" placeholder="Enter mobile number" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div className="flex gap-2">
              <button className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all">Apply Filter</button>
              <button className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50">Reset</button>
            </div>
          </div>

          {/* Table Toolbar */}
          <div className="px-8 py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div className="flex items-center gap-4">
                <button className="text-xs font-bold text-gray-500 flex items-center gap-2 border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50 transition-all shadow-sm">
                   <Download className="w-3.5 h-3.5"/> Export Excel
                </button>
                <button className="text-xs font-bold text-gray-500 flex items-center gap-2 border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50 transition-all shadow-sm">
                   <Upload className="w-3.5 h-3.5"/> Bulk Import
                </button>
             </div>
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Showing 1 to {filteredLeads.length} of 12,746 leads</p>
          </div>

          {/* Lead Table */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead className="bg-[#FBFBFB] border-b border-gray-100">
                <tr>
                  <th className="px-6 py-5 w-12"><input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer" /></th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Lead ID <ChevronDown className="w-3 h-3 inline ml-1 opacity-50"/></th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Lead Name <ChevronDown className="w-3 h-3 inline ml-1 opacity-50"/></th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Mobile Number</th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">City <ChevronDown className="w-3 h-3 inline ml-1 opacity-50"/></th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Lead Source <ChevronDown className="w-3 h-3 inline ml-1 opacity-50"/></th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Franchise Interest <ChevronDown className="w-3 h-3 inline ml-1 opacity-50"/></th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Investment Capacity <ChevronDown className="w-3 h-3 inline ml-1 opacity-50"/></th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Lead Score <ChevronDown className="w-3 h-3 inline ml-1 opacity-50"/></th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Lead Status <ChevronDown className="w-3 h-3 inline ml-1 opacity-50"/></th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Assigned Staff <ChevronDown className="w-3 h-3 inline ml-1 opacity-50"/></th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Next Follow-up <ChevronDown className="w-3 h-3 inline ml-1 opacity-50"/></th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right pr-12">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredLeads.map((lead) => (
                  <tr 
                    key={lead.id} 
                    className={`group hover:bg-emerald-50/20 transition-all cursor-pointer ${selectedLead?.id === lead.id ? 'bg-emerald-50/40' : ''}`}
                    onClick={() => setSelectedLead(lead)}
                  >
                    <td className="px-6 py-5"><input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer" /></td>
                    <td className="px-6 py-5 text-xs font-bold text-emerald-600">{lead.leadId}</td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 text-xs">{lead.name.charAt(0)}</div>
                        <span className="text-sm font-bold text-gray-900 leading-none">{lead.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm font-medium text-gray-600">{lead.mobile}</td>
                    <td className="px-6 py-5 text-sm font-medium text-gray-600">{lead.city}</td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <LeadSourceIcon source={lead.source} />
                        <span className="text-xs font-bold text-gray-700">{lead.source}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-[11px] font-bold text-gray-600 leading-tight">{lead.franchiseInterest}</td>
                    <td className="px-6 py-5 text-[11px] font-bold text-gray-600">{lead.investmentCapacity}</td>
                    <td className="px-6 py-5">
                      <div className="relative w-8 h-8 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90 transform">
                          <circle cx="16" cy="16" r="14" fill="none" stroke="#F1F5F9" strokeWidth="3" />
                          <circle cx="16" cy="16" r="14" fill="none" stroke={lead.score > 70 ? '#10B981' : lead.score > 50 ? '#F59E0B' : '#6366F1'} strokeWidth="3" strokeDasharray={2 * Math.PI * 14} strokeDashoffset={2 * Math.PI * 14 * (1 - lead.score / 100)} strokeLinecap="round" />
                        </svg>
                        <span className="absolute text-[10px] font-black text-gray-600">{lead.score}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.1em] border ${
                        lead.status === 'Hot Lead' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                        lead.status === 'Warm Lead' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                        lead.status === 'Cold Lead' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                        'bg-gray-50 text-gray-500 border-gray-100'
                      }`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600 border border-white shadow-sm">AK</div>
                        <span className="text-[11px] font-bold text-gray-600">{lead.assignedStaff.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`text-[10px] font-black uppercase tracking-tight ${lead.nextFollowUp.includes('Today') ? 'text-rose-600 italic' : 'text-gray-400'}`}>{lead.nextFollowUp}</span>
                    </td>
                    <td className="px-6 py-5 text-right flex items-center justify-end gap-1 group-hover:pr-6 pr-12 transition-all">
                       <button className="p-2 hover:bg-emerald-50 rounded-lg text-gray-400 hover:text-emerald-600 shadow-none hover:shadow-sm"><Phone className="w-4 h-4"/></button>
                       <button className="p-2 hover:bg-emerald-50 rounded-lg text-gray-400 hover:text-emerald-500 shadow-none hover:shadow-sm"><MessageCircle className="w-4 h-4"/></button>
                       <button className="p-2 hover:bg-emerald-50 rounded-lg text-gray-400 hover:text-violet-600 shadow-none hover:shadow-sm"><Edit2 className="w-4 h-4"/></button>
                       <button className="p-2 hover:bg-emerald-50 rounded-lg text-gray-400 hover:text-blue-600 shadow-none hover:shadow-sm"><Eye className="w-4 h-4"/></button>
                       <button className="p-2 hover:bg-rose-50 rounded-lg text-gray-400 hover:text-rose-600 shadow-none hover:shadow-sm"><MoreHorizontal className="w-4 h-4"/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-8 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
               <button className="p-2 text-gray-400 hover:text-gray-900 border border-transparent hover:border-gray-200 rounded-lg transition-all"><ChevronLeft className="w-5 h-5"/></button>
               <div className="flex items-center gap-1">
                  {[1, 2, 3, '...', 1275].map((page, i) => (
                    <button key={i} className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${page === 1 ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'text-gray-500 hover:bg-gray-200'}`}>
                      {page}
                    </button>
                  ))}
               </div>
               <button className="p-2 text-gray-400 hover:text-gray-900 border border-transparent hover:border-gray-200 rounded-lg transition-all"><ChevronRight className="w-5 h-5"/></button>
            </div>
            <div className="flex items-center gap-2">
               <span className="text-xs font-bold text-gray-400">10 / page</span>
               <ChevronDown className="w-3 h-3 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Side Detail Drawer (conditionally shown) */}
      {selectedLead && (
         <div className="fixed inset-y-0 right-0 w-[450px] bg-white shadow-2xl z-50 border-l border-gray-200 animate-in slide-in-from-right duration-300 flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
               <h3 className="text-lg font-black text-gray-900 tracking-tight">Lead Details</h3>
               <button onClick={() => setSelectedLead(null)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 group"><X className="w-5 h-5 group-hover:text-gray-900"/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto no-scrollbar">
               {/* Detail Header */}
               <div className="p-8 border-b border-gray-50 flex flex-col items-center text-center gap-4">
                  <div className="relative">
                     <div className="w-24 h-24 rounded-[2.5rem] bg-indigo-600 flex items-center justify-center text-3xl font-black text-white shadow-2xl shadow-indigo-200">
                        {selectedLead.name.charAt(0)}
                     </div>
                     <div className="absolute -bottom-2 -right-2 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-lg">
                        <Edit2 className="w-4 h-4 text-gray-400" />
                     </div>
                  </div>
                  <div>
                     <h2 className="text-2xl font-black text-gray-900 tracking-tight">{selectedLead.name} <span className="text-[10px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full border border-rose-100 font-black ml-1 uppercase">{selectedLead.status}</span></h2>
                     <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{selectedLead.leadId} • Added on 20 May 2024</p>
                  </div>
                  <div className="flex gap-3 w-full justify-center pt-2">
                     <button className="flex items-center gap-2 text-sm font-bold text-gray-700 bg-gray-50 px-5 py-2.5 rounded-xl border border-gray-100 hover:bg-white transition-all"><Phone className="w-4 h-4 text-emerald-600"/> {selectedLead.mobile}</button>
                     <button className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all border border-emerald-100"><MessageSquare className="w-5 h-5"/></button>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-700 mt-1">
                     <Mail className="w-4 h-4 text-blue-500" /> {selectedLead.email}
                  </div>
               </div>

               {/* Tabs inside drawer */}
               <div className="p-4 bg-gray-50/50 flex gap-2 border-b border-gray-50">
                  {['Overview', 'Timeline', 'Notes', 'Files', 'Tasks'].map((t) => (
                    <button key={t} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${t === 'Overview' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>{t}</button>
                  ))}
               </div>

               <div className="p-8 space-y-10 pb-32">
                  {/* Lead Information */}
                  <section className="space-y-6">
                     <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">Lead Information</h4>
                     <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                        <div>
                           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Lead Source</p>
                           <p className="text-sm font-bold text-gray-800">{selectedLead.source}</p>
                        </div>
                        <div>
                           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Franchise Interest</p>
                           <p className="text-sm font-bold text-gray-800">{selectedLead.franchiseInterest}</p>
                        </div>
                        <div>
                           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Investment Capacity</p>
                           <p className="text-sm font-bold text-gray-800">{selectedLead.investmentCapacity}</p>
                        </div>
                        <div>
                           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">City / State</p>
                           <p className="text-sm font-bold text-gray-800">{selectedLead.city}, {selectedLead.state}</p>
                        </div>
                        <div>
                           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Lead Score</p>
                           <p className="text-sm font-black text-indigo-600">{selectedLead.score} <span className="text-[10px] text-gray-400 font-bold">/ 100</span></p>
                        </div>
                        <div className="flex items-center gap-2">
                           <div>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Assigned Staff</p>
                              <div className="flex items-center gap-2">
                                 <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-600 border border-white">AK</div>
                                 <span className="text-sm font-bold text-gray-800">{selectedLead.assignedStaff.name}</span>
                              </div>
                           </div>
                        </div>
                     </div>
                  </section>

                  {/* Follow-up Information */}
                  <section className="space-y-4 bg-gray-50 border border-gray-100 rounded-3xl p-6">
                     <div className="flex items-center justify-between mb-2">
                        <h4 className="text-[11px] font-black text-gray-800 uppercase tracking-[0.2em]">Follow-Up Information</h4>
                        <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1 hover:underline"><Edit2 className="w-3 h-3"/> Edit</button>
                     </div>
                     <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                           <span className="text-gray-400 font-bold text-xs uppercase tracking-widest">Follow-Up Type</span>
                           <span className="text-gray-700 font-bold">Phone Call</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                           <span className="text-gray-400 font-bold text-xs uppercase tracking-widest">Next Follow-Up</span>
                           <span className="text-rose-600 font-black italic">{selectedLead.nextFollowUp}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                           <span className="text-gray-400 font-bold text-xs uppercase tracking-widest">Status</span>
                           <span className="text-orange-500 font-black uppercase tracking-widest bg-orange-50 px-2 py-0.5 rounded-lg text-[10px]">Pending</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                           <span className="text-gray-400 font-bold text-xs uppercase tracking-widest">Reminder</span>
                           <span className="text-gray-700 font-bold">15 minutes before</span>
                        </div>
                     </div>
                  </section>

                  {/* Notes Section */}
                  <section className="space-y-4">
                     <div className="flex items-center justify-between">
                        <h4 className="text-[11px] font-black text-gray-800 uppercase tracking-[0.2em]">Notes</h4>
                        <button className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1 hover:underline"><Plus className="w-3.5 h-3.5"/> Add Note</button>
                     </div>
                     <ul className="space-y-3">
                        <li className="flex items-start gap-3">
                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></div>
                           <p className="text-xs font-medium text-gray-600 leading-relaxed">Ready to invest in Taxi Franchise business.</p>
                        </li>
                        <li className="flex items-start gap-3">
                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></div>
                           <p className="text-xs font-medium text-gray-600 leading-relaxed">Wants ROI details within 6 months.</p>
                        </li>
                        <li className="flex items-start gap-3">
                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></div>
                           <p className="text-xs font-medium text-gray-600 leading-relaxed">Interested in Chennai-based operations.</p>
                        </li>
                     </ul>
                  </section>

                  {/* Attachments */}
                  <section className="space-y-4">
                     <div className="flex items-center justify-between">
                        <h4 className="text-[11px] font-black text-gray-800 uppercase tracking-[0.2em]">Attachments (3)</h4>
                        <button className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1 hover:underline"><Upload className="w-3.5 h-3.5"/> Upload</button>
                     </div>
                     <div className="space-y-2">
                        {['Proposal.pdf', 'Brochure.jpg', 'Aadhaar Card.pdf'].map((doc, i) => (
                           <div key={i} className="group p-3 bg-white border border-gray-100 rounded-xl flex items-center justify-between hover:border-emerald-200 transition-all">
                              <div className="flex items-center gap-3">
                                 <FileText className="w-4 h-4 text-emerald-600" />
                                 <div>
                                    <p className="text-[11px] font-bold text-gray-800 leading-none">{doc}</p>
                                    <p className="text-[9px] text-gray-400 font-bold uppercase mt-1 tracking-widest">{i === 1 ? '1.2 MB' : '245 KB'}</p>
                                 </div>
                              </div>
                              <button className="p-2 text-gray-300 hover:text-emerald-600 transition-all opacity-0 group-hover:opacity-100"><Download className="w-4 h-4"/></button>
                           </div>
                        ))}
                     </div>
                  </section>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default LeadManagement;
