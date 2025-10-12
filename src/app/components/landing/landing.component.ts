import { ViewChild, ElementRef, AfterViewInit, OnDestroy, HostListener } from '@angular/core';
import { Component, inject } from '@angular/core';
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
  imports: [CommonModule],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
})
export class LandingComponent implements AfterViewInit, OnDestroy {
  private browseFilterService = inject(BrowseFilterService);
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
