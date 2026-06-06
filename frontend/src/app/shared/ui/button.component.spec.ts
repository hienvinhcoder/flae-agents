import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ButtonComponent } from './button.component';

describe('ButtonComponent', () => {
  let component: ButtonComponent;
  let fixture: ComponentFixture<ButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply primary variant classes by default', () => {
    const buttonElement: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(component.variant()).toBe('primary');
    expect(buttonElement.className).toContain('bg-primary');
  });

  it('should apply correct variant classes', () => {
    fixture.componentRef.setInput('variant', 'destructive');
    fixture.detectChanges();
    const buttonElement: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(buttonElement.className).toContain('bg-error-soft');
  });

  it('should emit btnClick event when clicked and not disabled', () => {
    spyOn(component.btnClick, 'emit');
    const buttonElement: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    buttonElement.click();
    expect(component.btnClick.emit).toHaveBeenCalled();
  });

  it('should not emit btnClick event when disabled', () => {
    spyOn(component.btnClick, 'emit');
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    const buttonElement: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    buttonElement.click();
    expect(component.btnClick.emit).not.toHaveBeenCalled();
  });
});
