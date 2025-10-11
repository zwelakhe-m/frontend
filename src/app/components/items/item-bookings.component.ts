import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BookingsService, Booking, BookingStatus } from '../../services/bookings.service';
import { ItemsService, RentalItem } from '../../services/items.service';
import { ToastService } from '../../services/shared/toast.service';

@Component({
  selector: 'app-item-bookings',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './item-bookings.component.html',
  styleUrls: ['./item-bookings.component.scss'],
})
export class ItemBookingsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bookingsService = inject(BookingsService);
  private readonly itemsService = inject(ItemsService);
  private readonly toastService = inject(ToastService);

  // State
  protected item = signal<RentalItem | null>(null);
  protected bookings = signal<Booking[]>([]);
  protected isLoading = signal(false);
  protected activeFilter = signal<string>('all');
  protected processingBooking = signal<number | null>(null);

  // Filter options
  protected statusFilters = [
    { label: 'All Bookings', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Active', value: 'active' },
    { label: 'Completed', value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' },
    { label: 'Denied', value: 'denied' },
  ];

  // Computed
  protected filteredBookings = () => {
    const filter = this.activeFilter();
    if (filter === 'all') {
      return this.bookings();
    }
    if (filter === 'active') {
      // Show approved bookings that are currently active (between start and end date)
      const now = new Date();
      return this.bookings().filter((booking) => {
        const startDate = new Date(booking.start_date);
        const endDate = new Date(booking.end_date);
        return booking.status === 'approved' && startDate <= now && endDate >= now;
      });
    }
    return this.bookings().filter((booking) => booking.status === filter);
  };

  ngOnInit() {
    const itemId = this.route.snapshot.paramMap.get('id');
    if (itemId) {
      this.loadItemAndBookings(parseInt(itemId));
    }
  }

  private loadItemAndBookings(itemId: number) {
    this.isLoading.set(true);

    try {
      // Load item details
      this.itemsService.getItem(itemId).subscribe({
        next: (item) => {
          this.item.set(item);
        },
        error: (error) => {
          console.error('Error loading item:', error);
          this.toastService.error('Failed to Load Item', 'Could not load item details.');
        },
      });

      // Load item bookings
      this.bookingsService.getItemBookings(itemId).subscribe({
        next: (response) => {
          this.bookings.set(response.bookings);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading item bookings:', error);
          this.toastService.error('Failed to Load Bookings', 'Could not load booking history.');
          this.isLoading.set(false);
        },
      });
    } catch (error) {
      console.error('Error in loadItemAndBookings:', error);
      this.isLoading.set(false);
    }
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
        return 'bg-blue-100 text-blue-800';
      case 'denied':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  protected getCountForStatus(status: string): number {
    if (status === 'all') {
      return this.bookings().length;
    }
    if (status === 'active') {
      const now = new Date();
      return this.bookings().filter((booking) => {
        const startDate = new Date(booking.start_date);
        const endDate = new Date(booking.end_date);
        return booking.status === 'approved' && startDate <= now && endDate >= now;
      }).length;
    }
    return this.bookings().filter((booking) => booking.status === status).length;
  }

  protected formatDateRange(booking: Booking): string {
    const startDate = new Date(booking.start_date).toLocaleDateString();
    const endDate = new Date(booking.end_date).toLocaleDateString();
    return `${startDate} - ${endDate}`;
  }

  protected getDuration(booking: Booking): number {
    const start = new Date(booking.start_date);
    const end = new Date(booking.end_date);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  protected formatBookingDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  protected getRenterInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  }

  protected getTotalEarnings(): number {
    return this.bookings()
      .filter((booking) => booking.status === 'completed')
      .reduce((total, booking) => total + (booking.total_amount || 0), 0);
  }

  protected getEmptyStateMessage(): string {
    const filter = this.activeFilter();
    switch (filter) {
      case 'pending':
        return 'No pending booking requests for this item.';
      case 'approved':
        return 'No approved bookings for this item.';
      case 'active':
        return 'No currently active bookings for this item.';
      case 'completed':
        return 'No completed bookings yet.';
      case 'cancelled':
        return 'No cancelled bookings.';
      case 'denied':
        return 'No denied requests.';
      default:
        return 'This item has no booking history yet.';
    }
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
        this.loadItemAndBookings(this.item()!.id); // Refresh the list
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
        this.loadItemAndBookings(this.item()!.id); // Refresh the list
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
        this.loadItemAndBookings(this.item()!.id); // Refresh the list
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

  protected goBack() {
    const item = this.item();
    if (item) {
      this.router.navigate(['/items', item.id]);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  protected goToDashboard() {
    this.router.navigate(['/dashboard']);
  }
}
