
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, doc, setDoc, collection, getDocs, Firestore, updateDoc, query, where } from "firebase/firestore";
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

const GLOBAL_KEYS = [
  'corporate_accounts',
  'global_enquiries_data',
  'call_enquiries_history',
  'recription_recent_transfers',
  'payroll_history',
  'leave_history',
  'global_leave_requests',
  'global_travel_requests',
  'app_settings',
  'transport_pricing_rules_v2',
  'transport_rental_packages_v2',
  'company_departments',
  'company_roles',
  'company_shifts',
  'company_payout_dates',
  'company_global_payout_day',
  'company_auto_live_track',
  'global_attendance_modes',
  'salary_advances',
  'app_branding',
  'app_theme',
  'maps_api_key',
  'chat_groups_data',
  'internal_messages_data',
  'campaign_history',
  'app_documents',
  'admin_sidebar_order',
  'driver_activity_summary',
  'system_backup_logs',
  'dashboard_stats',
  'active_staff_locations',
  'analytics_cache'
];

const NAMESPACED_KEYS = [
  'staff_data',
  'branches_data',
  'leads_data',
  'vendor_data',
  'office_expenses',
  'tasks_data',
  'sub_admins',
  'trips_data',
  'driver_payment_records',
  'driver_wallet_data',
  'auto_dialer_data'
];

const DYNAMIC_PREFIXES = [
  'attendance_data_',
  'driver_activity_log_',
  'driver_wallet_data_',
  'staff_data_',
  'leads_data_',
  'branches_data_',
  'office_expenses_',
  'tasks_data_',
  'trips_data_'
];

const NOTIFICATION_COLLECTION = 'global_notifications';

let isSyncing = false;
// Use local storage to persist the "last synced" state so it survives app restarts/PWA reloads
const getSyncHashKey = (key: string) => `cloud_hash_${key}`;

const getDb = (app: FirebaseApp): Firestore => getFirestore(app);

const getFirebaseApp = (config?: FirebaseConfig): FirebaseApp | null => {
  if (HARDCODED_FIREBASE_CONFIG.apiKey && HARDCODED_FIREBASE_CONFIG.apiKey.length > 5) {
      if (getApps().length > 0) return getApp();
      return initializeApp(HARDCODED_FIREBASE_CONFIG);
  }
  return null;
};

const ensureAuth = async (app: FirebaseApp) => {
  try {
    const auth = getAuth(app);
    if (!auth.currentUser) await signInAnonymously(auth);
  } catch (e) {}
};

export const syncToCloud = async (config?: FirebaseConfig) => {
  if (isSyncing) return { success: false, message: "Sync in progress" };

  isSyncing = true;
  try {
    const app = getFirebaseApp(config);
    if (!app) {
        isSyncing = false;
        return { success: false, message: "Not Connected" };
    }

    await ensureAuth(app);
    const db = getDb(app);

    let writeCount = 0;

    const writeIfChanged = async (key: string) => {
        const data = localStorage.getItem(key);
        if (data === null) return;

        // Simple but effective: check if current data matches the last successful sync hash
        const currentHash = btoa(unescape(encodeURIComponent(data))).slice(0, 32);
        const lastHash = localStorage.getItem(getSyncHashKey(key));

        if (currentHash !== lastHash) {
            await setDoc(doc(db, "ok_boz_live_data", key), {
              content: data,
              lastUpdated: new Date().toISOString(),
              hash: currentHash
            });
            localStorage.setItem(getSyncHashKey(key), currentHash);
            writeCount++;
        }
    };
    
    // 1. Sync Global Keys
    for (const key of GLOBAL_KEYS) {
        await writeIfChanged(key);
    }

    // 2. Scan LocalStorage for all Franchisee and Employee Keys
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
            const isNamespaced = NAMESPACED_KEYS.includes(key);
            const isDynamic = DYNAMIC_PREFIXES.some(prefix => key.startsWith(prefix));
            const isAppMeta = key.startsWith('cloud_hash_') || key === 'app_session_id' || key === 'user_role';
            
            if ((isNamespaced || isDynamic) && !isAppMeta) {
                await writeIfChanged(key);
            }
        }
    }

    if (writeCount > 0) {
        console.log(`☁️ Cloud Sync Success: ${writeCount} items updated.`);
    }
    
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
            if (data.hash) {
                localStorage.setItem(getSyncHashKey(doc.id), data.hash);
            }
        }
    });
    
    return { success: true, message: "Restore complete! Data loaded from Cloud." };
  } catch (error: any) {
    return { success: false, message: `Restore failed: ${error.message}` };
  }
};

export const uploadFileToCloud = async (file: File, path: string): Promise<string | null> => {
  try {
    const app = getFirebaseApp();
    if (!app) throw new Error("Firebase not connected");
    await ensureAuth(app);
    const storage = getStorage(app);
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  } catch (error: any) {
    return null;
  }
};

export const autoLoadFromCloud = async (): Promise<boolean> => {
    try {
        const app = getFirebaseApp();
        if (!app) return false;
        const res = await restoreFromCloud();
        return res.success;
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
        else count = '1';
      } catch (e) { count = '1'; }
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
    await setDoc(doc(db, NOTIFICATION_COLLECTION, newNotification.id), newNotification);
  } catch (error) {}
};

export const fetchSystemNotifications = async (): Promise<BozNotification[]> => {
  try {
    const app = getFirebaseApp();
    if (!app) return [];
    await ensureAuth(app);
    const db = getDb(app);
    const userRole = localStorage.getItem('user_role') as UserRole;
    const sessionId = localStorage.getItem('app_session_id') || 'admin';
    const snapshot = await getDocs(collection(db, NOTIFICATION_COLLECTION));
    let allNotifications: BozNotification[] = [];
    snapshot.forEach(doc => { allNotifications.push(doc.data() as BozNotification); });
    
    return allNotifications.filter(notif => {
      if (notif.read) return false;
      if (!notif.targetRoles.includes(userRole)) return false;
      if (userRole === UserRole.EMPLOYEE && notif.employeeId !== sessionId) return false;
      if (userRole === UserRole.CORPORATE && notif.corporateId && notif.corporateId !== sessionId) return false;
      return true;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (error) { return []; }
};

export const markNotificationAsRead = async (notificationId: string) => {
  try {
    const app = getFirebaseApp();
    if (!app) return;
    await ensureAuth(app);
    const db = getDb(app);
    await updateDoc(doc(db, NOTIFICATION_COLLECTION, notificationId), { read: true });
  } catch (error) {}
};

export const setupAutoSync = () => {};
export const hydrateFromCloud = async () => Promise.resolve();
