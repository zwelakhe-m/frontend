import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { BookingsService, Booking, BookingStatus } from '../../services/bookings.service';
import { ItemsService, RentalItem } from '../../services/items.service';
import { NotificationsService } from '../../services/notifications.service';
import { ToastService } from '../../services/shared/toast.service';

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

  // Reactive state
  protected currentUser = signal<User | null>(null);
  protected recentBookings = signal<Booking[]>([]);
  protected pendingRequests = signal<Booking[]>([]);
  protected myItems = signal<RentalItem[]>([]);
  protected activeBookingsCount = signal(0);
  protected myItemsCount = signal(0);

  ngOnInit(): void {
    // Subscribe to current user
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser.set(user);
    });

    // Load initial data
    this.loadDashboardData();
  }

  private loadDashboardData(): void {
    // Load recent bookings
    this.bookingsService
      .getMyBookings({ limit: 5, sortBy: 'created', sortOrder: 'desc' })
      .subscribe((response) => {
        const bookings = response.bookings || [];
        this.recentBookings.set(bookings);
        this.activeBookingsCount.set(
          bookings.filter(
            (b: any) => b.status === BookingStatus.APPROVED || b.status === BookingStatus.PENDING
          ).length
        );
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

  protected getUserInitials(): string {
    const user = this.currentUser();
    if (!user?.name) return 'U';

    const names = user.name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return names[0][0].toUpperCase();
  }

   protected getMonthlyEarnings(): number {
    const bookings = this.recentBookings();
    if (!bookings || bookings.length === 0) return 0;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    // Only include bookings for this month and year, and with status APPROVED or COMPLETED
    const total = bookings
      .filter(b => {
        const endDate = new Date(b.end_date);
        return (
          endDate.getMonth() === currentMonth &&
          endDate.getFullYear() === currentYear &&
          (b.status === BookingStatus.APPROVED || b.status === BookingStatus.COMPLETED)
        );
      })
      .reduce((sum, b) => {
        const price = typeof b.total_price === 'number' ? b.total_price : parseFloat(b.total_price);
        return sum + (isNaN(price) ? 0 : price);
      }, 0);
    return isNaN(total) ? 0 : total;
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
    this.router.navigate(['/analytics']);
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
