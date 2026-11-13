import { environment } from '../../../environments/environment';
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { ItemsService, RentalItem } from '../../services/items.service';
import { AuthService } from '../../services/auth.service';
import { BookingsService, CreateBookingRequest } from '../../services/bookings.service';
import { ToastService } from '../../services/shared/toast.service';
import { ContactOwnerComponent } from '../messages/contact-owner.component';
import { CurrencyService } from '../../services/currency.service';

@Component({
  selector: 'app-item-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ContactOwnerComponent],
  templateUrl: './item-detail.component.html',
  styleUrls: ['./item-detail.component.scss'],
})
export class ItemDetailComponent implements OnInit {
  private itemsService = inject(ItemsService);
  private authService = inject(AuthService);
  private bookingsService = inject(BookingsService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastService = inject(ToastService);
  private readonly currencyService = inject(CurrencyService);

  // State
  item = signal<RentalItem | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  currentImageIndex = signal(0);
  showBookingModal = signal(false);
  isOwner = signal(false);

  // Booking form
  bookingStartDate = signal('');
  bookingEndDate = signal('');
  bookingMessage = signal('');
  bookingLoading = signal(false);
  bookingError = signal('');

  ngOnInit() {
    const itemIdParam = this.route.snapshot.paramMap.get('id');
    const itemId = itemIdParam !== null ? Number(itemIdParam) : NaN;
    if (!isNaN(itemId) && itemId > 0) {
      this.loadItem(itemId);
    } else {
      this.error.set('Invalid item ID');
      this.loading.set(false);
    }
  }

  private async loadItem(id: number) {
    this.loading.set(true);
    this.error.set(null);

    try {
      this.itemsService.getItem(id).subscribe({
        next: (item: RentalItem) => {
          this.item.set(item);
          this.checkIfOwner(item);
          this.loading.set(false);
        },
        error: (error: any) => {
          console.error('Error loading item:', error);
          this.error.set('Failed to load item details');
          this.loading.set(false);
        },
      });
    } catch (error) {
      console.error('Error loading item:', error);
      this.error.set('Failed to load item details');
      this.loading.set(false);
    }
  }

  private checkIfOwner(item: RentalItem) {
    const currentUser = this.authService.currentUser();
    this.isOwner.set(currentUser?.id === item.ownerId);
  }

  // Image gallery methods
  nextImage() {
    const item = this.item();
    if (item && item.images && item.images.length > 0) {
      const nextIndex = (this.currentImageIndex() + 1) % item.images.length;
      this.currentImageIndex.set(nextIndex);
    }
  }

  previousImage() {
    const item = this.item();
    if (item && item.images && item.images.length > 0) {
      const prevIndex =
        this.currentImageIndex() === 0 ? item.images.length - 1 : this.currentImageIndex() - 1;
      this.currentImageIndex.set(prevIndex);
    }
  }

  selectImage(index: number) {
    this.currentImageIndex.set(index);
  }

  getCurrentImageUrl(): string {
    const item = this.item();
    if (item && item.images && item.images.length > 0) {
      const imageUrl = item.images[this.currentImageIndex()];
      if (imageUrl && !imageUrl.startsWith('http')) {
        // return `http://localhost:8081/uploads/${imageUrl}`; // Localhost for reference
        return `${environment.apiUrl.replace(/\/api$/, '')}/uploads/${imageUrl}`;
      }
      return imageUrl || '/assets/images/placeholder-item.jpg';
    }
    return '/assets/images/placeholder-item.jpg';
  }

  getThumbnailUrl(imageUrl: string): string {
    if (imageUrl && !imageUrl.startsWith('http')) {
      // return `http://localhost:8081/uploads/${imageUrl}`; // Localhost for reference
      return `${environment.apiUrl.replace(/\/api$/, '')}/uploads/${imageUrl}`;
    }
    return imageUrl || '/assets/images/placeholder-item.jpg';
  }

  // Booking methods
  openBookingModal() {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }
    this.showBookingModal.set(true);
  }

  closeBookingModal() {
    this.showBookingModal.set(false);
    this.bookingStartDate.set('');
    this.bookingEndDate.set('');
    this.bookingMessage.set('');
    this.bookingError.set('');
  }

  onBookingDatesChange() {
    this.bookingError.set('');
  }

  getBookingDateError(): string {
    const startDate = this.bookingStartDate();
    const endDate = this.bookingEndDate();
    if (!startDate || !endDate) return '';
    if (startDate < this.getMinDate()) return 'The start date cannot be in the past.';
    if (endDate <= startDate) return 'Choose an end date at least one day after the start date.';
    return '';
  }

  isBookingDateRangeValid(): boolean {
    return !!(
      this.item()?.isAvailable &&
      this.bookingStartDate() &&
      this.bookingEndDate() &&
      !this.getBookingDateError()
    );
  }

  async submitBooking() {
    const item = this.item();
    if (!item || !this.isBookingDateRangeValid()) {
      this.bookingError.set(
        this.getBookingDateError() || 'Choose a start and end date to continue.',
      );
      return;
    }

    this.bookingError.set('');
    this.bookingLoading.set(true);

    try {
      const bookingData: CreateBookingRequest = {
        item_id: item.id,
        start_date: this.bookingStartDate(),
        end_date: this.bookingEndDate(),
        message: this.bookingMessage() || undefined,
      };

      this.bookingsService.createBooking(bookingData).subscribe({
        next: () => {
          this.toastService.success(
            'Booking Request Sent!',
            'Your booking request has been sent to the owner.'
          );
          this.closeBookingModal();
          this.bookingLoading.set(false);
        },
        error: (error: any) => {
          console.error('Error creating booking:', error);
          const message = error.message || 'Failed to send booking request. Please try again.';
          this.bookingError.set(message);
          this.toastService.error(
            'Booking Failed',
            message,
          );
          this.bookingLoading.set(false);
        },
      });
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Failed to send booking request. Please try again.');
      this.bookingLoading.set(false);
    }
  }

  // Navigation methods
  goBack() {
    history.back();
  }

  editItem() {
    const item = this.item();
    if (item) {
      this.router.navigate(['/items/edit', item.id]);
    }
  }

  contactOwner() {
    // Open the Contact Owner modal - the ContactOwnerComponent will handle the messaging logic
    // This method will be triggered by the ContactOwnerComponent itself
  }

  // Utility methods
  formatPrice(price: number): string {
    return this.currencyService.format(price);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  calculateDays(): number {
    if (!this.isBookingDateRangeValid()) return 0;

    const start = new Date(`${this.bookingStartDate()}T00:00:00Z`);
    const end = new Date(`${this.bookingEndDate()}T00:00:00Z`);
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  }

  calculateTotal(): number {
    const item = this.item();
    if (!item) return 0;
    return this.calculateDays() * item.pricePerDay;
  }

  getMinDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getMinEndDate(): string {
    const startDate = this.bookingStartDate() || this.getMinDate();
    const nextDay = new Date(`${startDate}T00:00:00Z`);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    const minEndDate = nextDay.toISOString().slice(0, 10);
    return minEndDate < this.getMinDate() ? this.getMinDate() : minEndDate;
  }

  hasRating(): boolean {
    const item = this.item();
    return !!(item && item.averageRating && item.averageRating > 0);
  }

  getRatingValue(): number {
    const item = this.item();
    return item?.averageRating || 0;
  }

  viewItemBookings() {
    const item = this.item();
    if (item) {
      // Navigate to a dedicated page for viewing item bookings
      this.router.navigate(['/items', item.id, 'bookings']);
    }
  }
}
