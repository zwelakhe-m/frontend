import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
})
export class LandingComponent {
  private router = inject(Router);
  private authService = inject(AuthService);

  protected navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  protected navigateToRegister(): void {
    this.router.navigate(['/register']);
  }

  protected navigateToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  protected navigateToBrowse(): void {
    this.router.navigate(['/browse']);
  }

  protected navigateToCreateItem(): void {
    // Check if user is authenticated
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/create-item']);
    } else {
      // Redirect to login with return URL
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: '/create-item' },
      });
    }
  }

  protected navigateToCreateItemForAuth(): void {
    // For "List Your Items" button - always require authentication
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/create-item']);
    } else {
      this.router.navigate(['/register'], {
        queryParams: { returnUrl: '/create-item' },
      });
    }
  }

  protected searchItems(searchTerm: string, location: string): void {
    this.router.navigate(['/browse'], {
      queryParams: {
        search: searchTerm || undefined,
        location: location || undefined,
      },
    });
  }
}
