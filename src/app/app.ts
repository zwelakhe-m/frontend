import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { NotificationToastComponent } from './components/shared/notification-toast.component';
import { NavigationHeaderComponent } from './components/shared/navigation-header.component';
import { FooterComponent } from './components/shared/footer.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NotificationToastComponent, NavigationHeaderComponent, FooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private authService = inject(AuthService);

  ngOnInit(): void {
    // Initialize auth state from localStorage
    this.authService.initializeAuthState();
  }
}
