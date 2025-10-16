import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';

export interface User {
  id: number;
  email: string;
  name: string;
  phone?: string;
  bio?: string;
  location?: string;
  isVerified: boolean;
  profilePhoto?: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  location?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  /**
   * Login with Facebook access token
   */
  loginWithFacebook(accessToken: string): Observable<AuthResponse> {
    this.isLoading.set(true);
    return this.http.post<AuthResponse>(`${this.baseUrl}/login/facebook`, { accessToken }).pipe(
      tap((response) => {
        this.setAuthData(response.token, response.user);
        this.isLoading.set(false);
      }),
      catchError((error) => {
        this.isLoading.set(false);
        return this.handleError(error);
      })
    );
  }
  /**
   * Login with Google ID token
   */
  loginWithGoogle(idToken: string): Observable<AuthResponse> {
    this.isLoading.set(true);
    return this.http.post<AuthResponse>(`${this.baseUrl}/login/google`, { idToken }).pipe(
      tap((response) => {
        this.setAuthData(response.token, response.user);
        this.isLoading.set(false);
      }),
      catchError((error) => {
        this.isLoading.set(false);
        return this.handleError(error);
      })
    );
  }
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  // private readonly baseUrl = 'http://localhost:8081/api/auth'; // Localhost for reference
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  // Reactive state management
  private readonly currentUserSubject = new BehaviorSubject<User | null>(null);
  private readonly tokenSubject = new BehaviorSubject<string | null>(null);

  // Public observables
  public currentUser$ = this.currentUserSubject.asObservable();
  public token$ = this.tokenSubject.asObservable();
  public isLoggedIn$ = this.currentUser$.pipe(map((user) => !!user));
  public isAuthenticated$ = this.isLoggedIn$; // Alias for compatibility

  // Signals for reactive UI
  public currentUser = signal<User | null>(null);
  public isLoggedIn = signal<boolean>(false);
  public isLoading = signal<boolean>(false);

  constructor() {
    // Check for existing token on app startup
    this.loadStoredAuth();
  }

  /**
   * Initialize authentication state (called from app startup)
   */
  initializeAuthState(): void {
    this.loadStoredAuth();
  }

  /**
   * Login user with email and password
   */
  login(credentials: LoginRequest): Observable<AuthResponse> {
    this.isLoading.set(true);

    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, credentials).pipe(
      tap((response) => {
        this.setAuthData(response.token, response.user);
        this.isLoading.set(false);
      }),
      catchError((error) => {
        this.isLoading.set(false);
        return this.handleError(error);
      })
    );
  }

  /**
   * Register new user
   */
  register(userData: RegisterRequest): Observable<AuthResponse> {
    this.isLoading.set(true);

    return this.http.post<AuthResponse>(`${this.baseUrl}/register`, userData).pipe(
      tap((response) => {
        this.setAuthData(response.token, response.user);
        this.isLoading.set(false);
      }),
      catchError((error) => {
        this.isLoading.set(false);
        return this.handleError(error);
      })
    );
  }

  /**
   * Get current user profile
   */
  getProfile(): Observable<User> {
    return this.http
      .get<User>(`${this.baseUrl}/profile`, {
        headers: this.getAuthHeaders(),
      })
      .pipe(
        tap((user) => {
          this.currentUser.set(user);
          this.currentUserSubject.next(user);
        }),
        catchError((error) => this.handleError(error))
      );
  }

  /**
   * Update user profile
   */
  updateProfile(userData: Partial<User>): Observable<User> {
    return this.http
      .put<User>(`${this.baseUrl}/profile`, userData, {
        headers: this.getAuthHeaders(),
      })
      .pipe(
        tap((user) => {
          this.currentUser.set(user);
          this.currentUserSubject.next(user);
        }),
        catchError((error) => this.handleError(error))
      );
  }

  /**
   * Logout user
   */
  logout(): Observable<void> {
    this.clearAuthData();
    // Since JWT tokens are stateless, we don't need to call the backend
    // Just clear the client-side data and return success
    return new Observable((observer) => {
      observer.next();
      observer.complete();
    });
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getToken() && !!this.currentUser();
  }

  /**
   * Get stored token
   */
  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      // Always check localStorage first as it's the source of truth
      const storedToken = localStorage.getItem('auth_token');
      if (storedToken) {
        // If we have a stored token but BehaviorSubject doesn't, sync it
        if (!this.tokenSubject.value) {
          this.tokenSubject.next(storedToken);
        }
        return storedToken;
      }
      return this.tokenSubject.value;
    }
    return this.tokenSubject.value;
  }

  /**
   * Get authorization headers
   */
  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    });
  }

  // Private methods

  private setAuthData(token: string, user: User): void {
    // Store in localStorage (only in browser)
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('currentUser', JSON.stringify(user));
    }

    // Update reactive state
    this.tokenSubject.next(token);
    this.currentUserSubject.next(user);
    this.currentUser.set(user);
    this.isLoggedIn.set(true);
  }

  private clearAuthData(): void {
    // Clear localStorage (only in browser)
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('currentUser');
    }

    // Reset reactive state
    this.tokenSubject.next(null);
    this.currentUserSubject.next(null);
    this.currentUser.set(null);
    this.isLoggedIn.set(false);
  }

  private loadStoredAuth(): void {
    // Only access localStorage in browser environment
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const token = localStorage.getItem('auth_token');
    const userStr = localStorage.getItem('currentUser');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);

        // Basic JWT token expiration check
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);

        if (tokenPayload.exp && tokenPayload.exp < currentTime) {
          // Token is expired, clear auth data
          console.log('Token expired, clearing auth data');
          this.clearAuthData();
          return;
        }

        // Token is valid, restore auth state
        this.tokenSubject.next(token);
        this.currentUserSubject.next(user);
        this.currentUser.set(user);
        this.isLoggedIn.set(true);

        console.log('Auth state restored from localStorage', {
          userId: user.id,
          email: user.email,
        });
      } catch (error) {
        console.warn('Error parsing stored auth data, clearing:', error);
        this.clearAuthData();
      }
    } else {
      console.log('No stored auth data found');
    }
  }

  private handleError(error: any): Observable<never> {
    let errorMessage = 'An error occurred';

    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    } else if (error.status === 401) {
      errorMessage = 'Invalid credentials';
      this.clearAuthData(); // Auto-logout on 401
    } else if (error.status === 403) {
      errorMessage = 'Access denied';
    } else if (error.status === 0) {
      errorMessage = 'Unable to connect to server';
    }

    console.error('Auth Service Error:', error);
    return throwError(() => new Error(errorMessage));
  }
}
