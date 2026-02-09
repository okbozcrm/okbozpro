
import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, X, Check, AlertCircle } from 'lucide-react';
import { CallSignal } from '../types';

const CallOverlay: React.FC = () => {
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const userName = sessionStorage.getItem('loggedInUserName') || 'User';

  const [activeCall, setActiveCall] = useState<CallSignal | null>(null);
  const [callTimer, setCallTimer] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const timerRef = useRef<number | null>(null);

  // 1. Listen for signals
  useEffect(() => {
    const handleSignalChange = () => {
      const signalStr = localStorage.getItem('boz_call_signal');
      if (!signalStr) {
        if (activeCall) endCallLocally();
        return;
      }

      const signal: CallSignal = JSON.parse(signalStr);

      // Ignore signals not meant for us or from us (unless it's an update to our own call)
      const isRecipient = signal.recipientId === sessionId;
      const isCaller = signal.callerId === sessionId;

      if (!isRecipient && !isCaller) return;

      // Handle Busy detection
      if (isRecipient && signal.status === 'ringing' && activeCall && activeCall.status !== 'ended') {
          // We are already in a call, send busy signal
          updateSignal({ ...signal, status: 'busy' });
          return;
      }

      setActiveCall(signal);

      // Handle timer
      if (signal.status === 'connected') {
        if (!timerRef.current) {
          timerRef.current = window.setInterval(() => {
            setCallTimer(prev => prev + 1);
          }, 1000);
        }
      } else {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        if (signal.status === 'ended' || signal.status === 'declined' || signal.status === 'busy') {
            setTimeout(() => setActiveCall(null), 2000);
        }
      }
    };

    window.addEventListener('storage', handleSignalChange);
    // Initial check
    handleSignalChange();

    return () => window.removeEventListener('storage', handleSignalChange);
  }, [sessionId, activeCall]);

  const updateSignal = (signal: CallSignal | null) => {
    if (signal) {
      localStorage.setItem('boz_call_signal', JSON.stringify(signal));
    } else {
      localStorage.removeItem('boz_call_signal');
    }
    // Storage event doesn't fire in the same tab, so we manually trigger it or update state
    window.dispatchEvent(new Event('storage'));
  };

  const endCallLocally = () => {
    setActiveCall(null);
    setCallTimer(0);
    if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
    }
  };

  const handleAccept = () => {
    if (!activeCall) return;
    updateSignal({ ...activeCall, status: 'connected' });
  };

  const handleDecline = () => {
    if (!activeCall) return;
    updateSignal({ ...activeCall, status: 'declined' });
    setTimeout(() => updateSignal(null), 500);
  };

  const handleEnd = () => {
    if (!activeCall) return;
    updateSignal({ ...activeCall, status: 'ended' });
    setTimeout(() => updateSignal(null), 500);
  };

  if (!activeCall) return null;

  const isIncoming = activeCall.recipientId === sessionId && activeCall.status === 'ringing';
  const isOutgoing = activeCall.callerId === sessionId && activeCall.status === 'ringing';
  const isConnected = activeCall.status === 'connected';
  const isBusy = activeCall.status === 'busy';
  const isDeclined = activeCall.status === 'declined';
  const isEnded = activeCall.status === 'ended';

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const displayName = isIncoming ? activeCall.callerName : (isOutgoing || isConnected ? (activeCall.callerId === sessionId ? 'Calling...' : activeCall.callerName) : 'User');

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-xl flex flex-col items-center justify-between p-12 text-white animate-in fade-in duration-500">
      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
      
      <div className="relative z-10 flex flex-col items-center gap-6 mt-12">
        <div className="relative">
          {(isIncoming || isOutgoing) && (
            <div className="absolute -inset-8 rounded-full bg-emerald-500/20 animate-ping" />
          )}
          <div className={`w-32 h-32 rounded-full border-4 ${isConnected ? 'border-emerald-500' : isBusy || isDeclined ? 'border-red-500' : 'border-emerald-500/50'} flex items-center justify-center text-5xl font-black bg-slate-800 shadow-2xl relative z-10 overflow-hidden`}>
             <span className="animate-pulse">{activeCall.callerName.charAt(0)}</span>
          </div>
        </div>
        
        <div className="text-center">
          <h2 className="text-3xl font-black tracking-tight mb-2">
            {isIncoming ? activeCall.callerName : (isOutgoing ? 'Ringing...' : isConnected ? activeCall.callerName : 'Call Ended')}
          </h2>
          <p className={`font-bold uppercase tracking-widest text-xs ${isBusy || isDeclined ? 'text-red-400' : 'text-emerald-400'}`}>
            {isIncoming ? 'Incoming Boz Call' : 
             isOutgoing ? `Calling ${activeCall.recipientId === 'admin' ? 'Head Office' : 'Staff'}...` : 
             isConnected ? `In Call • ${formatTime(callTimer)}` : 
             isBusy ? 'User is Busy' :
             isDeclined ? 'Call Declined' : 'Call Ended'}
          </p>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-12 mb-12">
        {isIncoming ? (
            <div className="flex gap-16 animate-in slide-in-from-bottom-4">
                <button 
                  onClick={handleDecline}
                  className="p-8 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-2xl shadow-red-900/50 transition-all transform active:scale-90"
                >
                  <PhoneOff className="w-8 h-8" />
                </button>
                <button 
                  onClick={handleAccept}
                  className="p-8 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-2xl shadow-emerald-900/50 transition-all transform active:scale-90 animate-bounce"
                >
                  <Phone className="w-8 h-8" />
                </button>
            </div>
        ) : (
            <div className="flex items-center justify-around w-full">
                <button 
                  onClick={() => setIsMuted(!isMuted)}
                  disabled={!isConnected}
                  className={`p-5 rounded-full border-2 transition-all ${!isConnected ? 'opacity-20' : ''} ${isMuted ? 'bg-white text-slate-900 border-white' : 'bg-slate-800 text-white border-slate-700 hover:bg-slate-700'}`}
                >
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>

                <button 
                  onClick={handleEnd}
                  className="p-8 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-2xl shadow-red-900/50 transition-all transform active:scale-90"
                >
                  {isOutgoing ? <X className="w-8 h-8" /> : <PhoneOff className="w-8 h-8" />}
                </button>

                <button 
                   disabled={!isConnected}
                   className={`p-5 rounded-full bg-slate-800 text-white border border-slate-700 hover:bg-slate-700 ${!isConnected ? 'opacity-20' : ''}`}
                >
                  <Volume2 className="w-6 h-6" />
                </button>
            </div>
        )}

        {(isBusy || isDeclined) && (
            <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-2xl flex items-center gap-3 text-red-200 animate-in shake duration-500">
                <AlertCircle className="w-5 h-5" />
                <span className="font-bold text-sm">Recipient is currently unavailable</span>
            </div>
        )}
      </div>
    </div>
  );
};

export default CallOverlay;
