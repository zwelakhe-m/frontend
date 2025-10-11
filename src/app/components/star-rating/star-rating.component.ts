import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-star-rating',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './star-rating.component.html',
  styleUrls: ['./star-rating.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => StarRatingComponent),
      multi: true,
    },
  ],
})
export class StarRatingComponent implements ControlValueAccessor {
  @Input() maxStars = 5;
  @Input() readonly = false;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() showValue = false;
  @Input() showCount = false;
  @Input() count = 0;
  @Input() allowHalf = false;
  @Input() rating = 0; // Add the missing rating input property

  @Output() ratingChange = new EventEmitter<number>();

  private _internalRating = 0;
  hoveredRating = 0;

  private onChange = (value: number) => {};
  private onTouched = () => {};

  get stars(): number[] {
    return Array(this.maxStars)
      .fill(0)
      .map((_, i) => i + 1);
  }

  get sizeClass(): string {
    switch (this.size) {
      case 'sm':
        return 'text-sm';
      case 'lg':
        return 'text-2xl';
      default:
        return 'text-lg';
    }
  }

  get currentRating(): number {
    return this._internalRating || this.rating;
  }

  getStarClass(star: number): string {
    const activeRating = this.hoveredRating || this.currentRating;
    const isActive = star <= activeRating;
    const isHalf = this.allowHalf && star === Math.ceil(activeRating) && activeRating % 1 !== 0;

    let classes = `${this.sizeClass} transition-colors duration-150 `;

    if (this.readonly) {
      classes += isActive ? 'text-yellow-400' : 'text-gray-300';
    } else {
      classes += 'cursor-pointer hover:scale-110 transform transition-transform ';
      classes += isActive
        ? 'text-yellow-400 hover:text-yellow-500'
        : 'text-gray-300 hover:text-yellow-300';
    }

    return classes;
  }

  onStarClick(star: number): void {
    if (this.readonly) return;

    this._internalRating = star;
    this.onChange(this._internalRating);
    this.onTouched();
    this.ratingChange.emit(this._internalRating);
  }

  onStarHover(star: number): void {
    if (this.readonly) return;
    this.hoveredRating = star;
  }

  onMouseLeave(): void {
    if (this.readonly) return;
    this.hoveredRating = 0;
  }

  // ControlValueAccessor implementation
  writeValue(value: number): void {
    this._internalRating = value || 0;
  }

  registerOnChange(fn: (value: number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    // Handle disabled state if needed
  }
}
