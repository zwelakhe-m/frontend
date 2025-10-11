import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StarRatingComponent } from '../star-rating/star-rating.component';

export interface ReviewFormData {
  rating_value: number;
  review_title?: string;
  review_text?: string;
  pros?: string;
  cons?: string;
  is_anonymous: boolean;
}

@Component({
  selector: 'app-review-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, StarRatingComponent],
  templateUrl: './review-form.component.html',
  styleUrls: ['./review-form.component.css'],
})
export class ReviewFormComponent implements OnInit {
  @Input() bookingId?: number;
  @Input() itemName?: string;
  @Input() isSubmitting = false;

  @Output() submitReview = new EventEmitter<ReviewFormData>();
  @Output() cancel = new EventEmitter<void>();

  reviewForm!: FormGroup;
  showOptionalFields = false;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.reviewForm = this.fb.group({
      rating_value: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      review_title: [''],
      review_text: ['', [Validators.maxLength(1000)]],
      pros: ['', [Validators.maxLength(500)]],
      cons: ['', [Validators.maxLength(500)]],
      is_anonymous: [false],
    });
  }

  get ratingValue(): number {
    return this.reviewForm.get('rating_value')?.value || 0;
  }

  get ratingText(): string {
    const rating = this.ratingValue;
    if (rating === 0) return 'Select a rating';
    if (rating === 1) return 'Very Poor';
    if (rating === 2) return 'Poor';
    if (rating === 3) return 'Fair';
    if (rating === 4) return 'Good';
    if (rating === 5) return 'Excellent';
    return '';
  }

  get isFormValid(): boolean {
    return this.reviewForm.valid && this.ratingValue > 0;
  }

  onRatingChange(rating: number): void {
    this.reviewForm.patchValue({ rating_value: rating });
  }

  toggleOptionalFields(): void {
    this.showOptionalFields = !this.showOptionalFields;
  }

  onSubmit(): void {
    if (this.isFormValid) {
      const formData = this.reviewForm.value as ReviewFormData;
      this.submitReview.emit(formData);
    }
  }

  onCancel(): void {
    this.cancel.emit();
  }

  // Character count helpers
  getCharacterCount(fieldName: string): number {
    return this.reviewForm.get(fieldName)?.value?.length || 0;
  }

  getCharacterLimit(fieldName: string): number {
    if (fieldName === 'review_text') return 1000;
    if (fieldName === 'pros' || fieldName === 'cons') return 500;
    return 0;
  }
}
