import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { MessageService, Conversation } from '../../services/message.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/shared/toast.service';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.scss'],
})
export class MessagesComponent implements OnInit {
  private messageService = inject(MessageService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private location = inject(Location);
  private toastService = inject(ToastService);

  conversations: Conversation[] = [];
  isLoading = true;
  currentUserId: number = 0;

  ngOnInit() {
    const currentUser = this.authService.currentUser();
    this.currentUserId = currentUser?.id || 0;
    this.loadConversations();
  }

  loadConversations() {
    this.isLoading = true;
    this.messageService.getConversations().subscribe({
      next: (conversations) => {
        this.conversations = conversations;
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading conversations:', error);
        this.toastService.error('Failed to load conversations');
        this.isLoading = false;
      },
    });
  }

  openConversation(conversation: Conversation) {
    this.router.navigate(['/messages', conversation.id]);
  }

  goToExplore() {
    this.router.navigate(['/']);
  }

  getItemImage(imageUrl: string): string {
    if (!imageUrl) {
      return '/assets/placeholder-item.jpg';
    }
    return imageUrl.startsWith('http') ? imageUrl : `http://localhost:8081${imageUrl}`;
  }

  formatTime(timestamp: string): string {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    const diffInDays = diffInHours / 24;

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInDays < 7) {
      return `${Math.floor(diffInDays)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  trackByConversationId(index: number, conversation: Conversation): number {
    return conversation.id;
  }

  goBack(): void {
    // Use Angular's Location service for better navigation
    this.location.back();
  }
}
