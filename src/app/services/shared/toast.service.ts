import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private notificationsSubject = new BehaviorSubject<ToastNotification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  private notifications: ToastNotification[] = [];
  private nextId = 1;

  show(notification: Omit<ToastNotification, 'id'>): string {
    const id = `toast-${this.nextId++}`;
    const toast: ToastNotification = {
      id,
      duration: 5000,
      ...notification,
    };

    this.notifications.push(toast);
    this.notificationsSubject.next([...this.notifications]);

    // Auto remove after duration (unless persistent)
    if (!toast.persistent && toast.duration) {
      setTimeout(() => {
        this.remove(id);
      }, toast.duration);
    }

    return id;
  }

  success(title: string, message?: string, options?: Partial<ToastNotification>): string {
    return this.show({ type: 'success', title, message, ...options });
  }

  error(title: string, message?: string, options?: Partial<ToastNotification>): string {
    return this.show({ type: 'error', title, message, ...options });
  }

  warning(title: string, message?: string, options?: Partial<ToastNotification>): string {
    return this.show({ type: 'warning', title, message, ...options });
  }

  info(title: string, message?: string, options?: Partial<ToastNotification>): string {
    return this.show({ type: 'info', title, message, ...options });
  }

  remove(id: string): void {
    this.notifications = this.notifications.filter((n) => n.id !== id);
    this.notificationsSubject.next([...this.notifications]);
  }

  clearAll(): void {
    this.notifications = [];
    this.notificationsSubject.next([]);
  }
}
