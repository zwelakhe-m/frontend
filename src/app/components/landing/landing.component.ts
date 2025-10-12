import {
  Component,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  HostListener,
  inject,
} from '@angular/core';
import { ModalComponent } from '../shared/modal/modal.component';

import { BrowseFilterService } from '../../services/browse-filter.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

// Category type for clarity
interface CategoryCard {
  name: string;
  icon: string; // emoji or icon string
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, ModalComponent],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
})
export class LandingComponent implements AfterViewInit, OnDestroy {
  modalOpen = false;
  featureContent: {
    icon: string;
    title: string;
    subtitle: string;
    future?: string;
    description: string;
  } | null = null;

  openFeatureModal(feature: 'secure' | 'instant' | 'earn'): void {
    if (feature === 'secure') {
      this.featureContent = {
        icon: `<svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>`,
        title: 'Secure & Safe',
        subtitle: 'All rentals are protected with verified user profiles and secure payments.',
        future: 'Insurance coverage is a planned feature and will be available soon.',
        description:
          'We take your safety seriously. Every user is verified before they can rent or list items. Payments are processed securely, and our team is always working to add more protections—including insurance, coming soon!',
      };
    } else if (feature === 'instant') {
      this.featureContent = {
        icon: `<svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>`,
        title: 'Instant Booking',
        subtitle:
          'Find and book items instantly with our smart matching algorithm and real-time availability.',
        description:
          'Our platform connects you with available items in your area, allowing you to book in just a few clicks. No waiting, no hassle—just fast, secure rentals.',
      };
    } else if (feature === 'earn') {
      this.featureContent = {
        icon: `<svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/></svg>`,
        title: 'Earn Money',
        subtitle:
          'Turn your unused items into income with competitive rates and a safe, trusted platform.',
        description:
          'Listing is easy and free. You control your prices and availability, and our secure payment system ensures you get paid quickly. We’re building more features to help you earn even more—stay tuned!',
      };
    }
    this.modalOpen = true;
  }

  closeFeatureModal(): void {
    this.modalOpen = false;
    this.featureContent = null;
  }
  private readonly browseFilterService = inject(BrowseFilterService);
  @ViewChild('carousel', { static: false }) carouselRef!: ElementRef<HTMLDivElement>;
  protected currentIndex = 0;
  private autoSlideInterval: any;
  protected itemsPerSlide = 3;

  @HostListener('window:resize')
  onResize() {
    this.updateItemsPerSlide();
    this.snapToCurrent();
  }

  ngAfterViewInit() {
    this.updateItemsPerSlide();
    this.startAutoSlide();
  }

  ngOnDestroy() {
    clearInterval(this.autoSlideInterval);
  }

  private updateItemsPerSlide() {
    if (window.innerWidth < 768) {
      this.itemsPerSlide = 1;
    } else {
      this.itemsPerSlide = 3;
    }
  }

  protected nextSlide() {
    const maxIndex = this.categories.length - this.itemsPerSlide;
    this.currentIndex = Math.min(this.currentIndex + 1, maxIndex);
    this.snapToCurrent();
  }

  protected prevSlide() {
    this.currentIndex = Math.max(this.currentIndex - 1, 0);
    this.snapToCurrent();
  }

  private snapToCurrent() {
    if (!this.carouselRef) return;
    const carousel = this.carouselRef.nativeElement;
    const card = carousel.querySelector('button');
    if (card) {
      const cardWidth = (card as HTMLElement).offsetWidth + 16; // 16px gap
      carousel.scrollTo({
        left: this.currentIndex * cardWidth,
        behavior: 'smooth',
      });
    }
  }

  private startAutoSlide() {
    this.autoSlideInterval = setInterval(() => {
      const maxIndex = this.categories.length - this.itemsPerSlide;
      if (this.currentIndex < maxIndex) {
        this.currentIndex++;
      } else {
        this.currentIndex = 0;
      }
      this.snapToCurrent();
    }, 4000);
  }
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  // Popular categories (add more as needed)
  protected categories: CategoryCard[] = [
    { name: 'Electronics', icon: '💻' },
    { name: 'Tools & Equipment', icon: '🛠️' },
    { name: 'Sports & Recreation', icon: '🏀' },
    { name: 'Automotive', icon: '🚗' },
    { name: 'Home & Garden', icon: '🏡' },
    { name: 'Party & Events', icon: '🎉' },
    { name: 'Fashion', icon: '👗' },
    { name: 'Books & Media', icon: '📚' },
    { name: 'Furniture', icon: '🛋️' },
    { name: 'Other', icon: '✨' },
  ];

  protected goToCategory(category: string) {
    this.browseFilterService.setCategory(category);
    this.router.navigate(['/browse']);
  }

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
