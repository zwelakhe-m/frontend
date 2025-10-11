import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ItemsService, CreateItemRequest } from '../../services/items.service';
import { AuthService, User } from '../../services/auth.service';
import { ToastService } from '../../services/shared/toast.service';

@Component({
  selector: 'app-item-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './item-create.component.html',
  styleUrls: ['./item-create.component.scss'],
})
export class ItemCreateComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly itemsService = inject(ItemsService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  loading = signal(false);
  uploadingImages = signal(false);
  selectedImages = signal<File[]>([]);
  imagePreviewUrls = signal<string[]>([]);

  // Location-related signals
  currentUser = signal<User | null>(null);
  locationMethod = signal<'current' | 'manual'>('current');
  currentLocation = signal<{ lat: number; lon: number } | null>(null);
  locationLoading = signal(false);
  locationError = signal<string | null>(null);

  categories = [
    'Electronics',
    'Furniture',
    'Sports & Recreation',
    'Tools & Equipment',
    'Automotive',
    'Party & Events',
    'Home & Garden',
    'Fashion',
    'Books & Media',
    'Other',
  ];

  itemForm: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
    category: ['', Validators.required],
    price: ['', [Validators.required, Validators.min(0.01)]],
    manualLocation: [''], // No validators by default - will be added when manual location is selected
    availability: [true],
    deposit: ['', [Validators.min(0)]],
    minRentalDays: [1, [Validators.required, Validators.min(1)]],
    maxRentalDays: [30, [Validators.required, Validators.min(1)]],
    deliveryAvailable: [false],
    deliveryFee: [0, [Validators.min(0)]],
    pickupInstructions: [''],
    condition: ['excellent', Validators.required],
    rules: [''],
  });

  conditionOptions = [
    { value: 'excellent', label: 'Excellent - Like new' },
    { value: 'very_good', label: 'Very Good - Minor wear' },
    { value: 'good', label: 'Good - Some wear but fully functional' },
    { value: 'fair', label: 'Fair - Noticeable wear but works well' },
  ];

  ngOnInit() {
    this.loadCurrentUser();
  }

  loadCurrentUser() {
    // Get current user from AuthService
    this.authService.currentUser$.subscribe({
      next: (user) => {
        this.currentUser.set(user);
      },
      error: (error) => {
        console.error('Failed to load user:', error);
      },
    });
  }

  useCurrentLocation() {
    if (!navigator.geolocation) {
      this.locationError.set('Geolocation is not supported by this browser');
      return;
    }

    this.locationLoading.set(true);
    this.locationError.set(null);

    // Clear manual location validation when using current location
    this.itemForm.get('manualLocation')?.clearValidators();
    this.itemForm.get('manualLocation')?.updateValueAndValidity();

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.currentLocation.set({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
        this.locationMethod.set('current');
        this.locationLoading.set(false);
        this.locationError.set(null);
      },
      (error) => {
        this.locationLoading.set(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            this.locationError.set('Location access denied. Please enable location services.');
            break;
          case error.POSITION_UNAVAILABLE:
            this.locationError.set('Location information unavailable.');
            break;
          case error.TIMEOUT:
            this.locationError.set('Location request timeout.');
            break;
          default:
            this.locationError.set('An unknown error occurred while retrieving location.');
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  }

  useManualLocation() {
    this.locationMethod.set('manual');
    this.currentLocation.set(null);
    this.locationError.set(null);

    // Add validation for manual location when using manual method
    this.itemForm.get('manualLocation')?.setValidators([Validators.required]);
    this.itemForm.get('manualLocation')?.updateValueAndValidity();
  }

  onImageSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const files = Array.from(input.files);
      const currentImages = this.selectedImages();

      // Limit to 5 images total
      if (currentImages.length + files.length > 5) {
        this.toastService.warning('Image Limit Reached', 'You can upload a maximum of 5 images');
        return;
      }

      // Add new files
      this.selectedImages.set([...currentImages, ...files]);

      // Generate preview URLs
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const currentUrls = this.imagePreviewUrls();
          this.imagePreviewUrls.set([...currentUrls, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  }

  removeImage(index: number) {
    const images = this.selectedImages();
    const urls = this.imagePreviewUrls();

    images.splice(index, 1);
    urls.splice(index, 1);

    this.selectedImages.set([...images]);
    this.imagePreviewUrls.set([...urls]);
  }

  async onSubmit() {
    console.log('🔥 onSubmit called');
    console.log('Form valid:', this.itemForm.valid);
    console.log('Form errors:', this.itemForm.errors);
    console.log('Form values:', this.itemForm.value);
    console.log('Selected images count:', this.selectedImages().length);
    console.log('Location method:', this.locationMethod());
    console.log('Current location:', this.currentLocation());

    if (this.itemForm.invalid) {
      console.log('❌ Form is invalid, marking all as touched');
      this.itemForm.markAllAsTouched();

      // Log specific field errors
      Object.keys(this.itemForm.controls).forEach((key) => {
        const control = this.itemForm.get(key);
        if (control?.invalid) {
          console.log(`❌ Field ${key} is invalid:`, control.errors);
        }
      });
      return;
    }

    // Validate location based on method
    if (this.locationMethod() === 'current' && !this.currentLocation()) {
      console.log('❌ Current location not available');
      this.toastService.warning(
        'Location Required',
        'Please allow location access or switch to manual address entry'
      );
      return;
    }

    if (this.locationMethod() === 'manual' && !this.itemForm.get('manualLocation')?.value?.trim()) {
      console.log('❌ Manual location not provided');
      this.toastService.warning('Address Required', 'Please enter a location address');
      return;
    }

    if (this.selectedImages().length === 0) {
      console.log('❌ No images selected');
      this.toastService.warning('Images Required', 'Please add at least one image of your item');
      return;
    }

    console.log('✅ All validations passed, creating item...');
    this.loading.set(true);

    try {
      // Create item request with images
      const formValues = this.itemForm.value;
      const itemData: CreateItemRequest = {
        name: formValues.title,
        description: formValues.description,
        category: formValues.category,
        pricePerDay: parseFloat(formValues.price),
        useCurrentLocation: this.locationMethod() === 'current',
        ...(this.locationMethod() === 'current' &&
          this.currentLocation() && {
            locationLat: this.currentLocation()!.lat,
            locationLon: this.currentLocation()!.lon,
          }),
        ...(this.locationMethod() === 'manual' && {
          manualAddress: formValues.manualLocation,
        }),
        images: this.selectedImages(), // Send actual File[] objects
      };

      console.log('📤 Sending item data:', itemData);

      this.itemsService.createItem(itemData).subscribe({
        next: (newItem) => {
          console.log('✅ Item created successfully:', newItem);
          this.toastService.success(
            'Item Listed Successfully!',
            'Your item has been added to the marketplace.'
          );
          this.router.navigate(['/my-items']);
          this.loading.set(false);
          this.uploadingImages.set(false);
        },
        error: (error) => {
          console.error('❌ Error creating item:', error);

          // Check if it's a timeout error
          if (error.message?.includes('timeout') || error.name === 'TimeoutError') {
            this.toastService.warning(
              'Item Creation Delayed',
              'Creation is taking longer than expected. Please check "My Items" to see if it was created successfully.'
            );
          } else {
            this.toastService.error('Creation Failed', 'Failed to create item. Please try again.');
          }

          this.loading.set(false);
          this.uploadingImages.set(false);
        },
      });
    } catch (error) {
      console.error('❌ Exception in onSubmit:', error);
      this.toastService.error('Creation Failed', 'Failed to create item. Please try again.');
      this.loading.set(false);
      this.uploadingImages.set(false);
    }
    // Removed finally block to avoid state conflicts
  }

  onCancel() {
    this.router.navigate(['/dashboard']);
  }

  onButtonClick() {
    console.log('🔥 Button clicked!');
    console.log('Form valid:', this.itemForm.valid);
    console.log('Form invalid:', this.itemForm.invalid);
    console.log('Loading:', this.loading());
    console.log('Uploading images:', this.uploadingImages());
    console.log(
      'Button disabled?',
      this.loading() || this.uploadingImages() || this.itemForm.invalid
    );

    if (this.itemForm.invalid) {
      console.log('❌ Form is invalid, checking each field:');
      Object.keys(this.itemForm.controls).forEach((key) => {
        const control = this.itemForm.get(key);
        if (control?.invalid) {
          console.log(`❌ ${key}: invalid`, control.errors);
        } else {
          console.log(`✅ ${key}: valid`);
        }
      });
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.itemForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.itemForm.get(fieldName);
    if (!field?.errors) return '';

    if (field.errors['required']) return `${this.getFieldLabel(fieldName)} is required`;
    if (field.errors['minlength'])
      return `${this.getFieldLabel(fieldName)} must be at least ${
        field.errors['minlength'].requiredLength
      } characters`;
    if (field.errors['maxlength'])
      return `${this.getFieldLabel(fieldName)} must be no more than ${
        field.errors['maxlength'].requiredLength
      } characters`;
    if (field.errors['min'])
      return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['min'].min}`;

    return 'Invalid value';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      title: 'Title',
      description: 'Description',
      category: 'Category',
      price: 'Price',
      manualLocation: 'Location',
      deposit: 'Deposit',
      minRentalDays: 'Minimum rental days',
      maxRentalDays: 'Maximum rental days',
      deliveryFee: 'Delivery fee',
      condition: 'Condition',
    };
    return labels[fieldName] || fieldName;
  }

  protected goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
