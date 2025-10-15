import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface GeocodeResponse {
  display_name: string;
  address: {
    neighbourhood?: string;
    suburb?: string;
    quarter?: string;
    district?: string;
    subdistrict?: string;
    locality?: string;
    hamlet?: string;
    city_district?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    province?: string;
    country?: string;
    postcode?: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class GeocodingService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, string>();

  // Rate limiting to be respectful to Nominatim
  private readonly requestQueue: Array<() => void> = [];
  private isProcessing = false;
  private readonly DELAY_BETWEEN_REQUESTS = 1000; // 1 second delay

  /**
   * Convert coordinates to human-readable address using Nominatim (OpenStreetMap)
   */
  reverseGeocode(lat: number, lon: number): Observable<string> {
    const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;

    // Check cache first
    if (this.cache.has(key)) {
      return of(this.cache.get(key)!);
    }

    // Return a more user-friendly coordinate format while geocoding in background
    const fallback = this.formatCoordinates(lat, lon);

    // Queue the actual geocoding request
    this.queueGeocodingRequest(lat, lon, key);

    return of(fallback);
  }

  private queueGeocodingRequest(lat: number, lon: number, cacheKey: string): void {
    this.requestQueue.push(() => {
      this.performReverseGeocode(lat, lon).subscribe({
        next: (address) => {
          this.cache.set(cacheKey, address);
        },
        error: (error) => {
          console.warn('Geocoding failed, using coordinates:', error);
        },
      });
    });

    this.processQueue();
  }

  private processQueue(): void {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const request = this.requestQueue.shift();

    if (request) {
      request();

      setTimeout(() => {
        this.isProcessing = false;
        this.processQueue();
      }, this.DELAY_BETWEEN_REQUESTS);
    }
  }

  private performReverseGeocode(lat: number, lon: number): Observable<string> {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&extratags=1`;

    return this.http
      .get<GeocodeResponse>(url, {
        headers: {
          'User-Agent': 'RentalMarketplace/1.0', // Required by Nominatim
        },
      })
      .pipe(
        map((response) => this.formatAddress(response)),
        catchError(() => of(this.formatCoordinates(lat, lon)))
      );
  }

  private formatAddress(response: GeocodeResponse): string {
    const { address } = response;

    // Get the most specific location information first
    const microLocation = address.neighbourhood || address.hamlet || address.locality || '';
    const district = address.district || address.subdistrict || address.city_district || '';
    const suburb = address.suburb || address.quarter || '';
    const city = address.city || address.town || address.village || '';

    // Build address hierarchy: micro-location > district/suburb > city
    const parts = [];

    // Add the most specific location first
    if (microLocation) {
      parts.push(microLocation);
    } else if (district) {
      parts.push(district);
    } else if (suburb) {
      parts.push(suburb);
    }

    // Add broader context if different
    if (city && !parts.includes(city)) {
      // If we have micro-location, add city directly
      if (microLocation || district) {
        parts.push(city);
      }
      // If we only have suburb, check if it's different from city
      else if (suburb && suburb !== city) {
        parts.push(city);
      }
      // If no specific location, just use city
      else if (!suburb) {
        parts.push(city);
      }
    }

    // Create final address string
    if (parts.length >= 2) {
      return `${parts[0]}, ${parts[1]}`;
    } else if (parts.length === 1) {
      return parts[0];
    } else {
      // Fallback to parsing display_name for micro-locations
      return this.extractMicroLocation(response.display_name);
    }
  }

  private extractMicroLocation(displayName: string): string {
    // Parse display_name to extract the most specific location
    // Pattern: "House Number, Street, Micro-location, District/Suburb, City, Province, Country"
    const parts = displayName.split(',').map((part) => part.trim());

    if (parts.length >= 5) {
      // Try to get micro-location (3rd) and district/city (4th or 5th)
      const microLocation = parts[2];
      const district = parts[3];
      const city = parts[4];

      const isValidMicro = microLocation && !microLocation.match(/^\d/) && microLocation.length > 2;
      const isValidDistrict = district && !district.match(/^\d/) && district.length > 2;
      const isValidCity = city && !city.match(/^\d/) && city.length > 2;

      // Prioritize micro-location + city if available
      if (isValidMicro && isValidCity && microLocation !== city) {
        return `${microLocation}, ${city}`;
      }
      // Fallback to district + city
      else if (isValidDistrict && isValidCity && district !== city) {
        return `${district}, ${city}`;
      }
      // Just micro-location if it's descriptive enough
      else if (isValidMicro && microLocation.length > 5) {
        return microLocation;
      }
      // Just city as last resort
      else if (isValidCity) {
        return city;
      }
    }

    // Enhanced fallback: look for common South African location patterns
    if (parts.length >= 3) {
      const meaningfulParts = parts.filter(
        (part) =>
          part &&
          !part.match(/^\d/) &&
          part.length > 2 &&
          !part.toLowerCase().includes('south africa') &&
          !part.toLowerCase().includes('gauteng') &&
          !part.toLowerCase().includes('province')
      );

      if (meaningfulParts.length >= 2) {
        // Take the two most specific meaningful parts
        const specific =
          meaningfulParts[meaningfulParts.length - 3] ||
          meaningfulParts[meaningfulParts.length - 2];
        const broader =
          meaningfulParts[meaningfulParts.length - 2] ||
          meaningfulParts[meaningfulParts.length - 1];

        if (specific && broader && specific !== broader) {
          return `${specific}, ${broader}`;
        }
      }
    }

    // Final fallback: truncate if too long
    return displayName.length > 35 ? displayName.substring(0, 32) + '...' : displayName;
  }

  private formatCoordinates(lat: number, lon: number): string {
    // More user-friendly coordinate display
    const latDir = lat >= 0 ? 'N' : 'S';
    const lonDir = lon >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(2)}°${latDir}, ${Math.abs(lon).toFixed(2)}°${lonDir}`;
  }

  /**
   * Get cached address if available
   */
  getCachedAddress(lat: number, lon: number): string | null {
    const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    return this.cache.get(key) || null;
  }

  /**
   * Clear the geocoding cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}
