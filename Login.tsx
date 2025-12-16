
import React, { useState } from 'react';
import { UserRole } from '../types';
import { Shield, User, Lock, Mail, ArrowRight, Building2, Eye, EyeOff, AlertTriangle, Cloud, BadgeCheck } from 'lucide-react';
import { useBranding } from '../context/BrandingContext';
import { sendSystemNotification, HARDCODED_FIREBASE_CONFIG } from '../services/cloudService'; // Import sendSystemNotification

interface LoginProps {
  onLogin: (role: UserRole) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const { companyName, logoUrl, primaryColor } = useBranding();
  const [activeTab, setActiveTab] = useState<'admin' | 'corporate' | 'employee'>('admin');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Check connection status based on config availability
  const isConnected = !!(HARDCODED_FIREBASE_CONFIG.apiKey && HARDCODED_FIREBASE_CONFIG.apiKey.length > 5) || !!localStorage.getItem('firebase_config');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate network delay for better UX
    setTimeout(async () => {
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
            
            // Store employee details for logout notification if it's an employee
            if (role === UserRole.EMPLOYEE) {
                localStorage.setItem('logged_in_employee_name', employeeName);
                localStorage.setItem('logged_in_employee_id', employeeId);
                localStorage.setItem('logged_in_employee_corporate_id', corporateOwnerId);

                // Send login notification
                // Fix: Explicitly cast 'type' to 'login' literal string
                const loginNotification = {
                    type: 'login' as 'login',
                    title: 'Employee Logged In',
                    message: `${employeeName} (${employeeId}) has logged in.`,
                    targetRoles: [UserRole.ADMIN, UserRole.CORPORATE],
                    corporateId: corporateOwnerId, // Admin sees all, Corporate only sees their own staff's logins
                    employeeId: employeeId,
                    link: `/admin/staff` // Admin and Corporate can go to staff list
                };
                await sendSystemNotification(loginNotification);
            }

            onLogin(role);
        } else {
            setError('Invalid credentials. Please check email and password.');
        }
        setIsLoading(false);
    }, 800);
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 font-sans"
      style={{ background: `linear-gradient(135deg, ${primaryColor}, #111827)` }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex overflow-hidden min-h-[500px] relative z-10">
        
        {/* Left Side */}
        <div className="hidden md:flex w-1/2 bg-gray-50 p-10 flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-8">
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
              <span className="text-2xl font-bold text-gray-800 tracking-tight">{companyName}</span>
            </div>
            
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              Staff Management System
            </h2>
            <p className="text-gray-600 leading-relaxed mb-8">
              Secure login for Admin, Franchise Partners, and Staff Members.
            </p>
            
            <div className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg w-fit mb-6 transition-colors ${isConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                <Cloud className="w-4 h-4" /> 
                {isConnected ? 'Cloud Database Connected' : 'Local Mode (No Cloud)'}
            </div>
          </div>
        </div>

        {/* Right Side */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Sign In</h3>
            <p className="text-gray-500 text-sm">Welcome back! Please enter your details.</p>
          </div>

          {/* Tabs */}
          <div className="bg-gray-100 p-1 rounded-xl flex mb-6">
            <button
              onClick={() => { setActiveTab('admin'); setEmail(''); setPassword(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'admin' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Admin
            </button>
            <button
              onClick={() => { setActiveTab('corporate'); setEmail(''); setPassword(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'corporate' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Franchise
            </button>
            <button
              onClick={() => { setActiveTab('employee'); setEmail(''); setPassword(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'employee' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Employee
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-shadow"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-shadow"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded-lg flex gap-2 items-start animate-in fade-in slide-in-from-top-1">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5"/>
                    <span>{error}</span>
                </div>
            )}

            <button type="submit" disabled={isLoading} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {isLoading ? (
                <>Logging in...</> 
              ) : (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
