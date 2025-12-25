import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { BozNotification, UserRole } from '../types';
import { fetchSystemNotifications, markNotificationAsRead as apiMarkNotificationAsRead, restoreFromCloud } from '../services/cloudService';

interface NotificationContextType {
  notifications: BozNotification[];
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
  const [notifications, setNotifications] = useState<BozNotification[]>(() => {
    try {
      const saved = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to parse notifications from local storage", e);
      return [];
    }
  });
  const unreadCount = notifications.filter(n => !n.read).length;
  const lastPlayedCountRef = useRef<number>(
    parseInt(localStorage.getItem(LAST_PLAYED_COUNT_KEY) || '0', 10)
  );

  // Play alarm sound if new notifications appear
  const playAlarmSound = useCallback(() => {
    try {
      const audio = document.createElement('audio');
      audio.src = NOTIFICATION_SOUND_URL;
      audio.volume = 0.5;
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
      lastPlayedCountRef.current = unreadCount;
      localStorage.setItem(LAST_PLAYED_COUNT_KEY, unreadCount.toString());
    } else if (unreadCount < lastPlayedCountRef.current) {
      lastPlayedCountRef.current = unreadCount;
      localStorage.setItem(LAST_PLAYED_COUNT_KEY, unreadCount.toString());
    }
  }, [unreadCount, playAlarmSound]);


  // Polling mechanism to fetch notifications
  useEffect(() => {
    let timeoutId: any;

    const pollNotifications = async () => {
      try {
        const fetchedNotifications = await fetchSystemNotifications();
        
        // Logic to trigger instant data refresh if relevant notifications appear
        const hasNewRelevantNotif = fetchedNotifications.some(fn => 
            !notifications.some(pn => pn.id === fn.id) && 
            (fn.type === 'login' || fn.type === 'system')
        );

        if (hasNewRelevantNotif) {
            console.log("🔔 New activity detected. Refreshing local database...");
            await restoreFromCloud();
            window.dispatchEvent(new Event('storage'));
            window.dispatchEvent(new CustomEvent('attendance-updated'));
        }

        setNotifications(prevNotifications => {
          const newNotifications = fetchedNotifications.filter(
            fn => !prevNotifications.some(pn => pn.id === fn.id)
          );
          const updatedExisting = prevNotifications.map(pn => {
            const fetched = fetchedNotifications.find(fn => fn.id === pn.id);
            return fetched ? { ...pn, read: fetched.read } : pn;
          });

          const mergedNotifications = [
            ...newNotifications.map(n => ({ ...n, read: false, timestamp: n.timestamp || new Date().toISOString() })),
            ...updatedExisting.filter(pn => fetchedNotifications.some(fn => fn.id === pn.id)),
            ...prevNotifications.filter(pn => !fetchedNotifications.some(fn => fn.id === pn.id))
          ];
          
          const uniqueAndSorted = Array.from(new Map(mergedNotifications.map(n => [n.id, n])).values())
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

          return uniqueAndSorted;
        });

      } catch (error) {
        console.error("Error polling notifications:", error);
      } finally {
        timeoutId = setTimeout(pollNotifications, 5000); // 5s poll for higher reactivity
      }
    };

    pollNotifications();
    return () => clearTimeout(timeoutId);
  }, [notifications]);

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