
# OK BOZ - Database Setup Guide

## How to Connect to Google Firebase (Database)

**If you do not do this, your data will disappear when you refresh the page.**

### Step 1: Create the Project
1. Go to [console.firebase.google.com](https://console.firebase.google.com/).
2. Click on your project **OKBOZ CRM**.

### Step 2: Get the Secret Keys
1. Click the **Gear Icon ⚙️** (Project Settings) at the top left.
2. Scroll down to the bottom where it says "Your apps".
3. If you haven't created an app yet, click the **`</>`** icon.
4. Enter a name (e.g. "Web") and click **Register**.
5. You will see a code block. **Copy the values inside** `firebaseConfig` (apiKey, authDomain, etc.).

### Step 3: Turn on the Database (Required!)
1. On the left menu, click **Build** -> **Firestore Database**.
2. Click **Create database**.
3. Select a location (any is fine) and click Next.
4. **CRITICAL:** Select **"Start in test mode"**.
5. Click **Create**.

### Step 4: Turn on File Storage (For Receipts/Docs)
1. On the left menu, click **Build** -> **Storage**.
2. Click **Get started**.
3. **CRITICAL:** Select **"Start in test mode"**.
4. Click **Next** -> **Done**.

### Step 5: Paste Keys into Code
1. Open the file `services/cloudService.ts`.
2. Scroll to the top where it says `export const HARDCODED_FIREBASE_CONFIG`.
3. Paste the values you got in **Step 2** inside the empty quotes `""`.

Example:
```typescript
export const HARDCODED_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: "AIzaSyDOCAbC123dEf...",
  authDomain: "okboz-crm.firebaseapp.com",
  projectId: "okboz-crm",
  // ... etc
};
```

### How it works
- Once you paste the keys, the app will automatically connect.
- It will **automatically save** (sync) your data to the database every 60 seconds.
- When you open the app, it will **automatically load** (restore) the data from the database.
