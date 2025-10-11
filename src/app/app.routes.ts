import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { map, filter, take } from 'rxjs/operators';

// Auth Guard
const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated$.pipe(
    map((isAuthenticated) => {
      if (isAuthenticated) {
        return true;
      } else {
        router.navigate(['/']);
        return false;
      }
    })
  );
};

// Guest Guard (redirect authenticated users away from login/register)
const guestGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated$.pipe(
    map((isAuthenticated) => {
      if (!isAuthenticated) {
        return true;
      } else {
        router.navigate(['/dashboard']);
        return false;
      }
    })
  );
};

export const routes: Routes = [
  // Public Routes
  {
    path: '',
    loadComponent: () =>
      import('./components/landing/landing.component').then((m) => m.LandingComponent),
    pathMatch: 'full',
  },
  {
    path: 'browse',
    loadComponent: () =>
      import('./components/items/items-browse.component').then((m) => m.ItemsBrowseComponent),
    title: 'Browse Items - RentHub',
  },
  {
    path: 'items',
    loadComponent: () =>
      import('./components/items/items-browse.component').then((m) => m.ItemsBrowseComponent),
    title: 'Browse Items - RentHub',
  },
  {
    path: 'items/:id',
    loadComponent: () =>
      import('./components/items/item-detail.component').then((m) => m.ItemDetailComponent),
    title: 'Item Details - RentHub',
    data: { prerender: false }
},
  {
    path: 'items/:id/bookings',
    loadComponent: () =>
      import('./components/items/item-bookings.component').then((m) => m.ItemBookingsComponent),
    canActivate: [authGuard],
    title: 'Item Bookings - RentHub',
  },

  // Authentication Routes (guest only)
  {
    path: 'login',
    loadComponent: () => import('./components/auth/login.component').then((m) => m.LoginComponent),
    canActivate: [guestGuard],
    title: 'Sign In - RentHub',
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./components/auth/register.component').then((m) => m.RegisterComponent),
    canActivate: [guestGuard],
    title: 'Sign Up - RentHub',
  },

  // Protected Routes (authenticated users only)
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./components/dashboard/dashboard.component').then((m) => m.DashboardComponent),
    canActivate: [authGuard],
    title: 'Dashboard - RentHub',
  },
  {
    path: 'create-item',
    loadComponent: () =>
      import('./components/items/item-create.component').then((m) => m.ItemCreateComponent),
    canActivate: [authGuard],
    title: 'List New Item - RentHub',
  },
  {
    path: 'my-items',
    loadComponent: () =>
      import('./components/items/my-items.component').then((m) => m.MyItemsComponent),
    canActivate: [authGuard],
    title: 'My Items - RentHub',
  },
  {
    path: 'booking-requests',
    loadComponent: () =>
      import('./components/bookings/booking-requests.component').then(
        (m) => m.BookingRequestsComponent
      ),
    canActivate: [authGuard],
    title: 'Booking Requests - RentHub',
  },
  {
    path: 'active-bookings',
    loadComponent: () =>
      import('./components/bookings/active-bookings.component').then(
        (m) => m.ActiveBookingsComponent
      ),
    canActivate: [authGuard],
    title: 'Active Bookings - RentHub',
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./components/user/profile.component').then((m) => m.ProfileComponent),
    canActivate: [authGuard],
    title: 'Profile & Settings - RentHub',
  },
  {
    path: 'analytics',
    loadComponent: () =>
      import('./components/analytics/analytics.component').then((m) => m.AnalyticsComponent),
    canActivate: [authGuard],
    title: 'Analytics & Earnings - RentHub',
  },
  {
    path: 'messages',
    loadComponent: () =>
      import('./components/messages/messages.component').then((m) => m.MessagesComponent),
    canActivate: [authGuard],
    title: 'Messages - RentHub',
  },
  {
      path: 'messages/:id',
      loadComponent: () =>
        import('./components/messages/conversation.component').then((m) => m.ConversationComponent),
      canActivate: [authGuard],
      title: 'Conversation - RentHub',
      data: { prerender: false }
    },

  // Fallback route
  {
    path: '**',
    redirectTo: '',
  },
];
