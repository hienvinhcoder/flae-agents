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

  // Selectors
  readonly currentUser = computed(() => this._currentUser());
  readonly isAuthenticated = computed(() => !!this._currentUser());
  readonly isLoading = computed(() => this._isLoading());
  readonly error = computed(() => this._error());

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

  reset(): void {
    this._currentUser.set(null);
    this._isLoading.set(false);
    this._error.set(null);
  }
}
