import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  template: `
    <footer id="footer" class="bg-gray-900 text-white py-16 px-6">
      <div class="max-w-7xl mx-auto text-center">
        <div class="flex items-center justify-center space-x-2 mb-8">
          <span
            class="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-purple-600 shadow-sm"
          >
            <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M3 12L12 5L21 12"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <rect x="7" y="12" width="10" height="7" rx="2" fill="white" fill-opacity="0.95" />
            </svg>
          </span>
          <span class="text-xl font-bold text-white">RentHub</span>
        </div>
        <p class="text-gray-400 mb-8">Making sharing economy accessible to everyone</p>
        <p class="text-gray-500">&copy; 2025 RentHub. All rights reserved.</p>
      </div>
    </footer>
  `,
  styleUrls: [],
})
export class FooterComponent {}
