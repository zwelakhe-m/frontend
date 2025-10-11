import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { BookingsService, Booking, BookingStatus } from '../../services/bookings.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/shared/toast.service';

@Component({
  selector: 'app-booking-requests',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './booking-requests.component.html',
  styleUrls: ['./booking-requests.component.scss'],
})
export class BookingRequestsComponent implements OnInit {
  private readonly bookingsService = inject(BookingsService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  // State
  protected allRequests = signal<Booking[]>([]);
  protected isLoading = signal(false);
  protected activeFilter = signal<string>('all');
  protected processingBooking = signal<number | null>(null);

  // Filter options
  protected statusFilters = [
    { label: 'All Requests', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Denied', value: 'denied' },
    { label: 'Completed', value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  // Computed
  protected filteredRequests = () => {
    const filter = this.activeFilter();
    if (filter === 'all') {
      return this.allRequests();
    }
    return this.allRequests().filter((request) => request.status === filter);
  };

  async ngOnInit() {
    this.loadRequests();
  }

  private loadRequests() {
    this.isLoading.set(true);
    this.bookingsService.getBookingRequests().subscribe({
      next: (response) => {
        const requests = response.booking_requests || [];
        this.allRequests.set(requests);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading booking requests:', error);
        this.toastService.error(
          'Failed to load booking requests',
          'Please try refreshing the page.'
        );
        this.isLoading.set(false);
      },
    });
  }

  protected setActiveFilter(filter: string) {
    this.activeFilter.set(filter);
  }

  protected getFilterButtonClass(filter: string): string {
    const isActive = this.activeFilter() === filter;
    return isActive
      ? 'bg-white text-purple-600 shadow-sm'
      : 'text-gray-600 hover:text-gray-900 hover:bg-white/50';
  }

  protected getStatusColor(status: string): string {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'denied':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  protected getTotalRequests(): number {
    return this.allRequests().length;
  }

  protected getCountForStatus(status: string): number {
    if (status === 'all') {
      return this.allRequests().length;
    }
    return this.allRequests().filter((request) => request.status === status).length;
  }

  protected getEmptyStateMessage(): string {
    const filter = this.activeFilter();
    switch (filter) {
      case 'pending':
        return 'You have no pending booking requests at the moment.';
      case 'approved':
        return 'No approved bookings yet.';
      case 'denied':
        return 'No denied requests.';
      case 'completed':
        return 'No completed bookings yet.';
      case 'cancelled':
        return 'No cancelled bookings.';
      default:
        return "You haven't received any booking requests yet.";
    }
  }

  protected formatDateRange(request: Booking): string {
    const startDate = new Date(request.start_date).toLocaleDateString();
    const endDate = new Date(request.end_date).toLocaleDateString();
    return `${startDate} - ${endDate}`;
  }

  protected getDuration(request: Booking): number {
    const start = new Date(request.start_date);
    const end = new Date(request.end_date);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  protected formatRequestDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  protected getRenterInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  }

  // Actions
  protected approveBooking(bookingId: number) {
    this.processingBooking.set(bookingId);
    this.bookingsService.updateBookingStatus(bookingId, BookingStatus.APPROVED).subscribe({
      next: () => {
        this.toastService.success(
          'Booking Approved',
          'The booking request has been approved successfully.'
        );
        this.loadRequests(); // Refresh the list
        this.processingBooking.set(null);
      },
      error: (error) => {
        console.error('Error approving booking:', error);
        this.toastService.error(
          'Failed to approve booking',
          'Please try again or contact support if the issue persists.'
        );
        this.processingBooking.set(null);
      },
    });
  }

  protected denyBooking(bookingId: number) {
    this.processingBooking.set(bookingId);
    this.bookingsService.updateBookingStatus(bookingId, BookingStatus.DENIED).subscribe({
      next: () => {
        this.toastService.warning('Booking Denied', 'The booking request has been denied.');
        this.loadRequests(); // Refresh the list
        this.processingBooking.set(null);
      },
      error: (error) => {
        console.error('Error denying booking:', error);
        this.toastService.error(
          'Failed to deny booking',
          'Please try again or contact support if the issue persists.'
        );
        this.processingBooking.set(null);
      },
    });
  }

  protected completeBooking(bookingId: number) {
    this.processingBooking.set(bookingId);
    this.bookingsService.updateBookingStatus(bookingId, BookingStatus.COMPLETED).subscribe({
      next: () => {
        this.toastService.success('Booking Completed', 'The booking has been marked as completed.');
        this.loadRequests(); // Refresh the list
        this.processingBooking.set(null);
      },
      error: (error) => {
        console.error('Error completing booking:', error);
        this.toastService.error(
          'Failed to complete booking',
          'Please try again or contact support if the issue persists.'
        );
        this.processingBooking.set(null);
      },
    });
  }

  protected cancelBooking(bookingId: number) {
    this.processingBooking.set(bookingId);
    this.bookingsService.updateBookingStatus(bookingId, BookingStatus.CANCELLED).subscribe({
      next: () => {
        this.toastService.info('Booking Cancelled', 'The booking has been cancelled.');
        this.loadRequests(); // Refresh the list
        this.processingBooking.set(null);
      },
      error: (error) => {
        console.error('Error cancelling booking:', error);
        this.toastService.error(
          'Failed to cancel booking',
          'Please try again or contact support if the issue persists.'
        );
        this.processingBooking.set(null);
      },
    });
  }

  protected goBack() {
    this.router.navigate(['/dashboard']);
  }
}
