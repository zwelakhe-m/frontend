import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { NotificationsService } from '../../services/notifications.service';
import { MessageService } from '../../services/message.service';
import { NotificationBellComponent } from '../notification-bell/notification-bell.component';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-navigation-header',
  standalone: true,
  imports: [CommonModule, RouterModule, NotificationBellComponent],
  templateUrl: './navigation-header.component.html',
  styleUrls: ['./navigation-header.component.scss'],
})
export class NavigationHeaderComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly notificationsService = inject(NotificationsService);
  protected readonly messageService = inject(MessageService);

  // State
  protected currentUser = signal<User | null>(null);
  protected isAuthenticated = signal(false);
  protected showMobileMenu = signal(false);
  protected showUserMenu = signal(false);
  protected currentRoute = signal('');
  protected shouldShowNav = signal(true);
  protected unreadMessagesCount = signal(0);

  // Routes where navigation should be hidden
  private hiddenNavRoutes = ['/', '/login', '/register'];

  // Navigation items for authenticated users
  protected navItems = [
    { label: 'Browse', route: '/browse', icon: 'search' },
    { label: 'Dashboard', route: '/dashboard', icon: 'home', authRequired: true },
    { label: 'My Items', route: '/my-items', icon: 'grid', authRequired: true },
    { label: 'Bookings', route: '/active-bookings', icon: 'calendar', authRequired: true },
    { label: 'Messages', route: '/messages', icon: 'message', authRequired: true, hasCount: true },
  ];

  ngOnInit() {
    // Subscribe to auth state
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser.set(user);
      this.isAuthenticated.set(!!user);

      // Update unread messages count when user changes
      if (user) {
        this.messageService.updateUnreadCount();
      }
    });

    // Subscribe to unread messages count
    this.messageService.unreadCount$.subscribe((count) => {
      this.unreadMessagesCount.set(count);
    });

    // Track current route for active nav highlighting
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentRoute.set(event.url);
        // Show/hide navigation based on current route
        this.shouldShowNav.set(!this.hiddenNavRoutes.includes(event.url));
      });

    // Close menus when clicking outside
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.user-menu-container')) {
        this.showUserMenu.set(false);
      }
      if (!target.closest('.mobile-menu-container')) {
        this.showMobileMenu.set(false);
      }
    });
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

  protected getFilteredNavItems() {
    return this.navItems.filter((item) => {
      if (item.authRequired) {
        return this.isAuthenticated();
      }
      return true;
    });
  }

  protected isActiveRoute(route: string): boolean {
    const current = this.currentRoute();
    if (route === '/browse') {
      return current === '/browse' || current === '/items';
    }
    return current.startsWith(route);
  }

  protected getNavItemClass(route: string): string {
    const baseClass =
      'flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200';
    if (this.isActiveRoute(route)) {
      return `${baseClass} bg-purple-100 text-purple-700`;
    }
    return `${baseClass} text-gray-600 hover:text-gray-900 hover:bg-gray-100`;
  }

  protected getMobileNavItemClass(route: string): string {
    const baseClass =
      'flex items-center px-4 py-3 text-base font-medium transition-all duration-200';
    if (this.isActiveRoute(route)) {
      return `${baseClass} bg-purple-50 text-purple-700 border-r-2 border-purple-700`;
    }
    return `${baseClass} text-gray-600 hover:text-gray-900 hover:bg-gray-50`;
  }

  protected getIconSvg(iconName: string): string {
    const icons: { [key: string]: string } = {
      search:
        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>',
      home: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>',
      grid: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>',
      calendar:
        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>',
      message:
        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.991 8.991 0 01-4.255-1.065L3 19l.935-5.745A8.993 8.993 0 013 12a8 8 0 018-8c4.418 0 8 3.582 8 8z"></path>',
      plus: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>',
      user: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>',
      settings:
        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>',
      logout:
        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>',
      menu: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>',
      close:
        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>',
    };
    return icons[iconName] || '';
  }

  // Actions
  protected toggleMobileMenu() {
    this.showMobileMenu.set(!this.showMobileMenu());
    this.showUserMenu.set(false);
  }

  protected toggleUserMenu() {
    this.showUserMenu.set(!this.showUserMenu());
    this.showMobileMenu.set(false);
  }

  protected navigateTo(route: string) {
    this.router.navigate([route]);
    this.showMobileMenu.set(false);
    this.showUserMenu.set(false);
  }

  protected logout() {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/']);
      this.showUserMenu.set(false);
    });
  }

  protected goToCreateItem() {
    this.router.navigate(['/create-item']);
  }

  protected goToProfile() {
    // TODO: Implement when user profile page is ready
    this.router.navigate(['/profile']);
    this.showUserMenu.set(false);
  }
}
