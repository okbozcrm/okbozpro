

import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/admin/Dashboard';
import BranchForm from './components/BranchForm';
import StaffList from './pages/admin/StaffList';
import Payroll from './pages/admin/Payroll';
import Settings from './pages/admin/Settings';
import EmployeeSettings from './pages/admin/EmployeeSettings'; 
import Expenses from './pages/admin/Expenses';
import LiveTracking from './pages/admin/LiveTracking';
// FIX: Changed import to a named import as VendorAttachment is not a default export
import { VendorAttachment } from './pages/admin/VendorAttachment';
import Corporate from './pages/admin/Corporate';
import SubAdminManagement from './pages/admin/SubAdminManagement'; // Added
import Documents from './pages/Documents';
import Leads from './pages/admin/Leads';
import Reports from './pages/admin/Reports'; 
import EmailMarketing from './pages/admin/EmailMarketing';
import { TripBooking } from './pages/admin/TripBooking';
import { CustomerCare } from './pages/admin/CustomerCare';
import AutoDialer from './pages/admin/AutoDialer';
import { DriverPayments } from './pages/admin/DriverPayments';
import DataExport from './pages/admin/DataExport'; 
import Messenger from './pages/admin/Messenger'; 
import UserAttendance from './pages/user/UserAttendance';
import UserSalary from './pages/user/UserSalary';
import ApplyLeave from './pages/user/ApplyLeave';
import UserProfile from './pages/user/UserProfile'; 
import TaskManagement from './pages/TaskManagement';
import KmClaims from './pages/KmClaims';
import GenAITools from './pages/admin/GenAITools';
import SOPDocuments from './pages/admin/SOPDocuments'; // NEW: Import SOPDocuments
import { UserRole } from './types';
import { BrandingProvider } from './context/BrandingContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { Loader2 } from 'lucide-react'; 
import { autoLoadFromCloud, syncToCloud, HARDCODED_FIREBASE_CONFIG } from './services/cloudService';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<UserRole>(UserRole.ADMIN);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initApp = async () => {
        await autoLoadFromCloud();
        const hasSession = !!localStorage.getItem('app_session_id');
        const savedRole = localStorage.getItem('user_role');
        if (hasSession && savedRole && Object.values(UserRole).includes(savedRole as UserRole)) {
          setIsAuthenticated(true);
          setUserRole(savedRole as UserRole);
        }
        setIsInitializing(false);
    };
    initApp();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    let timeoutId: any;
    const runSync = async () => {
        if (HARDCODED_FIREBASE_CONFIG.apiKey || localStorage.getItem('firebase_config')) {
            await syncToCloud();
        }
        timeoutId = setTimeout(runSync, 5000); 
    };
    timeoutId = setTimeout(runSync, 5000);

    const handleImmediateSync = () => { if (isAuthenticated) syncToCloud(); };
    window.addEventListener('cloud-sync-immediate', handleImmediateSync);

    return () => { clearTimeout(timeoutId); window.removeEventListener('cloud-sync-immediate', handleImmediateSync); };
  }, [isAuthenticated]);

  const handleLogin = (role: UserRole) => { setUserRole(role); setIsAuthenticated(true); };
  const handleLogout = () => { setIsAuthenticated(false); setUserRole(UserRole.ADMIN); localStorage.removeItem('app_session_id'); localStorage.removeItem('user_role'); };

  if (isInitializing) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
              <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
              <h2 className="text-lg font-bold text-gray-700">Syncing Database...</h2>
              <p className="text-sm text-gray-500">Connecting to Google Cloud Firebase</p>
          </div>
      );
  }

  const homePath = userRole === UserRole.EMPLOYEE ? '/user' : '/admin';

  return (
    <ThemeProvider>
      <BrandingProvider>
        <NotificationProvider>
          <HashRouter>
            {!isAuthenticated ? (
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login onLogin={handleLogin} />} />
                <Route path="/login/admin" element={<Login onLogin={handleLogin} initialTab="admin" />} />
                <Route path="/login/corporate" element={<Login onLogin={handleLogin} initialTab="corporate" />} />
                <Route path="/login/employee" element={<Login onLogin={handleLogin} initialTab="employee" />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            ) : (
                <Layout role={userRole} onLogout={handleLogout}>
                  <Routes>
                    <Route path="/" element={<Navigate to={homePath} replace />} />
                    {(userRole === UserRole.ADMIN || userRole === UserRole.CORPORATE || userRole === UserRole.SUB_ADMIN) && (
                      <>
                        <Route path="/admin" element={<Dashboard />} />
                        <Route path="/admin/reports" element={<Reports />} />
                        <Route path="/admin/marketing" element={userRole === UserRole.ADMIN || userRole === UserRole.SUB_ADMIN ? <EmailMarketing /> : <Navigate to="/admin" replace />} />
                        <Route path="/admin/customer-care" element={<CustomerCare role={userRole} />} />
                        <Route path="/admin/auto-dialer" element={<AutoDialer />} />
                        <Route path="/admin/trips" element={<TripBooking />} /> 
                        <Route path="/admin/tracking" element={<LiveTracking />} />
                        <Route path="/admin/driver-payments" element={<DriverPayments />} />
                        <Route path="/admin/leads" element={<Leads />} />
                        <Route path="/admin/tasks" element={<TaskManagement role={userRole} />} />
                        <Route path="/admin/km-claims" element={<KmClaims role={userRole} />} />
                        <Route path="/admin/attendance" element={<UserAttendance isAdmin={true} />} />
                        <Route path="/admin/branches" element={<BranchForm />} />
                        <Route path="/admin/staff" element={<StaffList />} />
                        <Route path="/admin/sub-admins" element={<SubAdminManagement />} /> 
                        <Route path="/admin/documents" element={<Documents role={userRole} />} />
                        <Route path="/admin/vendors" element={<VendorAttachment />} />
                        <Route path="/admin/payroll" element={<Payroll />} />
                        <Route path="/admin/expenses" element={<Expenses />} />
                        <Route path="/admin/finance-and-expenses" element={<Expenses />} />
                        <Route path="/admin/corporate" element={<Corporate />} />
                        <Route path="/admin/data-export" element={<DataExport />} />
                        <Route path="/admin/chat" element={<Messenger role={userRole} />} />
                        <Route path="/admin/gen-ai-tools" element={<GenAITools />} />
                        <Route path="/admin/sop" element={<SOPDocuments />} /> {/* NEW: SOP Documents Route */}
                        {userRole === UserRole.ADMIN && (
                          <>
                            <Route path="/admin/settings" element={<Settings />} />
                            <Route path="/admin/employee-settings" element={<EmployeeSettings />} />
                            <Route path="/admin/admin-finance" element={<Expenses />} />
                          </>
                        )}
                        <Route path="/admin/*" element={<div className="p-8 text-center text-gray-500">Page under construction</div>} />
                      </>
                    )}
                    {userRole === UserRole.EMPLOYEE && (
                      <>
                        <Route path="/user" element={<UserAttendance />} />
                        <Route path="/user/tasks" element={<TaskManagement role={UserRole.EMPLOYEE} />} />
                        <Route path="/user/customer-care" element={<CustomerCare role={UserRole.EMPLOYEE} />} />
                        <Route path="/user/vendors" element={<VendorAttachment />} />
                        <Route path="/user/salary" element={<UserSalary />} />
                        <Route path="/user/km-claims" element={<KmClaims role={UserRole.EMPLOYEE} />} />
                        <Route path="/user/documents" element={<Documents role={UserRole.EMPLOYEE} />} />
                        <Route path="/user/apply-leave" element={<ApplyLeave />} />
                        <Route path="/user/profile" element={<UserProfile />} />
                        <Route path="/user/chat" element={<Messenger role={UserRole.EMPLOYEE} />} />
                        <Route path="/user/reports" element={<Reports />} />
                        <Route path="/user/trips" element={<TripBooking />} />
                        <Route path="/user/tracking" element={<LiveTracking />} />
                        <Route path="/user/driver-payments" element={<DriverPayments />} />
                        <Route path="/user/attendance-admin" element={<UserAttendance isAdmin={true} />} />
                        <Route path="/user/staff" element={<StaffList />} />
                        <Route path="/user/payroll" element={<Payroll />} />
                        <Route path="/user/expenses" element={<Expenses />} />
                        <Route path="/user/auto-dialer" element={<AutoDialer />} />
                        <Route path="/user/leads" element={<Leads />} />
                        <Route path="/user/*" element={<div className="p-8 text-center text-gray-500">Page under construction</div>} />
                      </>
                    )}
                    <Route path="*" element={<Navigate to={homePath} replace />} />
                  </Routes>
                </Layout>
            )}
          </HashRouter>
        </NotificationProvider>
      </BrandingProvider>
    </ThemeProvider>
  );
};

export default App;