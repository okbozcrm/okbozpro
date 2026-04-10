
// Centralized API Service

// Helper to safely get the API URL
const getApiUrl = () => {
  // 1. Try to get from Vite environment variables
  try {
    const meta = import.meta as unknown as { env: Record<string, string> };
    if (meta && meta.env && meta.env.VITE_API_URL) {
        return meta.env.VITE_API_URL;
    }
  } catch {
    // Ignore error if import.meta is not available
  }

  // 2. Default to relative path (uses Vite proxy in dev, or same domain in prod)
  return '/api';
};

const API_BASE_URL = getApiUrl();

export const api = {
  auth: {
    login: async (credentials: Record<string, unknown>) => {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      
      if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Login failed');
      }
      return await res.json();
    }
  },
  
  employees: {
    getAll: async (corporateId?: string) => {
      const query = corporateId ? `?corporateId=${corporateId}` : '';
      const res = await fetch(`${API_BASE_URL}/employees${query}`);
      return res.json();
    },
    create: async (data: Record<string, unknown>) => {
      const res = await fetch(`${API_BASE_URL}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res.json();
    }
  },

  leads: {
    getAll: async () => {
      const res = await fetch(`${API_BASE_URL}/leads`);
      return res.json();
    },
    create: async (data: Record<string, unknown>) => {
      const res = await fetch(`${API_BASE_URL}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res.json();
    }
  }
};
