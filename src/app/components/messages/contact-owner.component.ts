import { environment } from '../../../environments/environment';
import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from '../../services/message.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/shared/toast.service';

@Component({
  selector: 'app-contact-owner',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contact-owner.component.html',
  styleUrls: ['./contact-owner.component.scss'],
})
export class ContactOwnerComponent {
  private messageService = inject(MessageService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastService = inject(ToastService);

  @Input() itemId: number = 0;
  @Input() itemName: string = '';
  @Input() itemImage: string = '';
  @Input() pricePerDay: number = 0;
  @Input() ownerName: string = '';
  @Input() ownerId: number = 0;

  showModal = false;
  messageContent = '';
  isStarting = false;
  isSending = false;
  conversationExists = false;
  conversationId = 0;

  get isLoggedIn(): boolean {
    return !!this.authService.currentUser();
  }

  get isOwnItem(): boolean {
    const currentUser = this.authService.currentUser();
    return currentUser?.id === this.ownerId;
  }

  openContactModal() {
    if (!this.isLoggedIn) {
      this.redirectToLogin();
      return;
    }

    if (this.isOwnItem) {
      this.toastService.error('You cannot message yourself about your own item');
      return;
    }

    this.showModal = true;
    this.checkExistingConversation();
  }

  closeModal() {
    this.showModal = false;
    this.messageContent = '';
    this.isStarting = false;
    this.isSending = false;
  }

  redirectToLogin() {
    this.router.navigate(['/login']);
  }

  checkExistingConversation() {
    // Check if conversation already exists for this item
    this.messageService.getConversations().subscribe({
      next: (conversations) => {
        const existing = conversations.find((conv) => conv.item_id === this.itemId);
        if (existing) {
          this.conversationExists = true;
          this.conversationId = existing.id;
        }
      },
      error: (error: any) => {
        console.error('Error checking conversations:', error);
      },
    });
  }

  viewConversation() {
    this.closeModal();
    this.router.navigate(['/messages', this.conversationId]);
  }

  startConversation() {
    if (!this.messageContent.trim()) {
      return;
    }

    this.isSending = true;

    this.messageService
      .startConversation({
        itemId: this.itemId,
        initialMessage: this.messageContent.trim(),
      })
      .subscribe({
        next: (response) => {
          this.toastService.success('Message sent successfully!');
          this.closeModal();

          // Navigate to the conversation
          this.router.navigate(['/messages', response.conversationId]);
        },
        error: (error: any) => {
          console.error('Error sending message:', error);
          if (error.status === 400 && error.error.message?.includes('yourself')) {
            this.toastService.error('You cannot message yourself about your own item');
          } else {
            this.toastService.error('Failed to send message. Please try again.');
          }
          this.isSending = false;
        },
      });
  }

  getItemImage(): string {
    if (!this.itemImage) {
      return '/assets/placeholder-item.jpg';
    }
    return this.itemImage.startsWith('http')
      ? this.itemImage
  // : `http://localhost:8081${this.itemImage}`; // Localhost for reference
  : `${environment.apiUrl.replace(/\/api$/, '')}${this.itemImage}`;
  }
}
