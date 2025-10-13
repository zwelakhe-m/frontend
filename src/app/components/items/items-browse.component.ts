import { environment } from '../../../environments/environment';
import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { BrowseFilterService } from '../../services/browse-filter.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ItemsService, RentalItem } from '../../services/items.service';
import { AuthService } from '../../services/auth.service';

export interface FilterOptions {
  category: string;
  priceMin: number;
  priceMax: number;
  location: string;
  radius: number;
  availability: 'available' | 'all';
}

@Component({
  selector: 'app-items-browse',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './items-browse.component.html',
  styleUrls: ['./items-browse.component.scss'],
})
export class ItemsBrowseComponent implements OnInit, OnDestroy {
  private browseFilterService = inject(BrowseFilterService);
  private itemsService = inject(ItemsService);
  protected authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Search timeout for debouncing
  private searchTimeout: any;

  // Signals for reactive state management
  items = signal<RentalItem[]>([]);
  loading = signal(false);
  searchQuery = '';
  totalItems = signal(0);
  currentPage = signal(1);
  itemsPerPage = 12;

  // Filter options
  filters = signal<FilterOptions>({
    category: '',
    priceMin: 0,
    priceMax: 1000,
    location: '',
    radius: 50,
    availability: 'available',
  });

  // Categories for filter dropdown
  categories = signal<string[]>(['All Categories']);

  // Sort options
  sortOptions = [
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
    { value: 'created_desc', label: 'Newest First' },
    { value: 'created_asc', label: 'Oldest First' },
    { value: 'rating_desc', label: 'Highest Rated' },
  ];

  currentSort = signal('created_desc');

  ngOnInit() {
    // Read query parameters from URL
    this.route.queryParams.subscribe((params) => {
      if (params['search']) {
        this.searchQuery = params['search'];
      }
      if (params['location']) {
        this.filters.update((filters) => ({
          ...filters,
          location: params['location'],
        }));
      }
    });

    // Check for selected category from landing page
    const selectedCategory = this.browseFilterService.selectedCategory();
    if (selectedCategory) {
      this.filters.update((filters) => ({ ...filters, category: selectedCategory }));
      this.browseFilterService.clearCategory();
    }

    this.loadItems();
    this.loadCategories();
  }

  ngOnDestroy() {
    // Clean up any pending search timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }

  private loadCategories() {
    // Load categories from the items service for dynamic categories
    this.itemsService.getCategories().subscribe({
      next: (categories) => {
        this.categories.set(['All Categories', ...categories]);
      },
      error: (error) => {
        console.log('Using default categories due to error:', error);
        // Keep default categories if API fails
      },
    });
  }

  async loadItems() {
    this.loading.set(true);
    try {
      // Check if we have any active filters
      const hasActiveFilters =
        (this.searchQuery && this.searchQuery.trim()) ||
        (this.filters().category && this.filters().category.trim()) ||
        (this.filters().location && this.filters().location.trim()) ||
        this.filters().priceMin > 0 ||
        this.filters().priceMax < 1000;

      if (hasActiveFilters) {
        // Use search with filters - but implement client-side filtering for now
        // since the backend search has location requirements
        this.itemsService.getAllItems().subscribe({
          next: (allItems) => {
            let filteredItems = [...allItems];

            // Apply text search filter
            if (this.searchQuery && this.searchQuery.trim()) {
              const query = this.searchQuery.toLowerCase();
              filteredItems = filteredItems.filter(
                (item) =>
                  item.title.toLowerCase().includes(query) ||
                  item.description.toLowerCase().includes(query)
              );
            }

            // Apply category filter
            if (this.filters().category && this.filters().category.trim()) {
              filteredItems = filteredItems.filter(
                (item) =>
                  item.category &&
                  item.category.toLowerCase() === this.filters().category.toLowerCase()
              );
            }

            // Apply price filters
            if (this.filters().priceMin > 0) {
              filteredItems = filteredItems.filter(
                (item) => item.pricePerDay >= this.filters().priceMin
              );
            }

            if (this.filters().priceMax < 1000) {
              filteredItems = filteredItems.filter(
                (item) => item.pricePerDay <= this.filters().priceMax
              );
            }

            // Apply location filter (simple text matching for now)
            if (this.filters().location && this.filters().location.trim()) {
              const locationQuery = this.filters().location.toLowerCase();
              filteredItems = filteredItems.filter(
                (item) => item.location && item.location.toLowerCase().includes(locationQuery)
              );
            }

            // Apply sorting
            const sortedItems = this.applySorting(filteredItems);

            // Apply pagination
            const startIndex = (this.currentPage() - 1) * this.itemsPerPage;
            const paginatedItems = sortedItems.slice(startIndex, startIndex + this.itemsPerPage);

            this.items.set(paginatedItems);
            this.totalItems.set(sortedItems.length);
            this.loading.set(false);
          },
          error: (error) => {
            console.error('Error loading items for search:', error);
            this.loading.set(false);
          },
        });
      } else {
        // No filters, use getAllItems for better performance and to show all items
        this.itemsService.getAllItems().subscribe({
          next: (items) => {
            // Apply sorting if needed
            const sortedItems = this.applySorting(items);

            // Apply pagination
            const startIndex = (this.currentPage() - 1) * this.itemsPerPage;
            const paginatedItems = sortedItems.slice(startIndex, startIndex + this.itemsPerPage);

            this.items.set(paginatedItems);
            this.totalItems.set(sortedItems.length);
            this.loading.set(false);
          },
          error: (error) => {
            console.error('Error loading items:', error);
            this.loading.set(false);
          },
        });
      }
    } catch (error) {
      console.error('Error loading items:', error);
      this.loading.set(false);
    }
  }

  private fallbackToGetAllItems() {
    this.itemsService.getAllItems().subscribe({
      next: (items) => {
        const sortedItems = this.applySorting(items);
        const startIndex = (this.currentPage() - 1) * this.itemsPerPage;
        const paginatedItems = sortedItems.slice(startIndex, startIndex + this.itemsPerPage);

        this.items.set(paginatedItems);
        this.totalItems.set(sortedItems.length);
        this.loading.set(false);
      },
      error: (fallbackError) => {
        console.error('Error loading fallback items:', fallbackError);
        this.loading.set(false);
      },
    });
  }

  private applySorting(items: RentalItem[]): RentalItem[] {
    const sortField = this.getSortField();
    const sortOrder = this.getSortOrder();

    return [...items].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'price':
          comparison = a.pricePerDay - b.pricePerDay;
          break;
        case 'created':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'rating':
          comparison = (a.averageRating || 0) - (b.averageRating || 0);
          break;
        default:
          comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  onSearch() {
    // This method is kept for the search button click
    this.currentPage.set(1);
    this.loadItems();
  }

  onRealTimeSearch() {
    // Clear any existing timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // Set timeout for debounced search
    this.searchTimeout = setTimeout(() => {
      this.currentPage.set(1);
      this.loadItems();
    }, 300);
  }

  onSearchInput(event: any) {
    const value = event.target.value;
    console.log('Search input changed to:', value);

    // Update search query immediately
    this.searchQuery = value;

    // Clear any existing timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // If search is cleared, immediately show all items
    if (value === '') {
      this.currentPage.set(1);
      this.loadItems();
      return;
    }

    // Set timeout for debounced search
    this.searchTimeout = setTimeout(() => {
      console.log('Searching for:', value);
      this.currentPage.set(1);
      this.loadItems();
    }, 300);
  }

  onFilterChange() {
    this.currentPage.set(1);
    this.loadItems();
  }

  onSortChange() {
    this.currentPage.set(1);
    this.loadItems();
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
    this.loadItems();
  }

  private getSortField(): string {
    const sort = this.currentSort();
    if (sort.includes('price')) return 'price';
    if (sort.includes('rating')) return 'rating';
    if (sort.includes('created')) return 'newest';
    return 'newest';
  }

  private getSortOrder(): 'asc' | 'desc' {
    return this.currentSort().includes('asc') ? 'asc' : 'desc';
  }

  getTotalPages(): number {
    return Math.ceil(this.totalItems() / this.itemsPerPage);
  }

  getPageNumbers(): number[] {
    const total = this.getTotalPages();
    const current = this.currentPage();
    const range = 2;

    let start = Math.max(1, current - range);
    let end = Math.min(total, current + range);

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  viewItemDetails(item: RentalItem) {
    this.router.navigate(['/items', item.id]);
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(price);
  }

  getImageUrl(item: RentalItem): string {
    // Handle both old and new image URL formats
    if (item.images && item.images.length > 0) {
      const imageUrl = item.images[0];
      // If it's already a full URL, return as is
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return imageUrl;
      }
      // If it's a relative path, prepend the backend URL
      if (imageUrl.startsWith('/uploads/')) {
        // return `http://localhost:8081${imageUrl}`; // Localhost for reference
        return `${environment.apiUrl.replace(/\/api$/, '')}${imageUrl}`;
      }
      // If it's just a filename, assume it's in uploads
      // return `http://localhost:8081/uploads/${imageUrl}`; // Localhost for reference
      return `${environment.apiUrl.replace(/\/api$/, '')}/uploads/${imageUrl}`;
    }
    return '/assets/images/placeholder-item.jpg';
  }

  clearAllFilters() {
    this.searchQuery = '';
    this.filters.set({
      category: '',
      priceMin: 0,
      priceMax: 1000,
      location: '',
      radius: 50,
      availability: 'available',
    });
    this.currentSort.set('created_desc');
    this.currentPage.set(1);
    this.loadItems();
  }

  getRatingStars(rating: number): string[] {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return [
      ...Array(fullStars).fill('★'),
      ...(hasHalfStar ? ['☆'] : []),
      ...Array(emptyStars).fill('☆'),
    ];
  }

  protected goBack(): void {
    // Check if user is authenticated
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/']);
    }
  }
}
