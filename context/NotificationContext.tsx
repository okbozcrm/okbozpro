
import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { Notification, UserRole } from '../types';
import { fetchSystemNotifications, markNotificationAsRead as apiMarkNotificationAsRead } from '../services/cloudService';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: () => void;
  playAlarmSound: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const NOTIFICATION_STORAGE_KEY = 'app_notifications_cache';
const LAST_PLAYED_COUNT_KEY = 'app_last_played_notification_count';
const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/sfx/preview/mixkit-positive-notification-951.mp3';

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    try {
      const saved = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to parse notifications from local storage", e);
      return [];
    }
  });
  const unreadCount = notifications.filter(n => !n.read).length;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastPlayedCountRef = useRef<number>(
    parseInt(localStorage.getItem(LAST_PLAYED_COUNT_KEY) || '0', 10)
  );

  // Play alarm sound if new notifications appear
  const playAlarmSound = useCallback(() => {
    try {
      // Create a new Audio object to ensure it plays even if one is already playing/paused
      const audio = new Audio(NOTIFICATION_SOUND_URL);
      audio.volume = 0.5; // Set volume to 50%
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(e => {
            console.warn("Auto-play prevented. User interaction required first.", e);
        });
      }
    } catch (e) {
      console.warn("Failed to play notification sound:", e);
    }
  }, []);

  // Effect to manage sound playing and last played count
  useEffect(() => {
    if (unreadCount > lastPlayedCountRef.current) {
      playAlarmSound();
      // Update ref and local storage after playing sound for new notifications
      lastPlayedCountRef.current = unreadCount;
      localStorage.setItem(LAST_PLAYED_COUNT_KEY, unreadCount.toString());
    } else if (unreadCount < lastPlayedCountRef.current) {
      // If notifications were read or cleared, reset lastPlayedCountRef
      lastPlayedCountRef.current = unreadCount;
      localStorage.setItem(LAST_PLAYED_COUNT_KEY, unreadCount.toString());
    }
  }, [unreadCount, playAlarmSound]);


  // Polling mechanism to fetch notifications
  useEffect(() => {
    let timeoutId: number; // Changed NodeJS.Timeout to number

    const pollNotifications = async () => {
      try {
        const fetchedNotifications = await fetchSystemNotifications();
        
        setNotifications(prevNotifications => {
          const newNotifications = fetchedNotifications.filter(
            fn => !prevNotifications.some(pn => pn.id === fn.id)
          );
          const updatedExisting = prevNotifications.map(pn => {
            const fetched = fetchedNotifications.find(fn => fn.id === pn.id);
            return fetched ? { ...pn, read: fetched.read } : pn; // Update read status
          });

          const mergedNotifications = [
            ...newNotifications.map(n => ({ ...n, read: false, timestamp: n.timestamp || new Date().toISOString() })), // New notifications start unread, ensure timestamp
            ...updatedExisting.filter(pn => fetchedNotifications.some(fn => fn.id === pn.id)), // Keep updated existing
            ...prevNotifications.filter(pn => !fetchedNotifications.some(fn => fn.id === pn.id)) // Keep local-only if not in fetched
          ];
          
          // Filter out duplicates and sort by timestamp
          const uniqueAndSorted = Array.from(new Map(mergedNotifications.map(n => [n.id, n])).values())
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

          return uniqueAndSorted;
        });

      } catch (error) {
        console.error("Error polling notifications:", error);
      } finally {
        timeoutId = setTimeout(pollNotifications, 10000); // Poll every 10 seconds
      }
    };

    pollNotifications(); // Initial fetch
    return () => clearTimeout(timeoutId); // Cleanup on unmount
  }, []);

  // Persist notifications to local storage whenever they change
  useEffect(() => {
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications));
  }, [notifications]);


  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
    await apiMarkNotificationAsRead(notificationId);
  }, []);

  const markAllNotificationsAsRead = useCallback(async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    for (const id of unreadIds) {
      await apiMarkNotificationAsRead(id);
    }
  }, [notifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        playAlarmSound,
      }}
    >
      {children}
      {/* Hidden audio element for notification sound (optional fallback) */}
      <audio ref={audioRef} src={NOTIFICATION_SOUND_URL} preload="auto" />
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
