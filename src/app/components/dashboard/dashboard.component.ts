import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { BookingsService, Booking, BookingStatus } from '../../services/bookings.service';
import { ItemsService, RentalItem } from '../../services/items.service';
import { NotificationsService } from '../../services/notifications.service';
import { ToastService } from '../../services/shared/toast.service';
import { UserService, AnalyticsData } from '../../services/user.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  protected authService = inject(AuthService);
  protected bookingsService = inject(BookingsService);
  protected itemsService = inject(ItemsService);
  protected notificationsService = inject(NotificationsService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  private readonly userService = inject(UserService);

  // Reactive state
  protected currentUser = signal<User | null>(null);
  protected recentBookings = signal<Booking[]>([]);
  protected pendingRequests = signal<Booking[]>([]);
  protected myItems = signal<RentalItem[]>([]);
  // protected activeBookingsCount = signal(0); // No longer used for dashboard card
  protected myItemsCount = signal(0);

  // Analytics state for dashboard
  protected dashboardAnalytics = signal<AnalyticsData | null>(null);
  protected dashboardEarnings = signal<number>(0);
  protected dashboardGrowth = signal<number>(0);

  // Get total bookings from backend analytics for dashboard card
  protected getTotalBookings(): number {
    return this.dashboardAnalytics()?.totalStats?.totalBookings ?? 0;
  }

  ngOnInit(): void {
    // Subscribe to current user
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser.set(user);
    });

    // Load initial data
    this.loadDashboardData();
    this.loadDashboardAnalytics();
  }

  private loadDashboardData(): void {
    // Load recent bookings
    this.bookingsService
      .getMyBookings({ limit: 5, sortBy: 'created', sortOrder: 'desc' })
      .subscribe((response) => {
        const bookings = response.bookings || [];
        this.recentBookings.set(bookings);
        // activeBookingsCount is not used for dashboard card anymore
      });

    // Load my items
    this.itemsService.getMyItems().subscribe((items) => {
      this.myItems.set(items);
      this.myItemsCount.set(items.length);
    });

    // Load incoming bookings for pending count
    this.bookingsService
      .getBookingRequests({ status: BookingStatus.PENDING })
      .subscribe((response) => {
        const requests = response.booking_requests || [];
        this.pendingRequests.set(requests);
      });

    // Start notification polling
    this.notificationsService.refresh().subscribe();
  }

  private loadDashboardAnalytics(): void {
    // Fetch analytics for 'month' period for dashboard summary
    this.userService.getAnalytics('month').subscribe({
      next: (data) => {
        this.dashboardAnalytics.set(data);
        this.dashboardEarnings.set(data.totalStats?.totalEarnings ?? 0);
        this.dashboardGrowth.set(data.totalStats?.growthPercentage ?? 0);
      },
      error: (error) => {
        console.error('Error loading dashboard analytics:', error);
        this.dashboardAnalytics.set(null);
        this.dashboardEarnings.set(0);
        this.dashboardGrowth.set(0);
      },
    });
  }

  protected getUserInitials(): string {
    const user = this.currentUser();
    if (!user?.name) return 'U';

    const names = user.name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return names[0][0].toUpperCase();
  }

  // Use backend analytics for monthly earnings
  protected getMonthlyEarnings(): number {
    return this.dashboardEarnings();
  }

  // Expose growth percentage for dashboard
  protected getMonthlyGrowth(): number {
    return this.dashboardGrowth();
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      maximumFractionDigits: 0,
    }).format(value || 0);
  }

  protected getItemStatusClass(item: RentalItem): string {
    return item.isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700';
  }

  protected getItemStatusLabel(item: RentalItem): string {
    return item.isAvailable ? 'Active' : 'Booked';
  }

  protected formatBookingDate(booking: Booking): string {
    const startDate = new Date(booking.start_date);
    const endDate = new Date(booking.end_date);
    const today = new Date();

    if (startDate > today) {
      const daysUntil = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
      return `Starts in ${daysUntil} days`;
    } else if (endDate > today) {
      const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
      return `${daysLeft} days left`;
    } else {
      return `Ended ${endDate.toLocaleDateString()}`;
    }
  }

  protected getStatusColor(status: BookingStatus): string {
    switch (status) {
      case BookingStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case BookingStatus.APPROVED:
        return 'bg-blue-100 text-blue-800';
      case BookingStatus.COMPLETED:
        return 'bg-gray-100 text-gray-800';
      case BookingStatus.CANCELLED:
        return 'bg-red-100 text-red-800';
      case BookingStatus.DENIED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  protected navigateToBrowse(): void {
    this.router.navigate(['/browse']);
  }

  protected navigateToCreateItem(): void {
    this.router.navigate(['/create-item']);
  }

  protected navigateToMyItems(): void {
    this.router.navigate(['/my-items']);
  }

  protected navigateToBookings(): void {
    this.router.navigate(['/active-bookings']);
  }

  protected navigateToPendingRequests(): void {
    this.router.navigate(['/booking-requests']);
  }

  protected navigateToActiveBookings(): void {
    this.router.navigate(['/active-bookings']);
  }

  protected navigateToAnalytics(): void {
    this.router.navigate(['/analytics'], { queryParams: { period: 'month' } });
  }

  // Booking management methods
  protected approveBooking(bookingId: number): void {
    this.bookingsService.approveBooking(bookingId).subscribe({
      next: (response) => {
        console.log('Booking approved:', response);
        this.toastService.success(
          'Booking Approved',
          'The booking request has been approved successfully.'
        );
        this.loadDashboardData(); // Refresh data
      },
      error: (error) => {
        console.error('Error approving booking:', error);
        this.toastService.error(
          'Failed to approve booking',
          'Please try again or contact support if the issue persists.'
        );
      },
    });
  }

  protected denyBooking(bookingId: number): void {
    const reason = prompt('Please provide a reason for denying this booking (optional):');
    this.bookingsService.denyBooking(bookingId, reason || undefined).subscribe({
      next: (response) => {
        console.log('Booking denied:', response);
        this.toastService.warning('Booking Denied', 'The booking request has been denied.');
        this.loadDashboardData(); // Refresh data
      },
      error: (error) => {
        console.error('Error denying booking:', error);
        this.toastService.error(
          'Failed to deny booking',
          'Please try again or contact support if the issue persists.'
        );
      },
    });
  }
}
