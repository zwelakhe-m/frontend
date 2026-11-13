import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';

import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
})
export class ModalComponent {
  @Input() open = false;
  @Output() close = new EventEmitter<void>();

  onClose() {
    this.close.emit();
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.open) {
      this.onClose();
    }
  }
}
