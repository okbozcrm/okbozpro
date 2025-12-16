
import React, { useState, useRef, useEffect } from 'react';
import { Phone, MessageCircle, Mail, Copy, Check } from 'lucide-react';

interface ContactDisplayProps {
  type: 'phone' | 'email';
  value: string;
  className?: string;
  showIcon?: boolean;
}

const ContactDisplay: React.FC<ContactDisplayProps> = ({ type, value, className = "", showIcon = true }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAction = (e: React.MouseEvent, action: 'call' | 'whatsapp' | 'email' | 'copy') => {
     e.stopPropagation();
     if (action === 'call') window.location.href = `tel:${value}`;
     if (action === 'email') window.location.href = `mailto:${value}`;
     if (action === 'whatsapp') {
         const clean = value.replace(/\D/g, '');
         // Default to India (91) if 10 digits, otherwise use as is
         const finalNumber = clean.length === 10 ? `91${clean}` : clean;
         window.open(`https://wa.me/${finalNumber}`, '_blank');
     }
     if (action === 'copy') {
         navigator.clipboard.writeText(value);
         setCopied(true);
         setTimeout(() => setCopied(false), 2000);
     }
     if (action !== 'copy') setIsOpen(false);
  };

  if (!value) return <span className="text-gray-400">-</span>;

  return (
    <div className="relative inline-block" ref={wrapperRef}>
      <div 
         onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
         className={`cursor-pointer hover:text-blue-600 transition-colors flex items-center gap-1 group relative ${className}`}
         title="Click for actions"
      >
         {showIcon && type === 'phone' && <Phone className="w-3 h-3 text-gray-400 group-hover:text-blue-500" />}
         {showIcon && type === 'email' && <Mail className="w-3 h-3 text-gray-400 group-hover:text-blue-500" />}
         <span className="truncate border-b border-transparent group-hover:border-blue-200">{value}</span>
      </div>

      {isOpen && (
         <div className="absolute left-0 bottom-full mb-2 bg-white shadow-xl border border-gray-200 rounded-lg p-1.5 z-50 flex gap-2 animate-in fade-in zoom-in duration-150 min-w-max">
             {type === 'phone' && (
                 <>
                     <button onClick={(e) => handleAction(e, 'whatsapp')} className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-md transition-colors flex flex-col items-center gap-1 min-w-[60px]" title="WhatsApp">
                         <MessageCircle className="w-5 h-5" />
                         <span className="text-[10px] font-bold">WhatsApp</span>
                     </button>
                     <button onClick={(e) => handleAction(e, 'call')} className="p-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-md transition-colors flex flex-col items-center gap-1 min-w-[60px]" title="Call">
                         <Phone className="w-5 h-5" />
                         <span className="text-[10px] font-bold">Call</span>
                     </button>
                 </>
             )}
             {type === 'email' && (
                 <button onClick={(e) => handleAction(e, 'email')} className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-md transition-colors flex flex-col items-center gap-1 min-w-[60px]" title="Send Email">
                     <Mail className="w-5 h-5" />
                     <span className="text-[10px] font-bold">Email</span>
                 </button>
             )}
             <div className="w-px bg-gray-200 my-1"></div>
             <button onClick={(e) => handleAction(e, 'copy')} className="p-2 hover:bg-gray-100 text-gray-600 rounded-md transition-colors flex flex-col items-center justify-center min-w-[40px]" title="Copy">
                 {copied ? <Check className="w-4 h-4 text-green-500"/> : <Copy className="w-4 h-4" />}
             </button>
         </div>
      )}
    </div>
  );
};

export default ContactDisplay;
