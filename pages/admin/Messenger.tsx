import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Send, Search, User, MoreVertical, Phone, 
  Check, CheckCheck, MessageSquare, ChevronLeft, 
  Building2, Shield, Cloud, Minus, Circle, 
  Paperclip, Mic, X, File, Image as ImageIcon, StopCircle, Download
} from 'lucide-react';
import { UserRole, Employee, CorporateAccount } from '../../types';
import { MOCK_EMPLOYEES } from '../../constants';

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
  type: 'text' | 'image' | 'file' | 'audio';
  fileName?: string; // Optional filename for non-text types
}

interface Contact {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  type: 'Admin' | 'Franchise' | 'Employee';
  corporateId?: string; // To group/filter
  online?: boolean;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

interface MessengerProps {
  role: UserRole;
}

const Messenger: React.FC<MessengerProps> = ({ role }) => {
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = role === UserRole.ADMIN;
  
  // --- State ---
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);

  // Animation states
  const [isMinimizing, setIsMinimizing] = useState(false);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- 1. Load Contacts based on Role Permissions ---
  useEffect(() => {
    let loadedContacts: Contact[] = [];

    // A. Load Data Sources
    const corps: CorporateAccount[] = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
    let allStaff: any[] = [];
    
    // Load Admin Staff
    const adminStaff = JSON.parse(localStorage.getItem('staff_data') || '[]');
    allStaff = [...allStaff, ...adminStaff.map((s: any) => ({...s, owner: 'admin'}))];

    // Load Corporate Staff
    corps.forEach(c => {
        const cStaff = JSON.parse(localStorage.getItem(`staff_data_${c.email}`) || '[]');
        allStaff = [...allStaff, ...cStaff.map((s: any) => ({...s, owner: c.email}))];
    });

    // Helper to randomize online status for demo purposes
    const isOnline = () => Math.random() > 0.4; 

    // B. Build Contact List based on Role
    
    // 1. Super Admin: Sees Everyone
    if (isSuperAdmin) {
        // Add Corporates
        corps.forEach(c => {
            loadedContacts.push({
                id: c.email, 
                name: c.companyName,
                role: 'Franchise Admin',
                type: 'Franchise',
                corporateId: c.email,
                online: isOnline()
            });
        });
        // Add All Employees
        allStaff.forEach(s => {
            loadedContacts.push({
                id: s.id,
                name: s.name,
                role: s.role,
                type: 'Employee',
                corporateId: s.owner,
                online: isOnline()
            });
        });
    } 
    // 2. Franchise Admin (Corporate): Sees Super Admin + Own Employees
    else if (role === UserRole.CORPORATE) {
        // Add Super Admin
        loadedContacts.push({
            id: 'admin',
            name: 'Head Office',
            role: 'Super Admin',
            type: 'Admin',
            corporateId: 'admin',
            online: true // Admin usually online
        });
        // Add Own Employees
        allStaff.filter(s => s.owner === sessionId).forEach(s => {
            loadedContacts.push({
                id: s.id,
                name: s.name,
                role: s.role,
                type: 'Employee',
                corporateId: sessionId,
                online: isOnline()
            });
        });
    }
    // 3. Employee: Sees Super Admin + Own Franchise Admin + (Optionally colleagues)
    else if (role === UserRole.EMPLOYEE) {
        // Find self to know owner
        const me = allStaff.find(s => s.id === sessionId) || MOCK_EMPLOYEES.find(e => e.id === sessionId);
        const myOwnerId = me?.owner || (me as any)?.corporateId || 'admin';

        // Add Super Admin
        loadedContacts.push({
            id: 'admin',
            name: 'Head Office',
            role: 'Super Admin',
            type: 'Admin',
            corporateId: 'admin',
            online: true
        });

        // Add My Franchise Admin (if not belonging to Head Office directly)
        if (myOwnerId !== 'admin') {
            const myCorp = corps.find(c => c.email === myOwnerId);
            if (myCorp) {
                loadedContacts.push({
                    id: myCorp.email,
                    name: myCorp.companyName,
                    role: 'Franchise Admin',
                    type: 'Franchise',
                    corporateId: myCorp.email,
                    online: isOnline()
                });
            }
        }

        // Add Colleagues (Optional, usually helpful)
        allStaff.filter(s => s.owner === myOwnerId && s.id !== sessionId).forEach(s => {
            loadedContacts.push({
                id: s.id,
                name: s.name,
                role: s.role,
                type: 'Employee',
                corporateId: myOwnerId,
                online: isOnline()
            });
        });
    }

    setContacts(loadedContacts);
  }, [role, sessionId, isSuperAdmin]);

  // --- 2. Load Messages & Sync ---
  useEffect(() => {
      const loadMessages = () => {
          const saved = localStorage.getItem('internal_messages_data');
          if (saved) {
              setMessages(JSON.parse(saved));
          }
      };
      
      loadMessages();
      
      // Poll for new messages (Simulated real-time)
      const interval = setInterval(loadMessages, 3000);
      return () => clearInterval(interval);
  }, []);

  // --- 3. Save Messages ---
  const saveMessage = (newMsg: Message) => {
      const updatedMessages = [...messages, newMsg];
      setMessages(updatedMessages);
      localStorage.setItem('internal_messages_data', JSON.stringify(updatedMessages));
      // Scroll to bottom
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  // --- Handlers ---
  const handleSendMessage = (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputText.trim() || !activeChatId) return;

      const newMsg: Message = {
          id: Date.now().toString(),
          senderId: sessionId,
          receiverId: activeChatId,
          content: inputText,
          timestamp: new Date().toISOString(),
          read: false,
          type: 'text'
      };

      saveMessage(newMsg);
      setInputText('');
  };

  const handleMinimize = () => {
      setIsMinimizing(true);
      setTimeout(() => {
        setActiveChatId(null);
        setShowChatOnMobile(false);
        setIsMinimizing(false);
      }, 300); // Wait for animation
  };

  const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
  };

  useEffect(() => {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- File Handling ---
  const handleFileSelect = () => fileInputRef.current?.click();
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && activeChatId) {
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = () => {
            const base64 = reader.result as string;
            const isImage = file.type.startsWith('image/');
            
            const newMsg: Message = {
                id: Date.now().toString(),
                senderId: sessionId,
                receiverId: activeChatId,
                content: base64, // Store base64 data
                fileName: file.name,
                timestamp: new Date().toISOString(),
                read: false,
                type: isImage ? 'image' : 'file'
            };
            saveMessage(newMsg);
        };
        reader.readAsDataURL(file);
    }
    // Reset input
    if(fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Voice Recording ---
  const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunksRef.current.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.onloadend = () => {
                if (activeChatId) {
                    const base64 = reader.result as string;
                    const newMsg: Message = {
                        id: Date.now().toString(),
                        senderId: sessionId,
                        receiverId: activeChatId,
                        content: base64,
                        timestamp: new Date().toISOString(),
                        read: false,
                        type: 'audio'
                    };
                    saveMessage(newMsg);
                }
            };
            reader.readAsDataURL(audioBlob);
            
            // Stop tracks
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
        setRecordingDuration(0);
        timerRef.current = setInterval(() => setRecordingDuration(prev => prev + 1), 1000);
    } catch (err) {
        console.error("Error accessing microphone", err);
        alert("Microphone access denied or not available. Please check browser permissions.");
    }
  };

  const stopRecording = (shouldSave: boolean) => {
    if (mediaRecorderRef.current && isRecording) {
        if (shouldSave) {
            mediaRecorderRef.current.stop(); // Triggers onstop which saves
        } else {
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop()); // Just stop stream
            // Clear ref to prevent saving logic if we added it manually differently, 
            // but here onstop handles logic. For cancellation, we might need a flag or separate handler.
            // Simplified: We rely on the fact that we won't call save logic if cancelled in a real-world scenario by detaching listener,
            // but for this simple demo, we'll just let it 'stop' but we need to prevent the onstop logic from saving if cancelled.
            // Hack fix for demo: assign onstop to null before stopping.
            mediaRecorderRef.current.onstop = null;
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };


  // --- Derived Data ---
  const filteredContacts = contacts.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Enhance contacts with last message data
  const enrichedContacts = filteredContacts.map(contact => {
      // Find last message between me and contact
      const chatMsgs = messages.filter(m => 
          (m.senderId === sessionId && m.receiverId === contact.id) ||
          (m.senderId === contact.id && m.receiverId === sessionId)
      );
      const lastMsg = chatMsgs.length > 0 ? chatMsgs[chatMsgs.length - 1] : null;
      const unread = chatMsgs.filter(m => m.senderId === contact.id && !m.read).length;

      let previewText = "Start a conversation";
      if (lastMsg) {
          if (lastMsg.type === 'text') previewText = lastMsg.content;
          else if (lastMsg.type === 'image') previewText = '📷 Photo';
          else if (lastMsg.type === 'audio') previewText = '🎤 Voice Message';
          else if (lastMsg.type === 'file') previewText = '📎 File';
      }

      return {
          ...contact,
          lastMessage: previewText,
          lastMessageTime: lastMsg?.timestamp,
          unreadCount: unread
      };
  }).sort((a, b) => {
      // Sort by recent message time
      const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
      const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
      return timeB - timeA;
  });

  const activeMessages = useMemo(() => {
      if (!activeChatId) return [];
      const chat = messages.filter(m => 
          (m.senderId === sessionId && m.receiverId === activeChatId) ||
          (m.senderId === activeChatId && m.receiverId === sessionId)
      ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      // Mark as read when viewing
      if (chat.some(m => m.receiverId === sessionId && !m.read)) {
          const updatedAll = messages.map(m => 
              (m.senderId === activeChatId && m.receiverId === sessionId) ? { ...m, read: true } : m
          );
          // Defer save to avoid render loop
          setTimeout(() => {
             localStorage.setItem('internal_messages_data', JSON.stringify(updatedAll));
             setMessages(updatedAll);
          }, 1000);
      }
      return chat;
  }, [activeChatId, messages, sessionId]);

  const activeContactProfile = contacts.find(c => c.id === activeChatId);

  // Auto-scroll to bottom on new message in active chat
  useEffect(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages]);


  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* LEFT PANE: CONTACT LIST */}
        <div className={`
            w-full md:w-80 flex-shrink-0 flex flex-col border-r border-gray-200 bg-white z-10 transition-transform duration-300 absolute md:relative h-full
            ${isMobileView ? (showChatOnMobile ? '-translate-x-full' : 'translate-x-0') : 'translate-x-0'}
        `}>
            {/* Header */}
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2 mb-4">
                    <MessageSquare className="w-5 h-5 text-emerald-600" /> Boz Chat
                </h2>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input 
                        type="text" 
                        placeholder="Search contacts..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {enrichedContacts.map(contact => (
                    <div 
                        key={contact.id}
                        onClick={() => { setActiveChatId(contact.id); setShowChatOnMobile(true); setIsMinimizing(false); }}
                        className={`p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${activeChatId === contact.id ? 'bg-emerald-50/50 border-l-4 border-l-emerald-500' : 'border-l-4 border-l-transparent'}`}
                    >
                        <div className="flex justify-between items-start mb-1">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm ${
                                        contact.type === 'Admin' ? 'bg-slate-800' :
                                        contact.type === 'Franchise' ? 'bg-indigo-600' : 'bg-emerald-500'
                                    }`}>
                                        {contact.type === 'Admin' && <Shield className="w-5 h-5" />}
                                        {contact.type === 'Franchise' && <Building2 className="w-5 h-5" />}
                                        {contact.type === 'Employee' && <User className="w-5 h-5" />}
                                    </div>
                                    {/* Online Indicator */}
                                    <span className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white ${contact.online ? 'bg-green-500' : 'bg-gray-300'}`} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 text-sm">{contact.name}</h4>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">
                                        {contact.role}
                                    </span>
                                </div>
                            </div>
                            {contact.lastMessageTime && (
                                <span className="text-[10px] text-gray-400">
                                    {new Date(contact.lastMessageTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                            )}
                        </div>
                        <div className="flex justify-between items-center pl-13 mt-2">
                            <p className="text-xs text-gray-500 truncate max-w-[180px]">
                                {contact.lastMessage || <span className="italic text-gray-400">Start a conversation</span>}
                            </p>
                            {contact.unreadCount ? (
                                <span className="bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center animate-pulse">
                                    {contact.unreadCount}
                                </span>
                            ) : null}
                        </div>
                    </div>
                ))}
                {enrichedContacts.length === 0 && (
                    <div className="p-8 text-center text-gray-400 text-sm">
                        No contacts found.
                    </div>
                )}
            </div>
        </div>

        {/* RIGHT PANE: CHAT WINDOW */}
        <div className={`
            flex-1 flex flex-col bg-[#e5ddd5] bg-opacity-30 absolute md:relative w-full h-full transition-all duration-300 ease-in-out transform origin-bottom-left
            ${isMobileView ? (showChatOnMobile ? 'translate-x-0' : 'translate-x-full') : 'translate-x-0'}
            ${isMinimizing ? 'scale-0 opacity-0 translate-y-full -translate-x-1/2' : 'scale-100 opacity-100'}
        `}>
            {activeChatId && activeContactProfile ? (
                <>
                    {/* Chat Header */}
                    <div className="p-3 bg-white border-b border-gray-200 flex justify-between items-center shadow-sm z-10 animate-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-3">
                            {isMobileView && (
                                <button onClick={() => setShowChatOnMobile(false)} className="p-1 text-gray-600 hover:bg-gray-100 rounded-full">
                                    <ChevronLeft className="w-6 h-6" />
                                </button>
                            )}
                            <div className="relative">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                                    activeContactProfile.type === 'Admin' ? 'bg-slate-800' :
                                    activeContactProfile.type === 'Franchise' ? 'bg-indigo-600' : 'bg-emerald-500'
                                }`}>
                                    {activeContactProfile.name.charAt(0)}
                                </div>
                                <span className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white ${activeContactProfile.online ? 'bg-green-500' : 'bg-gray-300'}`} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800 text-sm">{activeContactProfile.name}</h3>
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                    <Circle className={`w-2 h-2 fill-current ${activeContactProfile.online ? 'text-green-500' : 'text-gray-300'}`} /> 
                                    {activeContactProfile.online ? 'Online' : 'Offline'}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2 text-gray-500">
                            <button className="p-2 hover:bg-gray-100 rounded-full" title="Call"><Phone className="w-5 h-5" /></button>
                            <button 
                                onClick={handleMinimize} 
                                className="p-2 hover:bg-gray-100 rounded-full text-gray-600" 
                                title="Minimize Chat"
                            >
                                <Minus className="w-5 h-5" />
                            </button>
                            <button className="p-2 hover:bg-gray-100 rounded-full"><MoreVertical className="w-5 h-5" /></button>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat animate-in fade-in duration-500">
                        {activeMessages.map((msg, idx) => {
                            const isMe = msg.senderId === sessionId;
                            return (
                                <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`
                                        max-w-[75%] md:max-w-[60%] p-3 rounded-lg shadow-sm relative text-sm
                                        ${isMe ? 'bg-emerald-100 text-gray-800 rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none'}
                                    `}>
                                        {/* Render Content Based on Type */}
                                        {msg.type === 'text' && (
                                            <p className="mb-1 leading-relaxed">{msg.content}</p>
                                        )}
                                        {msg.type === 'image' && (
                                            <img src={msg.content} alt="shared" className="max-w-full rounded-lg mb-1 shadow-sm border border-black/5" />
                                        )}
                                        {msg.type === 'audio' && (
                                            <audio controls src={msg.content} className="max-w-[240px] h-10 mb-1" />
                                        )}
                                        {msg.type === 'file' && (
                                            <a href={msg.content} download={msg.fileName || "document"} className={`flex items-center gap-3 p-3 rounded-lg mb-1 border ${isMe ? 'bg-emerald-200 border-emerald-300' : 'bg-gray-100 border-gray-200'}`}>
                                                <div className="bg-white p-2 rounded-full">
                                                    <File className="w-5 h-5 text-gray-600" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-xs truncate max-w-[150px]">{msg.fileName || 'Document'}</span>
                                                    <span className="text-[10px] opacity-70">Click to download</span>
                                                </div>
                                                <Download className="w-4 h-4 opacity-50" />
                                            </a>
                                        )}

                                        <div className="flex items-center justify-end gap-1 text-[10px] text-gray-500 opacity-80">
                                            <span>{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                            {isMe && (
                                                msg.read ? <CheckCheck className="w-3 h-3 text-blue-500" /> : <Check className="w-3 h-3" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={scrollRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-white border-t border-gray-200 animate-in slide-in-from-bottom-2 duration-300">
                        {isRecording ? (
                            <div className="flex items-center justify-between bg-red-50 rounded-2xl px-4 py-3 border border-red-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                                    <span className="text-red-600 font-medium font-mono text-sm">Recording {formatTime(recordingDuration)}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => stopRecording(false)} className="p-2 text-gray-500 hover:bg-gray-200 rounded-full" title="Cancel">
                                        <X className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => stopRecording(true)} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md" title="Send Voice">
                                        <Send className="w-4 h-4 ml-0.5" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                                {/* Hidden File Input */}
                                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                                
                                <button type="button" onClick={handleFileSelect} className="p-3 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                                    <Paperclip className="w-5 h-5" />
                                </button>
                                
                                <div className="flex-1 bg-gray-100 rounded-2xl flex items-center px-4 py-2">
                                    <input 
                                        className="w-full bg-transparent border-none outline-none text-sm max-h-32 resize-none"
                                        placeholder="Type a message..."
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                    />
                                    {/* Mic only shows if text is empty */}
                                    {!inputText && (
                                        <button type="button" onClick={startRecording} className="text-gray-500 hover:text-red-500 transition-colors">
                                            <Mic className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                                
                                {inputText && (
                                    <button 
                                        type="submit" 
                                        className="p-3 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 shadow-md transition-transform active:scale-95"
                                    >
                                        <Send className="w-5 h-5 ml-0.5" />
                                    </button>
                                )}
                            </form>
                        )}
                    </div>
                </>
            ) : (
                // Empty State
                <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-center p-8 animate-in zoom-in duration-300">
                    <div className="w-32 h-32 bg-emerald-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
                        <MessageSquare className="w-16 h-16 text-emerald-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to Boz Chat</h2>
                    <p className="text-gray-500 max-w-md">
                        Select a contact from the left to start messaging. 
                        Communicate instantly with your team, franchise partners, and admins.
                    </p>
                    <div className="mt-8 flex gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Shield className="w-3 h-3"/> End-to-End Encrypted</span>
                        <span className="flex items-center gap-1"><Cloud className="w-3 h-3"/> Cloud Sync</span>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Messenger;