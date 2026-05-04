import { Injectable, signal } from '@angular/core';

export interface MockUser {
  id: string;
  email: string;
  name: string;
  role: 'Owner' | 'Admin' | 'Member';
  workspaceId?: string;
  avatarUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MockAuthService {
  readonly currentUser = signal<MockUser | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  constructor() {}

  // Mock network delay
  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async loginWithGoogle() {
    this.isLoading.set(true);
    this.error.set(null);
    
    await this.delay(800); // Simulate network latency

    try {
      // Mock successful Google login
      const mockUser: MockUser = {
        id: 'google-user-123',
        email: 'owner@mock.com',
        name: 'Mock Owner',
        role: 'Owner',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=owner'
      };
      
      this.currentUser.set(mockUser);
    } catch (e) {
      this.error.set('Đăng nhập bằng Google thất bại. Vui lòng thử lại.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async loginWithEmail(email: string, pass: string) {
    this.isLoading.set(true);
    this.error.set(null);

    await this.delay(1000); // Simulate network latency

    try {
      if (email === 'invitee@mock.com') {
        const mockInvitee: MockUser = {
          id: 'email-user-456',
          email: 'invitee@mock.com',
          name: 'Mock Invitee',
          role: 'Admin',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=invitee'
        };
        this.currentUser.set(mockInvitee);
        return;
      }

      if (email === 'owner@mock.com' && pass === 'password123') {
        const mockOwner: MockUser = {
          id: 'email-user-789',
          email: 'owner@mock.com',
          name: 'Mock Owner',
          role: 'Owner',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=owner2'
        };
        this.currentUser.set(mockOwner);
        return;
      }

      // Default fallback error
      throw new Error('Sai email hoặc mật khẩu.');
    } catch (e: any) {
      this.error.set(e.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      this.isLoading.set(false);
    }
  }

  logout() {
    this.currentUser.set(null);
  }
}
