import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface BrandingConfig {
  companyName: string;
  logoUrl: string;
  primaryColor: string; // Hex code
}

interface BrandingContextType extends BrandingConfig {
  updateBranding: (config: Partial<BrandingConfig>) => void;
  resetBranding: () => void;
}

const defaultBranding: BrandingConfig = {
  companyName: 'OK BOZ',
  logoUrl: '', // Empty string implies default 'M' icon
  primaryColor: '#10b981', // Default Emerald-500
};

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export const BrandingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [branding, setBranding] = useState<BrandingConfig>(defaultBranding);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('app_branding');
    if (saved) {
      try {
        setBranding({ ...defaultBranding, ...JSON.parse(saved) });
      } catch (e) {
        console.error("Failed to parse branding settings");
      }
    }
  }, []);

  const updateBranding = (config: Partial<BrandingConfig>) => {
    const newConfig = { ...branding, ...config };
    setBranding(newConfig);
    localStorage.setItem('app_branding', JSON.stringify(newConfig));
    
    // Optional: Update document title
    document.title = newConfig.companyName;
  };

  const resetBranding = () => {
    setBranding(defaultBranding);
    localStorage.removeItem('app_branding');
    document.title = defaultBranding.companyName;
  };

  return (
    <BrandingContext.Provider value={{ ...branding, updateBranding, resetBranding }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
};