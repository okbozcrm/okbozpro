
import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Briefcase, Calendar, CreditCard, Shield, Edit2, AlertCircle, Lock, CheckCircle, Eye, EyeOff, Heart, Home, PhoneCall, Save, X, Info } from 'lucide-react';
import { MOCK_EMPLOYEES } from '../../constants';
import { Employee } from '../../types';

// Helper to format date display
const formatDateDisplay = (dateString?: string) => {
  if (!dateString) return 'Not Provided';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const UserProfile: React.FC = () => {
  const [user, setUser] = useState<Employee | null>(null);
  const [userStorageKey, setUserStorageKey] = useState<string>(''); // To know where to save back
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  
  // Profile Editing State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Employee>>({});
  
  // Password Change State
  const [passwords, setPasswords] = useState({
      current: '',
      new: '',
      confirm: ''
  });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false });
  const [msg, setMsg] = useState({ type: '', text: '' });

  // Load User Data and Identify Storage Key
  useEffect(() => {
      const storedSessionId = localStorage.getItem('app_session_id');
      if (!storedSessionId) {
          setUser(MOCK_EMPLOYEES[0]);
          return;
      }

      // 1. Try Admin Staff
      try {
        const adminStaff = JSON.parse(localStorage.getItem('staff_data') || '[]');
        const found = adminStaff.find((e: any) => e.id === storedSessionId);
        if (found) {
            setUser(found);
            setUserStorageKey('staff_data');
            return;
        }
      } catch(e) {}

      // 2. Try Corporate Staff
      try {
        const corporates = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        for (const corp of corporates) {
            const key = `staff_data_${corp.email}`;
            const cStaff = JSON.parse(localStorage.getItem(key) || '[]');
            const found = cStaff.find((e: any) => e.id === storedSessionId);
            if (found) {
                setUser(found);
                setUserStorageKey(key);
                return;
            }
        }
      } catch(e) {}

      // 3. Fallback Mock
      setUser(MOCK_EMPLOYEES.find(e => e.id === storedSessionId) || MOCK_EMPLOYEES[0]);
  }, []);

  const handleEditProfileToggle = () => {
      if (!user) return;
      
      const usedEdits = user.profileEditCount || 0;
      if (usedEdits >= 2) {
          alert("You have reached the maximum limit (2) for profile edits. Please contact Admin for further changes.");
          return;
      }

      // Initialize form with current data
      setEditForm({
          address: user.address || '',
          gender: user.gender || '',
          bloodGroup: user.bloodGroup || '',
          maritalStatus: user.maritalStatus || '',
          emergencyContactName: user.emergencyContactName || '',
          emergencyContactPhone: user.emergencyContactPhone || '',
          emergencyContactRelation: user.emergencyContactRelation || '',
          accountNumber: user.accountNumber || '',
          ifsc: user.ifsc || '',
          pan: user.pan || '',
          aadhar: user.aadhar || ''
      });
      setIsEditingProfile(true);
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setEditForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const saveProfileChanges = () => {
      if (!user || !userStorageKey) return;

      const updatedCount = (user.profileEditCount || 0) + 1;
      
      const updatedUser: Employee = {
          ...user,
          ...editForm,
          profileEditCount: updatedCount
      };

      try {
          const storedList = JSON.parse(localStorage.getItem(userStorageKey) || '[]');
          const updatedList = storedList.map((e: Employee) => e.id === user.id ? updatedUser : e);
          localStorage.setItem(userStorageKey, JSON.stringify(updatedList));
          
          setUser(updatedUser);
          setIsEditingProfile(false);
          alert(`Profile updated successfully! (${updatedCount}/2 edits used)`);
      } catch (e) {
          console.error("Failed to save profile", e);
          alert("Failed to save changes.");
      }
  };

  const handlePasswordChange = (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;
      
      if (passwords.current !== user.password) {
          setMsg({ type: 'error', text: 'Current password is incorrect.' });
          return;
      }

      if (passwords.new.length < 6) {
          setMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
          return;
      }

      if (passwords.new !== passwords.confirm) {
          setMsg({ type: 'error', text: 'New passwords do not match.' });
          return;
      }

      // Save Password Logic
      if (userStorageKey) {
          try {
              const storedList = JSON.parse(localStorage.getItem(userStorageKey) || '[]');
              const updatedList = storedList.map((e: Employee) => e.id === user.id ? { ...e, password: passwords.new } : e);
              localStorage.setItem(userStorageKey, JSON.stringify(updatedList));
              
              setUser({ ...user, password: passwords.new });
              setMsg({ type: 'success', text: 'Password updated successfully!' });
              
              setTimeout(() => {
                  setIsEditingPassword(false);
                  setMsg({ type: '', text: '' });
                  setPasswords({ current: '', new: '', confirm: '' });
              }, 1500);
          } catch(e) {
              setMsg({ type: 'error', text: 'Storage error.' });
          }
      }
  };

  if (!user) return <div className="p-8 text-center text-gray-500">Loading profile...</div>;

  const editsLeft = 2 - (user.profileEditCount || 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold text-gray-800">My Profile</h2>
           <p className="text-gray-500">Manage your personal information</p>
        </div>
        
        {isEditingProfile ? (
            <div className="flex gap-2">
                <button 
                    onClick={() => setIsEditingProfile(false)}
                    className="flex items-center gap-2 bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                    <X className="w-4 h-4" /> Cancel
                </button>
                <button 
                    onClick={saveProfileChanges}
                    className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors shadow-sm"
                >
                    <Save className="w-4 h-4" /> Save Changes
                </button>
            </div>
        ) : (
            <button 
                onClick={handleEditProfileToggle}
                disabled={editsLeft <= 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                    editsLeft > 0 
                    ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100' 
                    : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                }`}
                title={editsLeft <= 0 ? "You have reached the edit limit" : "Edit allowed sections"}
            >
                {editsLeft > 0 ? <Edit2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                {editsLeft > 0 ? `Edit Profile (${editsLeft} left)` : 'Edit Limit Reached'}
            </button>
        )}
      </div>

      {isEditingProfile && (
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-yellow-800 text-sm flex items-start gap-2">
              <Info className="w-5 h-5 shrink-0" />
              <span>
                  You can edit your <strong>Home Address, Emergency Contact, and KYC Details</strong>. 
                  Email and Phone Number cannot be changed here; please contact Admin.
                  <strong> Note: You have {editsLeft} edit(s) remaining.</strong>
              </span>
          </div>
      )}

      {/* Profile Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden relative">
        <div className="h-32 bg-gradient-to-r from-emerald-500 to-teal-600"></div>
        <div className="px-8 pb-8">
          <div className="relative flex flex-col sm:flex-row justify-between items-end -mt-12 mb-6 gap-4">
            <div className="flex items-end gap-6">
               <img 
                 src={user.avatar} 
                 alt={user.name} 
                 className="w-24 h-24 rounded-full border-4 border-white shadow-md bg-white object-cover" 
               />
               <div className="mb-1">
                 <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
                 <p className="text-gray-500 font-medium">{user.role}</p>
               </div>
            </div>
            <div className="mb-1">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${user.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                {user.status || 'Active'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-gray-100">
             <div className="flex flex-col gap-1">
               <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Employee ID</span>
               <span className="font-mono text-gray-800 font-medium">{user.id}</span>
             </div>
             <div className="flex flex-col gap-1">
               <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Date of Joining</span>
               <span className="text-gray-800 font-medium flex items-center gap-2">
                 <Calendar className="w-4 h-4 text-emerald-500" />
                 {formatDateDisplay(user.joiningDate)}
               </span>
             </div>
             <div className="flex flex-col gap-1">
               <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Department</span>
               <span className="text-gray-800 font-medium flex items-center gap-2">
                 <Briefcase className="w-4 h-4 text-emerald-500" />
                 {user.department}
               </span>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
           <div>
               <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                 <User className="w-5 h-5 text-emerald-500" />
                 Personal Information
               </h3>
               <div className="space-y-4">
                  <div className={`flex items-start gap-4 p-3 rounded-lg transition-colors ${isEditingProfile ? 'bg-gray-100 opacity-70 cursor-not-allowed' : 'hover:bg-gray-50'}`}>
                     <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                     <div className="w-full">
                        <p className="text-xs text-gray-500 mb-0.5 flex justify-between">
                            Email Address 
                            {isEditingProfile && <span className="text-[10px] text-red-500 font-bold">Contact Admin</span>}
                        </p>
                        <p className="text-gray-800 font-medium break-all">{user.email || 'Not Provided'}</p>
                     </div>
                  </div>
                  <div className={`flex items-start gap-4 p-3 rounded-lg transition-colors ${isEditingProfile ? 'bg-gray-100 opacity-70 cursor-not-allowed' : 'hover:bg-gray-50'}`}>
                     <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                     <div className="w-full">
                        <p className="text-xs text-gray-500 mb-0.5 flex justify-between">
                            Phone Number
                            {isEditingProfile && <span className="text-[10px] text-red-500 font-bold">Contact Admin</span>}
                        </p>
                        <p className="text-gray-800 font-medium">{user.phone || 'Not Provided'}</p>
                     </div>
                  </div>
                  <div className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                     <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                     <div>
                        <p className="text-xs text-gray-500 mb-0.5">Branch Location</p>
                        <p className="text-gray-800 font-medium">{user.branch || 'Main Branch'}</p>
                     </div>
                  </div>
                  <div className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                     <Home className="w-5 h-5 text-gray-400 mt-0.5" />
                     <div className="w-full">
                        <p className="text-xs text-gray-500 mb-0.5">Home Address</p>
                        {isEditingProfile ? (
                            <textarea 
                                name="address"
                                value={editForm.address}
                                onChange={handleProfileChange}
                                className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                rows={2}
                            />
                        ) : (
                            <p className="text-gray-800 font-medium text-sm leading-relaxed">{user.address || 'Not Provided'}</p>
                        )}
                     </div>
                  </div>
               </div>
           </div>

           {/* Extended Personal Details */}
           <div className="pt-4 border-t border-gray-100">
               <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                 <Heart className="w-5 h-5 text-red-500" />
                 Extended Details
               </h4>
               <div className="grid grid-cols-3 gap-4">
                   <div className="bg-gray-50 p-3 rounded-lg text-center">
                       <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Gender</p>
                       {isEditingProfile ? (
                           <select name="gender" value={editForm.gender} onChange={handleProfileChange} className="w-full text-xs p-1 border rounded">
                               <option value="">-</option>
                               <option value="Male">Male</option>
                               <option value="Female">Female</option>
                           </select>
                       ) : (
                           <p className="text-sm font-medium text-gray-800">{user.gender || '-'}</p>
                       )}
                   </div>
                   <div className="bg-gray-50 p-3 rounded-lg text-center">
                       <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Blood Group</p>
                       {isEditingProfile ? (
                           <input name="bloodGroup" value={editForm.bloodGroup} onChange={handleProfileChange} className="w-full text-xs p-1 border rounded" placeholder="e.g. O+" />
                       ) : (
                           <p className="text-sm font-bold text-red-600">{user.bloodGroup || '-'}</p>
                       )}
                   </div>
                   <div className="bg-gray-50 p-3 rounded-lg text-center">
                       <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Marital Status</p>
                       {isEditingProfile ? (
                           <select name="maritalStatus" value={editForm.maritalStatus} onChange={handleProfileChange} className="w-full text-xs p-1 border rounded">
                               <option value="">-</option>
                               <option value="Single">Single</option>
                               <option value="Married">Married</option>
                           </select>
                       ) : (
                           <p className="text-sm font-medium text-gray-800">{user.maritalStatus || '-'}</p>
                       )}
                   </div>
               </div>
           </div>
        </div>

        <div className="space-y-6">
            {/* Emergency Contact */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
               <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                 <AlertCircle className="w-5 h-5 text-orange-500" />
                 Emergency Contact
               </h3>
               {isEditingProfile ? (
                   <div className="space-y-3">
                       <div>
                           <label className="text-xs text-gray-500 font-bold uppercase">Name</label>
                           <input name="emergencyContactName" value={editForm.emergencyContactName} onChange={handleProfileChange} className="w-full p-2 border border-gray-300 rounded text-sm" />
                       </div>
                       <div>
                           <label className="text-xs text-gray-500 font-bold uppercase">Relation</label>
                           <input name="emergencyContactRelation" value={editForm.emergencyContactRelation} onChange={handleProfileChange} className="w-full p-2 border border-gray-300 rounded text-sm" />
                       </div>
                       <div>
                           <label className="text-xs text-gray-500 font-bold uppercase">Phone</label>
                           <input name="emergencyContactPhone" value={editForm.emergencyContactPhone} onChange={handleProfileChange} className="w-full p-2 border border-gray-300 rounded text-sm" />
                       </div>
                   </div>
               ) : (
                   user.emergencyContactName ? (
                       <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                           <div className="flex justify-between items-start mb-2">
                               <div>
                                   <p className="font-bold text-gray-800 text-lg">{user.emergencyContactName}</p>
                                   <p className="text-sm text-gray-600">{user.emergencyContactRelation}</p>
                               </div>
                               <div className="bg-white p-2 rounded-full shadow-sm text-orange-600">
                                   <PhoneCall className="w-5 h-5" />
                               </div>
                           </div>
                           <p className="font-mono text-gray-800 font-medium mt-2">{user.emergencyContactPhone}</p>
                       </div>
                   ) : (
                       <div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-xl">
                           No emergency contact added.
                       </div>
                   )
               )}
            </div>

            {/* Banking & KYC */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-emerald-500" />
                    KYC & Banking
                  </h3>
                  {!isEditingProfile && (
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                         <Shield className="w-3 h-3" /> Verified
                      </span>
                  )}
               </div>
               
               <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                     <div className="flex items-center gap-3 w-full">
                        <div className="bg-white p-2 rounded-md shadow-sm shrink-0">
                          <CreditCard className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="w-full">
                          <p className="text-xs text-gray-500">Bank Account</p>
                          {isEditingProfile ? (
                              <div className="space-y-2 mt-1">
                                  <input name="accountNumber" value={editForm.accountNumber} onChange={handleProfileChange} placeholder="Acc No" className="w-full p-1 border rounded text-sm" />
                                  <input name="ifsc" value={editForm.ifsc} onChange={handleProfileChange} placeholder="IFSC" className="w-full p-1 border rounded text-sm uppercase" />
                              </div>
                          ) : (
                              <div className="flex justify-between w-full">
                                  <p className="text-sm font-bold text-gray-800 font-mono">
                                     •••• {user.accountNumber?.slice(-4) || 'XXXX'}
                                  </p>
                                  <span className="text-xs font-mono text-gray-400">{user.ifsc}</span>
                              </div>
                          )}
                        </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <p className="text-xs text-gray-500 mb-1">PAN Number</p>
                        {isEditingProfile ? (
                            <input name="pan" value={editForm.pan} onChange={handleProfileChange} className="w-full p-1 border rounded text-sm uppercase font-mono" />
                        ) : (
                            <p className="text-sm font-bold text-gray-800 font-mono">{user.pan || 'Not Provided'}</p>
                        )}
                     </div>
                     <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <p className="text-xs text-gray-500 mb-1">Aadhar Number</p>
                        {isEditingProfile ? (
                            <input name="aadhar" value={editForm.aadhar} onChange={handleProfileChange} className="w-full p-1 border rounded text-sm font-mono" />
                        ) : (
                            <p className="text-sm font-bold text-gray-800 font-mono">{user.aadhar || 'Not Provided'}</p>
                        )}
                     </div>
                  </div>
                  
                  {!isEditingProfile && (
                      <div className="mt-4 flex items-start gap-2 text-xs text-gray-500 bg-blue-50 p-3 rounded-lg border border-blue-100">
                         <Info className="w-4 h-4 text-blue-500 shrink-0" />
                         <p>To update sensitive banking or tax information, please contact the HR department directly.</p>
                      </div>
                  )}
               </div>
            </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-emerald-500" /> Security
              </h3>
              {!isEditingPassword && !isEditingProfile && (
                  <button 
                    onClick={() => setIsEditingPassword(true)}
                    className="text-sm text-emerald-600 font-medium hover:underline"
                  >
                      Change Password
                  </button>
              )}
          </div>

          {!isEditingPassword ? (
              <div className="text-sm text-gray-500 flex items-center gap-2">
                  <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                  </div>
                  <span className="ml-2">Last changed: Recently</span>
              </div>
          ) : (
              <form onSubmit={handlePasswordChange} className="max-w-md space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Current Password</label>
                      <div className="relative">
                          <input 
                              type={showPasswords.current ? "text" : "password"}
                              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                              value={passwords.current}
                              onChange={e => setPasswords({...passwords, current: e.target.value})}
                          />
                          <button type="button" onClick={() => setShowPasswords(p => ({...p, current: !p.current}))} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                              {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">New Password</label>
                          <div className="relative">
                              <input 
                                  type={showPasswords.new ? "text" : "password"}
                                  className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                  value={passwords.new}
                                  onChange={e => setPasswords({...passwords, new: e.target.value})}
                              />
                              <button type="button" onClick={() => setShowPasswords(p => ({...p, new: !p.new}))} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                                  {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                          </div>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Confirm Password</label>
                          <input 
                              type="password"
                              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                              value={passwords.confirm}
                              onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                          />
                      </div>
                  </div>
                  
                  {msg.text && (
                      <div className={`text-xs p-2 rounded flex items-center gap-2 ${msg.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {msg.type === 'error' ? <AlertCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                          {msg.text}
                      </div>
                  )}

                  <div className="flex gap-3">
                      <button 
                          type="button" 
                          onClick={() => { setIsEditingPassword(false); setMsg({type:'', text:''}); }}
                          className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
                      >
                          Cancel
                      </button>
                      <button 
                          type="submit"
                          className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors shadow-sm"
                      >
                          Update Password
                      </button>
                  </div>
              </form>
          )}
      </div>
    </div>
  );
};

export default UserProfile;
