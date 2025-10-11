import { Component, inject, signal, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { BookingsService, CreateBookingRequest } from '../../services/bookings.service';
import { ItemsService, RentalItem } from '../../services/items.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/shared/toast.service';

@Component({
  selector: 'app-booking-request',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './booking-request.component.html',
  styleUrls: ['./booking-request.component.scss'],
})
export class BookingRequestComponent implements OnInit {
  @Input() itemId!: string;

  private readonly fb = inject(FormBuilder);
  private readonly bookingsService = inject(BookingsService);
  private readonly itemsService = inject(ItemsService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  item = signal<RentalItem | null>(null);
  loading = signal(false);
  submitting = signal(false);

  bookingForm: FormGroup = this.fb.group({
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    message: ['', [Validators.maxLength(500)]],
    deliveryAddress: [''],
    needsDelivery: [false],
  });

  // Computed values
  totalDays = signal(0);
  subtotal = signal(0);
  deliveryFee = signal(0);
  depositAmount = signal(0);
  totalCost = signal(0);

  // Computed methods for template
  get today(): string {
    return new Date().toISOString().split('T')[0];
  }

  rentalDays = () => this.totalDays();
  serviceFee = () => Math.round(this.subtotal() * 0.1 * 100) / 100;
  isSubmitting = () => this.submitting();

  // Add a goBack method
  goBack() {
    this.router.navigate(['/browse']);
  }

  ngOnInit() {
    this.loadItem();
    this.setupFormSubscriptions();
  }

  async loadItem() {
    if (!this.itemId) return;

    this.loading.set(true);
    try {
      // getItem returns Observable, need to convert itemId to number and subscribe
      const itemId = parseInt(this.itemId);
      this.itemsService.getItem(itemId).subscribe({
        next: (item) => {
          this.item.set(item);
          this.calculateCosts();
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading item:', error);
          this.toastService.error(
            'Failed to Load Item',
            'Could not load item details. Please try again.'
          );
          this.loading.set(false);
        },
      });
    } catch (error) {
      console.error('Error loading item:', error);
      this.toastService.error(
        'Failed to Load Item',
        'Could not load item details. Please try again.'
      );
      this.loading.set(false);
    }
  }

  setupFormSubscriptions() {
    // Watch for date changes to calculate costs
    this.bookingForm.get('startDate')?.valueChanges.subscribe(() => {
      this.calculateCosts();
    });

    this.bookingForm.get('endDate')?.valueChanges.subscribe(() => {
      this.calculateCosts();
    });

    this.bookingForm.get('needsDelivery')?.valueChanges.subscribe(() => {
      this.calculateCosts();
    });
  }

  calculateCosts() {
    const item = this.item();
    if (!item) return;

    const startDate = this.bookingForm.get('startDate')?.value;
    const endDate = this.bookingForm.get('endDate')?.value;

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const timeDiff = end.getTime() - start.getTime();
      const days = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // Include both start and end days

      this.totalDays.set(Math.max(0, days));
      this.subtotal.set(days * item.pricePerDay);
      this.deliveryFee.set(0); // No delivery fee in our basic interface
      this.depositAmount.set(0); // No deposit in our basic interface

      const total = this.subtotal() + this.serviceFee();
      this.totalCost.set(total);
    } else {
      this.totalDays.set(0);
      this.subtotal.set(0);
      this.deliveryFee.set(0);
      this.totalCost.set(0);
    }
  }

  async onSubmit() {
    if (this.bookingForm.invalid) {
      this.bookingForm.markAllAsTouched();
      return;
    }

    const item = this.item();
    if (!item) return;

    // Validate dates
    const startDate = new Date(this.bookingForm.get('startDate')?.value);
    const endDate = new Date(this.bookingForm.get('endDate')?.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate < today) {
      this.toastService.warning('Invalid Date', 'Start date cannot be in the past');
      return;
    }

    if (endDate <= startDate) {
      this.toastService.warning('Invalid Date Range', 'End date must be after start date');
      return;
    }

    // Check basic date validation only (remove minRentalDays/maxRentalDays for now)
    if (this.totalDays() < 1) {
      this.toastService.warning('Invalid Rental Period', 'Rental period must be at least 1 day');
      return;
    }

    this.submitting.set(true);

    try {
      const bookingData: CreateBookingRequest = {
        item_id: item.id,
        start_date: this.bookingForm.get('startDate')?.value,
        end_date: this.bookingForm.get('endDate')?.value,
        message: this.bookingForm.get('message')?.value || '',
      };

      this.bookingsService.createBooking(bookingData).subscribe({
        next: (booking) => {
          this.toastService.success(
            'Booking Request Sent!',
            'Your booking request has been submitted successfully.'
          );
          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          console.error('Error creating booking:', error);
          this.toastService.error(
            'Booking Failed',
            'Failed to submit booking request. Please try again.'
          );
          this.submitting.set(false);
        },
      });
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Failed to submit booking request. Please try again.');
      this.submitting.set(false);
    }
  }

  onCancel() {
    this.router.navigate(['/items', this.itemId]);
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(price);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-ZA', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  getMinDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  getMaxDate(): string {
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1); // Allow booking up to 1 year in advance
    return maxDate.toISOString().split('T')[0];
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.bookingForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.bookingForm.get(fieldName);
    if (!field || !field.errors) return '';

    if (field.errors['required']) return `${this.getFieldLabel(fieldName)} is required`;
    if (field.errors['maxlength'])
      return `${this.getFieldLabel(fieldName)} must be no more than ${
        field.errors['maxlength'].requiredLength
      } characters`;

    return 'Invalid value';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      startDate: 'Start date',
      endDate: 'End date',
      message: 'Message',
      deliveryAddress: 'Delivery address',
    };
    return labels[fieldName] || fieldName;
  }
}
