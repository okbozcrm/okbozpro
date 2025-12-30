
import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { Shield, User, Lock, Mail, ArrowRight, Building2, Eye, EyeOff, AlertTriangle, Cloud, BadgeCheck, Download } from 'lucide-react';
import { useBranding } from '../context/BrandingContext';
import { sendSystemNotification, HARDCODED_FIREBASE_CONFIG } from '../services/cloudService'; // Import sendSystemNotification
import { BozNotification } from '../types'; 

interface LoginProps {
  onLogin: (role: UserRole) => void;
  initialTab?: 'admin' | 'corporate' | 'employee'; // NEW: Optional prop to pre-select tab
}

const Login: React.FC<LoginProps> = ({ onLogin, initialTab = 'admin' }) => {
  const { companyName, logoUrl, primaryColor } = useBranding();
  const [activeTab, setActiveTab] = useState<'admin' | 'corporate' | 'employee'>(initialTab); // Use initialTab prop
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        }
        setDeferredPrompt(null);
        setIsInstallable(false);
      });
    }
  };

  // Check connection status based on config availability
  const isConnected = !!(HARDCODED_FIREBASE_CONFIG.apiKey && HARDCODED_FIREBASE_CONFIG.apiKey.length > 5) || !!localStorage.getItem('firebase_config');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate network delay for better UX
    // Encapsulate async logic in a named function to ensure proper await context
    const executePostLoginActions = async () => {
        let success = false;
        let role = UserRole.ADMIN;
        let sessionId = '';
        let employeeName = '';
        let employeeId = '';
        let corporateOwnerId = ''; // To store corporate email if employee belongs to one

        if (activeTab === 'admin') {
            // Check against stored admin password or default
            const storedAdminPass = localStorage.getItem('admin_password') || '123456'; 
            const adminEmail = 'okboz.com@gmail.com'; 

            if (email.toLowerCase() === adminEmail.toLowerCase() && password === storedAdminPass) {
                success = true;
                role = UserRole.ADMIN;
                sessionId = 'admin';
            } else {
                // Check Sub Admins
                try {
                    const subAdmins = JSON.parse(localStorage.getItem('sub_admins_data') || '[]');
                    const foundSub = subAdmins.find((s: any) => s.email.toLowerCase() === email.toLowerCase() && s.password === password && s.status === 'Active');
                    
                    if (foundSub) {
                        success = true;
                        role = UserRole.SUB_ADMIN;
                        // For data scoping, we set sessionId to the context (admin or corporate email)
                        // This allows the sub-admin to see the data of the entity they manage
                        sessionId = foundSub.context === 'Head Office' ? 'admin' : foundSub.context;
                        employeeName = foundSub.name;
                        
                        // Store specific sub-admin ID for permission checks
                        localStorage.setItem('sub_admin_id', foundSub.id);
                    }
                } catch(e) {
                    console.error("Sub admin login error", e);
                }
            }
        } 
        else if (activeTab === 'corporate') {
            // 1. Check Stored Corporate Accounts
            const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
            const foundCorp = corps.find((c: any) => c.email.toLowerCase() === email.toLowerCase() && c.password === password);
            
            if (foundCorp) {
                success = true;
                role = UserRole.CORPORATE;
                sessionId = foundCorp.email;
            }
        } 
        else if (activeTab === 'employee') {
            // 1. Search Admin Staff
            let foundEmp = null;
            try {
                const adminStaff = JSON.parse(localStorage.getItem('staff_data') || '[]');
                foundEmp = adminStaff.find((e: any) => e.email?.toLowerCase() === email.toLowerCase() && e.password === password);
                if (foundEmp) corporateOwnerId = 'admin';
            } catch(e) {}

            // 2. Search Corporate Staff if not found
            if (!foundEmp) {
                try {
                    const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
                    for (const corp of corps) {
                        const corpStaff = JSON.parse(localStorage.getItem(`staff_data_${corp.email}`) || '[]');
                        foundEmp = corpStaff.find((e: any) => e.email?.toLowerCase() === email.toLowerCase() && e.password === password);
                        if (foundEmp) {
                            corporateOwnerId = corp.email; // Found in this corporate account
                            break;
                        }
                    }
                } catch(e) {}
            }

            if (foundEmp) {
                success = true;
                role = UserRole.EMPLOYEE;
                sessionId = foundEmp.id;
                employeeName = foundEmp.name;
                employeeId = foundEmp.id;
            }
        }

        if (success) {
            localStorage.setItem('app_session_id', sessionId);
            localStorage.setItem('user_role', role);
            
            // Trigger Welcome Popup on next load
            sessionStorage.setItem('justLoggedIn', 'true');
            if (role === UserRole.EMPLOYEE || role === UserRole.SUB_ADMIN) {
                sessionStorage.setItem('loggedInUserName', employeeName);
            }

            // Store employee details for logout notification if it's an employee
            if (role === UserRole.EMPLOYEE) {
                localStorage.setItem('logged_in_employee_name', employeeName);
                localStorage.setItem('logged_in_employee_id', employeeId);
                localStorage.setItem('logged_in_employee_corporate_id', corporateOwnerId);

                // Send login notification
                const loginNotification: Omit<BozNotification, 'id' | 'timestamp' | 'read'> = {
                    type: 'login',
                    title: 'Employee Logged In',
                    message: `${employeeName} (${employeeId}) has logged in.`,
                    targetRoles: [UserRole.ADMIN, UserRole.CORPORATE],
                    corporateId: corporateOwnerId, // Admin sees all, Corporate only sees their own staff's logins
                    employeeId: employeeId,
                    link: `/admin/staff` // Admin and Corporate can go to staff list
                };
                sendSystemNotification(loginNotification);
            }

            onLogin(role);
        } else {
            setError('Invalid credentials. Please check email and password.');
        }
        setIsLoading(false);
    };

    setTimeout(() => {
      executePostLoginActions();
    }, 800);
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 font-sans bg-gray-900 relative"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex overflow-hidden min-h-[600px] relative z-10">
        
        {/* Left Side - Image Background */}
        <div className="hidden md:flex w-1/2 relative bg-gray-900">
          <img 
            src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80" 
            alt="Modern Office" 
            className="absolute inset-0 w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
          
          <div className="relative z-10 p-10 flex flex-col justify-between h-full text-white">
            <div className="flex items-center gap-2">
              {logoUrl ? (
                 <img src={logoUrl} alt="Logo" className="w-10 h-10 object-contain" />
              ) : (
                <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg"
                    style={{ backgroundColor: primaryColor }}
                >
                    {companyName.charAt(0)}
                </div>
              )}
              <span className="text-2xl font-bold tracking-tight">{companyName}</span>
            </div>
            
            <div className="space-y-4">
              <h2 className="text-4xl font-bold leading-tight">
                Streamline your workforce.
              </h2>
              <p className="text-gray-300 text-lg leading-relaxed">
                The all-in-one platform for attendance, payroll, and field force management.
              </p>
              
              <div className={`inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full w-fit backdrop-blur-md border border-white/20 ${isConnected ? 'bg-emerald-50/20 text-emerald-300' : 'bg-white/10 text-gray-300'}`}>
                  <Cloud className="w-4 h-4" /> 
                  {isConnected ? 'Cloud Connected' : 'Local Mode'}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-white relative">
          <div className="max-w-sm mx-auto w-full">
            <div className="mb-8">
                <h3 className="text-3xl font-bold text-gray-900 mb-2">Sign In</h3>
                <p className="text-gray-500">Welcome back! Please enter your details.</p>
            </div>

            {/* Tabs */}
            <div className="bg-gray-100 p-1.5 rounded-xl flex mb-8">
                <button
                onClick={() => { setActiveTab('admin'); setEmail(''); setPassword(''); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'admin' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                Admin
                </button>
                <button
                onClick={() => { setActiveTab('corporate'); setEmail(''); setPassword(''); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'corporate' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                Franchise
                </button>
                <button
                onClick={() => { setActiveTab('employee'); setEmail(''); setPassword(''); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'employee' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                Employee
                </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
                <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-medium text-gray-900"
                    placeholder="name@company.com"
                    />
                </div>
                </div>

                <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-12 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-medium text-gray-900"
                    placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                </div>
                </div>

                {error && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded-lg flex gap-2 items-start animate-in fade-in slide-in-from-top-1">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5"/>
                        <span>{error}</span>
                    </div>
                )}

                <button type="submit" disabled={isLoading} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all transform hover:scale-[1.02] disabled:opacity-70 disabled:scale-100 flex items-center justify-center gap-2">
                {isLoading ? (
                    <>Logging in...</> 
                ) : (
                    <>Sign In <ArrowRight className="w-5 h-5" /></>
                )}
                </button>

                {/* Install App Button for Employees */}
                {activeTab === 'employee' && isInstallable && (
                    <button 
                        type="button"
                        onClick={handleInstallClick}
                        className="w-full py-3 border border-emerald-200 bg-emerald-50 text-emerald-700 rounded-xl font-bold hover:bg-emerald-100 transition-all flex items-center justify-center gap-2 mt-4"
                    >
                        <Download className="w-5 h-5" /> Install Employee App
                    </button>
                )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
