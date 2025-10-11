import { Component, inject, signal, ElementRef, ViewChild, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationsService, Notification } from '../../services/notifications.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative">
      <!-- Notification Bell Button -->
      <button
        #bellButton
        type="button"
        (click)="toggleDropdown()"
        class="relative p-2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full transition-colors"
        [class.text-blue-600]="isOpen()"
        aria-label="Notifications"
      >
        <!-- Bell Icon -->
        <svg
          class="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 17h5l-5 5v-5zM19 9A7 7 0 1 0 5 9c0 1.5.3 3 .8 4.4L5 14l5.5 5.5 1.2-.8A7.02 7.02 0 0 0 19 9z"
          ></path>
        </svg>

        <!-- Notification Badge -->
        <span
          *ngIf="unreadCount() > 0"
          class="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full min-w-[20px] h-5"
          [class.animate-pulse]="hasNewNotifications()"
        >
          {{ unreadCount() > 99 ? '99+' : unreadCount() }}
        </span>

        <!-- Polling Indicator -->
        <div
          *ngIf="notificationsService.isPolling()"
          class="absolute -bottom-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"
          title="Live updates active"
        ></div>
      </button>

      <!-- Dropdown Panel -->
      <div
        *ngIf="isOpen()"
        #dropdown
        class="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden"
        (click)="$event.stopPropagation()"
      >
        <!-- Header -->
        <div class="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-gray-900">Notifications</h3>
            <div class="flex items-center space-x-2">
              <!-- Refresh Button -->
              <button
                (click)="refreshNotifications()"
                [disabled]="notificationsService.isLoading()"
                class="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors disabled:opacity-50"
                title="Refresh notifications"
              >
                <svg
                  class="w-4 h-4"
                  [class.animate-spin]="notificationsService.isLoading()"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  ></path>
                </svg>
              </button>

              <!-- Mark All Read Button -->
              <button
                *ngIf="unreadCount() > 0"
                (click)="markAllAsRead()"
                class="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                title="Mark all as read"
              >
                Mark all read
              </button>

              <!-- Close Button -->
              <button
                (click)="closeDropdown()"
                class="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                title="Close notifications"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              </button>
            </div>
          </div>

          <!-- Unread Count -->
          <p *ngIf="unreadCount() > 0" class="text-xs text-gray-600 mt-1">
            {{ unreadCount() }} unread notification{{ unreadCount() === 1 ? '' : 's' }}
          </p>
        </div>

        <!-- Loading State -->
        <div
          *ngIf="notificationsService.isLoading() && notifications().length === 0"
          class="flex items-center justify-center py-8"
        >
          <div class="flex items-center space-x-2 text-gray-500">
            <svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              ></path>
            </svg>
            <span class="text-sm">Loading notifications...</span>
          </div>
        </div>

        <!-- Notifications List -->
        <div
          *ngIf="!notificationsService.isLoading() || notifications().length > 0"
          class="max-h-64 overflow-y-auto"
        >
          <!-- Empty State -->
          <div
            *ngIf="notifications().length === 0"
            class="flex flex-col items-center justify-center py-8 text-gray-500"
          >
            <svg
              class="w-12 h-12 mb-3 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 17h5l-5 5v-5zM19 9A7 7 0 1 0 5 9c0 1.5.3 3 .8 4.4L5 14l5.5 5.5 1.2-.8A7.02 7.02 0 0 0 19 9z"
              ></path>
            </svg>
            <p class="text-sm font-medium">No notifications</p>
            <p class="text-xs text-gray-400">You're all caught up!</p>
          </div>

          <!-- Notification Items -->
          <div
            *ngFor="let notification of notifications(); trackBy: trackByNotificationId"
            class="px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors cursor-pointer"
            [class.bg-blue-50]="!notification.is_read"
            (click)="handleNotificationClick(notification)"
          >
            <div class="flex items-start space-x-3">
              <!-- Notification Icon -->
              <div
                class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg"
                [ngClass]="notificationsService.getNotificationColor(notification.type)"
              >
                {{ notificationsService.getNotificationIcon(notification.type) }}
              </div>

              <!-- Notification Content -->
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <p
                      class="text-sm font-medium text-gray-900 truncate"
                      [class.font-semibold]="!notification.is_read"
                    >
                      {{ notification.title }}
                    </p>
                    <p class="text-sm text-gray-600 mt-1 line-clamp-2">
                      {{ notification.message }}
                    </p>
                  </div>

                  <!-- Actions -->
                  <div class="flex items-center space-x-1 ml-2">
                    <!-- Unread Indicator -->
                    <div
                      *ngIf="!notification.is_read"
                      class="w-2 h-2 bg-blue-500 rounded-full"
                      title="Unread"
                    ></div>

                    <!-- Delete Button -->
                    <button
                      (click)="deleteNotification(notification.id, $event)"
                      class="p-1 text-gray-400 hover:text-red-500 rounded transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete notification"
                    >
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        ></path>
                      </svg>
                    </button>
                  </div>
                </div>

                <!-- Timestamp -->
                <p class="text-xs text-gray-400 mt-2">
                  {{ notificationsService.formatTime(notification.created_at) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div
          *ngIf="notifications().length > 0"
          class="px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg"
        >
          <button
            (click)="viewAllNotifications()"
            class="w-full text-sm text-blue-600 hover:text-blue-800 font-medium text-center transition-colors"
          >
            View all notifications
          </button>
        </div>
      </div>
    </div>

    <!-- Backdrop (Mobile) -->
    <div *ngIf="isOpen()" class="fixed inset-0 z-40 lg:hidden" (click)="closeDropdown()"></div>
  `,
  styles: [
    `
      .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .group:hover .opacity-0 {
        opacity: 1;
      }

      @keyframes bellShake {
        0%,
        100% {
          transform: rotate(0deg);
        }
        10%,
        30%,
        50%,
        70%,
        90% {
          transform: rotate(-10deg);
        }
        20%,
        40%,
        60%,
        80% {
          transform: rotate(10deg);
        }
      }

      .animate-bell {
        animation: bellShake 0.5s ease-in-out;
      }
    `,
  ],
})
export class NotificationBellComponent implements OnDestroy {
  private platformId = inject(PLATFORM_ID);
  protected notificationsService = inject(NotificationsService);
  private router = inject(Router);

  @ViewChild('dropdown', { static: false }) dropdown?: ElementRef;
  @ViewChild('bellButton', { static: false }) bellButton?: ElementRef;

  // Component state
  protected isOpen = signal<boolean>(false);
  protected notifications = signal<Notification[]>([]);
  protected unreadCount = signal<number>(0);
  protected hasNewNotifications = signal<boolean>(false);

  private subscriptions: Subscription[] = [];
  private previousUnreadCount = 0;

  constructor() {
    // Subscribe to notifications
    this.subscriptions.push(
      this.notificationsService.notifications$.subscribe((notifications) => {
        this.notifications.set(notifications);
      }),

      this.notificationsService.unreadCount$.subscribe((count) => {
        const previousCount = this.unreadCount();
        this.unreadCount.set(count);

        // Trigger new notification animation if count increased
        if (count > previousCount && previousCount > 0) {
          this.hasNewNotifications.set(true);
          setTimeout(() => this.hasNewNotifications.set(false), 3000);
        }
      })
    );

    // Close dropdown when clicking outside (browser only)
    if (isPlatformBrowser(this.platformId)) {
      document.addEventListener('click', this.handleOutsideClick.bind(this));
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    if (isPlatformBrowser(this.platformId)) {
      document.removeEventListener('click', this.handleOutsideClick.bind(this));
    }
  }

  /**
   * Toggle dropdown visibility
   */
  protected toggleDropdown(): void {
    if (this.isOpen()) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  /**
   * Open dropdown and load notifications
   */
  protected openDropdown(): void {
    this.isOpen.set(true);
    this.refreshNotifications();
  }

  /**
   * Close dropdown
   */
  protected closeDropdown(): void {
    this.isOpen.set(false);
  }

  /**
   * Refresh notifications
   */
  protected refreshNotifications(): void {
    this.notificationsService.getMyNotifications({ limit: 20 }).subscribe({
      next: (response) => {
        // Notifications are automatically updated via the service
      },
      error: (error) => {
        console.error('Failed to refresh notifications:', error);
      },
    });
  }

  /**
   * Mark all notifications as read
   */
  protected markAllAsRead(): void {
    this.notificationsService.markAllAsRead().subscribe({
      next: () => {
        // State is automatically updated via the service
      },
      error: (error) => {
        console.error('Failed to mark all notifications as read:', error);
      },
    });
  }

  /**
   * Handle notification click
   */
  protected handleNotificationClick(notification: Notification): void {
    // Mark as read if unread
    if (!notification.is_read) {
      this.notificationsService.markAsRead(notification.id).subscribe({
        error: (error) => {
          console.error('Failed to mark notification as read:', error);
        },
      });
    }

    // Navigate based on notification type and related data
    this.navigateToNotificationTarget(notification);
    this.closeDropdown();
  }

  /**
   * Delete notification
   */
  protected deleteNotification(id: number, event: Event): void {
    event.stopPropagation();

    this.notificationsService.deleteNotification(id).subscribe({
      next: () => {
        // State is automatically updated via the service
      },
      error: (error) => {
        console.error('Failed to delete notification:', error);
      },
    });
  }

  /**
   * Navigate to view all notifications page
   */
  protected viewAllNotifications(): void {
    this.router.navigate(['/notifications']);
    this.closeDropdown();
  }

  /**
   * Track by function for notifications list
   */
  protected trackByNotificationId(index: number, notification: Notification): number {
    return notification.id;
  }

  /**
   * Navigate to notification target based on type and related data
   */
  private navigateToNotificationTarget(notification: Notification): void {
    const relatedId = notification.related_id;
    const relatedType = notification.related_type;

    switch (notification.type) {
      case 'booking_request':
      case 'booking_approved':
      case 'booking_denied':
      case 'booking_cancelled':
      case 'booking_completed':
        if (relatedId) {
          this.router.navigate(['/bookings', relatedId]);
        } else {
          this.router.navigate(['/bookings']);
        }
        break;

      case 'payment_received':
        if (relatedId) {
          this.router.navigate(['/bookings', relatedId]);
        } else {
          this.router.navigate(['/dashboard']);
        }
        break;

      case 'rating_received':
        if (relatedType === 'item' && relatedId) {
          this.router.navigate(['/items', relatedId]);
        } else {
          this.router.navigate(['/dashboard']);
        }
        break;

      case 'system':
      case 'promotion':
      case 'reminder':
        // For system notifications, stay on current page or go to dashboard
        break;

      default:
        // Default to dashboard for unknown notification types
        this.router.navigate(['/dashboard']);
        break;
    }
  }

  /**
   * Handle clicks outside the dropdown
   */
  private handleOutsideClick(event: Event): void {
    if (!this.isOpen()) return;

    const target = event.target as HTMLElement;
    const dropdown = this.dropdown?.nativeElement;
    const button = this.bellButton?.nativeElement;

    if (dropdown && !dropdown.contains(target) && button && !button.contains(target)) {
      this.closeDropdown();
    }
  }
}
