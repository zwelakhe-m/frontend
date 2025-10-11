import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { BookingsService, Booking, BookingStatus } from '../../services/bookings.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/shared/toast.service';

@Component({
  selector: 'app-active-bookings',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './active-bookings.component.html',
  styleUrls: ['./active-bookings.component.scss'],
})
export class ActiveBookingsComponent implements OnInit {
  protected bookingsService = inject(BookingsService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  // Expose Math to template
  protected Math = Math;

  // State
  protected myBookings = signal<Booking[]>([]);
  protected requestedBookings = signal<Booking[]>([]);
  protected loading = signal(true);
  protected activeTab = signal<'incoming' | 'outgoing'>('incoming');

  // Filter signals
  protected selectedStatus = signal<BookingStatus | 'all'>('all');
  protected searchTerm = signal('');

  // Computed values
  protected totalActiveCount = signal(0);
  protected incomingActiveCount = signal(0);
  protected outgoingActiveCount = signal(0);

  // Status options for filtering
  protected statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: BookingStatus.APPROVED, label: 'Approved' },
    { value: BookingStatus.COMPLETED, label: 'Completed' },
  ];

  ngOnInit(): void {
    this.loadActiveBookings();
  }

  private loadActiveBookings(): void {
    this.loading.set(true);

    // Load my bookings (outgoing - where I'm the renter)
    this.bookingsService.getMyBookings().subscribe({
      next: (response) => {
        const bookings = response.bookings || [];
        // Filter for active/approved/completed bookings only
        const activeBookings = bookings.filter(
          (b: any) => b.status === BookingStatus.APPROVED || b.status === BookingStatus.COMPLETED
        );
        this.myBookings.set(activeBookings);
        this.outgoingActiveCount.set(activeBookings.length);
        this.updateTotalCount();
      },
      error: (error) => {
        console.error('Error loading my bookings:', error);
      },
    });

    // Load booking requests for my items (incoming - where I'm the owner)
    this.bookingsService.getBookingRequests().subscribe({
      next: (response) => {
        const requests = response.booking_requests || [];
        // Filter for active/approved/completed bookings only
        const activeRequests = requests.filter(
          (r: any) => r.status === BookingStatus.APPROVED || r.status === BookingStatus.COMPLETED
        );
        this.requestedBookings.set(activeRequests);
        this.incomingActiveCount.set(activeRequests.length);
        this.updateTotalCount();
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading booking requests:', error);
        this.loading.set(false);
      },
    });
  }

  private updateTotalCount(): void {
    this.totalActiveCount.set(this.incomingActiveCount() + this.outgoingActiveCount());
  }

  protected setActiveTab(tab: 'incoming' | 'outgoing'): void {
    this.activeTab.set(tab);
  }

  protected getCurrentBookings(): Booking[] {
    const bookings = this.activeTab() === 'incoming' ? this.requestedBookings() : this.myBookings();
    return this.filterBookings(bookings);
  }

  private filterBookings(bookings: Booking[]): Booking[] {
    let filtered = bookings;

    // Filter by status
    if (this.selectedStatus() !== 'all') {
      filtered = filtered.filter((booking) => booking.status === this.selectedStatus());
    }

    // Filter by search term
    const searchTerm = this.searchTerm().toLowerCase();
    if (searchTerm) {
      filtered = filtered.filter(
        (booking) =>
          booking.item_name?.toLowerCase().includes(searchTerm) ||
          booking.renter_name?.toLowerCase().includes(searchTerm) ||
          booking.owner_name?.toLowerCase().includes(searchTerm)
      );
    }

    return filtered;
  }

  protected completeBooking(bookingId: number): void {
    if (confirm('Are you sure you want to mark this booking as completed?')) {
      this.bookingsService.completeBooking(bookingId).subscribe({
        next: (response) => {
          console.log('Booking completed:', response);
          this.toastService.success(
            'Booking Completed',
            'The booking has been marked as completed successfully.'
          );
          this.loadActiveBookings(); // Refresh data
        },
        error: (error) => {
          console.error('Error completing booking:', error);
          this.toastService.error(
            'Failed to Complete',
            'Failed to complete booking. Please try again.'
          );
        },
      });
    }
  }

  protected cancelBooking(bookingId: number): void {
    const reason = prompt('Please provide a reason for cancelling this booking (optional):');
    if (reason !== null) {
      // User didn't cancel the prompt
      this.bookingsService.cancelBooking(bookingId, reason || undefined).subscribe({
        next: (response) => {
          console.log('Booking cancelled:', response);
          this.toastService.info(
            'Booking Cancelled',
            'The booking has been cancelled successfully.'
          );
          this.loadActiveBookings(); // Refresh data
        },
        error: (error) => {
          console.error('Error cancelling booking:', error);
          this.toastService.error(
            'Failed to Cancel',
            'Failed to cancel booking. Please try again.'
          );
        },
      });
    }
  }

  protected contactUser(booking: Booking): void {
    const isOwner = this.activeTab() === 'incoming';
    const contactPerson = isOwner ? booking.renter_name : booking.owner_name;
    const email = isOwner ? booking.renter_email : booking.owner_email;

    if (email) {
      window.location.href = `mailto:${email}?subject=Regarding booking for ${booking.item_name}`;
    } else {
      this.toastService.warning(
        'Contact Unavailable',
        `Contact information not available for ${contactPerson}`
      );
    }
  }

  protected viewItemDetails(booking: Booking): void {
    this.router.navigate(['/items', booking.item_id]);
  }

  protected formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  protected formatDateRange(booking: Booking): string {
    const startDate = this.formatDate(booking.start_date);
    const endDate = this.formatDate(booking.end_date);
    return `${startDate} - ${endDate}`;
  }

  protected calculateDaysLeft(booking: Booking): number {
    const endDate = new Date(booking.end_date);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  protected isBookingActive(booking: Booking): boolean {
    const today = new Date();
    const startDate = new Date(booking.start_date);
    const endDate = new Date(booking.end_date);
    return booking.status === BookingStatus.APPROVED && startDate <= today && endDate >= today;
  }

  protected canCompleteBooking(booking: Booking): boolean {
    // Only owners can mark bookings as completed, and only after end date
    const today = new Date();
    const endDate = new Date(booking.end_date);
    return (
      this.activeTab() === 'incoming' &&
      booking.status === BookingStatus.APPROVED &&
      endDate <= today
    );
  }

  protected canCancelBooking(booking: Booking): boolean {
    // Both parties can cancel, but not if already completed
    const today = new Date();
    const startDate = new Date(booking.start_date);
    return (
      booking.status === BookingStatus.APPROVED && startDate > today // Only if booking hasn't started yet
    );
  }

  protected getStatusColor(status: BookingStatus): string {
    return this.bookingsService.getStatusColor(status);
  }

  protected formatPrice(price: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  }

  protected goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
