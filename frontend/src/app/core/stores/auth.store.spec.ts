import { TestBed } from '@angular/core/testing';
import { AuthStore } from './auth.store';
import { User } from '../models/auth.model';

describe('AuthStore', () => {
  let store: AuthStore;

  const mockUser: User = {
    id: 'user_123',
    firebase_uid: 'firebase_uid_123',
    email: 'test@example.com',
    full_name: 'Test User',
    avatar_url: 'https://example.com/avatar.png',
    is_active: true,
    login_providers: ['google'],
    current_workspace_id: 'workspace_123'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthStore]
    });
    store = TestBed.inject(AuthStore);
  });

  it('should be created', () => {
    expect(store).toBeTruthy();
  });

  it('should have correct default state values', () => {
    expect(store.currentUser()).toBeNull();
    expect(store.isAuthenticated()).toBeFalse();
    expect(store.isLoading()).toBeFalse();
    expect(store.error()).toBeNull();
    expect(store.isAuthReady()).toBeFalse();
  });

  it('should update current user and update isAuthenticated state accordingly', () => {
    store.setCurrentUser(mockUser);
    expect(store.currentUser()).toEqual(mockUser);
    expect(store.isAuthenticated()).toBeTrue();

    store.setCurrentUser(null);
    expect(store.currentUser()).toBeNull();
    expect(store.isAuthenticated()).toBeFalse();
  });

  it('should update loading state', () => {
    store.setLoading(true);
    expect(store.isLoading()).toBeTrue();

    store.setLoading(false);
    expect(store.isLoading()).toBeFalse();
  });

  it('should set, clear and update error state', () => {
    store.setError('Failed to sync user');
    expect(store.error()).toBe('Failed to sync user');

    store.clearError();
    expect(store.error()).toBeNull();
  });

  it('should update auth ready state', () => {
    store.setAuthReady(true);
    expect(store.isAuthReady()).toBeTrue();

    store.setAuthReady(false);
    expect(store.isAuthReady()).toBeFalse();
  });

  it('should reset state except isAuthReady', () => {
    store.setCurrentUser(mockUser);
    store.setLoading(true);
    store.setError('Some error');
    store.setAuthReady(true);

    store.reset();

    expect(store.currentUser()).toBeNull();
    expect(store.isAuthenticated()).toBeFalse();
    expect(store.isLoading()).toBeFalse();
    expect(store.error()).toBeNull();
    // isAuthReady should remain unchanged by reset() based on store implementation
    expect(store.isAuthReady()).toBeTrue();
  });
});
