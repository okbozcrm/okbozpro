
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, doc, setDoc, collection, getDocs, Firestore, updateDoc, initializeFirestore } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth, signInAnonymously } from "firebase/auth";
import { BozNotification, UserRole } from '../types';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

// 🔒 PERMANENT CONNECTION AREA
export const HARDCODED_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: "AIzaSyAD7Svj-vyOxc5JYgvpv92W63AxoQ1FDNM",
  authDomain: "okboz-pro.firebaseapp.com",
  projectId: "okboz-pro",
  storageBucket: "okboz-pro.firebasestorage.app",
  messagingSenderId: "604894528742",
  appId: "1:604894528742:web:9c2693404dbd24591fe727",
  measurementId: "G-87HDWVRKJY"
};

export const HARDCODED_MAPS_API_KEY = "AIzaSyCOMoIZNP1pjhJ8O9zhGf6KLWr6pngqDWs";

// 🌐 Org-Wide Shared Data
const GLOBAL_KEYS = [
  'corporate_accounts',
  'sub_admins_data', // Added for Sub Admin management
  'global_enquiries_data',
  'global_travel_requests', // KM Claims
  'global_leave_requests',
  'internal_messages_data', // Boz Chat
  'office_expenses',
  'campaign_history', // Email Marketing
  'app_branding',
  'app_theme',
  'maps_api_key',
  'dashboard_stats',
  'google_sheet_script_url' // Added for Trip Booking Integration
];

// 🏢 Franchise-Specific Data (Suffix applied automatically)
const NAMESPACED_KEYS = [
  'staff_data',
  'branches_data',
  'leads_data',
  'vendor_data',
  'tasks_data',
  'trips_data',
  'driver_payment_records',
  'driver_wallet_data',
  'auto_dialer_data',
  'payroll_history',
  'company_departments',
  'company_roles',
  'company_shifts',
  'company_payout_dates',
  'corporate_profit_overview', // Added for Profit & Expense Report Sync
  'analytics_cache' // Added for Full Reports Page Sync
];

// ⚡ Real-time Dynamic Logs
const DYNAMIC_PREFIXES = [
  'attendance_data_',
  'driver_activity_log_',
  'active_staff_locations'
];

const NOTIFICATION_COLLECTION = 'global_notifications';

let isSyncing = false;
const lastSyncedData: Record<string, string> = {};

const getActiveConfig = (config?: FirebaseConfig): FirebaseConfig | null => {
  if (HARDCODED_FIREBASE_CONFIG.apiKey && HARDCODED_FIREBASE_CONFIG.apiKey.length > 5) {
      return HARDCODED_FIREBASE_CONFIG;
  }
  let activeConfig = config;
  if (!activeConfig || !activeConfig.apiKey) {
     const saved = localStorage.getItem('firebase_config');
     if (saved) activeConfig = JSON.parse(saved);
  }
  if (!activeConfig || !activeConfig.apiKey) return null;
  return activeConfig;
};

const getFirebaseApp = (config?: FirebaseConfig): FirebaseApp | null => {
  const activeConfig = getActiveConfig(config);
  if (!activeConfig) return null;
  
  if (getApps().length > 0) return getApp();
  
  try {
    const app = initializeApp(activeConfig);
    // Initialize Firestore with long polling to prevent connection issues in certain environments
    try {
        initializeFirestore(app, {
            experimentalForceLongPolling: true,
        });
    } catch(e) {
        // Firestore might already be initialized if getApps() missed something or race condition
        console.warn("Firestore initialization warning:", e);
    }
    return app;
  } catch (e) {
    console.error("Firebase Init Error:", e);
    return null;
  }
};

const ensureAuth = async (app: FirebaseApp) => {
  try {
    const auth = getAuth(app);
    if (!auth.currentUser) await signInAnonymously(auth);
  } catch (e) {}
};

const getDb = (app: FirebaseApp): Firestore => getFirestore(app);

export const syncToCloud = async (config?: FirebaseConfig) => {
  if (isSyncing) return { success: false, message: "Sync in progress" };

  isSyncing = true;
  try {
    const app = getFirebaseApp(config);
    if (!app) return { success: false, message: "Not Connected" };

    await ensureAuth(app);
    const db = getDb(app);

    const corporateAccountsStr = localStorage.getItem('corporate_accounts');
    const corporates = corporateAccountsStr ? JSON.parse(corporateAccountsStr) : [];

    let writeCount = 0;

    const writeIfChanged = async (key: string) => {
        const data = localStorage.getItem(key);
        if (!data || lastSyncedData[key] === data) return;
        await setDoc(doc(db, "ok_boz_live_data", key), {
          content: data,
          lastUpdated: new Date().toISOString()
        });
        lastSyncedData[key] = data;
        writeCount++;
    };
    
    // 1. Sync Global Shared State
    for (const key of GLOBAL_KEYS) await writeIfChanged(key);

    // 2. Sync Staff Data (Root)
    await writeIfChanged('staff_data');

    // 3. Sync Corporate Namespaced Keys
    if (Array.isArray(corporates)) {
      for (const corp of corporates) {
        const email = corp.email;
        if (!email) continue;
        for (const prefix of NAMESPACED_KEYS) {
          await writeIfChanged(`${prefix}_${email}`);
        }
      }
    }

    // 4. Sync Dynamic/Employee Specific Data
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && DYNAMIC_PREFIXES.some(prefix => key.startsWith(prefix))) {
            await writeIfChanged(key);
        }
    }

    if (writeCount > 0) console.log(`☁️ Cloud Sync: Updated ${writeCount} modules.`);
    return { success: true, message: `Sync complete! (${writeCount} updates)` };
  } catch (error: any) {
    console.error("Sync Error:", error);
    return { success: false, message: `Sync failed: ${error.message}` };
  } finally {
    isSyncing = false;
  }
};

export const restoreFromCloud = async (config?: FirebaseConfig) => {
  try {
    const app = getFirebaseApp(config);
    if (!app) return { success: false, message: "No Configuration" };
    await ensureAuth(app);
    const db = getDb(app);
    const snapshot = await getDocs(collection(db, "ok_boz_live_data"));
    if (snapshot.empty) return { success: true, message: "Connected, but database is empty." };
    
    snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.content) {
            localStorage.setItem(doc.id, data.content);
            lastSyncedData[doc.id] = data.content;
        }
    });
    
    console.log("✅ All Data Mirrored from Cloud");
    return { success: true, message: "Restore complete!" };
  } catch (error: any) {
    console.error("Restore Error:", error);
    return { success: false, message: `Restore failed: ${error.message}` };
  }
};

export const uploadFileToCloud = async (file: File, path: string): Promise<string | null> => {
  try {
    const app = getFirebaseApp();
    if (!app) throw new Error("Firebase not connected");
    await ensureAuth(app);
    if (!app.options.storageBucket) return null;
    const storage = getStorage(app);
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  } catch (error: any) {
    console.error("Cloud Upload Failed:", error.code, error.message);
    return null;
  }
};

export const autoLoadFromCloud = async (): Promise<boolean> => {
    try {
        const app = getFirebaseApp();
        if (!app) return false;
        await restoreFromCloud();
        return true;
    } catch (e) { return false; }
};

export const getCloudDatabaseStats = async (config?: FirebaseConfig) => {
  try {
    const app = getFirebaseApp(config);
    if (!app) return null;
    await ensureAuth(app);
    const db = getDb(app);
    const snapshot = await getDocs(collection(db, "ok_boz_live_data"));
    const stats: Record<string, any> = {};
    snapshot.forEach(doc => {
      const data = doc.data();
      let count = '-';
      try {
        const parsed = JSON.parse(data.content);
        if (Array.isArray(parsed)) count = parsed.length.toString();
        else if (typeof parsed === 'object') count = Object.keys(parsed).length.toString();
        else count = '1';
      } catch (e) { count = 'Raw'; }
      stats[doc.id] = { count: count, lastUpdated: data.lastUpdated };
    });
    return stats;
  } catch (error: any) { return null; }
};

export const sendSystemNotification = async (notification: Omit<BozNotification, 'id' | 'timestamp' | 'read'>) => {
  try {
    const app = getFirebaseApp();
    if (!app) return;
    await ensureAuth(app);
    const db = getDb(app);
    const newNotification: BozNotification = {
      ...notification,
      id: `NOTIF-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };

    const cleanData = Object.fromEntries(
      Object.entries(newNotification).filter(([_, value]) => value !== undefined)
    );

    await setDoc(doc(db, NOTIFICATION_COLLECTION, newNotification.id), cleanData);
  } catch (error) { console.error("Failed to send notification:", error); }
};

export const fetchSystemNotifications = async (): Promise<BozNotification[]> => {
  try {
    const app = getFirebaseApp();
    if (!app) return [];
    await ensureAuth(app);
    const db = getDb(app);
    
    // Get current user context
    const userRole = localStorage.getItem('user_role') as UserRole;
    const sessionId = localStorage.getItem('app_session_id') || 'admin';
    
    const snapshot = await getDocs(collection(db, NOTIFICATION_COLLECTION));
    let allNotifications: BozNotification[] = [];
    snapshot.forEach(doc => { allNotifications.push(doc.data() as BozNotification); });
    
    const relevantNotifications = allNotifications.filter(notif => {
      // 1. Basic Read/Validity Check
      if (notif.read) return false;
      
      // 2. Role Check: Is this notification allowed for this role?
      const isTargetRole = notif.targetRoles && notif.targetRoles.includes(userRole);
      if (!isTargetRole) return false;

      // 3. Super Admin: Sees ALL notifications targeted at ADMIN
      if (userRole === UserRole.ADMIN) {
          return true;
      }

      // 4. Employee (Staff): Strict Check
      // Only show if the notification is explicitly assigned to their ID (e.g. Tasks, Leave Updates)
      if (userRole === UserRole.EMPLOYEE) {
          return notif.employeeId === sessionId;
      }

      // 5. Corporate (Franchisee): Strict Check
      // Only show if the notification is explicitly assigned to their Corporate ID
      // (e.g. Staff Logins under their franchise, Leads assigned to their franchise)
      if (userRole === UserRole.CORPORATE) {
          return notif.corporateId === sessionId;
      }

      return false;
    });

    return relevantNotifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (error) { console.error("Failed to fetch notifications:", error); return []; }
};

export const markNotificationAsRead = async (notificationId: string) => {
  try {
    const app = getFirebaseApp();
    if (!app) return;
    await ensureAuth(app);
    const db = getDb(app);
    await updateDoc(doc(db, NOTIFICATION_COLLECTION, notificationId), { read: true });
  } catch (error) { console.error("Failed to mark notification as read:", error); }
};

export const setupAutoSync = () => {};
export const hydrateFromCloud = async () => Promise.resolve();
