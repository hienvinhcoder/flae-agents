import { Injectable, signal, computed } from '@angular/core';
import { User } from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthStore {
  // State Signals
  private readonly _currentUser = signal<User | null>(null);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);
  /**
   * Đánh dấu Firebase Auth SDK đã hoàn tất việc khởi tạo và kiểm tra session.
   * Guard phải chờ signal này = true trước khi quyết định redirect.
   */
  private readonly _isAuthReady = signal<boolean>(false);

  // Selectors
  readonly currentUser = computed(() => this._currentUser());
  readonly isAuthenticated = computed(() => !!this._currentUser());
  readonly isLoading = computed(() => this._isLoading());
  readonly error = computed(() => this._error());
  readonly isAuthReady = computed(() => this._isAuthReady());

  // Updaters
  setCurrentUser(user: User | null): void {
    this._currentUser.set(user);
  }

  setLoading(isLoading: boolean): void {
    this._isLoading.set(isLoading);
  }

  setError(error: string | null): void {
    this._error.set(error);
  }

  clearError(): void {
    this._error.set(null);
  }

  setAuthReady(ready: boolean): void {
    this._isAuthReady.set(ready);
  }

  reset(): void {
    this._currentUser.set(null);
    this._isLoading.set(false);
    this._error.set(null);
  }
}
