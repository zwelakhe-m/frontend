import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BrowseFilterService {
  // Signal for selected category (for cross-page filter)
  selectedCategory = signal<string | null>(null);

  setCategory(category: string | null) {
    this.selectedCategory.set(category);
  }

  clearCategory() {
    this.selectedCategory.set(null);
  }
}
