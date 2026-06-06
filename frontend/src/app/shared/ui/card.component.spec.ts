import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardComponent } from './card.component';

describe('CardComponent', () => {
  let component: CardComponent;
  let fixture: ComponentFixture<CardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply default variant by default', () => {
    const cardDiv: HTMLDivElement = fixture.nativeElement.querySelector('div');
    expect(component.variant()).toBe('default');
    expect(cardDiv.className).toContain('bg-surface');
  });

  it('should apply elevated variant classes', () => {
    fixture.componentRef.setInput('variant', 'elevated');
    fixture.detectChanges();
    const cardDiv: HTMLDivElement = fixture.nativeElement.querySelector('div');
    expect(cardDiv.className).toContain('bg-elevated');
    expect(cardDiv.className).toContain('border-strong');
  });

  it('should apply no padding when noPadding is true', () => {
    fixture.componentRef.setInput('noPadding', true);
    fixture.detectChanges();
    const cardDiv: HTMLDivElement = fixture.nativeElement.querySelector('div');
    expect(cardDiv.className).not.toContain('p-5');
  });
});
