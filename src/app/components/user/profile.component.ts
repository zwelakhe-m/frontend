import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { RatingsService, UserRating } from '../../services/ratings.service';
import { ToastService } from '../../services/shared/toast.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly ratingsService = inject(RatingsService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly toastService = inject(ToastService);

  // State
  protected currentUser = signal<User | null>(null);
  protected isLoading = signal(false);
  protected isEditing = signal(false);
  protected activeTab = signal<'profile' | 'security' | 'ratings'>('profile');

  // Forms
  protected profileForm!: FormGroup;
  protected passwordForm!: FormGroup;

  // User stats
  protected userStats = signal({
    totalBookings: 0,
    totalEarnings: 0,
    averageRating: 0,
    totalRatings: 0,
    itemsListed: 0,
    joinDate: '',
  });

  ngOnInit(): void {
    this.initializeForms();
    this.loadUserData();
  }

  private initializeForms(): void {
    this.profileForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      bio: [''],
      location: [''],
    });

    this.passwordForm = this.fb.group(
      {
        currentPassword: ['', [Validators.required]],
        newPassword: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
      },
      {
        validators: [this.passwordMatchValidator],
      }
    );
  }

  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const newPassword = control.get('newPassword')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { passwordMismatch: true };
  }

  private loadUserData(): void {
    this.isLoading.set(true);

    // Load current user
    this.authService.currentUser$.subscribe((user) => {
      if (user) {
        this.currentUser.set(user);
        this.profileForm.patchValue({
          fullName: user.name,
          email: user.email,
          phone: user.phone || '',
          bio: user.bio || '',
          location: user.location || '',
        });

        // Load user stats
        this.loadUserStats(user.id);
      }
    });

    this.isLoading.set(false);
  }

  private loadUserStats(userId: number): void {
    // This would typically come from a dedicated user stats endpoint
    // For now, we'll use placeholder data
    this.userStats.set({
      totalBookings: 15,
      totalEarnings: 2430,
      averageRating: 4.8,
      totalRatings: 12,
      itemsListed: 8,
      joinDate: 'January 2024',
    });

    // Load actual ratings if available
    this.ratingsService.getReceivedRatings().subscribe((ratings: UserRating[]) => {
      const totalRatings = ratings.length;
      const averageRating =
        totalRatings > 0
          ? ratings.reduce((sum: number, rating: UserRating) => sum + rating.rating_value, 0) /
            totalRatings
          : 0;

      this.userStats.update((stats) => ({
        ...stats,
        averageRating: Math.round(averageRating * 10) / 10,
        totalRatings: totalRatings,
      }));
    });
  }

  protected setActiveTab(tab: 'profile' | 'security' | 'ratings'): void {
    this.activeTab.set(tab);
  }

  protected toggleEdit(): void {
    if (this.isEditing()) {
      // Cancel editing - reset form
      const user = this.currentUser();
      if (user) {
        this.profileForm.patchValue({
          fullName: user.name,
          email: user.email,
          phone: user.phone || '',
          bio: user.bio || '',
          location: user.location || '',
        });
      }
    }
    this.isEditing.set(!this.isEditing());
  }

  protected saveProfile(): void {
    if (this.profileForm.valid) {
      this.isLoading.set(true);
      const formData = this.profileForm.value;

      this.userService.updateProfile(formData).subscribe({
        next: (updatedUser) => {
          this.currentUser.set(updatedUser);
          this.isEditing.set(false);
          this.isLoading.set(false);
          this.toastService.success(
            'Profile Updated',
            'Your profile has been updated successfully.'
          );
        },
        error: (error) => {
          console.error('Error updating profile:', error);
          this.isLoading.set(false);
          this.toastService.error('Update Failed', 'Failed to update profile. Please try again.');
        },
      });
    }
  }

  protected changePassword(): void {
    if (this.passwordForm.valid) {
      this.isLoading.set(true);
      const { currentPassword, newPassword } = this.passwordForm.value;

      this.userService.changePassword({ currentPassword, newPassword }).subscribe({
        next: () => {
          this.passwordForm.reset();
          this.isLoading.set(false);
          this.toastService.success(
            'Password Changed',
            'Your password has been updated successfully.'
          );
        },
        error: (error) => {
          console.error('Error changing password:', error);
          this.isLoading.set(false);
          this.toastService.error(
            'Password Change Failed',
            'Failed to change password. Please check your current password.'
          );
        },
      });
    }
  }

  protected deleteAccount(): void {
    const password = prompt('Please enter your password to confirm account deletion:');
    if (password) {
      this.isLoading.set(true);
      this.userService.deleteAccount(password).subscribe({
        next: () => {
          this.toastService.success(
            'Account Deleted',
            'Your account has been deleted successfully.'
          );
          this.authService.logout().subscribe(() => {
            this.router.navigate(['/']);
          });
        },
        error: (error) => {
          console.error('Error deleting account:', error);
          this.isLoading.set(false);
          this.toastService.error(
            'Deletion Failed',
            'Failed to delete account. Please check your password.'
          );
        },
      });
    }
  }

  protected getUserInitials(): string {
    const user = this.currentUser();
    if (!user?.name) return 'U';

    const names = user.name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return names[0][0].toUpperCase();
  }

  protected getStars(rating: number): string[] {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        stars.push('full');
      } else if (i - 0.5 <= rating) {
        stars.push('half');
      } else {
        stars.push('empty');
      }
    }
    return stars;
  }

  protected navigateBack(): void {
    this.router.navigate(['/dashboard']);
  }

  protected navigateToBrowse(): void {
    this.router.navigate(['/browse']);
  }
}
