
import React, { useEffect, useState } from 'react';
import { BookOpen, Files, ExternalLink, Info, ShieldCheck, Building2 } from 'lucide-react';
import { UserRole } from '../../types';

const SOPDocuments: React.FC = () => {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [corporateName, setCorporateName] = useState<string>('');
  const [sopFolderUrl, setSopFolderUrl] = useState<string>('');

  useEffect(() => {
    const role = localStorage.getItem('user_role') as UserRole;
    setUserRole(role);

    if (role === UserRole.CORPORATE) {
      const sessionId = localStorage.getItem('app_session_id');
      const corporates = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
      const myCorp = corporates.find((c: any) => c.email === sessionId);
      if (myCorp) {
        setCorporateName(myCorp.companyName);
      }
    }

    // Retrieve SOPs URL from localStorage, fallback to placeholder
    const savedUrl = localStorage.getItem('google_sop_folder_url');
    setSopFolderUrl(savedUrl || 'https://docs.google.com/document/d/1_YOUR_SOP_DOCUMENT_ID/edit?usp=sharing');
  }, []);

  const isSuperAdmin = userRole === UserRole.ADMIN;
  const isCorporate = userRole === UserRole.CORPORATE;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <div className="p-4 bg-purple-100 rounded-2xl text-purple-600">
          <BookOpen className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Standard Operating Procedures (SOPs)</h2>
          <p className="text-gray-500 text-sm mt-1">Your guide to efficient operations.</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Files className="w-5 h-5 text-purple-500" /> Access SOP Documents
        </h3>
        
        {isSuperAdmin && (
          <div className="bg-purple-50 border border-purple-200 text-purple-800 p-4 rounded-lg mb-6 flex items-start gap-3">
            <Info className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-bold mb-2">For Super Admin:</p>
              <p className="text-sm">
                To manage SOP documents (add, edit, delete), please click "Manage SOPs in Drive". This will open the designated Google Drive folder in a new tab where you can perform all necessary administrative tasks directly.
                Ensure SOPs are clearly categorized and up-to-date for all franchise partners.
              </p>
            </div>
          </div>
        )}

        {isCorporate && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg mb-6 flex items-start gap-3">
            <Info className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-bold mb-2">Hello {corporateName || 'Franchise Partner'}:</p>
              <p className="text-sm">
                Here you will find all the necessary Standard Operating Procedures to ensure smooth and compliant operations for your franchise. 
                Please refer to these documents for guidance on various tasks and processes.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <a
            href={sopFolderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-3 shadow-lg transition-all hover:scale-105 transform active:scale-95"
          >
            <ExternalLink className="w-5 h-5" />
            Open SOPs View
          </a>
          {isSuperAdmin && (
            <a
              href={sopFolderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <ShieldCheck className="w-5 h-5" /> Manage SOPs in Drive
            </a>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-emerald-500" /> How to Use SOPs
        </h3>
        <p className="text-gray-600 mb-4">
          SOPs are critical for maintaining consistency, efficiency, and quality across all operations.
          Please follow these guidelines:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>Always refer to the latest version of the SOP for any task.</li>
          <li>If you identify an outdated or unclear SOP, report it to your admin immediately.</li>
          <li>For training purposes, use SOPs as a primary resource for new staff onboarding.</li>
          <li>Adherence to SOPs ensures compliance with company policies and regulatory requirements.</li>
        </ul>
      </div>
    </div>
  );
};

export default SOPDocuments;
