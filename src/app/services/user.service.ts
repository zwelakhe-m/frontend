import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService, User } from './auth.service';

export interface UpdateProfileRequest {
  fullName?: string;
  email?: string;
  phone?: string;
  bio?: string;
  location?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface AnalyticsData {
  period: string;
  earnings: Array<{
    period: string;
    earnings: number;
    bookings: number;
  }>;
  totalStats: {
    totalItems: number;
    totalBookings: number;
    totalEarnings: number;
    averageRating: number;
    totalReviews: number;
    growthPercentage: number;
  };
  popularItems: Array<{
    id: number;
    name: string;
    image_url: string;
    booking_count: number;
    total_earnings: number;
  }>;
  recentBookings: Array<{
    id: number;
    start_date: string;
    end_date: string;
    total_price: number;
    status: string;
    item_name: string;
    renter_name: string;
  }>;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/auth/me`, {
      headers: this.authService.getAuthHeaders(),
    });
  }

  updateProfile(profileData: UpdateProfileRequest): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/users/profile`, profileData, {
      headers: this.authService.getAuthHeaders(),
    });
  }

  changePassword(passwordData: ChangePasswordRequest): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/users/password`, passwordData, {
      headers: this.authService.getAuthHeaders(),
    });
  }

  getAnalytics(period: string = 'month'): Observable<AnalyticsData> {
    return this.http.get<AnalyticsData>(`${this.apiUrl}/users/analytics?period=${period}`, {
      headers: this.authService.getAuthHeaders(),
    });
  }

  deleteAccount(password: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/users/account`, {
      headers: this.authService.getAuthHeaders(),
      body: { password },
    });
  }
}
