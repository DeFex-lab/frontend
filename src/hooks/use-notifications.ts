'use client';

import { useState, useEffect, useRef } from 'react';
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

export function useNotifications(userId?: string) {
  const { client } = useDorisio();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const sdkNotificationsRef = useRef<Notification[]>([]);
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const clearTimer = (id: string) => {
    const timer = timersRef.current[id];
    if (timer !== undefined) {
      clearTimeout(timer);
      delete timersRef.current[id];
    }
  };

  const dismissNotification = (notificationId: string) => {
    clearTimer(notificationId);
    setNotifications((prev) => {
      const target = prev.find((n) => n.id === notificationId);
      if (target && !target.read) {
        setUnreadCount((count) => Math.max(0, count - 1));
      }
      return prev.filter((n) => n.id !== notificationId);
    });
  };

  const scheduleAutoDismiss = (notification: Notification) => {
    const type = notification.type;
    // Error notifications remain visible until the user dismisses them.
    if (type === 'error') {
      clearTimer(notification.id);
      return;
    }

    const override = (notification as Notification & { autoDismissMs?: number | null }).autoDismissMs;
    const duration = override === null ? null : override ?? DEFAULT_AUTO_DISMISS_MS;
    clearTimer(notification.id);
    if (duration === null || duration <= 0) {
      return;
    }
    timersRef.current[notification.id] = setTimeout(() => {
      dismissNotification(notification.id);
    }, duration);
  };

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

  // Schedule auto-dismiss for newly added notifications.
  useEffect(() => {
    const knownIds = new Set(Object.keys(timersRef.current));
    for (const notification of notifications) {
      if (!knownIds.has(notification.id)) {
        scheduleAutoDismiss(notification);
      }
    }
  }, [notifications]);

  // Clear off pending timers on unmount.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of Object.values(timers)) {
        clearTimeout(timer);
      }
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
    filterByType,
    dismissNotification,
  };
}
