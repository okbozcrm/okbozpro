
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, MapPin, Calendar, DollarSign, Briefcase, Menu, X, LogOut, UserCircle, Building, Settings, Target, CreditCard, ClipboardList, ReceiptIndianRupee, Navigation, Car, Building2, PhoneIncoming, GripVertical, Edit2, Check, FileText, Layers, PhoneCall, Bus, Bell, Sun, Moon, Monitor, Mail, UserCog, CarFront, BellRing, BarChart3, Map, Headset, BellDot, Plane, Download, PhoneForwarded, Database, Sun as SunIcon, Moon as MoonIcon, MessageSquareText, Activity, Bike, RefreshCw, Loader2 } from 'lucide-react';
import { UserRole, Enquiry, CorporateAccount, Employee, BozNotification, TravelAllowanceRequest } from '../types';
import { useBranding } from '../context/BrandingContext';
import { useTheme } from '../context/ThemeContext';
import { useNotification } from '../context/NotificationContext';
import { sendSystemNotification, restoreFromCloud } from '../services/cloudService';

interface LayoutProps {
  children: React.ReactNode;
  role: UserRole;
  onLogout: () => void;
}

const MASTER_ADMIN_LINKS = [
  { id: 'dashboard', path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'chat', path: '/admin/chat', label: 'Boz Chat', icon: MessageSquareText },
  { id: 'reports', path: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { id: 'marketing', path: '/admin/marketing', label: 'Email Marketing', icon: Mail },
  { id: 'auto-dialer', path: '/admin/auto-dialer', label: 'Auto Dialer', icon: PhoneForwarded },
  { id: 'customer-care', path: '/admin/customer-care', label: 'Customer Care', icon: Headset },
  { id: 'trips', path: '/admin/trips', label: 'Trip Booking', icon: Map },
  { id: 'tracking', path: '/admin/tracking', label: 'Live Tracking', icon: Navigation },
  { id: 'driver-payments', path: '/admin/driver-payments', label: 'Driver Payments', icon: ReceiptIndianRupee }, 
  { id: 'leads', path: '/admin/leads', label: 'Franchisee Leads', icon: Layers },
  { id: 'tasks', path: '/admin/tasks', label: 'Tasks', icon: ClipboardList },
  { id: 'km-claims', path: '/admin/km-claims', label: 'KM Claims (TA)', icon: Bike },
  { id: 'attendance', path: '/admin/attendance', label: 'Attendance Dashboard', icon: Activity },
  { id: 'branches', path: '/admin/branches', label: 'Branches', icon: Building },
  { id: 'staff', path: '/admin/staff', label: 'Staff Management', icon: Users },
  { id: 'employee-settings', path: '/admin/employee-settings', label: 'Employee Setting', icon: UserCog },
  { id: 'documents', path: '/admin/documents', label: 'Documents', icon: FileText },
  { id: 'vendors', path: '/admin/vendors', label: 'Vendor Attachment', icon: CarFront },
  { id: 'payroll', path: '/admin/payroll', label: 'Payroll', icon: DollarSign },
  { id: 'finance-and-expenses', path: '/admin/finance-and-expenses', label: 'Finance & Expenses', icon: CreditCard },
  { id: 'corporate', path: '/admin/corporate', label: 'Corporate', icon: Building2 },
  { id: 'data-export', path: '/admin/data-export', label: 'Data & Backup', icon: Database }, 
  { id: 'settings', path: '/admin/settings', label: 'Settings', icon: Settings },
];

const Layout: React.FC<LayoutProps> = ({ children, role, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isEditingSidebar, setIsEditingSidebar] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { companyName, logoUrl, primaryColor } = useBranding();
  const { theme, setTheme } = useTheme();
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);

  const [orderedLinks, setOrderedLinks] = useState(() => {
    const savedOrder = localStorage.getItem('admin_sidebar_order');
    if (savedOrder) {
      try {
        const orderIds = JSON.parse(savedOrder);
        const reordered = orderIds
          .map((id: string) => MASTER_ADMIN_LINKS.find(link => link.id === id))
          .filter((link: any): link is typeof MASTER_ADMIN_LINKS[0] => !!link);
        const missing = MASTER_ADMIN_LINKS.filter(link => !orderIds.includes(link.id));
        return [...reordered, ...missing];
      } catch (e) {
        return MASTER_ADMIN_LINKS;
      }
    }
    return MASTER_ADMIN_LINKS;
  });

  const currentSessionId = localStorage.getItem('app_session_id') || 'admin';
  const { notifications, unreadCount, markNotificationAsRead, markAllNotificationsAsRead, playAlarmSound } = useNotification();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  
  const themeRef = useRef<HTMLDivElement>(null);
  const [employeePermissions, setEmployeePermissions] = useState<string[]>([]);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [pendingTaCount, setPendingTaCount] = useState(0);

  useEffect(() => {
    if (role === UserRole.EMPLOYEE) {
      const sessionId = localStorage.getItem('app_session_id');
      if (!sessionId) return;
      let foundEmp: Employee | null = null;
      try {
        const adminStaff = JSON.parse(localStorage.getItem('staff_data') || '[]');
        foundEmp = adminStaff.find((e: Employee) => e.id === sessionId);
      } catch(e) {}
      if (!foundEmp) {
        try {
          const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
          for (const corp of corps) {
            const corpStaff = JSON.parse(localStorage.getItem(`staff_data_${corp.email}`) || '[]');
            foundEmp = corpStaff.find((e: Employee) => e.id === sessionId);
            if (foundEmp) break;
          }
        } catch(e) {}
      }
      if (foundEmp && foundEmp.moduleAccess) setEmployeePermissions(foundEmp.moduleAccess);
    }
  }, [role]);

  const userLinks = useMemo(() => {
    const baseLinks = [
        { id: 'my-attendance', path: '/user', label: 'My Attendance', icon: Calendar },
        { id: 'auto-dialer', path: '/user/auto-dialer', label: 'Auto Dialer', icon: PhoneForwarded },
        { id: 'my-salary', path: '/user/salary', label: 'My Salary', icon: DollarSign },
        { id: 'my-km-claims', path: '/user/km-claims', label: 'My KM Claims (TA)', icon: Bike },
        { id: 'my-documents', path: '/user/documents', label: 'My Documents', icon: FileText },
        { id: 'apply-leave', path: '/user/apply-leave', label: 'Apply Leave', icon: Plane },
        { id: 'my-profile', path: '/user/profile', label: 'My Profile', icon: UserCircle },
        { id: 'customer-care-employee', path: '/user/customer-care', label: 'Customer Care', icon: Headset },
        { id: 'chat-employee', path: '/user/chat', label: 'Boz Chat', icon: MessageSquareText },
        { id: 'my-tasks', path: '/user/tasks', label: 'My Tasks', icon: ClipboardList },
        { id: 'vendors-employee', path: '/user/vendors', label: 'Vendor Attachment', icon: CarFront },
    ];
    
    const restrictedLinksMap: Record<string, any> = {
        'reports': { id: 'reports', path: '/user/reports', label: 'Reports', icon: BarChart3 },
        'trips': { id: 'trips', path: '/user/trips', label: 'Trip Booking', icon: Map },
        'driver-payments': { id: 'driver-payments', path: '/user/driver-payments', label: 'Driver Payments', icon: ReceiptIndianRupee },
        'attendance_admin': { id: 'attendance_admin', path: '/user/attendance-admin', label: 'Attendance (Admin)', icon: Activity },
        'staff': { id: 'staff', path: '/user/staff', label: 'Staff Management', icon: Users },
        'payroll': { id: 'payroll', path: '/user/payroll', label: 'Payroll (Admin)', icon: DollarSign },
        'finance': { id: 'finance', path: '/user/expenses', label: 'Finance & Expenses', icon: CreditCard },
        'leads': { id: 'leads', path: '/user/leads', label: 'Franchisee Leads', icon: Layers } // Correctly mapped to /user/leads
    };
    
    const addedLinks: any[] = [];
    employeePermissions.forEach(perm => {
        if (restrictedLinksMap[perm]) addedLinks.push(restrictedLinksMap[perm]);
    });
    
    const finalLinks = [...baseLinks];
    finalLinks.splice(6, 0, ...addedLinks);
    return finalLinks;
  }, [employeePermissions]);

  const visibleAdminLinks = useMemo(() => {
    return orderedLinks.filter(link => {
      if (role === UserRole.ADMIN) return true;
      const corporateAllowed = [
        'dashboard', 'reports', 'chat', 'customer-care', 'trips', 'tracking',
        'tasks', 'attendance', 'branches', 'staff',
        'documents', 'vendors', 'payroll', 'finance-and-expenses', 'driver-payments', 'km-claims',
        'auto-dialer', 'leads'
      ];
      if (role === UserRole.CORPORATE && corporateAllowed.includes(link.id)) return true;
      return false;
    });
  }, [role, orderedLinks]);

  const sidebarLinks = role === UserRole.EMPLOYEE ? userLinks : visibleAdminLinks;
  const currentPath = location.pathname;

  const handleManualRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
        await restoreFromCloud();
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('attendance-updated'));
    } catch (e) { console.error(e); }
    finally { setTimeout(() => setIsRefreshing(false), 800); }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <div className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-white dark:bg-gray-850 border-r border-gray-100 dark:border-gray-750 transition-transform duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="flex items-center justify-between p-4 h-16 shrink-0">
          <Link to="/" className="flex items-center gap-2 cursor-pointer">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md" style={{ backgroundColor: primaryColor }}>{companyName.charAt(0)}</div>
            <span className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">{companyName}</span>
          </Link>
          <button className="md:hidden p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full" onClick={() => setSidebarOpen(false)}><X className="w-5 h-5" /></button>
        </div>
        <nav className="flex-1 overflow-y-auto custom-scrollbar p-3 pt-0">
          <div className="space-y-1">
            {sidebarLinks.map((link) => (
              <Link
                key={link.id}
                to={link.path}
                className={`relative flex items-center gap-3 px-4 py-3 rounded-lg transition-colors group ${currentPath === link.path ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-750'}`}
              >
                <link.icon className={`w-5 h-5 ${currentPath === link.path ? 'text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400'}`} />
                <span className={`text-sm font-medium ${currentPath === link.path ? 'text-white' : ''}`}>{link.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </div>
      <div className="flex-1 flex flex-col md:ml-64 relative">
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 bg-white dark:bg-gray-850 border-b border-gray-100 dark:border-gray-750 shrink-0 relative z-40">
          <button className="md:hidden p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full" onClick={() => setSidebarOpen(true)}><Menu className="w-5 h-5" /></button>
          <div className="hidden md:block">
            <h1 className="text-lg font-semibold text-gray-800 dark:text-white">
                {sidebarLinks.find(link => currentPath === link.path || currentPath.startsWith(link.path + '/'))?.label || 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleManualRefresh} disabled={isRefreshing} className={`p-2 rounded-full text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all ${isRefreshing ? 'opacity-50' : 'hover:scale-105'}`} title="Refresh Data"><RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} /></button>
            <button onClick={onLogout} className="p-2 rounded-full text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ml-1" title="Logout"><LogOut className="w-5 h-5" /></button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto custom-scrollbar p-6">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
