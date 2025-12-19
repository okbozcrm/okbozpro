
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
// Fixed: Added missing 'Calculator' icon to imports
import { LayoutDashboard, Users, MapPin, Calendar, DollarSign, Briefcase, Menu, X, LogOut, UserCircle, Building, Settings, Target, CreditCard, ClipboardList, ReceiptIndianRupee, Navigation, Car, Building2, PhoneIncoming, GripVertical, Edit2, Check, FileText, Layers, PhoneCall, Bus, Bell, Sun, Moon, Monitor, Mail, UserCog, CarFront, BellRing, BarChart3, Map, Headset, BellDot, Plane, Download, PhoneForwarded, Database, Sun as SunIcon, Moon as MoonIcon, Sunrise, Sunset, MessageSquareText, Sparkles, Zap, PhoneForwarded as PhoneIcon, Calculator } from 'lucide-react';
import { UserRole, Enquiry, CorporateAccount, Employee } from '../types';
import { useBranding } from '../context/BrandingContext';
import { useTheme } from '../context/ThemeContext';
import { useNotification } from '../context/NotificationContext';

interface LayoutProps {
  children: React.ReactNode;
  role: UserRole;
  onLogout: () => void;
}

const MASTER_ADMIN_LINKS = [
  { id: 'dashboard', path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'chat', path: '/admin/chat', label: 'Boz Chat', icon: MessageSquareText },
  { id: 'ai-tools', path: '/admin/ai-tools', label: 'GenAI Tools', icon: Sparkles },
  { id: 'customer-care', path: '/admin/customer-care', label: 'Customer Care', icon: Headset },
  { id: 'call-enquiries', path: '/admin/call-enquiries', label: 'Call Log', icon: PhoneIcon },
  { id: 'transport-calc', path: '/admin/transport-calculator', label: 'Transport Calc', icon: Calculator },
  { id: 'reports', path: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { id: 'trips', path: '/admin/trips', label: 'Trip Booking', icon: Map },
  { id: 'tracking', path: '/admin/tracking', label: 'Live Tracking', icon: Navigation },
  { id: 'driver-monitoring', path: '/admin/driver-monitoring', label: 'Driver Activity', icon: Bus },
  { id: 'driver-payments', path: '/admin/driver-payments', label: 'Driver Wallet', icon: ReceiptIndianRupee }, 
  { id: 'marketing', path: '/admin/marketing', label: 'Email Marketing', icon: Mail },
  { id: 'auto-dialer', path: '/admin/auto-dialer', label: 'Auto Dialer', icon: PhoneForwarded },
  { id: 'leads', path: '/admin/leads', label: 'Franchisee Leads', icon: Layers },
  { id: 'tasks', path: '/admin/tasks', label: 'Tasks', icon: ClipboardList },
  { id: 'attendance', path: '/admin/attendance', label: 'Attendance', icon: Calendar },
  { id: 'branches', path: '/admin/branches', label: 'Branches', icon: Building },
  { id: 'staff', path: '/admin/staff', label: 'Staffing', icon: Users },
  { id: 'documents', path: '/admin/documents', label: 'Documents', icon: FileText },
  { id: 'vendors', path: '/admin/vendors', label: 'Vendors', icon: CarFront },
  { id: 'payroll', path: '/admin/payroll', label: 'Payroll', icon: DollarSign },
  { id: 'finance', path: '/admin/expenses', label: 'Finance', icon: CreditCard },
  { id: 'corporate', path: '/admin/corporate', label: 'Franchise List', icon: Building2 },
  { id: 'subscription', path: '/admin/subscription', label: 'Subscription', icon: Zap },
  { id: 'data-export', path: '/admin/data-export', label: 'Data & Backup', icon: Database }, 
  { id: 'settings', path: '/admin/settings', label: 'Settings', icon: Settings },
];

const Layout: React.FC<LayoutProps> = ({ children, role, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isEditingSidebar, setIsEditingSidebar] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { companyName, logoUrl, primaryColor } = useBranding();
  const { theme, setTheme } = useTheme();
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  
  const { notifications, unreadCount, markNotificationAsRead, markAllNotificationsAsRead, playAlarmSound } = useNotification();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);
  
  const [employeePermissions, setEmployeePermissions] = useState<string[]>([]);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [welcomeName, setWelcomeName] = useState('');
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const prevChatCountRef = useRef(0);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    const justLoggedIn = sessionStorage.getItem('justLoggedIn');
    if (justLoggedIn === 'true' && role === UserRole.EMPLOYEE) {
        const hour = new Date().getHours();
        let greet = 'Good Morning';
        if (hour >= 12 && hour < 17) greet = 'Good Afternoon';
        else if (hour >= 17) greet = 'Good Evening';
        setGreeting(greet);
        setWelcomeName(sessionStorage.getItem('loggedInUserName') || 'Employee');
        setShowWelcomePopup(true);
        sessionStorage.removeItem('justLoggedIn');
        setTimeout(() => setShowWelcomePopup(false), 3000);
    }
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, [role]);

  useEffect(() => {
    const checkChatMessages = () => {
        try {
            const msgs = JSON.parse(localStorage.getItem('internal_messages_data') || '[]');
            const sessionId = localStorage.getItem('app_session_id');
            if (!sessionId) return;
            const unread = msgs.filter((m: any) => m.receiverId === sessionId && !m.read).length;
            setChatUnreadCount(unread);
            if (unread > prevChatCountRef.current) playAlarmSound();
            prevChatCountRef.current = unread;
        } catch (e) {}
    };
    checkChatMessages();
    const interval = setInterval(checkChatMessages, 3000);
    return () => clearInterval(interval);
  }, [playAlarmSound]);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => {
        setDeferredPrompt(null);
        setIsInstallable(false);
      });
    }
  };

  useEffect(() => {
    const sessionId = localStorage.getItem('app_session_id');
    if (role === UserRole.ADMIN) {
      setUserName('Senthil Kumar');
      setUserSubtitle('CEO & Founder');
    } 
    else if (role === UserRole.CORPORATE) {
      try {
        const accounts: CorporateAccount[] = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        const account = accounts.find((acc: CorporateAccount) => acc.email === sessionId);
        if (account) {
            setUserName(account.companyName);
            setUserSubtitle(account.city ? `${account.city} Branch` : 'Corporate Partner');
        }
      } catch (e) {}
    } 
    else if (role === UserRole.EMPLOYEE) {
       try {
         let emp: Employee | undefined;
         const adminStaff: Employee[] = JSON.parse(localStorage.getItem('staff_data') || '[]');
         emp = adminStaff.find((e: Employee) => e.id === sessionId);
         if (!emp) {
            const accounts: CorporateAccount[] = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
            for (const acc of accounts) {
                const corpStaff: Employee[] = JSON.parse(localStorage.getItem(`staff_data_${acc.email}`) || '[]');
                emp = corpStaff.find((e: Employee) => e.id === sessionId);
                if (emp) break;
            }
         }
         if (emp) {
             setUserName(emp.name);
             setUserSubtitle(emp.role);
             setEmployeePermissions(emp.moduleAccess || []);
         }
       } catch(e) {}
    }
  }, [role]);

  const [userName, setUserName] = useState('');
  const [userSubtitle, setUserSubtitle] = useState('');
  const [orderedLinks, setOrderedLinks] = useState(MASTER_ADMIN_LINKS);

  useEffect(() => {
    if (role === UserRole.ADMIN || role === UserRole.CORPORATE) {
      const savedOrder = localStorage.getItem('admin_sidebar_order');
      if (savedOrder) {
        try {
          const orderIds: string[] = JSON.parse(savedOrder);
          const sorted = [...MASTER_ADMIN_LINKS].sort((a, b) => {
            const indexA = orderIds.indexOf(a.id);
            const indexB = orderIds.indexOf(b.id);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            return 0;
          });
          setOrderedLinks(sorted);
        } catch (e) {}
      }
    }
  }, [role]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) setNotificationsOpen(false);
      if (themeRef.current && !themeRef.current.contains(event.target as Node)) setThemeMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('dragIndex', index.toString());
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    const dragIndex = parseInt(e.dataTransfer.getData('dragIndex'), 10);
    const newOrderedLinks = [...orderedLinks];
    const [draggedLink] = newOrderedLinks.splice(dragIndex, 1);
    newOrderedLinks.splice(dropIndex, 0, draggedLink);
    setOrderedLinks(newOrderedLinks);
    localStorage.setItem('admin_sidebar_order', JSON.stringify(newOrderedLinks.map(link => link.id)));
  };

  const sidebarLinks = useMemo(() => {
    if (role === UserRole.EMPLOYEE) {
        const base = [
            { id: 'dash-emp', path: '/user/dashboard', label: 'Overview', icon: LayoutDashboard }, // Added Dashboard for Employee
            { id: 'care-emp', path: '/user/customer-care', label: 'Customer Care', icon: Headset },
            { id: 'chat-emp', path: '/user/chat', label: 'Boz Chat', icon: MessageSquareText },
            { id: 'tasks-emp', path: '/user/tasks', label: 'My Tasks', icon: ClipboardList },
            { id: 'vendors-emp', path: '/user/vendors', label: 'Vendors', icon: CarFront },
            { id: 'attendance-emp', path: '/user', label: 'Attendance', icon: Calendar },
            { id: 'salary-emp', path: '/user/salary', label: 'Salary', icon: DollarSign },
            { id: 'profile-emp', path: '/user/profile', label: 'Profile', icon: UserCircle },
        ];
        const permissionMap: Record<string, any> = {
            'reports': { id: 'reports', path: '/user/reports', label: 'Reports', icon: BarChart3 },
            'trips': { id: 'trips', path: '/user/trips', label: 'Trip Booking', icon: Map },
            'driver-monitoring': { id: 'driver-monitoring', path: '/user/driver-monitoring', label: 'Driver Activity', icon: Bus }
        };
        const extra = employeePermissions.map(p => permissionMap[p]).filter(Boolean);
        return [...base, ...extra];
    }
    return orderedLinks.filter(link => {
      if (role === UserRole.ADMIN) return true;
      const corpAllowed = ['dashboard', 'chat', 'customer-care', 'trips', 'tracking', 'driver-monitoring', 'tasks', 'attendance', 'branches', 'staff', 'documents', 'vendors', 'payroll', 'finance', 'driver-payments'];
      return corpAllowed.includes(link.id);
    });
  }, [role, orderedLinks, employeePermissions]);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <div className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-white dark:bg-gray-850 border-r border-gray-100 dark:border-gray-750 transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="flex items-center justify-between p-4 h-16 shrink-0">
          <Link to="/" className="flex items-center gap-2">
            {logoUrl ? <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain" /> : <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: primaryColor }}>{companyName.charAt(0)}</div>}
            <span className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">{companyName}</span>
          </Link>
          <button className="md:hidden p-2 text-gray-400" onClick={() => setSidebarOpen(false)}><X className="w-5 h-5" /></button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 pt-0 custom-scrollbar">
          <div className="space-y-1">
            {sidebarLinks.map((link, index) => (
              <Link
                key={link.id}
                to={link.path}
                className={`relative flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors group ${location.pathname === link.path ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-750'}`}
                draggable={isEditingSidebar}
                onDragStart={(e) => isEditingSidebar && handleDragStart(e, index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => isEditingSidebar && handleDrop(e, index)}
              >
                <link.icon className={`w-5 h-5 ${location.pathname === link.path ? 'text-white' : 'text-gray-400 group-hover:text-emerald-500'}`} />
                <span className="text-sm font-medium">{link.label}</span>
                {(link.id === 'chat' || link.id === 'chat-emp') && chatUnreadCount > 0 && <span className="ml-auto px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">{chatUnreadCount}</span>}
                {isEditingSidebar && <GripVertical className="absolute right-2 text-gray-300 w-4 h-4 cursor-grab" />}
              </Link>
            ))}
          </div>
          {(role === UserRole.ADMIN || role === UserRole.CORPORATE) && (
             <div className="mt-4 p-2 border-t border-gray-100 dark:border-gray-700">
                <button onClick={() => setIsEditingSidebar(!isEditingSidebar)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors">
                   <Edit2 className="w-3.5 h-3.5" /> {isEditingSidebar ? 'Done Editing' : 'Customize Sidebar'}
                </button>
             </div>
          )}
        </nav>
      </div>

      <div className="flex-1 flex flex-col md:ml-64">
        <header className="h-16 flex items-center justify-between px-6 bg-white dark:bg-gray-850 border-b border-gray-100 dark:border-gray-750 shrink-0">
          <button className="md:hidden p-2 text-gray-500" onClick={() => setSidebarOpen(true)}><Menu className="w-5 h-5" /></button>
          <h1 className="text-lg font-semibold text-gray-800 dark:text-white">{sidebarLinks.find(l => location.pathname.startsWith(l.path))?.label || 'Dashboard'}</h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-3 mr-2 px-3 border-l border-gray-100 dark:border-gray-700 hidden sm:flex">
                <div className="text-right">
                    <p className="text-sm font-bold text-gray-800 dark:text-white">{userName}</p>
                    <p className="text-[10px] font-medium text-gray-400">{userSubtitle}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400"><UserCircle className="w-5 h-5" /></div>
            </div>
            <div className="relative" ref={notificationRef}>
                <button onClick={() => setNotificationsOpen(!notificationsOpen)} className={`p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${unreadCount > 0 ? 'animate-pulse' : ''}`}>
                    <BellDot className="w-5 h-5" />
                    {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>}
                </button>
            </div>
            <div className="relative" ref={themeRef}>
              <button onClick={() => setThemeMenuOpen(!themeMenuOpen)} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>
            </div>
            <button onClick={onLogout} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"><LogOut className="w-5 h-5" /></button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
