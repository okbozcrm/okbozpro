
import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Shield, Edit2, AlertCircle, Lock, CheckCircle, Eye, EyeOff, Save, X, Camera } from 'lucide-react';

const AdminProfile: React.FC = () => {
  const [adminData, setAdminData] = useState({
    name: 'Administrator',
    email: 'okboz.com@gmail.com',
    phone: '+91 98765 43210',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
  });

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [editForm, setEditForm] = useState(adminData);
  
  // Password Change State
  const [passwords, setPasswords] = useState({
      current: '',
      new: '',
      confirm: ''
  });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false });
  const [msg, setMsg] = useState({ type: '', text: '' });

  // Load Admin Data
  useEffect(() => {
      const storedProfile = localStorage.getItem('admin_profile');
      if (storedProfile) {
          try {
              setAdminData(JSON.parse(storedProfile));
          } catch (e) {
              console.error("Failed to parse admin profile", e);
          }
      }
  }, []);

  const handleEditProfileToggle = () => {
      setEditForm(adminData);
      setIsEditingProfile(true);
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setEditForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const saveProfileChanges = () => {
      localStorage.setItem('admin_profile', JSON.stringify(editForm));
      setAdminData(editForm);
      setIsEditingProfile(false);
      
      // Update display name in session if needed
      // sessionStorage.setItem('loggedInUserName', editForm.name);
      
      alert("Admin profile updated successfully!");
      window.dispatchEvent(new Event('storage')); // Notify other components
  };

  const handlePasswordChange = (e: React.FormEvent) => {
      e.preventDefault();
      const storedAdminPass = localStorage.getItem('admin_password') || '123456';
      
      if (passwords.current !== storedAdminPass) {
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

      localStorage.setItem('admin_password', passwords.new);
      setMsg({ type: 'success', text: 'Password updated successfully!' });
      
      setTimeout(() => {
          setIsEditingPassword(false);
          setMsg({ type: '', text: '' });
          setPasswords({ current: '', new: '', confirm: '' });
      }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Admin Profile</h2>
           <p className="text-gray-500 dark:text-gray-400">Manage your administrative account details</p>
        </div>
        
        {isEditingProfile ? (
            <div className="flex gap-2">
                <button 
                    onClick={() => setIsEditingProfile(false)}
                    className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
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
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40"
            >
                <Edit2 className="w-4 h-4" /> Edit Profile
            </button>
        )}
      </div>

      {/* Profile Header Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden relative">
        <div className="h-32 bg-gradient-to-r from-emerald-500 to-teal-600"></div>
        <div className="px-8 pb-8">
          <div className="relative flex flex-col sm:flex-row justify-between items-end -mt-12 mb-6 gap-4">
            <div className="flex items-end gap-6">
               <div className="relative group">
                  <img 
                    src={adminData.avatar} 
                    alt={adminData.name} 
                    className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-800 shadow-md bg-white dark:bg-gray-700 object-cover" 
                  />
                  {isEditingProfile && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  )}
               </div>
               <div className="mb-1">
                 <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{adminData.name}</h1>
                 <p className="text-gray-500 dark:text-gray-400 font-medium">Master Administrator</p>
               </div>
            </div>
            <div className="mb-1">
              <span className="px-3 py-1 rounded-full text-xs font-bold border bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                System Active
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100 dark:border-gray-700">
             <div className="flex flex-col gap-1">
               <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Account Type</span>
               <span className="text-gray-800 dark:text-gray-200 font-medium flex items-center gap-2">
                 <Shield className="w-4 h-4 text-emerald-500" />
                 Super Admin (Head Office)
               </span>
             </div>
             <div className="flex flex-col gap-1">
               <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Last Login</span>
               <span className="text-gray-800 dark:text-gray-200 font-medium">
                 {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
               </span>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Account Details */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
           <div>
               <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                 <User className="w-5 h-5 text-emerald-500" />
                 Account Information
               </h3>
               <div className="space-y-4">
                  <div className="flex items-start gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-750 rounded-lg transition-colors">
                     <User className="w-5 h-5 text-gray-400 mt-0.5" />
                     <div className="w-full">
                        <p className="text-xs text-gray-500 mb-0.5">Full Name</p>
                        {isEditingProfile ? (
                            <input 
                                type="text"
                                name="name"
                                value={editForm.name}
                                onChange={handleProfileChange}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        ) : (
                            <p className="text-gray-800 dark:text-gray-200 font-medium">{adminData.name}</p>
                        )}
                     </div>
                  </div>
                  <div className="flex items-start gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-750 rounded-lg transition-colors">
                     <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                     <div className="w-full">
                        <p className="text-xs text-gray-500 mb-0.5">Email Address</p>
                        {isEditingProfile ? (
                            <input 
                                type="email"
                                name="email"
                                value={editForm.email}
                                onChange={handleProfileChange}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        ) : (
                            <p className="text-gray-800 dark:text-gray-200 font-medium">{adminData.email}</p>
                        )}
                     </div>
                  </div>
                  <div className="flex items-start gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-750 rounded-lg transition-colors">
                     <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                     <div className="w-full">
                        <p className="text-xs text-gray-500 mb-0.5">Phone Number</p>
                        {isEditingProfile ? (
                            <input 
                                type="text"
                                name="phone"
                                value={editForm.phone}
                                onChange={handleProfileChange}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        ) : (
                            <p className="text-gray-800 dark:text-gray-200 font-medium">{adminData.phone}</p>
                        )}
                     </div>
                  </div>
               </div>
           </div>
        </div>

        {/* Security Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <Lock className="w-5 h-5 text-emerald-500" /> Security Settings
                </h3>
                {!isEditingPassword && (
                    <button 
                      onClick={() => setIsEditingPassword(true)}
                      className="text-sm text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
                    >
                        Change Password
                    </button>
                )}
            </div>

            {!isEditingPassword ? (
                <div className="space-y-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        <div className="flex gap-1">
                            {[1,2,3,4,5,6].map(i => <span key={i} className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full"></span>)}
                        </div>
                        <span className="ml-2">Password is set</span>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                            For security purposes, we recommend changing your password every 90 days. 
                            Ensure your new password is at least 8 characters long and includes numbers.
                        </p>
                    </div>
                </div>
            ) : (
                <form onSubmit={handlePasswordChange} className="space-y-4 bg-gray-50 dark:bg-gray-750 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Current Password</label>
                        <div className="relative">
                            <input 
                                type={showPasswords.current ? "text" : "password"}
                                required
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                value={passwords.current}
                                onChange={e => setPasswords({...passwords, current: e.target.value})}
                            />
                            <button type="button" onClick={() => setShowPasswords(p => ({...p, current: !p.current}))} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                                {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">New Password</label>
                        <div className="relative">
                            <input 
                                type={showPasswords.new ? "text" : "password"}
                                required
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                value={passwords.new}
                                onChange={e => setPasswords({...passwords, new: e.target.value})}
                            />
                            <button type="button" onClick={() => setShowPasswords(p => ({...p, new: !p.new}))} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                                {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Confirm New Password</label>
                        <input 
                            type="password"
                            required
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                            value={passwords.confirm}
                            onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                        />
                    </div>
                    
                    {msg.text && (
                        <div className={`text-xs p-2 rounded flex items-center gap-2 ${msg.type === 'error' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' : 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'}`}>
                            {msg.type === 'error' ? <AlertCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                            {msg.text}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button 
                            type="button" 
                            onClick={() => { setIsEditingPassword(false); setMsg({type:'', text:''}); }}
                            className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
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
    </div>
  );
};

export default AdminProfile;
