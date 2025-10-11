import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

// Custom validator for password confirmation
function passwordMatchValidator(control: AbstractControl) {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  if (password && confirmPassword && password.value !== confirmPassword.value) {
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);

  // Reactive state
  public isLoading = signal(false);
  public showPassword = signal(false);
  public errorMessage = signal('');
  private returnUrl = signal('');

  // Form setup
  registerForm: FormGroup = this.fb.group(
    {
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      location: [''],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      agreeToTerms: [false, [Validators.requiredTrue]],
    },
    { validators: passwordMatchValidator }
  );

  constructor() {
    // Clear error message when form changes
    this.registerForm.valueChanges.subscribe(() => {
      if (this.errorMessage()) {
        this.errorMessage.set('');
      }
    });
  }

  ngOnInit(): void {
    // Get return URL from query params
    this.returnUrl.set(this.route.snapshot.queryParams['returnUrl'] || '/dashboard');
  }

  onSubmit(): void {
    if (this.registerForm.valid && !this.isLoading()) {
      this.isLoading.set(true);
      this.errorMessage.set('');

      const registerData = {
        fullName: this.registerForm.get('name')?.value,
        email: this.registerForm.get('email')?.value,
        password: this.registerForm.get('password')?.value,
        phone: this.registerForm.get('phone')?.value || undefined,
        location: this.registerForm.get('location')?.value || undefined,
      };

      this.authService.register(registerData).subscribe({
        next: (response) => {
          this.isLoading.set(false);
          // Navigate to dashboard
          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          this.isLoading.set(false);
          this.errorMessage.set(error.message || 'Registration failed. Please try again.');
        },
      });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.registerForm.controls).forEach((key) => {
        this.registerForm.get(key)?.markAsTouched();
      });
    }
  }

  togglePassword(): void {
    this.showPassword.set(!this.showPassword());
  }

  getPasswordStrength(): Array<{ active: boolean; color: string }> {
    const password = this.registerForm.get('password')?.value || '';
    const length = password.length;

    const criteria = [
      length >= 6,
      /[A-Z]/.test(password),
      /[a-z]/.test(password),
      /[0-9]/.test(password),
      /[^A-Za-z0-9]/.test(password),
    ];

    const score = criteria.filter(Boolean).length;

    return [
      { active: score >= 1, color: 'bg-red-500' },
      { active: score >= 2, color: 'bg-yellow-500' },
      { active: score >= 3, color: 'bg-blue-500' },
      { active: score >= 4, color: 'bg-green-500' },
    ];
  }

  getPasswordStrengthText(): { text: string; color: string } {
    const password = this.registerForm.get('password')?.value || '';
    const length = password.length;

    const criteria = [
      length >= 6,
      /[A-Z]/.test(password),
      /[a-z]/.test(password),
      /[0-9]/.test(password),
      /[^A-Za-z0-9]/.test(password),
    ];

    const score = criteria.filter(Boolean).length;

    if (score <= 1) return { text: 'Weak', color: 'text-red-600' };
    if (score <= 2) return { text: 'Fair', color: 'text-yellow-600' };
    if (score <= 3) return { text: 'Good', color: 'text-blue-600' };
    return { text: 'Strong', color: 'text-green-600' };
  }

  switchToLogin(): void {
    this.router.navigate(['/login']);
  }

  closeModal(): void {
    this.router.navigate(['/']);
  }
}
