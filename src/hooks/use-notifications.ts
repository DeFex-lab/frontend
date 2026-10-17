'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Notification, NotificationType } from '@/types';
import { useDorisio } from 'dorisio-sdk/react';
import {
  COLLABORATIONS_CHANGED_EVENT,
  getCollaborationNotifications,
  markAllCollaborationNotificationsRead,
  markCollaborationNotificationRead,
} from '@/lib/collaborations';

const COLLABORATION_NOTICE_PREFIX = 'collaboration-notice-';
const DEFAULT_AUTO_DISMISS_MS = 5000;
const AUTO_DISMISS_TYPES: NotificationType[] = ['info', 'success'];
const AUTO_DISMISS_OVERRIDE_KEY = 'autoDismissMs';

export function useNotifications(userId?: string) {
  const { client } = useDorisio();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const sdkNotificationsRef = useRef<Notification[]>([]);
  const autoDismissTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    async function fetchNotifications() {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const data = await client.getNotifications(userId);
        sdkNotificationsRef.current = data;
        const collaborationNotifications = getCollaborationNotifications(userId);
        const combined = [...collaborationNotifications, ...data].sort(
          (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
        );
        setNotifications(combined);
        setUnreadCount(combined.filter((notification) => !notification.read).length);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
        sdkNotificationsRef.current = [];
        const collaborationNotifications = getCollaborationNotifications(userId);
        setNotifications(collaborationNotifications);
        setUnreadCount(collaborationNotifications.filter((notification) => !notification.read).length);
      } finally {
        setLoading(false);
      }
    }

    fetchNotifications();

    function refreshCollaborationNotifications(): void {
      if (!userId) return;
      const combined = [...getCollaborationNotifications(userId), ...sdkNotificationsRef.current].sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );
      setNotifications(combined);
      setUnreadCount(combined.filter((notification) => !notification.read).length);
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === 'dorisio:collaborations') {
        refreshCollaborationNotifications();
      }
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener(COLLABORATIONS_CHANGED_EVENT, refreshCollaborationNotifications);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(COLLABORATIONS_CHANGED_EVENT, refreshCollaborationNotifications);
    };
  }, [userId, client]);

  const clearAutoDismissTimer = useCallback((notificationId: string) => {
    const timer = autoDismissTimersRef.current.get(notificationId);
    if (timer) {
      clearTimeout(timer);
      autoDismissTimersRef.current.delete(notificationId);
    }
  }, []);

  const dismissNotification = useCallback(
    (notificationId: string) => {
      clearAutoDismissTimer(notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      setUnreadCount((prev) => {
        const target = notifications.find((n) => n.id === notificationId);
        return target && !target.read ? Math.max(0, prev - 1) : prev;
      });
    },
    [clearAutoDismissTimer, notifications]
  );

  const scheduleAutoDismiss = useCallback(
    (notification: Notification) => {
      if (!AUTO_DISMISS_TYPES.includes(notification.type)) return;
      const override = (notification as Notification & { autoDismissMs?: number })[AUTO_DISMISS_OVERRIDE_KEY];
      const timeout = override ?? DEFAULT_AUTO_DISMISS_MS;
      if (timeout <= 0) return;
      clearAutoDismissTimer(notification.id);
      const timer = setTimeout(() => {
        autoDismissTimersRef.current.delete(notification.id);
        setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
        setUnreadCount((prev) => (notification.read ? prev : Math.max(0, prev - 1)));
      }, timeout);
      autoDismissTimersRef.current.set(notification.id, timer);
    },
    [clearAutoDismissTimer]
  );

  useEffect(() => {
    notifications.forEach((notification) => {
      if (!autoDismissTimersRef.current.has(notification.id)) {
        scheduleAutoDismiss(notification);
      }
    });
  }, [notifications, scheduleAutoDismiss]);

  useEffect(() => {
    const timers = autoDismissTimersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const markAsRead = async (notificationId: string) => {
    if (notificationId.startsWith(COLLABORATION_NOTICE_PREFIX)) {
      markCollaborationNotificationRead(notificationId);
      return;
    }

    try {
      await client.markNotificationAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    autoDismissTimersRef.current.forEach((timer) => clearTimeout(timer));
    autoDismissTimersRef.current.clear();
    if (userId) markAllCollaborationNotificationsRead(userId);
    try {
      await client.markAllNotificationsAsRead(userId);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const filterByType = (type: NotificationType) => {
    return notifications.filter((n) => n.type === type);
  };

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    filterByType,
  };
}
