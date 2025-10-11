import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StarRatingComponent } from '../star-rating/star-rating.component';

export interface Review {
  id: number;
  rating_value: number;
  review_title?: string;
  review_text?: string;
  pros?: string;
  cons?: string;
  reviewer_name: string;
  reviewer_verified: boolean;
  is_anonymous: boolean;
  helpful_count: number;
  created_at: string;
  start_date: string;
  end_date: string;
}

@Component({
  selector: 'app-review-card',
  standalone: true,
  imports: [CommonModule, StarRatingComponent],
  templateUrl: './review-card.component.html',
  styleUrls: ['./review-card.component.css'],
})
export class ReviewCardComponent {
  @Input({ required: true }) review!: Review;
  @Input() canMarkHelpful = false;
  @Input() userHasMarkedHelpful = false;

  @Output() markHelpful = new EventEmitter<number>();
  @Output() removeHelpful = new EventEmitter<number>();

  get reviewerDisplayName(): string {
    return this.review.is_anonymous ? 'Anonymous' : this.review.reviewer_name;
  }

  get formattedDate(): string {
    return new Date(this.review.created_at).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  get rentalPeriod(): string {
    const startDate = new Date(this.review.start_date);
    const endDate = new Date(this.review.end_date);

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' });
    };

    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  }

  onHelpfulClick(): void {
    if (this.userHasMarkedHelpful) {
      this.removeHelpful.emit(this.review.id);
    } else {
      this.markHelpful.emit(this.review.id);
    }
  }
}
