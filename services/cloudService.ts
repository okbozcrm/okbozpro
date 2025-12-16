
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, doc, setDoc, collection, getDocs, Firestore, updateDoc, query, where } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth, signInAnonymously } from "firebase/auth";
import { Notification, UserRole } from '../types'; // Import Notification and UserRole

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

// ============================================================================
// 🔒 PERMANENT CONNECTION AREA
// ============================================================================
// Keys provided by user.
// ============================================================================

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

// ============================================================================

export const DEFAULT_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: ''
};

// --- DATA MAPPING ---
// These keys will be automatically synced to the database
const GLOBAL_KEYS = [
  'corporate_accounts',
  'global_enquiries_data',
  'call_enquiries_history',
  'reception_recent_transfers',
  'payroll_history',
  'leave_history',
  'app_settings',
  'transport_pricing_rules_v2',
  'transport_rental_packages_v2',
  'company_departments',
  'company_roles',
  'company_shifts',
  'company_payout_dates',
  'company_global_payout_day',
  'salary_advances',
  'app_branding',
  'app_theme',
  'maps_api_key' // Ensures Maps Key set by Admin syncs to Franchise panels
];

const NAMESPACED_KEYS = [
  'staff_data',
  'branches_data',
  'leads_data',
  'vendor_data',
  'office_expenses',
  'tasks_data',
  'sub_admins',
  'app_settings',
  'trips_data'
];

const NOTIFICATION_COLLECTION = 'global_notifications';

// --- SYNC STATE MANAGEMENT ---
let isSyncing = false;
// Cache to track what has been written to cloud to avoid redundant writes
const lastSyncedData: Record<string, string> = {};

// Helper to check for mock data to prevent pollution of production DB
const isMockDataPresent = (): boolean => {
  const staffData = localStorage.getItem('staff_data');
  
  // Check for known mock data signatures (e.g. from constants.ts or initial state)
  // If the user hasn't cleared the default data, we shouldn't sync.
  if (staffData && (staffData.includes('John Doe') || staffData.includes('"id":"E001"'))) {
    return true;
  }
  return false;
};

// Helper to get the active configuration
const getActiveConfig = (config?: FirebaseConfig): FirebaseConfig | null => {
  // 1. Priority: Hardcoded Config (The Permanent Solution)
  if (HARDCODED_FIREBASE_CONFIG.apiKey && HARDCODED_FIREBASE_CONFIG.apiKey.length > 5) {
      return HARDCODED_FIREBASE_CONFIG;
  }

  // 2. Fallback: Passed config or LocalStorage (The Temporary Solution)
  let activeConfig = config;
  if (!activeConfig || !activeConfig.apiKey) {
     const saved = localStorage.getItem('firebase_config');
     if (saved) activeConfig = JSON.parse(saved);
  }
  
  if (!activeConfig || !activeConfig.apiKey) return null;
  return activeConfig;
};

// Helper to initialize App safely
const getFirebaseApp = (config?: FirebaseConfig): FirebaseApp | null => {
  const activeConfig = getActiveConfig(config);
  if (!activeConfig) return null;

  // Avoid duplicate app initialization error
  if (getApps().length > 0) {
    return getApp();
  }

  try {
    return initializeApp(activeConfig);
  } catch (e) {
    console.error("Firebase Init Error:", e);
    return null;
  }
};

// Helper to authenticate anonymously if needed
const ensureAuth = async (app: FirebaseApp) => {
  try {
    const auth = getAuth(app);
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
  } catch (e) {
    // console.warn("Firebase Auth: Anonymous sign-in failed (Rules might require open access)", e);
  }
};

// Helper to initialize DB safely
const getDb = (app: FirebaseApp): Firestore => {
  return getFirestore(app);
};

// --- SYNC FUNCTION (Saves data to Cloud) ---
export const syncToCloud = async (config?: FirebaseConfig) => {
  // SAFETY GUARD: Prevent syncing if mock data is detected
  if (isMockDataPresent()) {
    console.log("☁️ Sync Skipped: Mock data detected. Clear data before syncing to production.");
    return { success: true, message: "Sync Skipped: Mock Data Present" };
  }

  // CONCURRENCY GUARD: Prevent overlapping syncs
  if (isSyncing) {
    console.log("⏳ Sync skipped: Previous sync still in progress.");
    return { success: false, message: "Sync in progress" };
  }

  isSyncing = true;

  try {
    const app = getFirebaseApp(config);
    if (!app) return { success: false, message: "Not Connected" };

    await ensureAuth(app); // Ensure authenticated
    const db = getDb(app);

    const corporateAccountsStr = localStorage.getItem('corporate_accounts');
    const corporates = corporateAccountsStr ? JSON.parse(corporateAccountsStr) : [];

    let writeCount = 0;

    // Helper to write only if changed
    const writeIfChanged = async (key: string) => {
        const data = localStorage.getItem(key);
        if (!data) return; // Nothing to save

        // Optimization: Only write if data has changed since last sync
        if (lastSyncedData[key] === data) return;

        await setDoc(doc(db, "ok_boz_live_data", key), {
          content: data,
          lastUpdated: new Date().toISOString()
        });
        
        lastSyncedData[key] = data; // Update cache
        writeCount++;
    };
    
    // 1. Save Global & Root Namespaced Data (Head Office)
    const rootKeys = [...GLOBAL_KEYS, ...NAMESPACED_KEYS];
    for (const key of rootKeys) {
      await writeIfChanged(key);
    }

    // 2. Save Corporate Specific Data
    if (Array.isArray(corporates)) {
      for (const corp of corporates) {
        const email = corp.email;
        if (!email) continue;

        for (const prefix of NAMESPACED_KEYS) {
          const key = `${prefix}_${email}`;
          await writeIfChanged(key);
        }
      }
    }

    if (writeCount > 0) {
        console.log(`☁️ Synced ${writeCount} updated records to cloud.`);
    }

    return { success: true, message: `Sync complete! (${writeCount} updates)` };
  } catch (error: any) {
    console.error("Sync Error:", error);
    if (error.code === 'permission-denied') {
        return { success: false, message: "Permission Denied. Set Firestore rules to Test Mode." };
    }
    if (error.code === 'resource-exhausted') {
        return { success: false, message: "Quota exceeded or too many writes. Retrying later." };
    }
    return { success: false, message: `Sync failed: ${error.message}` };
  } finally {
    isSyncing = false;
  }
};

// --- RESTORE FUNCTION (Loads data from Cloud) ---
export const restoreFromCloud = async (config?: FirebaseConfig) => {
  try {
    const app = getFirebaseApp(config);
    if (!app) return { success: false, message: "No Configuration" };

    await ensureAuth(app); // Ensure authenticated
    const db = getDb(app);

    const snapshot = await getDocs(collection(db, "ok_boz_live_data"));
    
    if (snapshot.empty) {
        return { success: true, message: "Connected, but database is empty." };
    }

    snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.content) {
            localStorage.setItem(doc.id, data.content);
            // Update cache to prevent immediate re-upload
            lastSyncedData[doc.id] = data.content;
        }
    });

    console.log("✅ Data Loaded from Cloud");
    return { success: true, message: "Restore complete! Data loaded from Cloud." };
  } catch (error: any) {
    console.error("Restore Error:", error);
    if (error.code === 'permission-denied') {
        return { success: false, message: "Permission Denied. Set Firestore rules to Test Mode." };
    }
    return { success: false, message: `Restore failed: ${error.message}` };
  }
};

// Upload File to Firebase Storage
export const uploadFileToCloud = async (file: File, path: string): Promise<string | null> => {
  try {
    const app = getFirebaseApp();
    if (!app) throw new Error("Firebase not connected");

    await ensureAuth(app); // Ensure authenticated

    if (!app.options.storageBucket) {
        return null;
    }

    const storage = getStorage(app);
    const storageRef = ref(storage, path);

    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error: any) {
    console.error("Cloud Upload Failed (Falling back to local):", error.code, error.message);
    return null;
  }
};

// Auto-load data on app start
export const autoLoadFromCloud = async (): Promise<boolean> => {
    try {
        const app = getFirebaseApp();
        if (!app) return false;
        await restoreFromCloud();
        return true;
    } catch (e) {
        return false;
    }
};

export const getCloudDatabaseStats = async (config?: FirebaseConfig) => {
  try {
    const app = getFirebaseApp(config);
    if (!app) return null;
    
    await ensureAuth(app); // Ensure authenticated
    const db = getDb(app);
    
    const snapshot = await getDocs(collection(db, "ok_boz_live_data"));
    const stats: Record<string, any> = {};
    
    snapshot.forEach(doc => {
      const data = doc.data();
      let count = '-';
      try {
        const parsed = JSON.parse(data.content);
        if (Array.isArray(parsed)) count = parsed.length.toString();
        else count = 'Config';
      } catch (e) {
          count = 'Raw';
      }
      
      stats[doc.id] = {
        count: count,
        lastUpdated: data.lastUpdated
      };
    });
    
    return stats;
  } catch (error: any) {
    if (error.code === 'permission-denied' || error.message?.includes('Missing or insufficient permissions')) {
        return { _permissionDenied: true };
    }
    return null;
  }
};

// --- NEW: Notification Service Functions ---

// Send a system notification to Firestore
// @ts-ignore - Updated Omit type to reflect internal timestamp and read generation
export const sendSystemNotification = async (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
  try {
    const app = getFirebaseApp();
    if (!app) { console.warn("Firebase not connected for notification."); return; }
    await ensureAuth(app);
    const db = getDb(app);

    const newNotification: Notification = {
      ...notification,
      id: `NOTIF-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };

    await setDoc(doc(db, NOTIFICATION_COLLECTION, newNotification.id), newNotification);
    // console.log("Notification sent:", newNotification.id);
  } catch (error) {
    console.error("Failed to send notification:", error);
  }
};

// Fetch notifications relevant to the current user
export const fetchSystemNotifications = async (): Promise<Notification[]> => {
  try {
    const app = getFirebaseApp();
    if (!app) return [];
    await ensureAuth(app);
    const db = getDb(app);

    const userRole = localStorage.getItem('user_role') as UserRole;
    const sessionId = localStorage.getItem('app_session_id') || 'admin';
    
    let q = collection(db, NOTIFICATION_COLLECTION);
    
    const snapshot = await getDocs(q);
    let allNotifications: Notification[] = [];
    snapshot.forEach(doc => {
      allNotifications.push(doc.data() as Notification);
    });

    const relevantNotifications = allNotifications.filter(notif => {
      // 1. Filter out already read notifications (client side for simplicity with complex targetRoles)
      if (notif.read) return false;

      // 2. Check if current user's role is in targetRoles
      const isTargetRole = notif.targetRoles.includes(userRole);
      if (!isTargetRole) return false;

      // 3. Check corporateId for CORPORATE role
      if (userRole === UserRole.CORPORATE && notif.corporateId && notif.corporateId !== sessionId) {
        return false;
      }
      // 4. Check employeeId for EMPLOYEE role
      if (userRole === UserRole.EMPLOYEE && notif.employeeId && notif.employeeId !== sessionId) {
        return false;
      }

      // 5. Admin (Super Admin) sees all that target ADMIN role or are global (no specific corporateId/employeeId)
      if (userRole === UserRole.ADMIN) {
        const isGlobalOrAdminTargeted = (!notif.corporateId && !notif.employeeId) || (notif.targetRoles.includes(UserRole.ADMIN));
        if (isGlobalOrAdminTargeted) return true;
      }
      
      return true; // If it passes all filters, it's relevant
    });

    // Sort by timestamp newest first
    return relevantNotifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    return [];
  }
};

// Mark a specific notification as read
export const markNotificationAsRead = async (notificationId: string) => {
  try {
    const app = getFirebaseApp();
    if (!app) { console.warn("Firebase not connected for notification."); return; }
    await ensureAuth(app);
    const db = getDb(app);

    const notificationRef = doc(db, NOTIFICATION_COLLECTION, notificationId);
    await updateDoc(notificationRef, { read: true });
  } catch (error) {
    console.error("Failed to mark notification as read:", error);
  }
};

// No need for setupAutoSync and hydrateFromCloud as they are covered by autoLoadFromCloud and syncToCloud
export const setupAutoSync = () => {};
export const hydrateFromCloud = async () => Promise.resolve();
