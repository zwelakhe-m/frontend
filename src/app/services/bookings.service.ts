import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';

// Booking interface
export interface Booking {
  id: number;
  item_id: number;
  item_name: string;
  item_description?: string;
  image_urls?: string[];
  price_per_day: number;
  renter_id: number;
  renter_name: string;
  renter_email: string;
  owner_id: number;
  owner_name: string;
  owner_email: string;
  start_date: string;
  end_date: string;
  total_price: number;
  total_cost?: number;
  total_amount?: number;
  status: BookingStatus;
  message?: string;
  owner_notes?: string;
  reason?: string;
  created_at: string;
  updated_at?: string;
}

export enum BookingStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  DENIED = 'denied',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export interface CreateBookingRequest {
  item_id: number;
  start_date: string;
  end_date: string;
  message?: string;
}

export interface BookingFilters {
  status?: BookingStatus;
  type?: 'outgoing' | 'incoming'; // outgoing = as renter, incoming = as owner
  itemId?: number;
  userId?: number;
  startDate?: string;
  endDate?: string;
  sortBy?: 'date' | 'price' | 'status' | 'created';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface BookingStats {
  totalBookings: number;
  totalEarnings: number;
  totalSpent: number;
  activeBookings: number;
  pendingRequests: number;
  completedBookings: number;
  averageRating?: number;
}

@Injectable({
  providedIn: 'root',
})
export class BookingsService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = 'http://localhost:8081/api/bookings';

  // Reactive state management
  private readonly myBookingsSubject = new BehaviorSubject<Booking[]>([]);
  private readonly incomingBookingsSubject = new BehaviorSubject<Booking[]>([]);
  private readonly outgoingBookingsSubject = new BehaviorSubject<Booking[]>([]);
  private readonly statsSubject = new BehaviorSubject<BookingStats>({
    totalBookings: 0,
    totalEarnings: 0,
    totalSpent: 0,
    activeBookings: 0,
    pendingRequests: 0,
    completedBookings: 0,
  });

  // Public observables
  public myBookings$ = this.myBookingsSubject.asObservable();
  public incomingBookings$ = this.incomingBookingsSubject.asObservable();
  public outgoingBookings$ = this.outgoingBookingsSubject.asObservable();
  public stats$ = this.statsSubject.asObservable();

  // Signals for reactive UI
  public isLoading = signal<boolean>(false);
  public bookingLoading = signal<boolean>(false);
  public pendingCount = signal<number>(0);

  /**
   * Get all bookings for current user (as renter)
   */
  getMyBookings(filters?: BookingFilters): Observable<any> {
    this.isLoading.set(true);

    const params = this.buildParams(filters);

    return this.http
      .get<any>(`${this.baseUrl}/my-bookings`, {
        params,
        headers: this.authService.getAuthHeaders(),
      })
      .pipe(
        tap((response) => {
          const bookings = response.bookings || [];
          this.myBookingsSubject.next(bookings);
          this.isLoading.set(false);
        }),
        catchError((error) => {
          this.isLoading.set(false);
          return this.handleError(error);
        })
      );
  }

  /**
   * Get booking requests for user's items (as owner)
   */
  getBookingRequests(filters?: BookingFilters): Observable<any> {
    this.isLoading.set(true);

    const params = this.buildParams(filters);

    return this.http
      .get<any>(`${this.baseUrl}/requests`, {
        params,
        headers: this.authService.getAuthHeaders(),
      })
      .pipe(
        tap((response) => {
          const bookings = response.booking_requests || [];
          this.incomingBookingsSubject.next(bookings);
          // Update pending count
          const pendingCount = bookings.filter(
            (b: any) => b.status === BookingStatus.PENDING
          ).length;
          this.pendingCount.set(pendingCount);
          this.isLoading.set(false);
        }),
        catchError((error) => {
          this.isLoading.set(false);
          return this.handleError(error);
        })
      );
  }

  /**
   * Get booking by ID
   */
  getBooking(id: number): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}/${id}`, {
        headers: this.authService.getAuthHeaders(),
      })
      .pipe(catchError((error) => this.handleError(error)));
  }

  /**
   * Create new booking
   */
  createBooking(bookingData: CreateBookingRequest): Observable<any> {
    this.bookingLoading.set(true);

    return this.http
      .post<any>(this.baseUrl, bookingData, {
        headers: this.authService.getAuthHeaders(),
      })
      .pipe(
        tap((response) => {
          const booking = response.booking;
          // Add to outgoing bookings
          const currentBookings = this.outgoingBookingsSubject.value;
          this.outgoingBookingsSubject.next([booking, ...currentBookings]);
          this.bookingLoading.set(false);
        }),
        catchError((error) => {
          this.bookingLoading.set(false);
          return this.handleError(error);
        })
      );
  }

  /**
   * Update booking status (owner actions)
   */
  updateBookingStatus(id: number, status: BookingStatus, owner_notes?: string): Observable<any> {
    this.bookingLoading.set(true);

    const body: any = { status };
    if (owner_notes) {
      body.owner_notes = owner_notes;
    }

    return this.http
      .put<any>(`${this.baseUrl}/${id}/status`, body, {
        headers: this.authService.getAuthHeaders(),
      })
      .pipe(
        tap((response) => {
          const booking = response.booking;
          this.updateBookingInState(booking);
          this.bookingLoading.set(false);
        }),
        catchError((error) => {
          this.bookingLoading.set(false);
          return this.handleError(error);
        })
      );
  }

  /**
   * Approve booking (owner action)
   */
  approveBooking(id: number, notes?: string): Observable<any> {
    return this.updateBookingStatus(id, BookingStatus.APPROVED, notes);
  }

  /**
   * Deny booking (owner action)
   */
  denyBooking(id: number, notes?: string): Observable<any> {
    return this.updateBookingStatus(id, BookingStatus.DENIED, notes);
  }

  /**
   * Cancel booking (renter or owner action)
   */
  cancelBooking(id: number, notes?: string): Observable<any> {
    return this.updateBookingStatus(id, BookingStatus.CANCELLED, notes);
  }

  /**
   * Mark booking as completed (automatic or manual)
   */
  completeBooking(id: number): Observable<any> {
    return this.updateBookingStatus(id, BookingStatus.COMPLETED);
  }

  /**
   * Check item availability for given dates
   */
  checkAvailability(
    itemId: number,
    startDate: string,
    endDate: string
  ): Observable<{ available: boolean; conflictingBookings?: Booking[] }> {
    const params = new HttpParams()
      .set('itemId', itemId.toString())
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this.http
      .get<{ available: boolean; conflictingBookings?: Booking[] }>(
        `${this.baseUrl}/check-availability`,
        { params }
      )
      .pipe(catchError((error) => this.handleError(error)));
  }

  /**
   * Get booking statistics for current user
   */
  getBookingStats(): Observable<BookingStats> {
    return this.http
      .get<BookingStats>(`${this.baseUrl}/stats`, {
        headers: this.authService.getAuthHeaders(),
      })
      .pipe(
        tap((stats) => {
          this.statsSubject.next(stats);
        }),
        catchError((error) => this.handleError(error))
      );
  }

  /**
   * Get bookings for a specific item (for item owners)
   */
  getItemBookings(
    itemId: number,
    filters?: BookingFilters
  ): Observable<{ bookings: Booking[]; total: number }> {
    const params = this.buildParams(filters);

    return this.http
      .get<{ bookings: Booking[]; total: number }>(`${this.baseUrl}/items/${itemId}`, {
        params,
        headers: this.authService.getAuthHeaders(),
      })
      .pipe(catchError((error) => this.handleError(error)));
  }

  /**
   * Calculate booking price
   */
  calculatePrice(pricePerDay: number, startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeDiff = end.getTime() - start.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    return Math.max(1, daysDiff) * pricePerDay;
  }

  /**
   * Get booking duration in days
   */
  getBookingDuration(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeDiff = end.getTime() - start.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  /**
   * Check if booking can be cancelled
   */
  canCancelBooking(booking: Booking): boolean {
    const now = new Date();
    const startDate = new Date(booking.start_date);
    const hoursDiff = (startDate.getTime() - now.getTime()) / (1000 * 3600);

    // Can cancel if booking hasn't started and is more than 24 hours away
    return booking.status === BookingStatus.APPROVED && hoursDiff > 24;
  }

  /**
   * Check if booking can be modified
   */
  canModifyBooking(booking: Booking): boolean {
    const now = new Date();
    const startDate = new Date(booking.start_date);

    return (
      booking.status === BookingStatus.PENDING ||
      (booking.status === BookingStatus.APPROVED && startDate > now)
    );
  }

  /**
   * Get status badge color for UI
   */
  getStatusColor(status: BookingStatus): string {
    switch (status) {
      case BookingStatus.PENDING:
        return '#f59e0b'; // amber
      case BookingStatus.APPROVED:
        return '#3b82f6'; // blue
      case BookingStatus.COMPLETED:
        return '#10b981'; // emerald
      case BookingStatus.CANCELLED:
        return '#ef4444'; // red
      case BookingStatus.DENIED:
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray
    }
  }

  // Private helper methods

  private updateBookingInState(updatedBooking: Booking): void {
    // Update in all relevant state arrays
    this.updateBookingInArray(this.myBookingsSubject, updatedBooking);
    this.updateBookingInArray(this.incomingBookingsSubject, updatedBooking);
    this.updateBookingInArray(this.outgoingBookingsSubject, updatedBooking);

    // Update pending count
    const incomingBookings = this.incomingBookingsSubject.value;
    const pendingCount = incomingBookings.filter((b) => b.status === BookingStatus.PENDING).length;
    this.pendingCount.set(pendingCount);
  }

  private updateBookingInArray(subject: BehaviorSubject<Booking[]>, updatedBooking: Booking): void {
    const currentBookings = subject.value;
    const index = currentBookings.findIndex((b) => b.id === updatedBooking.id);
    if (index > -1) {
      currentBookings[index] = updatedBooking;
      subject.next([...currentBookings]);
    }
  }

  private buildParams(filters?: BookingFilters): HttpParams {
    let params = new HttpParams();

    if (!filters) return params;

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    return params;
  }

  private handleError(error: any): Observable<never> {
    let errorMessage = 'An error occurred';

    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    } else if (error.status === 401) {
      errorMessage = 'Authentication required';
    } else if (error.status === 403) {
      errorMessage = 'Access denied';
    } else if (error.status === 404) {
      errorMessage = 'Booking not found';
    } else if (error.status === 409) {
      errorMessage = 'Booking conflict - item not available for selected dates';
    } else if (error.status === 0) {
      errorMessage = 'Unable to connect to server';
    }

    console.error('Bookings Service Error:', error);
    return throwError(() => new Error(errorMessage));
  }
}
