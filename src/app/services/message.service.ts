import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Conversation {
  id: number;
  item_id: number;
  created_at: string;
  updated_at: string;
  item_name: string;
  item_image: string;
  price_per_day: number;
  other_user_id: number;
  other_user_name: string;
  last_message: string;
  last_message_at: string;
  last_message_sender_id: number;
  unread_count: number;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  sent_at: string;
  sender_name: string;
  is_read_by_user: boolean;
}

export interface ConversationDetail {
  conversation: {
    id: number;
    item_id: number;
    item_name: string;
    item_image: string;
    other_user_id: number;
    other_user_name: string;
  };
  messages: Message[];
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface StartConversationRequest {
  itemId: number;
  initialMessage?: string;
}

export interface SendMessageRequest {
  conversationId: number;
  content: string;
}

@Injectable({
  providedIn: 'root',
})
export class MessageService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/messages`;

  // BehaviorSubjects for real-time updates
  private unreadCountSubject = new BehaviorSubject<number>(0);
  private conversationsSubject = new BehaviorSubject<Conversation[]>([]);

  // Observables for components to subscribe to
  unreadCount$ = this.unreadCountSubject.asObservable();
  conversations$ = this.conversationsSubject.asObservable();

  // Start a new conversation or get existing one
  startConversation(request: StartConversationRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/conversations`, request);
  }

  // Send a message
  sendMessage(request: SendMessageRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/send`, request);
  }

  // Get all conversations for current user
  getConversations(): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(`${this.apiUrl}/conversations`);
  }

  // Get messages for a specific conversation
  getMessages(
    conversationId: number,
    page: number = 1,
    limit: number = 50
  ): Observable<ConversationDetail> {
    return this.http.get<ConversationDetail>(
      `${this.apiUrl}/conversations/${conversationId}/messages?page=${page}&limit=${limit}`
    );
  }

  // Mark messages as read
  markMessagesAsRead(conversationId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/conversations/${conversationId}/read`, {});
  }

  // Get unread count
  getUnreadCount(): Observable<{ unreadCount: number }> {
    return this.http.get<{ unreadCount: number }>(`${this.apiUrl}/unread-count`);
  }

  // Update local unread count
  updateUnreadCount(): void {
    this.getUnreadCount().subscribe((result) => {
      this.unreadCountSubject.next(result.unreadCount);
    });
  }

  // Update local conversations
  updateConversations(): void {
    this.getConversations().subscribe((conversations) => {
      this.conversationsSubject.next(conversations);
    });
  }

  // Get current unread count value
  getCurrentUnreadCount(): number {
    return this.unreadCountSubject.value;
  }

  // Get current conversations value
  getCurrentConversations(): Conversation[] {
    return this.conversationsSubject.value;
  }
}
