import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AskInputComponent } from './ask-input.component';

describe('AskInputComponent', () => {
  let component: AskInputComponent;
  let fixture: ComponentFixture<AskInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AskInputComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AskInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update query model', () => {
    component.query.set('What is Flae?');
    fixture.detectChanges();
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    expect(textarea.value).toBe('What is Flae?');
  });

  it('should emit ask event when submit button clicked', () => {
    spyOn(component.ask, 'emit');
    component.query.set('Tell me about the graph');
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    button.click();

    expect(component.ask.emit).toHaveBeenCalledWith('Tell me about the graph');
    expect(component.query()).toBe('');
  });

  it('should emit ask event on Enter (without Shift)', () => {
    spyOn(component.ask, 'emit');
    component.query.set('Another test query');
    fixture.detectChanges();

    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      shiftKey: false,
    } as any);
    textarea.dispatchEvent(enterEvent);

    expect(component.ask.emit).toHaveBeenCalledWith('Another test query');
    expect(component.query()).toBe('');
  });

  it('should NOT emit ask event on Enter + Shift', () => {
    spyOn(component.ask, 'emit');
    component.query.set('Test query');
    fixture.detectChanges();

    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    const enterShiftEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      shiftKey: true,
    } as any);
    textarea.dispatchEvent(enterShiftEvent);

    expect(component.ask.emit).not.toHaveBeenCalled();
    expect(component.query()).toBe('Test query');
  });
});
