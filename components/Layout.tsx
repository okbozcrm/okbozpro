import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, MapPin, Calendar, DollarSign, Briefcase, Menu, X, LogOut, UserCircle, Building, Settings, Target, CreditCard, ClipboardList, ReceiptIndianRupee, Navigation, Car, Building2, PhoneIncoming, GripVertical, Edit2, Check, FileText, Layers, PhoneCall, Bus, Bell, Sun, Moon, Monitor, Mail, UserCog, CarFront, BellRing, BarChart3, Map, Headset, BellDot, Plane, Download, PhoneForwarded, Database, Sun as SunIcon, Moon as MoonIcon, MessageSquareText, Activity } from 'lucide-react';
/* FIX: Corrected import name from AppNotification to BozNotification to match types.ts export. */
import { UserRole, Enquiry, CorporateAccount, Employee, BozNotification } from '../types';
import { useBranding } from '../context/BrandingContext';
import { useTheme } from '../context/ThemeContext';
import { useNotification } from '../context/NotificationContext';
import { sendSystemNotification } from '../services/cloudService';

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
  const location = useLocation();
  const navigate = useNavigate();
  const { companyName, logoUrl, primaryColor } = useBranding();
  const { theme, setTheme } = useTheme();
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);

  // Reorder and persistance logic for sidebar links
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

  // NEW: Logic to find the specific Franchise Name for Corporate Panel
  const franchiseName = useMemo(() => {
    if (role === UserRole.CORPORATE) {
        try {
            const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
            const sessionId = localStorage.getItem('app_session_id');
            const found = corps.find((c: any) => c.email === sessionId);
            return found ? found.companyName : '';
        } catch (e) {
            return '';
        }
    }
    return '';
  }, [role]);

  const userName = role === UserRole.ADMIN ? 'Administrator' : (sessionStorage.getItem('loggedInUserName') || localStorage.getItem('logged_in_employee_name') || 'User');
  const userSubtitle = role === UserRole.ADMIN ? 'Head Office' : role === UserRole.CORPORATE ? 'Franchise Partner' : 'Staff Member';
  
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
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [role]);

  useEffect(() => {
    const checkTaskReminders = async () => {
        try {
            const tasksJson = localStorage.getItem('tasks_data');
            if (!tasksJson) return;
            
            const tasks: any[] = JSON.parse(tasksJson);
            const now = new Date();
            const sessionId = localStorage.getItem('app_session_id');
            let hasUpdate = false;

            const updatedTasks = tasks.map(task => {
                if (task.assignedTo === sessionId && 
                    task.reminderTime && 
                    !task.reminderTriggered && 
                    new Date(task.reminderTime) <= now) {
                    
                    sendSystemNotification({
                        type: 'task_assigned',
                        title: `Task Reminder: ${task.title}`,
                        message: `Scheduled reminder for task: ${task.title}. Details: ${task.description.slice(0, 100)}...`,
                        targetRoles: [role],
                        employeeId: sessionId || undefined,
                        link: role === UserRole.EMPLOYEE ? '/user/tasks' : '/admin/tasks'
                    });

                    hasUpdate = true;
                    return { ...task, reminderTriggered: true };
                }
                return task;
            });

            if (hasUpdate) {
                localStorage.setItem('tasks_data', JSON.stringify(updatedTasks));
                window.dispatchEvent(new Event('storage'));
            }
        } catch (e) {
            console.error("Task reminder background check failed", e);
        }
    };

    const interval = setInterval(checkTaskReminders, 30000);
    checkTaskReminders();

    return () => clearInterval(interval);
  }, [role]);

  useEffect(() => {
    const checkChatMessages = () => {
        try {
            const msgs = JSON.parse(localStorage.getItem('internal_messages_data') || '[]');
            const sessionId = localStorage.getItem('app_session_id');
            if (!sessionId) return;
            const unread = msgs.filter((m: any) => m.receiverId === sessionId && !m.read).length;
            setChatUnreadCount(unread);
            if (unread > prevChatCountRef.current) {
                playAlarmSound();
            }
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
      deferredPrompt.userChoice.then((choiceResult: any) => {
        setDeferredPrompt(null);
        setIsInstallable(false);
      });
    }
  };

  const [newTaskCount, setNewTaskCount] = useState(0);

  const calculateNewTaskCount = () => {
    try {
        const enquiriesJson = localStorage.getItem('global_enquiries_data');
        if (!enquiriesJson) {
            setNewTaskCount(0);
            return;
        }
        const allEnquiries: Enquiry[] = JSON.parse(enquiriesJson);
        const sessionId = localStorage.getItem('app_session_id');
        let relevantNewEnquiries: Enquiry[] = [];
        if (role === UserRole.ADMIN) {
            relevantNewEnquiries = allEnquiries.filter(e => e.status === 'New');
        } else if (role === UserRole.CORPORATE) {
            relevantNewEnquiries = allEnquiries.filter(e => e.status === 'New' && e.assignedCorporate === sessionId);
        } else if (role === UserRole.EMPLOYEE) {
            relevantNewEnquiries = allEnquiries.filter(e => e.status === 'New' && e.assignedTo === sessionId);
        }
        setNewTaskCount(relevantNewEnquiries.length);
    } catch (e) {
        setNewTaskCount(0);
    }
  };

  useEffect(() => {
      calculateNewTaskCount();
      window.addEventListener('storage', calculateNewTaskCount);
      return () => window.removeEventListener('storage', calculateNewTaskCount);
  }, [role]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) setNotificationsOpen(false);
      if (themeRef.current && !themeRef.current.contains(event.target as Node)) setThemeMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notificationId: string, link?: string) => {
    markNotificationAsRead(notificationId);
    setNotificationsOpen(false);
    if (link) navigate(link);
  };

  const handleDragStart = (e: React.DragEvent<HTMLAnchorElement>, index: number) => {
    e.dataTransfer.setData('dragIndex', index.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLAnchorElement>, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('dragIndex'), 10);
    const newOrderedLinks = [...orderedLinks];
    const [draggedLink] = newOrderedLinks.splice(dragIndex, 1);
    newOrderedLinks.splice(dropIndex, 0, draggedLink);
    setOrderedLinks(newOrderedLinks);
    localStorage.setItem('admin_sidebar_order', JSON.stringify(newOrderedLinks.map(link => link.id)));
  };

  const visibleAdminLinks = useMemo(() => {
    return orderedLinks.filter(link => {
      if (role === UserRole.ADMIN) return true;
      const corporateAllowed = [
        'dashboard', 'reports', 'chat', 'customer-care', 'trips', 'tracking',
        'tasks', 'attendance', 'branches', 'staff', 'employee-settings',
        'documents', 'vendors', 'payroll', 'finance-and-expenses', 'driver-payments'
      ];
      if (role === UserRole.CORPORATE && corporateAllowed.includes(link.id)) return true;
      return false;
    });
  }, [role, orderedLinks]);

  const userLinks = useMemo(() => {
    const baseLinks = [
        { id: 'my-attendance', path: '/user', label: 'My Attendance', icon: Calendar },
        { id: 'my-salary', path: '/user/salary', label: 'My Salary', icon: DollarSign },
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
        'finance': { id: 'finance', path: '/user/expenses', label: 'Finance & Expenses', icon: CreditCard }
    };
    
    const addedLinks: any[] = [];
    employeePermissions.forEach(perm => {
        if (restrictedLinksMap[perm]) addedLinks.push(restrictedLinksMap[perm]);
    });
    
    const finalLinks = [...baseLinks];
    finalLinks.splice(5, 0, ...addedLinks);
    return finalLinks;
  }, [employeePermissions]);

  const sidebarLinks = role === UserRole.EMPLOYEE ? userLinks : visibleAdminLinks;
  const currentPath = location.pathname;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {showWelcomePopup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-500">
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 flex flex-col items-center justify-center text-center max-w-sm w-full animate-in zoom-in-95 duration-500 border border-gray-200 dark:border-gray-700">
                  <div className="mb-4 text-emerald-500 animate-bounce">
                      {greeting.includes('Morning') ? <SunIcon className="w-16 h-16 text-yellow-500" /> : greeting.includes('Afternoon') ? <SunIcon className="w-16 h-16" /> : <MoonIcon className="w-16 h-16" />}
                  </div>
                  <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">{greeting}!</h2>
                  <p className="text-xl text-gray-600 dark:text-gray-300 font-medium">Welcome back,</p>
                  <p className="text-2xl text-emerald-600 dark:text-emerald-400 font-bold mb-6">{welcomeName}</p>
                  <button onClick={() => setShowWelcomePopup(false)} className="mt-2 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">Dismiss</button>
              </div>
          </div>
      )}
      <div className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-white dark:bg-gray-850 border-r border-gray-100 dark:border-gray-750 transition-transform duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="flex items-center justify-between p-4 h-16 shrink-0">
          <Link to="/" className="flex items-center gap-2 cursor-pointer">
            {logoUrl ? <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain" /> : <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md" style={{ backgroundColor: primaryColor }}>{companyName.charAt(0)}</div>}
            <span className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">{companyName}</span>
          </Link>
          <button className="md:hidden p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full" onClick={() => setSidebarOpen(false)}><X className="w-5 h-5" /></button>
        </div>
        <nav className="flex-1 overflow-y-auto custom-scrollbar p-3 pt-0">
          <div className="space-y-1">
            {sidebarLinks.map((link, index) => (
              <Link
                key={link.id}
                to={link.path}
                className={`relative flex items-center gap-3 px-4 py-3 rounded-lg transition-colors group ${currentPath === link.path ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-750'}`}
                draggable={(role === UserRole.ADMIN || role === UserRole.CORPORATE) && isEditingSidebar}
                onDragStart={(e) => (role === UserRole.ADMIN || role === UserRole.CORPORATE) && isEditingSidebar && handleDragStart(e, index)}
                onDragOver={(e) => (role === UserRole.ADMIN || role === UserRole.CORPORATE) && isEditingSidebar && handleDragOver(e)}
                onDrop={(e) => (role === UserRole.ADMIN || role === UserRole.CORPORATE) && isEditingSidebar && handleDrop(e, index)}
              >
                <link.icon className={`w-5 h-5 ${currentPath === link.path ? 'text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400'}`} />
                <span className={`text-sm font-medium ${currentPath === link.path ? 'text-white' : ''}`}>{link.label}</span>
                {(link.id === 'chat' || link.id === 'chat-employee') && chatUnreadCount > 0 && <span className="ml-auto px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse shadow-sm">{chatUnreadCount}</span>}
                {link.id === 'reception' && newTaskCount > 0 && <span className="ml-auto px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">{newTaskCount}</span>}
                {isEditingSidebar && (role === UserRole.ADMIN || role === UserRole.CORPORATE) && <GripVertical className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 cursor-grab" />}
              </Link>
            ))}
          </div>
          {(role === UserRole.ADMIN || role === UserRole.CORPORATE) && (
             <div className="mt-4 p-2 border-t border-gray-100 dark:border-gray-700">
                <button onClick={() => setIsEditingSidebar(!isEditingSidebar)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"><Edit2 className="w-4 h-4 text-gray-500 dark:text-gray-400" /> {isEditingSidebar ? 'Done Editing' : 'Edit Sidebar'}</button>
             </div>
          )}
          {role === UserRole.EMPLOYEE && isInstallable && (
             <div className="mt-4 p-2 border-t border-gray-100 dark:border-gray-700">
                <button onClick={handleInstallClick} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"><Download className="w-4 h-4" /> Install App</button>
             </div>
          )}
        </nav>
      </div>
      <div className="flex-1 flex flex-col md:ml-64 relative">
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 bg-white dark:bg-gray-850 border-b border-gray-100 dark:border-gray-750 shrink-0 relative z-40">
          <button className="md:hidden p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full" onClick={() => setSidebarOpen(true)}><Menu className="w-5 h-5" /></button>
          
          <div className="hidden md:block">
            <h1 className="text-lg font-semibold text-gray-800 dark:text-white">
                {sidebarLinks.find(link => currentPath.startsWith(link.path))?.label || 'Dashboard'}
            </h1>
          </div>

          {/* NEW: Centered Franchise Name for Corporate Users */}
          {role === UserRole.CORPORATE && franchiseName && (
              <div className="absolute left-1/2 -translate-x-1/2 hidden lg:flex flex-col items-center animate-in fade-in slide-in-from-top-2 duration-700">
                  <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-[0.3em]">{franchiseName}</span>
                  </div>
                  <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent mt-1"></div>
              </div>
          )}

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-3 mr-1 pl-3 border-l border-gray-100 dark:border-gray-700 hidden sm:flex">
                {/* Profile Text - Hidden for Franchise as requested */}
                {role !== UserRole.CORPORATE && (
                    <div className="text-right">
                        <p className="text-sm font-semibold text-gray-800 dark:text-white leading-tight">{userName}</p>
                        <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400">{userSubtitle}</p>
                    </div>
                )}
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-300"><UserCircle className="w-5 h-5" /></div>
            </div>
            <div className="relative" ref={notificationRef}>
                <button onClick={() => { setNotificationsOpen(!notificationsOpen); if (!notificationsOpen && unreadCount > 0) markAllNotificationsAsRead(); }} className={`relative p-2 rounded-full text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${unreadCount > 0 && !notificationsOpen ? 'animate-blink-bell' : ''}`} title="Notifications"><BellDot className="w-5 h-5" />{unreadCount > 0 && <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-850"></span>}</button>
                {notificationsOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-750 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center"><h3 className="font-bold text-gray-800 dark:text-white">Notifications ({unreadCount})</h3><button onClick={markAllNotificationsAsRead} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Mark All as Read</button></div>
                        <div className="max-h-80 overflow-y-auto custom-scrollbar divide-y divide-gray-100 dark:divide-gray-700">
                            {notifications.length === 0 ? <p className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">No new notifications.</p> : notifications.map(notif => (
                                <div key={notif.id} onClick={() => handleNotificationClick(notif.id, notif.link)} className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${notif.read ? 'opacity-70' : 'font-medium bg-blue-50 dark:bg-blue-950'}`}>
                                    <p className="text-sm text-gray-800 dark:text-white flex items-center gap-2">{notif.type === 'new_enquiry' && <Headset className="w-4 h-4 text-emerald-600" />}{notif.type === 'task_assigned' && <ClipboardList className="w-4 h-4 text-indigo-600" />}{notif.type === 'login' && <UserCircle className="w-4 h-4 text-blue-600" />}{notif.title}</p>
                                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">{notif.message}</p>
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{new Date(notif.timestamp).toLocaleString()}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <div className="relative" ref={themeRef}>
              <button onClick={() => setThemeMenuOpen(!themeMenuOpen)} className="p-2 rounded-full text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Toggle theme">{theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}</button>
              {themeMenuOpen && (
                <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-750 rounded-md shadow-lg border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
                  <button onClick={() => { setTheme('light'); setThemeMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"><Sun className="w-4 h-4" /> Light</button>
                  <button onClick={() => { setTheme('dark'); setThemeMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"><Moon className="w-4 h-4" /> Dark</button>
                  <button onClick={() => { setTheme('system'); setThemeMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"><Monitor className="w-4 h-4" /> System</button>
                </div>
              )}
            </div>
            <button onClick={onLogout} className="p-2 rounded-full text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ml-1" title="Logout"><LogOut className="w-5 h-5" /></button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto custom-scrollbar p-6">{children}</main>
      </div>
    </div>
  );
};

export default Layout;