import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { UserService, AnalyticsData } from '../../services/user.service';
import { ToastService } from '../../services/shared/toast.service';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.scss'],
})
export class AnalyticsComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  // State
  protected currentUser = signal<User | null>(null);
  protected isLoading = signal(false);
  protected activeTimeframe = signal<'week' | 'month' | 'year' | 'all'>('month');
  protected analytics = signal<AnalyticsData | null>(null);

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser.set(user);
      if (user) {
        this.loadAnalyticsData();
      }
    });
  }

  private loadAnalyticsData(): void {
    this.isLoading.set(true);
    const period = this.activeTimeframe();

    this.userService.getAnalytics(period).subscribe({
      next: (data) => {
        this.analytics.set(data);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading analytics:', error);
        this.toastService.error('Error', 'Failed to load analytics data');
        this.isLoading.set(false);
        // Set fallback data for development
        this.generateFallbackData();
      },
    });
  }

  private generateFallbackData(): void {
    // Fallback data structure that matches the backend API
    const fallbackData: AnalyticsData = {
      period: this.activeTimeframe(),
      earnings: this.generateTimeSeriesData(),
      totalStats: {
        totalItems: 8,
        totalBookings: 23,
        totalEarnings: 2847.5,
        averageRating: 4.8,
        totalReviews: 12,
        growthPercentage: 15.3,
      },
      popularItems: [
        {
          id: 1,
          name: 'Professional Camera Kit',
          image_url: '/assets/camera.jpg',
          booking_count: 8,
          total_earnings: 1200,
        },
        {
          id: 2,
          name: 'Wireless Microphone Set',
          image_url: '/assets/mic.jpg',
          booking_count: 6,
          total_earnings: 720,
        },
        {
          id: 3,
          name: 'Drone with 4K Camera',
          image_url: '/assets/drone.jpg',
          booking_count: 5,
          total_earnings: 850,
        },
      ],
      recentBookings: [
        {
          id: 1,
          start_date: '2024-10-15',
          end_date: '2024-10-17',
          total_price: 150,
          status: 'completed',
          item_name: 'Camera Kit',
          renter_name: 'John Doe',
        },
        {
          id: 2,
          start_date: '2024-10-12',
          end_date: '2024-10-14',
          total_price: 90,
          status: 'completed',
          item_name: 'Microphone',
          renter_name: 'Jane Smith',
        },
      ],
    };

    this.analytics.set(fallbackData);
    this.isLoading.set(false);
  }

  private generateTimeSeriesData(): Array<{ period: string; earnings: number; bookings: number }> {
    const timeframe = this.activeTimeframe();
    const data: Array<{ period: string; earnings: number; bookings: number }> = [];

    switch (timeframe) {
      case 'week':
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          data.push({
            period: date.toISOString(),
            earnings: Math.floor(Math.random() * 200) + 50,
            bookings: Math.floor(Math.random() * 5) + 1,
          });
        }
        break;
      case 'month':
        for (let i = 29; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          data.push({
            period: date.toISOString(),
            earnings: Math.floor(Math.random() * 300) + 100,
            bookings: Math.floor(Math.random() * 8) + 2,
          });
        }
        break;
      case 'year':
        for (let i = 11; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          data.push({
            period: date.toISOString(),
            earnings: Math.floor(Math.random() * 1000) + 500,
            bookings: Math.floor(Math.random() * 30) + 10,
          });
        }
        break;
      case 'all':
        for (let i = 23; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          data.push({
            period: date.toISOString(),
            earnings: Math.floor(Math.random() * 1200) + 400,
            bookings: Math.floor(Math.random() * 35) + 8,
          });
        }
        break;
    }

    return data;
  }

  protected setTimeframe(timeframe: 'week' | 'month' | 'year' | 'all'): void {
    this.activeTimeframe.set(timeframe);
    this.loadAnalyticsData();
  }

  protected getChartData(): Array<{ period: string; earnings: number; bookings: number }> {
    const analytics = this.analytics();
    if (!analytics) return [];

    return analytics.earnings.map((item) => ({
      period: this.formatDate(item.period),
      earnings: item.earnings,
      bookings: item.bookings,
    }));
  }

  protected getMaxEarnings(): number {
    const data = this.getChartData();
    return Math.max(...data.map((d) => d.earnings), 100);
  }

  protected getGrowthPercentage(): number {
    const analytics = this.analytics();
    return analytics?.totalStats.growthPercentage || 0;
  }

  protected getAbsoluteGrowthPercentage(): number {
    return Math.abs(this.getGrowthPercentage());
  }

  protected formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  }

  protected formatDate(dateString: string): string {
    const date = new Date(dateString);
    const timeframe = this.activeTimeframe();

    if (timeframe === 'week') {
      return date.toLocaleDateString('en-ZA', { weekday: 'short' });
    } else if (timeframe === 'month') {
      return date.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' });
    } else {
      return date.toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' });
    }
  }

  protected navigateBack(): void {
    this.router.navigate(['/dashboard']);
  }

  protected exportData(): void {
    // In a real app, this would generate and download a CSV/Excel file
    this.toastService.info('Export', 'Export functionality coming soon!');
  }
}
