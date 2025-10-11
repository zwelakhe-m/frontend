import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StarRatingComponent } from '../star-rating/star-rating.component';

export interface RatingStatistics {
  average_rating: number;
  total_reviews: number;
  rating_breakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

@Component({
  selector: 'app-rating-summary',
  standalone: true,
  imports: [CommonModule, StarRatingComponent],
  templateUrl: './rating-summary.component.html',
  styleUrls: ['./rating-summary.component.css'],
})
export class RatingSummaryComponent {
  @Input({ required: true }) statistics!: RatingStatistics;
  @Input() showBreakdown = true;

  get ratingLevels(): Array<{ level: number; count: number; percentage: number }> {
    const total = this.statistics.total_reviews;
    return [5, 4, 3, 2, 1].map((level) => ({
      level,
      count:
        this.statistics.rating_breakdown[level as keyof typeof this.statistics.rating_breakdown],
      percentage:
        total > 0
          ? (this.statistics.rating_breakdown[
              level as keyof typeof this.statistics.rating_breakdown
            ] /
              total) *
            100
          : 0,
    }));
  }

  get averageRatingText(): string {
    const rating = this.statistics.average_rating;
    if (rating >= 4.5) return 'Excellent';
    if (rating >= 4.0) return 'Very Good';
    if (rating >= 3.5) return 'Good';
    if (rating >= 3.0) return 'Fair';
    if (rating >= 2.0) return 'Poor';
    return 'Very Poor';
  }

  get averageRatingColor(): string {
    const rating = this.statistics.average_rating;
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 4.0) return 'text-blue-600';
    if (rating >= 3.5) return 'text-yellow-600';
    if (rating >= 3.0) return 'text-orange-600';
    return 'text-red-600';
  }
}
