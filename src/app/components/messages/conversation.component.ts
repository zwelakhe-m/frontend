import { environment } from '../../../environments/environment';
import { Component, OnInit, inject, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService, ConversationDetail, Message } from '../../services/message.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/shared/toast.service';

@Component({
  selector: 'app-conversation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './conversation.component.html',
  styleUrls: ['./conversation.component.scss'],
})
export class ConversationComponent implements OnInit, AfterViewChecked {
  private messageService = inject(MessageService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toastService = inject(ToastService);

  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  conversationDetail: ConversationDetail | null = null;
  conversationId: number = 0;
  currentUserId: number = 0;
  newMessage: string = '';
  isLoading = true;
  isSending = false;
  private shouldScrollToBottom = false;

  ngOnInit() {
    this.currentUserId = this.authService.currentUser()?.id || 0;
    this.conversationId = Number(this.route.snapshot.paramMap.get('id'));

    if (this.conversationId) {
      this.loadConversation();
    } else {
      this.isLoading = false;
    }
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  loadConversation() {
    this.isLoading = true;
    this.messageService.getMessages(this.conversationId).subscribe({
      next: (detail) => {
        this.conversationDetail = detail;
        this.isLoading = false;
        this.shouldScrollToBottom = true;

        // Mark messages as read
        this.markAsRead();
      },
      error: (error: any) => {
        console.error('Error loading conversation:', error);
        this.toastService.error('Failed to load conversation');
        this.isLoading = false;
      },
    });
  }

  sendMessage() {
    if (!this.newMessage.trim() || this.isSending) return;

    this.isSending = true;

    this.messageService
      .sendMessage({
        conversationId: this.conversationId,
        content: this.newMessage.trim(),
      })
      .subscribe({
        next: (response) => {
          // Add message to local list
          if (this.conversationDetail) {
            const newMsg: Message = {
              id: response.message.id,
              conversation_id: this.conversationId,
              sender_id: this.currentUserId,
              content: this.newMessage.trim(),
              sent_at: response.message.sentAt,
              sender_name: 'You',
              is_read_by_user: true,
            };

            this.conversationDetail.messages.push(newMsg);
            this.shouldScrollToBottom = true;
          }

          this.newMessage = '';
          this.isSending = false;

          // Update unread count and conversations
          this.messageService.updateUnreadCount();
          this.messageService.updateConversations();
        },
        error: (error: any) => {
          console.error('Error sending message:', error);
          this.toastService.error('Failed to send message');
          this.isSending = false;
        },
      });
  }

  markAsRead() {
    this.messageService.markMessagesAsRead(this.conversationId).subscribe({
      next: () => {
        // Update unread count
        this.messageService.updateUnreadCount();
        this.messageService.updateConversations();
      },
      error: (error) => {
        console.error('Error marking messages as read:', error);
      },
    });
  }

  onEnterPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  goBack() {
    this.router.navigate(['/messages']);
  }

  getItemImage(imageUrl: string): string {
    if (!imageUrl) {
      return '/assets/placeholder-item.jpg';
    }
  // return imageUrl.startsWith('http') ? imageUrl : `http://localhost:8081${imageUrl}`; // Localhost for reference
  return imageUrl.startsWith('http') ? imageUrl : `${environment.apiUrl.replace(/\/api$/, '')}${imageUrl}`;
  }

  getMessageClasses(isSent: boolean): string {
    return isSent ? 'bg-purple-600 text-white' : 'bg-white text-gray-900 border border-gray-200';
  }

  formatMessageTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  trackByMessageId(index: number, message: Message): number {
    return message.id;
  }

  private scrollToBottom() {
    try {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }
}
