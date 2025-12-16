
import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Upload, Search, Filter, Eye, Download, Trash2, 
  File, Image as ImageIcon, FileSpreadsheet, MoreVertical, X, CheckCircle 
} from 'lucide-react';
import { DocumentFile, UserRole } from '../types';
import { uploadFileToCloud } from '../services/cloudService';

interface DocumentsProps {
  role: UserRole;
}

const Documents: React.FC<DocumentsProps> = ({ role }) => {
  // Determine Session Context
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin' || role === UserRole.ADMIN;

  const STORAGE_KEY = 'app_documents';

  // Initial Mock Data
  const MOCK_DOCUMENTS: DocumentFile[] = [];

  // State
  const [documents, setDocuments] = useState<DocumentFile[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : MOCK_DOCUMENTS;
  });

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentFile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  
  // Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState('General');
  const [uploadVisibility, setUploadVisibility] = useState('Private');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
  }, [documents]);

  // Handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    
    setIsUploading(true);

    try {
        let fileUrl = '';
        
        // 1. Try Cloud Upload (Firebase)
        const cloudUrl = await uploadFileToCloud(uploadFile, `documents/${Date.now()}_${uploadFile.name}`);
        
        if (cloudUrl) {
            fileUrl = cloudUrl;
        } else {
            // 2. Fallback to Base64 (Local Storage Persistence)
            // This ensures files work even without a backend for the demo
            fileUrl = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(uploadFile);
            });
        }

        const newDoc: DocumentFile = {
            id: `DOC-${Date.now()}`,
            name: uploadFile.name,
            type: uploadFile.type,
            size: (uploadFile.size / 1024 / 1024).toFixed(2) + ' MB',
            category: uploadCategory as any,
            uploadedBy: role === UserRole.ADMIN ? 'Super Admin' : role === UserRole.CORPORATE ? 'Corporate Admin' : 'Employee',
            uploadDate: new Date().toISOString().split('T')[0],
            url: fileUrl,
            visibility: uploadVisibility as any,
            ownerId: sessionId
        };

        setDocuments([newDoc, ...documents]);
        setIsUploadModalOpen(false);
        setUploadFile(null);
    } catch (error) {
        console.error("Upload failed", error);
        alert("Failed to upload document. Please try again.");
    } finally {
        setIsUploading(false);
    }
  };

  const handleDownload = (doc: DocumentFile) => {
    const link = document.createElement('a');
    link.href = doc.url;
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      setDocuments(prev => prev.filter(d => d.id !== id));
    }
  };

  // Helpers
  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="w-8 h-8 text-red-500" />;
    if (type.includes('image')) return <ImageIcon className="w-8 h-8 text-blue-500" />;
    if (type.includes('sheet') || type.includes('excel')) return <FileSpreadsheet className="w-8 h-8 text-green-600" />;
    return <File className="w-8 h-8 text-gray-400" />;
  };

  // Filtering Logic
  const filteredDocs = documents.filter(doc => {
    // 1. Role Based Access
    let hasAccess = false;
    if (isSuperAdmin) {
      hasAccess = true; // Super Admin sees all
    } else if (role === UserRole.CORPORATE) {
      // Corporate sees Public, their own, or documents uploaded by their employees
      hasAccess = doc.visibility === 'Public' || doc.ownerId === sessionId || doc.visibility === 'Private'; 
    } else {
      // Employee sees Public or their own
      hasAccess = doc.visibility === 'Public' || doc.ownerId === sessionId;
    }

    if (!hasAccess) return false;

    // 2. Search & Category
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || doc.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 h-[calc(100vh-6rem)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Document Storage</h2>
          <p className="text-gray-500">Centralized repository for all company files</p>
        </div>
        <button 
          onClick={() => setIsUploadModalOpen(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors"
        >
          <Upload className="w-5 h-5" />
          Upload Document
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search documents..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          <Filter className="w-4 h-4 text-gray-400" />
          {['All', 'General', 'Policy', 'Report', 'Contract', 'ID Proof'].map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
                categoryFilter === cat 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Document Grid/List */}
      <div className="flex-1 overflow-y-auto">
        {filteredDocs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredDocs.map(doc => (
              <div key={doc.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group flex flex-col">
                <div className="p-5 flex items-start justify-between">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    {getFileIcon(doc.type)}
                  </div>
                  <div className="relative">
                    <button className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="px-5 pb-2 flex-1">
                  <h3 className="font-bold text-gray-800 text-sm truncate" title={doc.name}>{doc.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-gray-100 rounded text-[10px] text-gray-500 font-medium uppercase">{doc.type.split('/')[1] || 'FILE'}</span>
                    <span className="text-xs text-gray-400">• {doc.size}</span>
                  </div>
                </div>

                <div className="px-5 pb-4">
                   <div className="text-xs text-gray-400 flex justify-between items-center border-t border-gray-50 pt-3 mt-2">
                      <span>{doc.uploadDate}</span>
                      <span>By {doc.uploadedBy}</span>
                   </div>
                </div>

                <div className="flex border-t border-gray-100 divide-x divide-gray-100 bg-gray-50 rounded-b-xl">
                   <button 
                     onClick={() => setPreviewDoc(doc)}
                     className="flex-1 py-3 flex items-center justify-center gap-2 text-gray-600 hover:bg-white hover:text-emerald-600 text-xs font-medium transition-colors"
                   >
                      <Eye className="w-4 h-4" /> View
                   </button>
                   <button 
                     onClick={() => handleDownload(doc)}
                     className="flex-1 py-3 flex items-center justify-center gap-2 text-gray-600 hover:bg-white hover:text-blue-600 text-xs font-medium transition-colors"
                   >
                      <Download className="w-4 h-4" /> Download
                   </button>
                   {(isSuperAdmin || doc.ownerId === sessionId) && (
                     <button 
                       onClick={() => handleDelete(doc.id)}
                       className="flex-1 py-3 flex items-center justify-center gap-2 text-gray-600 hover:bg-white hover:text-red-600 text-xs font-medium transition-colors"
                     >
                        <Trash2 className="w-4 h-4" /> Delete
                     </button>
                   )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
             <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
               <File className="w-8 h-8 text-gray-300" />
             </div>
             <p className="text-lg font-medium text-gray-600">No documents found</p>
             <p className="text-sm">Upload a new file to get started.</p>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800">Upload Document</h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
               <div 
                 onClick={() => fileInputRef.current?.click()}
                 className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${uploadFile ? 'border-emerald-400 bg-emerald-50' : 'border-gray-300 hover:bg-gray-50'}`}
               >
                  <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
                  {uploadFile ? (
                    <>
                      <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-2">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-medium text-emerald-800 truncate max-w-xs">{uploadFile.name}</p>
                      <p className="text-xs text-emerald-600 mt-1">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-2">
                        <Upload className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-medium text-gray-700">Click to browse files</p>
                      <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG, XLSX (Max 10MB)</p>
                    </>
                  )}
               </div>

               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                  >
                    <option>General</option>
                    <option>Policy</option>
                    <option>Report</option>
                    <option>Contract</option>
                    <option>ID Proof</option>
                  </select>
               </div>

               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
                  <div className="flex gap-2">
                     {['Public', 'Private', 'AdminOnly'].map(vis => (
                       <button
                         key={vis}
                         onClick={() => setUploadVisibility(vis)}
                         className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all ${uploadVisibility === vis ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-gray-600 border-gray-200'}`}
                       >
                         {vis}
                       </button>
                     ))}
                  </div>
               </div>

               <button 
                 onClick={handleUpload}
                 disabled={!uploadFile || isUploading}
                 className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 text-white py-3 rounded-xl font-medium shadow-sm transition-colors flex items-center justify-center gap-2 mt-4"
               >
                 {isUploading ? 'Uploading...' : 'Upload Now'}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
           <div className="bg-white rounded-xl w-full max-w-4xl h-[85vh] flex flex-col animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center p-4 border-b border-gray-200">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                       {getFileIcon(previewDoc.type)}
                    </div>
                    <div>
                       <h3 className="font-bold text-gray-900">{previewDoc.name}</h3>
                       <p className="text-xs text-gray-500">{previewDoc.size} • {previewDoc.uploadDate}</p>
                    </div>
                 </div>
                 <div className="flex gap-2">
                    <button 
                        onClick={() => handleDownload(previewDoc)}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors" 
                        title="Download"
                    >
                       <Download className="w-5 h-5" />
                    </button>
                    <button onClick={() => setPreviewDoc(null)} className="p-2 hover:bg-red-50 rounded-lg text-gray-500 hover:text-red-500 transition-colors">
                       <X className="w-5 h-5" />
                    </button>
                 </div>
              </div>
              <div className="flex-1 bg-gray-100 flex items-center justify-center p-4 overflow-hidden">
                 {previewDoc.type.includes('image') ? (
                    <img src={previewDoc.url} alt="Preview" className="max-w-full max-h-full object-contain shadow-lg rounded-lg" />
                 ) : previewDoc.type.includes('pdf') ? (
                    <iframe src={previewDoc.url} className="w-full h-full rounded-lg border border-gray-200 shadow-lg" title="PDF Preview"></iframe>
                 ) : (
                    <div className="text-center text-gray-500 bg-white p-10 rounded-2xl shadow-sm">
                       <FileText className="w-24 h-24 mx-auto mb-4 text-gray-300" />
                       <p className="text-lg font-medium text-gray-700">Preview not available</p>
                       <p className="text-sm text-gray-500 mb-6">This file type cannot be viewed in the browser.</p>
                       <button 
                           onClick={() => handleDownload(previewDoc)}
                           className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 mx-auto transition-colors"
                       >
                           <Download className="w-4 h-4" /> Download to view
                       </button>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Documents;
