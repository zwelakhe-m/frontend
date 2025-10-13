import { Injectable, inject, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, interval } from 'rxjs';
import { map, catchError, tap, switchMap, startWith } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  related_id?: number;
  related_type?: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationFilters {
  unread_only?: boolean;
  limit?: number;
  offset?: number;
}

export interface NotificationResponse {
  success: boolean;
  unread_count: number;
  notifications: Notification[];
}

@Injectable({
  providedIn: 'root',
})
export class NotificationsService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  // private readonly baseUrl = 'http://localhost:8081/api/notifications'; // Localhost for reference
  private readonly baseUrl = `${environment.apiUrl}/notifications`;

  // Reactive state management
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  private unreadCountSubject = new BehaviorSubject<number>(0);

  // Public observables
  public notifications$ = this.notificationsSubject.asObservable();
  public unreadCount$ = this.unreadCountSubject.asObservable();

  // Signals for reactive UI
  public isLoading = signal<boolean>(false);
  public unreadCount = signal<number>(0);
  public isPolling = signal<boolean>(false);

  // Polling interval for real-time updates (30 seconds)
  private pollingInterval = 30000;
  private pollingSubscription?: any;

  constructor() {
    // Start polling when user is authenticated
    this.authService.isAuthenticated$.subscribe((isAuth) => {
      if (isAuth) {
        this.startPolling();
      } else {
        this.stopPolling();
        this.clearNotifications();
      }
    });
  }

  /**
   * Get notifications for current user
   */
  getMyNotifications(filters: NotificationFilters = {}): Observable<NotificationResponse> {
    this.isLoading.set(true);

    let params = new HttpParams();
    if (filters.unread_only !== undefined)
      params = params.set('unread_only', filters.unread_only.toString());
    if (filters.limit !== undefined) params = params.set('limit', filters.limit.toString());
    if (filters.offset !== undefined) params = params.set('offset', filters.offset.toString());

    return this.http
      .get<NotificationResponse>(`${this.baseUrl}/my-notifications`, {
        params,
        headers: this.authService.getAuthHeaders(),
      })
      .pipe(
        tap((response) => {
          this.notificationsSubject.next(response.notifications);
          this.unreadCountSubject.next(response.unread_count);
          this.unreadCount.set(response.unread_count);
          this.isLoading.set(false);
        }),
        catchError((error) => {
          this.isLoading.set(false);
          return this.handleError(error);
        })
      );
  }

  /**
   * Get unread notifications only
   */
  getUnreadNotifications(): Observable<NotificationResponse> {
    return this.getMyNotifications({ unread_only: true });
  }

  /**
   * Mark notification as read
   */
  markAsRead(
    id: number
  ): Observable<{ success: boolean; message: string; notification: Notification }> {
    return this.http
      .put<{ success: boolean; message: string; notification: Notification }>(
        `${this.baseUrl}/${id}/read`,
        {},
        {
          headers: this.authService.getAuthHeaders(),
        }
      )
      .pipe(
        tap((response) => {
          this.updateNotificationInState(response.notification);
          const currentCount = this.unreadCount();
          if (currentCount > 0) {
            this.unreadCount.set(currentCount - 1);
            this.unreadCountSubject.next(currentCount - 1);
          }
        }),
        catchError((error) => this.handleError(error))
      );
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): Observable<{ success: boolean; message: string }> {
    return this.http
      .put<{ success: boolean; message: string }>(
        `${this.baseUrl}/mark-all-read`,
        {},
        {
          headers: this.authService.getAuthHeaders(),
        }
      )
      .pipe(
        tap(() => {
          // Update local state - mark all as read
          const currentNotifications = this.notificationsSubject.value;
          const updatedNotifications = currentNotifications.map((notification) => ({
            ...notification,
            is_read: true,
          }));
          this.notificationsSubject.next(updatedNotifications);
          this.unreadCount.set(0);
          this.unreadCountSubject.next(0);
        }),
        catchError((error) => this.handleError(error))
      );
  }

  /**
   * Delete notification
   */
  deleteNotification(id: number): Observable<{ success: boolean; message: string }> {
    return this.http
      .delete<{ success: boolean; message: string }>(`${this.baseUrl}/${id}`, {
        headers: this.authService.getAuthHeaders(),
      })
      .pipe(
        tap(() => {
          const currentNotifications = this.notificationsSubject.value;
          const notificationToDelete = currentNotifications.find((n) => n.id === id);
          const filteredNotifications = currentNotifications.filter((n) => n.id !== id);

          this.notificationsSubject.next(filteredNotifications);

          // Update unread count if deleted notification was unread
          if (notificationToDelete && !notificationToDelete.is_read) {
            const currentCount = this.unreadCount();
            this.unreadCount.set(Math.max(0, currentCount - 1));
            this.unreadCountSubject.next(Math.max(0, currentCount - 1));
          }
        }),
        catchError((error) => this.handleError(error))
      );
  }

  /**
   * Start polling for new notifications
   */
  startPolling(): void {
    if (this.pollingSubscription || !this.authService.isAuthenticated()) {
      return;
    }

    this.isPolling.set(true);

    this.pollingSubscription = interval(this.pollingInterval)
      .pipe(
        startWith(0), // Start immediately
        switchMap(() => this.getMyNotifications({ limit: 20 }))
      )
      .subscribe();
  }

  /**
   * Stop polling for notifications
   */
  stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = undefined;
    }
    this.isPolling.set(false);
  }

  /**
   * Manually refresh notifications
   */
  refresh(): Observable<NotificationResponse> {
    return this.getMyNotifications();
  }

  /**
   * Get notification icon based on type
   */
  getNotificationIcon(type: string): string {
    switch (type) {
      case 'booking_request':
        return '📅';
      case 'booking_approved':
        return '✅';
      case 'booking_denied':
        return '❌';
      case 'booking_cancelled':
        return '🚫';
      case 'booking_completed':
        return '🎉';
      case 'payment_received':
        return '💰';
      case 'rating_received':
        return '⭐';
      case 'system':
        return '🔔';
      case 'promotion':
        return '🎁';
      case 'reminder':
        return '⏰';
      default:
        return '📢';
    }
  }

  /**
   * Get notification color based on type
   */
  getNotificationColor(type: string): string {
    switch (type) {
      case 'booking_request':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'booking_approved':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'booking_denied':
      case 'booking_cancelled':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'booking_completed':
        return 'bg-purple-50 border-purple-200 text-purple-800';
      case 'payment_received':
        return 'bg-emerald-50 border-emerald-200 text-emerald-800';
      case 'rating_received':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'system':
        return 'bg-gray-50 border-gray-200 text-gray-800';
      case 'promotion':
        return 'bg-pink-50 border-pink-200 text-pink-800';
      case 'reminder':
        return 'bg-indigo-50 border-indigo-200 text-indigo-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  }

  /**
   * Format notification time for display
   */
  formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  }

  /**
   * Get notification priority based on type
   */
  getNotificationPriority(type: string): 'high' | 'medium' | 'low' {
    switch (type) {
      case 'booking_request':
      case 'booking_approved':
      case 'booking_denied':
      case 'payment_received':
        return 'high';
      case 'booking_completed':
      case 'rating_received':
      case 'booking_cancelled':
        return 'medium';
      case 'system':
      case 'promotion':
      case 'reminder':
        return 'low';
      default:
        return 'medium';
    }
  }

  // Private helper methods

  private updateNotificationInState(updatedNotification: Notification): void {
    const currentNotifications = this.notificationsSubject.value;
    const index = currentNotifications.findIndex((n) => n.id === updatedNotification.id);
    if (index > -1) {
      currentNotifications[index] = updatedNotification;
      this.notificationsSubject.next([...currentNotifications]);
    }
  }

  private clearNotifications(): void {
    this.notificationsSubject.next([]);
    this.unreadCount.set(0);
    this.unreadCountSubject.next(0);
  }

  private handleError(error: any): Observable<never> {
    let errorMessage = 'An error occurred';

    if (error.error?.error) {
      errorMessage = error.error.error;
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    } else if (error.status === 401) {
      errorMessage = 'Authentication required';
    } else if (error.status === 403) {
      errorMessage = 'Access denied';
    } else if (error.status === 404) {
      errorMessage = 'Notification not found';
    } else if (error.status === 0) {
      errorMessage = 'Unable to connect to server';
    }

    console.error('Notifications Service Error:', error);
    return throwError(() => new Error(errorMessage));
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }
}
