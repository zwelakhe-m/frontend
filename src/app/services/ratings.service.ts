import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface UserRating {
  id: number;
  booking_id: number;
  rating_by_user_id: number;
  rating_for_user_id: number;
  rating_value: number;
  comment?: string;
  created_at: string;
  rater_name: string;
  rated_user_name: string;
  item_name: string;
  start_date: string;
  end_date: string;
}

export interface ItemReview {
  id: number;
  item_id: number;
  booking_id: number;
  reviewer_id: number;
  rating_value: number;
  review_title?: string;
  review_text?: string;
  pros?: string;
  cons?: string;
  is_anonymous: boolean;
  is_verified_rental: boolean;
  helpful_count: number;
  created_at: string;
  updated_at: string;
  reviewer_name: string;
  reviewer_verified: boolean;
  start_date: string;
  end_date: string;
}

export interface CreateUserRatingRequest {
  booking_id: number;
  rating_for_user_id: number;
  rating_value: number;
  comment?: string;
}

export interface CreateItemReviewRequest {
  booking_id: number;
  rating_value: number;
  review_title?: string;
  review_text?: string;
  pros?: string;
  cons?: string;
  is_anonymous?: boolean;
}

export interface ItemReviewsResponse {
  success: boolean;
  item_id: number;
  reviews: ItemReview[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
  statistics: {
    average_rating: number;
    total_reviews: number;
    rating_breakdown: {
      5: number;
      4: number;
      3: number;
      2: number;
      1: number;
    };
  };
}

export interface UserRatingsResponse {
  success: boolean;
  user_id: number;
  average_rating: number;
  total_ratings: number;
  ratings: UserRating[];
}

@Injectable({
  providedIn: 'root',
})
export class RatingsService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly baseUrl = 'http://localhost:8081/api/ratings';

  // Reactive state management
  private userRatingsSubject = new BehaviorSubject<UserRating[]>([]);
  private itemReviewsSubject = new BehaviorSubject<ItemReview[]>([]);

  // Public observables
  public userRatings$ = this.userRatingsSubject.asObservable();
  public itemReviews$ = this.itemReviewsSubject.asObservable();

  // Signals for reactive UI
  public isLoading = signal<boolean>(false);
  public submitLoading = signal<boolean>(false);

  /**
   * USER-TO-USER RATINGS
   */

  /**
   * Create a user rating
   */
  createUserRating(ratingData: CreateUserRatingRequest): Observable<UserRating> {
    this.submitLoading.set(true);

    return this.http
      .post<{ success: boolean; message: string; rating: UserRating }>(this.baseUrl, ratingData, {
        headers: this.authService.getAuthHeaders(),
      })
      .pipe(
        map((response) => response.rating),
        tap((rating) => {
          const currentRatings = this.userRatingsSubject.value;
          this.userRatingsSubject.next([rating, ...currentRatings]);
          this.submitLoading.set(false);
        }),
        catchError((error) => {
          this.submitLoading.set(false);
          return this.handleError(error);
        })
      );
  }

  /**
   * Get ratings for a specific user
   */
  getUserRatings(userId: number, limit = 20, offset = 0): Observable<UserRatingsResponse> {
    this.isLoading.set(true);

    const params = new HttpParams().set('limit', limit.toString()).set('offset', offset.toString());

    return this.http.get<UserRatingsResponse>(`${this.baseUrl}/user/${userId}`, { params }).pipe(
      tap((response) => {
        this.userRatingsSubject.next(response.ratings);
        this.isLoading.set(false);
      }),
      catchError((error) => {
        this.isLoading.set(false);
        return this.handleError(error);
      })
    );
  }

  /**
   * Get ratings given by current user
   */
  getMyRatings(
    limit = 20,
    offset = 0
  ): Observable<{ success: boolean; ratings_given: UserRating[] }> {
    this.isLoading.set(true);

    const params = new HttpParams().set('limit', limit.toString()).set('offset', offset.toString());

    return this.http
      .get<{ success: boolean; ratings_given: UserRating[] }>(`${this.baseUrl}/my-ratings`, {
        params,
        headers: this.authService.getAuthHeaders(),
      })
      .pipe(
        tap((response) => {
          this.userRatingsSubject.next(response.ratings_given);
          this.isLoading.set(false);
        }),
        catchError((error) => {
          this.isLoading.set(false);
          return this.handleError(error);
        })
      );
  }

  /**
   * Get ratings received by current user (ratings others gave to me)
   */
  getReceivedRatings(limit = 20, offset = 0): Observable<UserRating[]> {
    const currentUser = this.authService.currentUser();
    if (!currentUser) {
      return throwError(() => new Error('User not authenticated'));
    }

    return this.getUserRatings(currentUser.id, limit, offset).pipe(
      map((response) => response.ratings)
    );
  }

  /**
   * Get ratings for a specific booking
   */
  getBookingRatings(
    bookingId: number
  ): Observable<{ success: boolean; booking_id: number; ratings: UserRating[] }> {
    return this.http
      .get<{ success: boolean; booking_id: number; ratings: UserRating[] }>(
        `${this.baseUrl}/booking/${bookingId}`,
        {
          headers: this.authService.getAuthHeaders(),
        }
      )
      .pipe(catchError((error) => this.handleError(error)));
  }

  /**
   * Update a user rating
   */
  updateUserRating(ratingId: number, comment: string): Observable<UserRating> {
    this.submitLoading.set(true);

    return this.http
      .put<{ success: boolean; message: string; rating: UserRating }>(
        `${this.baseUrl}/${ratingId}`,
        { comment },
        {
          headers: this.authService.getAuthHeaders(),
        }
      )
      .pipe(
        map((response) => response.rating),
        tap((rating) => {
          this.updateUserRatingInState(rating);
          this.submitLoading.set(false);
        }),
        catchError((error) => {
          this.submitLoading.set(false);
          return this.handleError(error);
        })
      );
  }

  /**
   * Delete a user rating
   */
  deleteUserRating(ratingId: number): Observable<void> {
    return this.http
      .delete<{ success: boolean; message: string }>(`${this.baseUrl}/${ratingId}`, {
        headers: this.authService.getAuthHeaders(),
      })
      .pipe(
        map(() => void 0),
        tap(() => {
          this.removeUserRatingFromState(ratingId);
        }),
        catchError((error) => this.handleError(error))
      );
  }

  /**
   * ITEM REVIEWS
   */

  /**
   * Create an item review
   */
  createItemReview(reviewData: CreateItemReviewRequest): Observable<ItemReview> {
    this.submitLoading.set(true);

    return this.http
      .post<{ success: boolean; message: string; review: ItemReview }>(
        `${this.baseUrl}/item-review`,
        reviewData,
        {
          headers: this.authService.getAuthHeaders(),
        }
      )
      .pipe(
        map((response) => response.review),
        tap((review) => {
          const currentReviews = this.itemReviewsSubject.value;
          this.itemReviewsSubject.next([review, ...currentReviews]);
          this.submitLoading.set(false);
        }),
        catchError((error) => {
          this.submitLoading.set(false);
          return this.handleError(error);
        })
      );
  }

  /**
   * Get reviews for a specific item
   */
  getItemReviews(
    itemId: number,
    options: {
      rating?: number;
      sort_by?: 'created_at' | 'rating_value' | 'helpful_count';
      sort_order?: 'asc' | 'desc';
      limit?: number;
      offset?: number;
    } = {}
  ): Observable<ItemReviewsResponse> {
    this.isLoading.set(true);

    let params = new HttpParams();

    if (options.rating) params = params.set('rating', options.rating.toString());
    if (options.sort_by) params = params.set('sort_by', options.sort_by);
    if (options.sort_order) params = params.set('sort_order', options.sort_order);
    if (options.limit) params = params.set('limit', options.limit.toString());
    if (options.offset) params = params.set('offset', options.offset.toString());

    return this.http
      .get<ItemReviewsResponse>(`${this.baseUrl}/item/${itemId}/reviews`, { params })
      .pipe(
        tap((response) => {
          this.itemReviewsSubject.next(response.reviews);
          this.isLoading.set(false);
        }),
        catchError((error) => {
          this.isLoading.set(false);
          return this.handleError(error);
        })
      );
  }

  /**
   * Mark a review as helpful
   */
  markReviewHelpful(
    reviewId: number
  ): Observable<{ success: boolean; message: string; helpful_count: number }> {
    return this.http
      .post<{ success: boolean; message: string; helpful_count: number }>(
        `${this.baseUrl}/review/${reviewId}/helpful`,
        {},
        {
          headers: this.authService.getAuthHeaders(),
        }
      )
      .pipe(
        tap((response) => {
          this.updateReviewHelpfulCount(reviewId, response.helpful_count);
        }),
        catchError((error) => this.handleError(error))
      );
  }

  /**
   * Remove helpful mark from a review
   */
  removeReviewHelpful(
    reviewId: number
  ): Observable<{ success: boolean; message: string; helpful_count: number }> {
    return this.http
      .delete<{ success: boolean; message: string; helpful_count: number }>(
        `${this.baseUrl}/review/${reviewId}/helpful`,
        {
          headers: this.authService.getAuthHeaders(),
        }
      )
      .pipe(
        tap((response) => {
          this.updateReviewHelpfulCount(reviewId, response.helpful_count);
        }),
        catchError((error) => this.handleError(error))
      );
  }

  /**
   * UTILITY METHODS
   */

  /**
   * Generate star display for rating
   */
  getStarDisplay(rating: number): string[] {
    const stars: string[] = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push('★');
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push('☆');
      } else {
        stars.push('☆');
      }
    }

    return stars;
  }

  /**
   * Get rating color based on value
   */
  getRatingColor(rating: number): string {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 4.0) return 'text-blue-600';
    if (rating >= 3.5) return 'text-yellow-600';
    if (rating >= 3.0) return 'text-orange-600';
    return 'text-red-600';
  }

  /**
   * Get rating text description
   */
  getRatingText(rating: number): string {
    if (rating >= 4.5) return 'Excellent';
    if (rating >= 4.0) return 'Very Good';
    if (rating >= 3.5) return 'Good';
    if (rating >= 3.0) return 'Fair';
    if (rating >= 2.0) return 'Poor';
    return 'Very Poor';
  }

  /**
   * Format rating display with count
   */
  formatRatingDisplay(averageRating: number, totalRatings: number): string {
    if (totalRatings === 0) return 'No ratings yet';
    const formatted = averageRating.toFixed(1);
    const plural = totalRatings === 1 ? 'rating' : 'ratings';
    return `${formatted} (${totalRatings} ${plural})`;
  }

  // Private helper methods

  private updateUserRatingInState(updatedRating: UserRating): void {
    const currentRatings = this.userRatingsSubject.value;
    const index = currentRatings.findIndex((r) => r.id === updatedRating.id);
    if (index > -1) {
      currentRatings[index] = updatedRating;
      this.userRatingsSubject.next([...currentRatings]);
    }
  }

  private removeUserRatingFromState(ratingId: number): void {
    const currentRatings = this.userRatingsSubject.value;
    const filteredRatings = currentRatings.filter((r) => r.id !== ratingId);
    this.userRatingsSubject.next(filteredRatings);
  }

  private updateReviewHelpfulCount(reviewId: number, helpfulCount: number): void {
    const currentReviews = this.itemReviewsSubject.value;
    const index = currentReviews.findIndex((r) => r.id === reviewId);
    if (index > -1) {
      currentReviews[index] = { ...currentReviews[index], helpful_count: helpfulCount };
      this.itemReviewsSubject.next([...currentReviews]);
    }
  }

  private handleError(error: any): Observable<never> {
    let errorMessage = 'An error occurred';

    if (error.error?.error) {
      errorMessage = error.error.error;
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    } else if (error.status === 401) {
      errorMessage = 'Authentication required';
    } else if (error.status === 403) {
      errorMessage = 'Access denied';
    } else if (error.status === 404) {
      errorMessage = 'Rating not found';
    } else if (error.status === 409) {
      errorMessage = 'Rating already exists for this booking';
    } else if (error.status === 0) {
      errorMessage = 'Unable to connect to server';
    }

    console.error('Ratings Service Error:', error);
    return throwError(() => new Error(errorMessage));
  }
}
