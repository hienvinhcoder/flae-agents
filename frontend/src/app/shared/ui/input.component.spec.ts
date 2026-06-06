import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { InputComponent } from './input.component';

describe('InputComponent', () => {
  let component: InputComponent;
  let fixture: ComponentFixture<InputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InputComponent, FormsModule, ReactiveFormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(InputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set placeholder and type', () => {
    fixture.componentRef.setInput('placeholder', 'Enter name');
    fixture.componentRef.setInput('type', 'password');
    fixture.detectChanges();
    const inputElement: HTMLInputElement = fixture.nativeElement.querySelector('input');
    expect(inputElement.placeholder).toBe('Enter name');
    expect(inputElement.type).toBe('password');
  });

  it('should update value on input event', () => {
    const inputElement: HTMLInputElement = fixture.nativeElement.querySelector('input');
    inputElement.value = 'Hello';
    inputElement.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(component.value()).toBe('Hello');
  });

  it('should show label if provided', () => {
    fixture.componentRef.setInput('label', 'Username');
    fixture.detectChanges();
    const labelElement = fixture.nativeElement.querySelector('label');
    expect(labelElement).toBeTruthy();
    expect(labelElement.textContent.trim()).toBe('Username');
  });
});
