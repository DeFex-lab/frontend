/**
 * Notification Provider
 * Global notification system
 */

'use client';

import { useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useAppStore, Notification } from '@/stores/app-store';
import { cn } from '@/lib/utils';
import { useSafeTimeout } from '@/hooks/use-timeout';

const notificationIcons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

/**
 * Default auto-dismiss timeouts (ms) by notification type.
 * Error notifications default to null (i.e. persist until the user dismisses them).
 */
const DEFAULT_DISMISS_TIMEOUTS: Record<Notification['type'], number | null> = {
  success: 5000,
  info: 5000,
  warning: 6000,
  error: null,
};

export function NotificationProvider(): JSX.Element {
  const notifications = useAppStore((state) => state.notifications);
  const removeNotification = useAppStore((state) => state.removeNotification);

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-md pointer-events-none">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onRemove: () => void;
}

function NotificationItem({ notification, onRemove }: NotificationItemProps): JSX.Element {
  const Icon = notificationIcons[notification.type];
  const { schedule, cancel } = useSafeTimeout();

  // Resolve the effective dismiss timeout:
  //   1. An explicit per-notification duration always wins.
  //   2. Otherwise fall back to the type default (error => persist).
  const dismissTimeout =
    typeof notification.duration === 'number' && notification.duration > 0
      ? notification.duration
      : DEFAULT_DISMISS_TIMEOUTS[notification.type];

  useEffect(() => {
    // Error notifications (or any type with a null timeout) remain visible
    // until the user explicitly dismisses them.
    if (dismissTimeout === null) return;

    const timer = schedule(onRemove, dismissTimeout);
    return () => cancel(timer);
  }, [dismissTimeout, onRemove, schedule, cancel]);

  const colorClasses = {
    success: 'border-success/30 bg-success/10 text-success',
    error: 'border-destructive/30 bg-destructive/10 text-destructive',
    info: 'border-info/30 bg-info/10 text-info',
    warning: 'border-warning/30 bg-warning/10 text-warning',
  };

  return (
    <div
      className={cn(
        'rounded-lg border p-4 flex gap-3 items-start animate-slide-down pointer-events-auto',
        colorClasses[notification.type]
      )}
      role="alert"
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        {notification.title && <p className="font-semibold">{notification.title}</p>}
        <p className="text-sm">{notification.message}</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Dismiss notification"
        className="text-current/60 hover:text-current flex-shrink-0 transition-smooth"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

/**
 * useNotification hook
 */
export function useNotification(): {
  notify: (notification: Omit<Notification, 'id'>) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
} {
  const addNotification = useAppStore((state) => state.addNotification);

  return {
    // Pass through the notification as-is so callers can override `type`,
    // `title`, or `duration` per notification.
    notify: addNotification,
    success: (message, title) =>
      addNotification({ type: 'success', message, title, duration: 5000 }),
    // Errors persist until the user dismisses them (duration: null).
    error: (message, title) =>
      addNotification({ type: 'error', message, title, duration: null }),
    info: (message, title) =>
      addNotification({ type: 'info', message, title, duration: 5000 }),
    warning: (message, title) =>
      addNotification({ type: 'warning', message, title, duration: 6000 }),
  };
}
