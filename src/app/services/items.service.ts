import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface RentalItem {
  id: number;
  title: string;
  description: string;
  category: string;
  pricePerDay: number;
  location: string;
  latitude?: number;
  longitude?: number;
  images: string[];
  isAvailable: boolean;
  ownerId: number;
  ownerName: string;
  ownerVerified: boolean;
  createdAt: string;
  updatedAt: string;
  averageRating?: number;
  totalReviews?: number;
  distance?: number; // For search results
}

// API response interface (matches backend structure)
export interface ApiRentalItem {
  id: number;
  name: string;
  description: string;
  price_per_day: number;
  location: {
    lat: number;
    lon: number;
  };
  address?: {
    formatted_address: string;
    district: string | null;
    city: string;
    country: string;
  };
  image_urls?: string[];
  distance_km?: string;
  owner?: {
    name: string;
    email: string;
  };
  created_at: string;
}

export interface CreateItemRequest {
  name: string;
  description: string;
  category?: string;
  pricePerDay: number;
  locationLat?: number;
  locationLon?: number;
  manualAddress?: string;
  useCurrentLocation?: boolean;
  images?: File[]; // For form data
  imageUrls?: string[]; // For URLs after upload
}

export interface SearchFilters {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  location?: string;
  latitude?: number;
  longitude?: number;
  radius?: number; // in km
  isAvailable?: boolean;
  sortBy?: 'price' | 'distance' | 'rating' | 'newest';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface SearchResponse {
  items: RentalItem[];
  total: number;
  hasMore: boolean;
}

// API Search Response (matches backend structure)
export interface ApiSearchResponse {
  success: boolean;
  search_params: {
    center: { lat: number; lon: number };
    radius_km: number;
    filters: any;
  };
  results_count: number;
  items: ApiRentalItem[];
}

@Injectable({
  providedIn: 'root',
})
export class ItemsService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly baseUrl = `${environment.apiUrl}/items`;
  private readonly searchUrl = `${environment.apiUrl}/search`;

  // Reactive state management
  private itemsSubject = new BehaviorSubject<RentalItem[]>([]);
  private myItemsSubject = new BehaviorSubject<RentalItem[]>([]);
  private searchResultsSubject = new BehaviorSubject<SearchResponse>({
    items: [],
    total: 0,
    hasMore: false,
  });

  // Public observables
  public items$ = this.itemsSubject.asObservable();
  public myItems$ = this.myItemsSubject.asObservable();
  public searchResults$ = this.searchResultsSubject.asObservable();

  // Signals for reactive UI
  public isLoading = signal<boolean>(false);
  public searchLoading = signal<boolean>(false);
  public currentFilters = signal<SearchFilters>({});

  /**
   * Get all items with optional filters
   */
  getItems(filters?: SearchFilters): Observable<RentalItem[]> {
    this.isLoading.set(true);

    const params = this.buildParams(filters);

    return this.http.get<RentalItem[]>(this.baseUrl, { params }).pipe(
      tap((items) => {
        this.itemsSubject.next(items);
        this.isLoading.set(false);
      }),
      catchError((error) => {
        this.isLoading.set(false);
        return this.handleError(error);
      })
    );
  }

  /**
   * Search items with location-based results
   */
  searchItems(filters: SearchFilters): Observable<SearchResponse> {
    this.searchLoading.set(true);
    this.currentFilters.set(filters);

    const params = this.buildParams(filters);

    return this.http.get<ApiSearchResponse>(`${this.searchUrl}/items`, { params }).pipe(
      map((apiResponse) => this.transformSearchResponse(apiResponse)),
      tap((response) => {
        this.searchResultsSubject.next(response);
        this.searchLoading.set(false);
      }),
      catchError((error) => {
        this.searchLoading.set(false);
        return this.handleError(error);
      })
    );
  }

  /**
   * Search nearby items using user's location
   */
  searchNearby(
    latitude: number,
    longitude: number,
    radius: number = 50,
    limit: number = 20
  ): Observable<RentalItem[]> {
    this.searchLoading.set(true);

    const params = new HttpParams()
      .set('lat', latitude.toString())
      .set('lon', longitude.toString())
      .set('radius', radius.toString())
      .set('limit', limit.toString());

    return this.http.get<RentalItem[]>(`${this.searchUrl}/items`, { params }).pipe(
      tap((items) => {
        this.searchLoading.set(false);
      }),
      catchError((error) => {
        this.searchLoading.set(false);
        return this.handleError(error);
      })
    );
  }

  /**
   * Get item by ID
   */
  getItem(id: number): Observable<RentalItem> {
    return this.http.get<any>(`${this.baseUrl}/${id}`).pipe(
      map((apiItem) => this.transformBackendItem(apiItem)),
      catchError((error) => this.handleError(error))
    );
  }

  /**
   * Get all available items (no location filtering)
   */
  getAllItems(): Observable<RentalItem[]> {
    this.isLoading.set(true);

    return this.http.get<any[]>(`${this.baseUrl}`).pipe(
      map((apiItems) => apiItems.map((item) => this.transformBackendItem(item))),
      tap((items) => {
        this.itemsSubject.next(items);
        this.isLoading.set(false);
      }),
      catchError((error) => {
        this.isLoading.set(false);
        return this.handleError(error);
      })
    );
  }

  /**
   * Get current user's items
   */
  getMyItems(): Observable<RentalItem[]> {
    this.isLoading.set(true);

    return this.http
      .get<ApiRentalItem[]>(`${this.baseUrl}/my`, {
        headers: this.authService.getAuthHeaders(),
        withCredentials: true,
      })
      .pipe(
        map((apiItems) => apiItems.map((item) => this.transformApiItem(item))),
        tap((items) => {
          this.myItemsSubject.next(items);
          this.isLoading.set(false);
        }),
        catchError((error) => {
          this.isLoading.set(false);
          return this.handleError(error);
        })
      );
  }

  /**
   * Create new rental item
   */
  createItem(itemData: CreateItemRequest): Observable<RentalItem> {
    this.isLoading.set(true);

    // Create FormData to handle file uploads
    const formData = new FormData();

    // Add form fields
    formData.append('name', itemData.name);
    formData.append('description', itemData.description);
    formData.append('pricePerDay', itemData.pricePerDay.toString());

    if (itemData.locationLat) {
      formData.append('locationLat', itemData.locationLat.toString());
    }
    if (itemData.locationLon) {
      formData.append('locationLon', itemData.locationLon.toString());
    }
    if (itemData.manualAddress) {
      formData.append('manualAddress', itemData.manualAddress);
    }
    formData.append('useCurrentLocation', (itemData.useCurrentLocation || false).toString());

    // Add image files
    if (itemData.images && itemData.images.length > 0) {
      itemData.images.forEach((file) => {
        formData.append('images', file);
      });
    }

    // Create headers without Content-Type (let browser set it for FormData)
    const headers = this.authService.getAuthHeaders().delete('Content-Type');

    return this.http
      .post<any>(this.baseUrl, formData, {
        headers,
        withCredentials: true,
        // Add longer timeout for geocoding process
        timeout: 30000, // 30 seconds timeout for geocoding
      })
      .pipe(
        tap((newItem) => {
          // Add to my items list
          const currentItems = this.myItemsSubject.value;
          this.myItemsSubject.next([newItem, ...currentItems]);
          // Don't set loading here - let component manage it
        }),
        map((apiItem) => this.transformApiItem(apiItem)),
        catchError((error) => {
          // Don't set loading here - let component manage it
          return this.handleError(error);
        })
      );
  }

  /**
   * Update rental item
   */
  updateItem(id: number, itemData: Partial<CreateItemRequest>): Observable<RentalItem> {
    this.isLoading.set(true);

    const formData = new FormData();

    // Add updated fields
    Object.entries(itemData).forEach(([key, value]) => {
      if (value !== undefined && key !== 'images') {
        formData.append(key, value.toString());
      }
    });

    // Add new images if provided
    if (itemData.images) {
      itemData.images.forEach((file) => {
        formData.append('images', file);
      });
    }

    return this.http
      .put<RentalItem>(`${this.baseUrl}/${id}`, formData, {
        headers: this.authService.getAuthHeaders().delete('Content-Type'),
        withCredentials: true,
      })
      .pipe(
        tap((item) => {
          // Update in my items
          const currentItems = this.myItemsSubject.value;
          const index = currentItems.findIndex((i) => i.id === id);
          if (index > -1) {
            currentItems[index] = item;
            this.myItemsSubject.next([...currentItems]);
          }
          this.isLoading.set(false);
        }),
        catchError((error) => {
          this.isLoading.set(false);
          return this.handleError(error);
        })
      );
  }

  /**
   * Delete rental item
   */
  deleteItem(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/${id}`, {
        headers: this.authService.getAuthHeaders(),
        withCredentials: true,
      })
      .pipe(
        tap(() => {
          // Remove from my items
          const currentItems = this.myItemsSubject.value;
          const filteredItems = currentItems.filter((item) => item.id !== id);
          this.myItemsSubject.next(filteredItems);
        }),
        catchError((error) => this.handleError(error))
      );
  }

  /**
   * Toggle item availability
   */
  toggleItemAvailability(id: number): Observable<RentalItem> {
    return this.http
      .put<{ message: string; item: RentalItem }>(
        `${this.baseUrl}/${id}/toggle-availability`,
        {},
        {
          headers: this.authService.getAuthHeaders(),
        }
      )
      .pipe(
        map((response) => response.item),
        tap((updatedItem) => {
          // Update in my items
          const currentItems = this.myItemsSubject.value;
          const updatedItems = currentItems.map((item) => (item.id === id ? updatedItem : item));
          this.myItemsSubject.next(updatedItems);
        }),
        catchError((error) => this.handleError(error))
      );
  }

  /**
   * Get popular categories
   */
  getCategories(): Observable<string[]> {
    return this.http
      .get<string[]>(`${this.baseUrl}/categories`)
      .pipe(catchError((error) => this.handleError(error)));
  }

  /**
   * Get user's location using browser geolocation
   */
  getCurrentLocation(): Promise<{ latitude: number; longitude: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    });
  }

  // Private helper methods

  private transformSearchResponse(apiResponse: ApiSearchResponse): SearchResponse {
    return {
      items: apiResponse.items.map((item) => this.transformApiItem(item)),
      total: apiResponse.results_count,
      hasMore: false, // We can implement pagination later
    };
  }

  private transformApiItem(apiItem: ApiRentalItem): RentalItem {
    // Determine category from item name and description
    const itemText = `${apiItem.name} ${apiItem.description}`.toLowerCase();
    let category = 'Other';

    if (
      itemText.includes('drill') ||
      itemText.includes('tool') ||
      itemText.includes('mower') ||
      itemText.includes('clipper')
    ) {
      category = 'Tools & Equipment';
    } else if (
      itemText.includes('camera') ||
      itemText.includes('projector') ||
      itemText.includes('electronic')
    ) {
      category = 'Electronics';
    } else if (
      itemText.includes('bike') ||
      itemText.includes('bicycle') ||
      itemText.includes('sport')
    ) {
      category = 'Sports & Recreation';
    } else if (
      itemText.includes('car') ||
      itemText.includes('vehicle') ||
      itemText.includes('automotive')
    ) {
      category = 'Automotive';
    }

    return {
      id: apiItem.id,
      title: apiItem.name,
      description: apiItem.description,
      category: category,
      pricePerDay: apiItem.price_per_day,
      location: apiItem.address?.formatted_address || 'Location not available',
      latitude: apiItem.location?.lat || 0,
      longitude: apiItem.location?.lon || 0,
      images: apiItem.image_urls || [], // Use actual image URLs from API
      isAvailable: true, // Assuming available if returned in search
      ownerId: 0, // Not provided in search response
      ownerName: apiItem.owner?.name || 'Unknown',
      ownerVerified: false,
      createdAt: apiItem.created_at,
      updatedAt: apiItem.created_at,
      distance: apiItem.distance_km ? parseFloat(apiItem.distance_km) : undefined,
    };
  }

  private transformBackendItem(backendItem: any): RentalItem {
    // Determine category from item name and description
    const itemText = `${backendItem.name} ${backendItem.description}`.toLowerCase();
    let category = backendItem.category || 'Other';

    // If no category provided, try to determine from content
    if (!backendItem.category || backendItem.category === 'Other') {
      if (
        itemText.includes('drill') ||
        itemText.includes('tool') ||
        itemText.includes('mower') ||
        itemText.includes('clipper')
      ) {
        category = 'Tools & Equipment';
      } else if (
        itemText.includes('camera') ||
        itemText.includes('projector') ||
        itemText.includes('electronic')
      ) {
        category = 'Electronics';
      } else if (
        itemText.includes('bike') ||
        itemText.includes('bicycle') ||
        itemText.includes('sport')
      ) {
        category = 'Sports & Recreation';
      } else if (
        itemText.includes('car') ||
        itemText.includes('vehicle') ||
        itemText.includes('automotive')
      ) {
        category = 'Automotive';
      }
    }

    return {
      id: backendItem.id,
      title: backendItem.name,
      description: backendItem.description,
      category: category,
      pricePerDay: parseFloat(backendItem.price_per_day),
      location:
        backendItem.address?.formatted_address ||
        backendItem.formatted_address ||
        'Location not available',
      latitude: parseFloat(backendItem.location_lat) || 0,
      longitude: parseFloat(backendItem.location_lon) || 0,
      images: backendItem.image_urls || [],
      isAvailable: backendItem.is_available !== false,
      ownerId: backendItem.owner_id || 0,
      ownerName: backendItem.owner?.name || backendItem.owner_name || 'Unknown',
      ownerVerified: false,
      createdAt: backendItem.created_at,
      updatedAt: backendItem.updated_at || backendItem.created_at,
    };
  }

  private buildParams(filters?: SearchFilters): HttpParams {
    let params = new HttpParams();

    if (!filters) return params;

    // Map frontend parameters to backend parameters
    const paramMapping: { [key: string]: string } = {
      latitude: 'lat',
      longitude: 'lon',
      minPrice: 'minPrice',
      maxPrice: 'maxPrice',
      radius: 'radius',
      isAvailable: 'isAvailable',
      query: 'query',
      category: 'category',
      location: 'location',
      sortBy: 'sortBy',
      sortOrder: 'sortOrder',
      limit: 'limit',
      offset: 'offset',
    };

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        const backendParam = paramMapping[key] || key;
        params = params.set(backendParam, value.toString());
      }
    });

    // Always provide default coordinates for location-based search
    // Use a central location (Johannesburg) as default
    if (!params.has('lat') || !params.has('lon')) {
      params = params.set('lat', '-26.204100'); // Johannesburg latitude
      params = params.set('lon', '28.047300'); // Johannesburg longitude
    }

    // Set default radius if not provided
    if (!params.has('radius')) {
      params = params.set('radius', '50'); // 50km default radius
    }

    return params;
  }

  private handleError(error: any): Observable<never> {
    let errorMessage = 'An error occurred';

    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    } else if (error.status === 401) {
      errorMessage = 'Authentication required';
    } else if (error.status === 403) {
      errorMessage = 'Access denied';
    } else if (error.status === 404) {
      errorMessage = 'Item not found';
    } else if (error.status === 0) {
      errorMessage = 'Unable to connect to server';
    }

    console.error('Items Service Error:', error);
    return throwError(() => new Error(errorMessage));
  }
}
