import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, X, Shield, ShieldCheck, Mail, Phone, Lock, 
  Trash2, Edit2, Building2, Eye, EyeOff, Save, CheckSquare, Square,
  Check, AlertCircle, Info, ChevronDown, MapPin
} from 'lucide-react';
import { CorporateAccount, SubAdmin, ModulePermission, Branch } from '../../types';

const MODULES = [
  'Dashboard',
  'Live Tracking',
  'Boz Chat',
  'Employee Setting',
  'Reports',
  'Email Marketing',
  'Auto Dialer',
  'Customer Care',
  'Trip Booking',
  'Driver Payments',
  'Franchisee Leads',
  'Attendance Dashboard',
  'Tasks',
  'Staff Management',
  'Documents',
  'Branches',
  'Vendor Attachment',
  'Payroll',
  'Finance & Expenses',
  'Corporate',
  'Data & Backup',
  'Settings',
  'KM Claims (TA)'
];

const SubAdminManagement: React.FC = () => {
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  const [subAdmins, setSubAdmins] = useState<SubAdmin[]>([]);
  const [corporates, setCorporates] = useState<CorporateAccount[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Initialize empty permission state
  const getEmptyPermissions = () => {
      const p: Record<string, ModulePermission> = {};
      MODULES.forEach(m => {
          p[m] = { view: false, add: false, edit: false, delete: false };
      });
      return p;
  };

  const initialFormState = {
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'Manager',
    context: isSuperAdmin ? 'Head Office' : sessionId,
    branchAccess: 'All' as 'All' | 'None' | string[],
    status: 'Active' as 'Active' | 'Inactive',
    permissions: getEmptyPermissions()
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    const load = () => {
        // Load Sub Admins
        const saData = JSON.parse(localStorage.getItem('sub_admins_data') || '[]');
        setSubAdmins(saData);

        // Load Corporates
        const corpData = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        setCorporates(corpData);

        // Load Branches for all contexts to facilitate Super Admin
        let allBranches: any[] = [];
        const adminB = JSON.parse(localStorage.getItem('branches_data') || '[]');
        allBranches = [...adminB.map((b: any) => ({ ...b, owner: 'admin' }))];
        
        corpData.forEach((c: any) => {
            const cb = JSON.parse(localStorage.getItem(`branches_data_${c.email}`) || '[]');
            allBranches = [...allBranches, ...cb.map((b: any) => ({ ...b, owner: c.email }))];
        });
        setBranches(allBranches);
    };
    load();
    window.addEventListener('storage', load);
    return () => window.removeEventListener('storage', load);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'context') {
        setFormData({ ...formData, [name]: value, branchAccess: 'All' });
    } else {
        setFormData({ ...formData, [name]: value });
    }
  };

  const togglePermission = (module: string, action: keyof ModulePermission) => {
      setFormData(prev => {
          const perms = prev.permissions as Record<string, ModulePermission>;
          const currentModulePerms = perms[module] || { view: false, add: false, edit: false, delete: false };
          return {
              ...prev,
              permissions: {
                  ...prev.permissions,
                  [module]: {
                      ...currentModulePerms,
                      [action]: !currentModulePerms[action]
                  }
              }
          };
      });
  };

  const toggleAllInModule = (module: string) => {
      const perms = formData.permissions as Record<string, ModulePermission>;
      const current = perms[module] || { view: false, add: false, edit: false, delete: false };
      const isAllOn = current.view && current.add && current.edit && current.delete;
      setFormData(prev => ({
          ...prev,
          permissions: {
              ...prev.permissions,
              [module]: {
                  view: !isAllOn,
                  add: !isAllOn,
                  edit: !isAllOn,
                  delete: !isAllOn
              }
          }
      }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) return;

    const payload: SubAdmin = {
        ...formData,
        id: editingId || `SA-${Date.now()}`,
        createdAt: editingId ? (subAdmins.find(s => s.id === editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
        branchAccess: formData.branchAccess
    };

    let updatedList: SubAdmin[];
    if (editingId) {
        updatedList = subAdmins.map(s => s.id === editingId ? payload : s);
    } else {
        updatedList = [payload, ...subAdmins];
    }

    localStorage.setItem('sub_admins_data', JSON.stringify(updatedList));
    setSubAdmins(updatedList);
    window.dispatchEvent(new Event('cloud-sync-immediate'));
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(initialFormState);
  };

  const handleEdit = (sa: SubAdmin) => {
    setEditingId(sa.id);
    setFormData({
        name: sa.name,
        email: sa.email,
        password: sa.password,
        phone: sa.phone,
        role: sa.role,
        context: sa.context,
        branchAccess: sa.branchAccess,
        status: sa.status,
        permissions: {
            ...getEmptyPermissions(),
            ...sa.permissions
        }
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Remove this Sub Admin? They will lose all access immediately.")) {
        const updated = subAdmins.filter(s => s.id !== id);
        setSubAdmins(updated);
        localStorage.setItem('sub_admins_data', JSON.stringify(updated));
        window.dispatchEvent(new Event('cloud-sync-immediate'));
    }
  };

  const filteredAdmins = subAdmins.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         s.email.toLowerCase().includes(searchTerm.toLowerCase());
    // Non-super admins only see sub-admins within their own context
    const matchesContext = isSuperAdmin || s.context === sessionId;
    return matchesSearch && matchesContext;
  });

  const availableBranchesForContext = useMemo(() => {
      const targetContext = formData.context === 'Head Office' ? 'admin' : formData.context;
      return branches.filter((b: any) => b.owner === targetContext);
  }, [branches, formData.context]);

  const availableContexts = useMemo(() => {
      if (isSuperAdmin) {
          return [
              { id: 'Head Office', name: 'Head Office (Internal)' },
              ...corporates.map(c => ({ id: c.email, name: `${c.companyName} (${c.city})` }))
          ];
      } else {
          const myCorp = corporates.find(c => c.email === sessionId);
          return [
              { id: sessionId, name: myCorp ? `${myCorp.companyName} (${myCorp.city})` : 'My Franchise' }
          ];
      }
  }, [isSuperAdmin, corporates, sessionId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Sub Admin Management</h2>
          <p className="text-gray-500">
              {isSuperAdmin ? 'Create administrative users with granular module permissions' : 'Manage sub-administrators for your branch'}
          </p>
        </div>
        <button 
            onClick={() => { setEditingId(null); setFormData(initialFormState); setIsModalOpen(true); }}
            className="bg-slate-900 hover:bg-black text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all transform active:scale-95"
        >
            <ShieldCheck className="w-5 h-5" /> Add Sub Admin
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search admins by name or email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-slate-900 outline-none font-medium"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAdmins.map(admin => (
          <div key={admin.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl ${admin.status === 'Inactive' ? 'bg-gray-100 text-gray-400' : 'bg-slate-100 text-slate-800'}`}>
                  <Shield className="w-6 h-6" />
                </div>
                <div className="flex flex-col items-end">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                    admin.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-gray-50 text-gray-500 border-gray-100'
                  }`}>
                    {admin.status}
                  </span>
                  <p className="text-[9px] text-gray-400 mt-1 font-bold">CONTEXT: {admin.context === 'Head Office' ? 'HQ' : 'CORP'}</p>
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 truncate">{admin.name}</h3>
              <p className="text-indigo-600 font-bold text-xs uppercase tracking-wider mb-4">{admin.role}</p>
              
              <div className="space-y-2 border-t border-gray-50 pt-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Mail className="w-4 h-4" /> {admin.email}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Phone className="w-4 h-4" /> {admin.phone}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400 mt-2 bg-gray-50 p-2 rounded-lg">
                  <Info className="w-3 h-3 shrink-0" />
                  <span className="truncate">Perms: {Object.values(admin.permissions || {}).filter(p => (p as any).view).length} Modules Active</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-between items-center group-hover:bg-indigo-50/20 transition-colors">
               <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Added: {new Date(admin.createdAt).toLocaleDateString()}</span>
               <div className="flex gap-1">
                  <button onClick={() => handleEdit(admin)} className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(admin.id)} className="p-2 text-gray-400 hover:text-rose-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
               </div>
            </div>
          </div>
        ))}
        {filteredAdmins.length === 0 && (
            <div className="col-span-full py-20 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200 text-gray-400">
                <Shield className="w-16 h-16 mx-auto mb-4 opacity-10" />
                <p className="font-bold uppercase tracking-widest text-sm">No sub admins found.</p>
            </div>
        )}
      </div>

      {/* --- ADD/EDIT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col animate-in fade-in zoom-in duration-200 border border-gray-100 overflow-hidden">
            
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
               <div>
                <h3 className="text-2xl font-black text-gray-800 tracking-tighter">{editingId ? 'Edit Sub Admin' : 'Add New Sub Admin'}</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Control Access & Security</p>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl text-gray-400 hover:text-gray-900 transition-all shadow-sm">
                  <X className="w-7 h-7" />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
               <form onSubmit={handleSubmit} className="space-y-10">
                  {/* Identity Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Assign to Context</label>
                        <div className="relative">
                            <select 
                                name="context" 
                                value={formData.context} 
                                onChange={handleInputChange} 
                                disabled={!isSuperAdmin}
                                className={`w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none font-bold text-gray-800 ${!isSuperAdmin ? 'bg-gray-100 cursor-not-allowed opacity-80' : 'bg-gray-50 cursor-pointer'}`}
                            >
                                {availableContexts.map(ctx => (
                                    <option key={ctx.id} value={ctx.id}>{ctx.name}</option>
                                ))}
                            </select>
                            <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            {isSuperAdmin && <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Full Name *</label>
                        <input name="name" required value={formData.name} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-800" placeholder="Display Name" />
                      </div>
                      
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Role *</label>
                        <select name="role" required value={formData.role} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-800">
                            <option>Manager</option>
                            <option>Accountant</option>
                            <option>HR Executive</option>
                            <option>Supervisor</option>
                            <option>Franchise Coordinator</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Email (Login ID) *</label>
                        <input type="email" name="email" required value={formData.email} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-800" placeholder="admin@okboz.com" />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Password *</label>
                        <div className="relative">
                            <input 
                                type={showPassword ? "text" : "password"} 
                                name="password" required value={formData.password} onChange={handleInputChange} 
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-800" 
                                placeholder="••••••••" 
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Phone</label>
                        <input name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-800" placeholder="+91..." />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Branch Access</label>
                        <div className="relative">
                            <select 
                                name="branchAccess" 
                                value={typeof formData.branchAccess === 'string' ? formData.branchAccess : 'Specific'} 
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setFormData({ ...formData, branchAccess: (val === 'Specific' ? [] : val) as any });
                                }}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none font-bold text-gray-800"
                            >
                                <option value="All">All / Standard Access</option>
                                <option value="None">None (Review Only)</option>
                                {availableBranchesForContext.length > 0 && <option value="Specific">Specific Branch</option>}
                            </select>
                            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                        </div>
                        {Array.isArray(formData.branchAccess) && (
                            <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2 animate-in fade-in slide-in-from-top-2">
                                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 px-1">Select Active Branches</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {availableBranchesForContext.map(branch => (
                                        <label key={branch.id} className="flex items-center gap-3 p-2 bg-white border border-gray-100 rounded-lg cursor-pointer hover:bg-indigo-50 transition-colors">
                                            <input 
                                                type="checkbox"
                                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                                                checked={formData.branchAccess.includes(branch.name)}
                                                onChange={(e) => {
                                                    const current = formData.branchAccess as string[];
                                                    const updated = e.target.checked 
                                                        ? [...current, branch.name]
                                                        : current.filter(n => n !== branch.name);
                                                    setFormData({ ...formData, branchAccess: updated });
                                                }}
                                            />
                                            <span className="text-xs font-bold text-gray-700">{branch.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Account Status</label>
                        <select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-gray-800 outline-none appearance-none cursor-pointer">
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                      </div>
                  </div>

                  {/* Permissions Matrix Section */}
                  <div className="pt-6">
                      <div className="flex items-center gap-2 mb-6">
                          <CheckSquare className="w-5 h-5 text-indigo-500" />
                          <h4 className="font-black text-gray-800 text-sm uppercase tracking-[0.2em]">Access Permissions Matrix</h4>
                      </div>
                      
                      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-inner">
                          <table className="w-full text-left">
                              <thead className="bg-gray-50/80 border-b border-gray-100">
                                  <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                      <th className="px-6 py-4">Module</th>
                                      <th className="px-6 py-4 text-center">View</th>
                                      <th className="px-6 py-4 text-center">Add</th>
                                      <th className="px-6 py-4 text-center">Edit</th>
                                      <th className="px-6 py-4 text-center">Delete</th>
                                      <th className="px-6 py-4 text-center bg-indigo-50/30">All</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                  {MODULES.map(module => {
                                      const perms = formData.permissions as Record<string, ModulePermission>;
                                      const p = perms[module] || { view: false, add: false, edit: false, delete: false };
                                      const isAllSelected = p.view && p.add && p.edit && p.delete;
                                      return (
                                          <tr key={module} className="hover:bg-gray-50/50 transition-colors">
                                              <td className="px-6 py-4 font-bold text-gray-700 text-sm">{module}</td>
                                              <td className="px-6 py-4 text-center">
                                                  <button type="button" onClick={() => togglePermission(module, 'view')} className={`p-1 rounded-md transition-colors ${p.view ? 'text-emerald-500' : 'text-gray-300'}`}>
                                                      {p.view ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
                                                  </button>
                                              </td>
                                              <td className="px-6 py-4 text-center">
                                                  <button type="button" onClick={() => togglePermission(module, 'add')} className={`p-1 rounded-md transition-colors ${p.add ? 'text-emerald-500' : 'text-gray-300'}`}>
                                                      {p.add ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
                                                  </button>
                                              </td>
                                              <td className="px-6 py-4 text-center">
                                                  <button type="button" onClick={() => togglePermission(module, 'edit')} className={`p-1 rounded-md transition-colors ${p.edit ? 'text-emerald-500' : 'text-gray-300'}`}>
                                                      {p.edit ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
                                                  </button>
                                              </td>
                                              <td className="px-6 py-4 text-center">
                                                  <button type="button" onClick={() => togglePermission(module, 'delete')} className={`p-1 rounded-md transition-colors ${p.delete ? 'text-rose-500' : 'text-gray-300'}`}>
                                                      {p.delete ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
                                                  </button>
                                              </td>
                                              <td className="px-6 py-4 text-center bg-indigo-50/10">
                                                  <button type="button" onClick={() => toggleAllInModule(module)} className={`p-1 rounded-md transition-colors ${isAllSelected ? 'text-indigo-600' : 'text-gray-300'}`}>
                                                      {isAllSelected ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
                                                  </button>
                                              </td>
                                          </tr>
                                      );
                                  })}
                              </tbody>
                          </table>
                      </div>
                  </div>
               </form>
            </div>

            <div className="p-8 border-t border-gray-100 bg-gray-50 flex justify-end gap-4 shrink-0">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-8 py-3.5 bg-white border border-gray-200 text-gray-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all shadow-sm"
                >
                  Discard
                </button>
                <button 
                  onClick={handleSubmit}
                  className="px-12 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-slate-900/20 hover:bg-black transition-all transform active:scale-95 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" /> {editingId ? 'Update Access' : 'Create Sub Admin'}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubAdminManagement;