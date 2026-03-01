import { Component, inject, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  // Facebook OAuth
  public facebookAppId = 'YOUR_FACEBOOK_APP_ID'; // TODO: Replace with your actual Facebook App ID

  onFacebookSignIn(): void {
    // Load Facebook SDK if not already loaded
    if (!(window as any).FB) {
      const script = document.createElement('script');
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.onload = () => this.initFacebookSdk();
      document.body.appendChild(script);
    } else {
      this.initFacebookSdk();
    }
  }

  initFacebookSdk(): void {
    (window as any).FB.init({
      appId: this.facebookAppId,
      cookie: true,
      xfbml: false,
      version: 'v19.0', // Use latest version
    });
    this.triggerFacebookLogin();
  }

  triggerFacebookLogin(): void {
    (window as any).FB.login((response: any) => {
      if (response.authResponse) {
        this.handleFacebookCredential(response.authResponse.accessToken);
      } else {
        this.errorMessage.set('Facebook login failed or cancelled.');
      }
    }, { scope: 'email,public_profile' });
  }

  handleFacebookCredential(accessToken: string): void {
    this.isLoading.set(true);
    this.authService.loginWithFacebook(accessToken).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (error: any) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.message || 'Facebook login failed.');
      },
    });
  }
  // Google OAuth
  public googleClientId = '547425240105-drc54prgr1cmern62j23iivrn9lsg53a.apps.googleusercontent.com';

  onGoogleSignIn(): void {
    // Load Google Identity Services SDK if not already loaded
    if (!(window as any).google) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => this.renderGoogleButton();
      document.body.appendChild(script);
    } else {
      this.renderGoogleButton();
    }
  }

  renderGoogleButton(): void {
    (window as any).google.accounts.id.initialize({
      client_id: this.googleClientId,
      callback: (response: any) => this.handleGoogleCredential(response),
    });
    (window as any).google.accounts.id.prompt();
  }

  handleGoogleCredential(response: any): void {
    // response.credential is a JWT ID token
    // Send this token to your backend for verification and login
    this.isLoading.set(true);
    this.authService.loginWithGoogle(response.credential).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (error: any) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.message || 'Google login failed.');
      },
    });
  }
  private readonly platformId = inject(PLATFORM_ID);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  // Reactive state
  public isLoading = signal(false);
  public showPassword = signal(false);
  public errorMessage = signal('');
  private readonly returnUrl = signal('');

  // Form setup
  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rememberMe: [false],
  });

  constructor() {
    // Clear error message when form changes
    this.loginForm.valueChanges.subscribe(() => {
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
    if (this.loginForm.valid && !this.isLoading()) {
      this.isLoading.set(true);
      this.errorMessage.set('');

      const loginData = {
        email: this.loginForm.get('email')?.value,
        password: this.loginForm.get('password')?.value,
      };

      this.authService.login(loginData).subscribe({
        next: (response) => {
          this.isLoading.set(false);
          // Store remember me preference
          if (this.loginForm.get('rememberMe')?.value && isPlatformBrowser(this.platformId)) {
            localStorage.setItem('rememberMe', 'true');
          }
          // Navigate to dashboard
          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          this.isLoading.set(false);
          this.errorMessage.set(error.message || 'Login failed. Please try again.');
        },
      });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.loginForm.controls).forEach((key) => {
        this.loginForm.get(key)?.markAsTouched();
      });
    }
  }

  togglePassword(): void {
    this.showPassword.set(!this.showPassword());
  }

  switchToRegister(): void {
    this.router.navigate(['/register']);
  }

  closeModal(): void {
    this.router.navigate(['/']);
  }
// ...existing code...
}
