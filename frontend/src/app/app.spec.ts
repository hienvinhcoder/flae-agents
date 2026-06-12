import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { TranslateModule } from '@ngx-translate/core';
import { ConnectionModalService } from './core/services/connection-modal.service';
import { AuthInitializerService } from './core/services/auth-initializer.service';
import { LanguageService } from './core/services/language.service';
import { AuthStore } from './core/stores/auth.store';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';

describe('App', () => {
  let mockConnectionModalService: any;
  let mockAuthInitializerService: any;
  let mockLanguageService: any;
  let mockAuthStore: any;

  beforeEach(async () => {
    mockConnectionModalService = {
      isServerDown: signal(false),
      isChecking: signal(false),
      show: jasmine.createSpy('show'),
      hide: jasmine.createSpy('hide'),
      retryConnection: jasmine.createSpy('retryConnection').and.returnValue(Promise.resolve(true))
    };
    
    mockAuthInitializerService = {
      initialize: jasmine.createSpy('initialize').and.returnValue(Promise.resolve())
    };
    
    mockLanguageService = {};
    
    mockAuthStore = {
      isAuthReady: signal(true),
      currentUser: signal(null),
      reset: jasmine.createSpy('reset'),
      setAuthReady: jasmine.createSpy('setAuthReady')
    };

    await TestBed.configureTestingModule({
      imports: [App, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: ConnectionModalService, useValue: mockConnectionModalService },
        { provide: AuthInitializerService, useValue: mockAuthInitializerService },
        { provide: LanguageService, useValue: mockLanguageService },
        { provide: AuthStore, useValue: mockAuthStore }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render router outlet', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });
});
