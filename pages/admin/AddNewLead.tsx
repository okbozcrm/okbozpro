
import React, { useState } from 'react';
import { 
  ArrowLeft, Save, Plus, Info, 
  Facebook, Globe, Share2, Phone, MessageCircle, 
  User, Search, Users, Briefcase, Hash,
  ChevronDown, CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LeadFormData {
  fullName: string;
  mobileNumber: string;
  whatsAppNumber: string;
  emailId: string;
  altNumber: string;
  gender: string;
  dob: string;
  occupation: string;
  companyName: string;
  city: string;
  state: string;
  pincode: string;
  address: string;
  franchiseInterest: string;
  investmentCapacity: string;
  preferredCity: string;
  source: string;
  sourceDetails: string;
  howHeard: string;
  existingBusiness: string;
  timeline: string;
  multipleServices: string;
  notes: string;
  assignTo: string;
  assignDept: string;
  assignBranch: string;
}

const AddNewLead = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<LeadFormData>({
    fullName: '',
    mobileNumber: '',
    whatsAppNumber: '',
    emailId: '',
    altNumber: '',
    gender: '',
    dob: '',
    occupation: '',
    companyName: '',
    city: '',
    state: '',
    pincode: '',
    address: '',
    franchiseInterest: '',
    investmentCapacity: '',
    preferredCity: '',
    source: '',
    sourceDetails: '',
    howHeard: '',
    existingBusiness: '',
    timeline: '',
    multipleServices: 'No',
    notes: '',
    assignTo: '',
    assignDept: '',
    assignBranch: ''
  });

  const sources = [
    { name: 'Facebook Ads', icon: Facebook, color: 'text-blue-600' },
    { name: 'Website', icon: Globe, color: 'text-emerald-600' },
    { name: 'Franchise Expo', icon: Briefcase, color: 'text-orange-500' },
    { name: 'Referral', icon: Users, color: 'text-amber-500' },
    { name: 'Telecalling', icon: Phone, color: 'text-rose-500' },
    { name: 'Walk-in', icon: User, color: 'text-emerald-500' },
    { name: 'WhatsApp Campaign', icon: MessageCircle, color: 'text-emerald-400' },
    { name: 'Google Ads', icon: Search, color: 'text-blue-500' },
    { name: 'Others', icon: Share2, color: 'text-gray-400' },
  ];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Saving lead:', formData);
    navigate('/admin/leads');
  };

  const renderInput = (label: string, name: string, type = 'text', placeholder = '', required = false) => (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <div className="relative">
        <input
          type={type}
          name={name}
          placeholder={placeholder}
          required={required}
          className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-gray-300"
          value={formData[name as keyof LeadFormData] || ''}
          onChange={(e) => setFormData({ ...formData, [name]: e.target.value })}
        />
        {name === 'whatsAppNumber' && (
          <MessageCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
        )}
      </div>
    </div>
  );

  const renderSelect = (label: string, name: string, options: string[], required = false) => (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <div className="relative">
        <select
          name={name}
          required={required}
          className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all appearance-none pr-10"
          value={formData[name as keyof LeadFormData] || ''}
          onChange={(e) => setFormData({ ...formData, [name]: e.target.value })}
        >
          <option value="">Select {label.toLowerCase()}</option>
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <div className="space-y-0.5">
            <h1 className="text-xl font-black text-gray-900 tracking-tight">Add New Lead</h1>
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <span>Lead Management</span>
              <span>/</span>
              <span className="text-emerald-600">Add New Lead</span>
            </div>
          </div>
        </div>
        <button 
          onClick={() => navigate('/admin/leads')}
          className="flex items-center gap-2 px-4 py-2 border border-gray-100 rounded-xl text-xs font-black text-gray-600 hover:bg-gray-50 transition-all uppercase tracking-widest"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Leads
        </button>
      </div>

      <div className="p-8 flex flex-col lg:flex-row gap-8">
        {/* Main Form */}
        <form onSubmit={handleSave} className="flex-1 space-y-8">
          {/* Section 1: Basic Information */}
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8 space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                <span className="text-xs font-black text-emerald-600">1.</span>
              </div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-[0.2em]">Basic Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {renderInput('Full Name', 'fullName', 'text', 'Enter full name', true)}
              {renderInput('Mobile Number', 'mobileNumber', 'tel', 'Enter mobile number', true)}
              {renderInput('WhatsApp Number', 'whatsAppNumber', 'tel', 'Enter WhatsApp number')}
              {renderInput('Email ID', 'emailId', 'email', 'Enter email address')}
              {renderInput('Alternative Number', 'altNumber', 'tel', 'Enter alternative number')}
              {renderSelect('Gender', 'gender', ['Male', 'Female', 'Other'])}
              {renderInput('Date of Birth', 'dob', 'date')}
              {renderInput('Occupation', 'occupation', 'text', 'Enter occupation')}
              {renderInput('Company / Business Name', 'companyName', 'text', 'Enter company name')}
              {renderSelect('City', 'city', ['Salem', 'Madurai', 'Chennai', 'Coimbatore'], true)}
              {renderSelect('State', 'state', ['Tamil Nadu', 'Karnataka', 'Kerala'], true)}
              {renderInput('Pincode', 'pincode', 'text', 'Enter pincode')}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Address</label>
              <textarea 
                rows={3} 
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-gray-300"
                placeholder="Enter full address"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
              />
            </div>
          </div>

          {/* Section 2: Lead Details */}
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8 space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center">
                <span className="text-xs font-black text-violet-600">2.</span>
              </div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-[0.2em]">Lead Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {renderSelect('Franchise Interest', 'franchiseInterest', ['Taxi Franchise', 'Load Xpress Franchise', 'Bike Delivery Franchise'], true)}
              {renderSelect('Investment Capacity', 'investmentCapacity', ['₹3 - 5 Lakhs', '₹5 - 10 Lakhs', '₹10 - 30 Lakhs', 'Above ₹30 Lakhs'], true)}
              {renderSelect('Preferred City / Territory', 'preferredCity', ['Select preferred city'], true)}
              {renderSelect('Lead Source', 'source', sources.map(s => s.name), true)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Source Details</label>
                  <input 
                     type="text" 
                     placeholder="Enter source details (Campaign, Ad Name, Expo Name etc.)"
                     className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-gray-300"
                     value={formData.sourceDetails}
                     onChange={(e) => setFormData({...formData, sourceDetails: e.target.value})}
                  />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 text-center block">Lead Score (Auto)</label>
                     <div className="h-[46px] bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 font-black">
                        --
                     </div>
                     <p className="text-[8px] text-gray-400 text-center font-bold">Will be calculated automatically</p>
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 text-center block">Lead Priority (Auto)</label>
                     <div className="h-[46px] bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center text-gray-300 font-black">
                        --
                     </div>
                     <p className="text-[8px] text-gray-400 text-center font-bold">Will be calculated automatically</p>
                  </div>
               </div>
            </div>
          </div>

          {/* Section 3: Additional Information */}
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8 space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                <span className="text-xs font-black text-amber-600">3.</span>
              </div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-[0.2em]">Additional Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderSelect('How did you hear about OK BOZ?', 'howHeard', ['Social Media', 'Newspaper', 'Friends', 'Franchise Expo'])}
              {renderSelect('Expected Investment Timeline', 'timeline', ['Immediate', 'Within 1 month', 'Within 3 months', 'Planning for future'])}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Existing Business / Experience</label>
                  <textarea 
                    rows={2} 
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-gray-300"
                    placeholder="Enter details about existing business or experience"
                    value={formData.existingBusiness}
                    onChange={(e) => setFormData({...formData, existingBusiness: e.target.value})}
                  />
               </div>
               <div className="space-y-4">
                  <div className="space-y-3">
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Interested in Multiple Services?</p>
                     <div className="flex items-center gap-6">
                        {['Yes', 'No'].map(opt => (
                           <label key={opt} className="flex items-center gap-2 cursor-pointer group">
                              <input 
                                 type="radio" 
                                 name="multipleServices" 
                                 className="hidden" 
                                 onChange={() => setFormData({...formData, multipleServices: opt})}
                              />
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${formData.multipleServices === opt ? 'border-emerald-500 bg-emerald-500 shadow-lg shadow-emerald-200' : 'border-gray-200 group-hover:border-emerald-300'}`}>
                                 {formData.multipleServices === opt && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                              </div>
                              <span className={`text-xs font-black transition-all ${formData.multipleServices === opt ? 'text-gray-900 font-black' : 'text-gray-400'}`}>{opt}</span>
                           </label>
                        ))}
                     </div>
                  </div>
               </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Comments / Notes</label>
              <textarea 
                rows={2} 
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-gray-300"
                placeholder="Enter any additional comments or notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
            </div>
          </div>

          {/* Section 4: Assign Lead */}
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8 space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                <span className="text-xs font-black text-blue-600">4.</span>
              </div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-[0.2em]">Assign Lead</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {renderSelect('Assign To', 'assignTo', ['Select staff'], true)}
              {renderSelect('Assign Department', 'assignDept', ['Select department'])}
              {renderSelect('Assign Branch', 'assignBranch', ['Select branch'])}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-center gap-4 bg-white/50 backdrop-blur-md p-6 rounded-[2rem] border border-white sticky bottom-8 shadow-2xl shadow-gray-200">
            <button 
              type="button" 
              onClick={() => setFormData({
                fullName: '',
                mobileNumber: '',
                whatsAppNumber: '',
                emailId: '',
                altNumber: '',
                gender: '',
                dob: '',
                occupation: '',
                companyName: '',
                city: '',
                state: '',
                pincode: '',
                address: '',
                franchiseInterest: '',
                investmentCapacity: '',
                preferredCity: '',
                source: '',
                sourceDetails: '',
                howHeard: '',
                existingBusiness: '',
                timeline: '',
                multipleServices: 'No',
                notes: '',
                assignTo: '',
                assignDept: '',
                assignBranch: ''
              })}
              className="px-10 py-3.5 border border-gray-100 rounded-2xl text-[10px] font-black text-gray-500 uppercase tracking-widest hover:bg-white hover:text-gray-900 transition-all shadow-sm"
            >
              Reset
            </button>
            <button 
              type="submit" 
              className="flex-1 max-w-xs px-10 py-3.5 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-900/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" /> Save Lead
            </button>
            <button 
              type="button" 
              className="px-10 py-3.5 border border-gray-100 rounded-2xl text-[10px] font-black text-gray-900 uppercase tracking-widest hover:bg-white transition-all flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Save & Add Another
            </button>
          </div>
        </form>

        {/* Sidebar Info */}
        <div className="lg:w-[320px] space-y-6">
          {/* Lead Sources */}
          <div className="bg-white rounded-[2rem] border border-gray-100 p-6 space-y-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Hash className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">Lead Source</h4>
                <p className="text-[10px] font-bold text-gray-400 mt-0.5">Select the source from where you got this lead</p>
              </div>
            </div>
            <div className="space-y-1">
              {sources.map(source => (
                <button 
                  key={source.name}
                  onClick={() => setFormData({...formData, source: source.name})}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${formData.source === source.name ? 'bg-emerald-50 border border-emerald-100' : 'hover:bg-gray-50 border border-transparent'}`}
                >
                  <source.icon className={`w-4 h-4 ${source.color}`} />
                  <span className={`text-[11px] font-black transition-all ${formData.source === source.name ? 'text-emerald-700' : 'text-gray-600'}`}>{source.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Lead Score Guide */}
          <div className="bg-white rounded-[2rem] border border-gray-100 p-6 space-y-6 shadow-sm">
             <div className="flex items-center gap-3 text-amber-500">
                <Info className="w-5 h-5" />
                <h4 className="text-xs font-black text-gray-800 uppercase tracking-widest">Lead Score Guide</h4>
             </div>
             <p className="text-[10px] text-gray-400 font-bold leading-relaxed px-1">Lead score will be calculated automatically based on the information provided</p>
             <div className="space-y-3">
                <div className="flex items-center justify-between bg-rose-50/50 p-3 rounded-2xl border border-rose-100/50">
                   <span className="text-[10px] font-black text-rose-600 bg-white px-2 py-1 rounded-lg shadow-sm">80 - 100</span>
                   <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Hot Lead</span>
                </div>
                <div className="flex items-center justify-between bg-orange-50/50 p-3 rounded-2xl border border-orange-100/50">
                   <span className="text-[10px] font-black text-orange-600 bg-white px-2 py-1 rounded-lg shadow-sm">50 - 79</span>
                   <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Warm Lead</span>
                </div>
                <div className="flex items-center justify-between bg-blue-50/50 p-3 rounded-2xl border border-blue-100/50">
                   <span className="text-[10px] font-black text-blue-600 bg-white px-2 py-1 rounded-lg shadow-sm">0 - 49</span>
                   <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Cold Lead</span>
                </div>
             </div>
          </div>

          {/* Quick Tips */}
          <div className="bg-white rounded-[2rem] border border-gray-100 p-6 space-y-6 shadow-sm">
             <div className="flex items-center gap-3 text-emerald-500">
                <CheckCircle2 className="w-5 h-5" />
                <h4 className="text-xs font-black text-gray-800 uppercase tracking-widest">Quick Tips</h4>
             </div>
             <ul className="space-y-4 px-1">
                {[
                   'Fill all mandatory fields to get better results',
                   'Provide accurate contact information',
                   'Add notes for better follow-up',
                   'Assign to the right person for faster conversion'
                ].map((tip, i) => (
                   <li key={i} className="flex gap-3">
                      <div className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <p className="text-[10px] font-bold text-gray-500 leading-relaxed">{tip}</p>
                   </li>
                ))}
             </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddNewLead;
