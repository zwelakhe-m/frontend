import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ItemsService, RentalItem } from '../../services/items.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/shared/toast.service';

@Component({
  selector: 'app-my-items',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './my-items.component.html',
  styleUrls: ['./my-items.component.scss'],
})
export class MyItemsComponent implements OnInit {
  private itemsService = inject(ItemsService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastService = inject(ToastService);

  items = signal<RentalItem[]>([]);
  filteredItems = signal<RentalItem[]>([]);
  loading = signal(false);
  totalItems = signal(0);
  currentPage = signal(1);
  itemsPerPage = 10;

  // Delete confirmation state
  itemToDelete = signal<RentalItem | null>(null);
  showDeleteConfirmation = signal(false);

  // Filter options
  statusFilter = 'all';
  sortBy = 'created';
  sortOrder = 'desc';

  ngOnInit() {
    this.loadMyItems();
  }

  async loadMyItems() {
    this.loading.set(true);
    try {
      this.itemsService.getMyItems().subscribe({
        next: (items) => {
          this.items.set(items);
          this.applyFiltersAndSort();
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading my items:', error);
          this.loading.set(false);
        },
      });
    } catch (error) {
      console.error('Error loading my items:', error);
      this.loading.set(false);
    }
  }

  applyFiltersAndSort() {
    let filtered = [...this.items()];

    // Apply status filter
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter((item) => {
        switch (this.statusFilter) {
          case 'available':
            return item.isAvailable;
          case 'unavailable':
            return !item.isAvailable;
          case 'rented':
            // For now, we don't have rental status, so return empty array
            return false;
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (this.sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'price':
          comparison = a.pricePerDay - b.pricePerDay;
          break;
        case 'created':
        default:
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }

      return this.sortOrder === 'desc' ? -comparison : comparison;
    });

    this.filteredItems.set(filtered);
    this.totalItems.set(filtered.length);
    this.currentPage.set(1);
  }

  onFilterChange() {
    this.applyFiltersAndSort();
  }

  onSortChange() {
    this.applyFiltersAndSort();
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
  }

  // Get paginated items for display
  getPaginatedItems(): RentalItem[] {
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredItems().slice(start, end);
  }

  getAvailableCount(): number {
    return this.items().filter((item) => item.isAvailable).length;
  }

  getUnavailableCount(): number {
    return this.items().filter((item) => !item.isAvailable).length;
  }

  createNewItem() {
    this.router.navigate(['/items/create']);
  }

  editItem(item: RentalItem) {
    this.router.navigate(['/items/edit', item.id]);
  }

  viewItem(item: RentalItem) {
    this.router.navigate(['/items', item.id]);
  }

  async toggleAvailability(item: RentalItem) {
    try {
      this.itemsService.toggleItemAvailability(item.id).subscribe({
        next: (updatedItem) => {
          // Update the item in our list
          const items = this.items();
          const index = items.findIndex((i) => i.id === item.id);
          if (index !== -1) {
            items[index] = updatedItem;
            this.items.set([...items]);
            this.applyFiltersAndSort();
          }
          this.toastService.success(
            'Availability Updated',
            `Item is now ${updatedItem.isAvailable ? 'available' : 'unavailable'} for rental.`
          );
        },
        error: (error) => {
          console.error('Error updating item availability:', error);
          this.toastService.error(
            'Failed to update availability',
            'Please try again or contact support if the issue persists.'
          );
        },
      });
    } catch (error) {
      console.error('Error updating item availability:', error);
      this.toastService.error(
        'Failed to update availability',
        'Please try again or contact support if the issue persists.'
      );
    }
  }

  // Show delete confirmation
  confirmDeleteItem(item: RentalItem) {
    this.itemToDelete.set(item);
    this.showDeleteConfirmation.set(true);
  }

  // Cancel delete
  cancelDelete() {
    this.itemToDelete.set(null);
    this.showDeleteConfirmation.set(false);
  }

  // Execute delete
  async deleteItem() {
    const item = this.itemToDelete();
    if (!item) return;

    try {
      this.itemsService.deleteItem(item.id).subscribe({
        next: () => {
          // Remove the item from our list
          const items = this.items().filter((i) => i.id !== item.id);
          this.items.set(items);
          this.applyFiltersAndSort();
          this.toastService.success(
            'Item Deleted',
            `"${item.title}" has been deleted successfully.`
          );
          this.cancelDelete();
        },
        error: (error) => {
          console.error('Error deleting item:', error);
          this.toastService.error(
            'Failed to delete item',
            'Please try again or contact support if the issue persists.'
          );
          this.cancelDelete();
        },
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      this.toastService.error(
        'Failed to delete item',
        'Please try again or contact support if the issue persists.'
      );
      this.cancelDelete();
    }
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

  formatPrice(price: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(price);
  }

  getImageUrl(item: RentalItem): string {
    return item.images?.[0] || '/assets/images/placeholder-item.jpg';
  }

  getStatusBadgeClass(item: RentalItem): string {
    if (!item.isAvailable) return 'status-unavailable';
    // Remove currentlyRented since it's not in our interface
    return 'status-available';
  }

  getStatusText(item: RentalItem): string {
    if (!item.isAvailable) return 'Unavailable';
    // Remove currentlyRented since it's not in our interface
    return 'Available';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  protected goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
