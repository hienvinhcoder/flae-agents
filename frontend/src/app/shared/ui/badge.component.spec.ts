import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BadgeComponent } from './badge.component';

describe('BadgeComponent', () => {
  let component: BadgeComponent;
  let fixture: ComponentFixture<BadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BadgeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BadgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply default variant by default', () => {
    const badgeSpan: HTMLSpanElement = fixture.nativeElement.querySelector('span');
    expect(component.variant()).toBe('default');
    expect(badgeSpan.className).toContain('bg-subtle');
  });

  it('should apply correct variant classes', () => {
    fixture.componentRef.setInput('variant', 'graph');
    fixture.detectChanges();
    const badgeSpan: HTMLSpanElement = fixture.nativeElement.querySelector('span');
    expect(badgeSpan.className).toContain('border-graph-border');
    expect(badgeSpan.className).toContain('bg-graph-soft');
    expect(badgeSpan.className).toContain('text-green-200');
  });
});
