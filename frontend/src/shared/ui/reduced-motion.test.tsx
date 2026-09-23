import { describe, expect, it } from 'vitest';

import css from '../../styles.css?raw';

describe('motion accessibility', () => {
  it('disables animations, transitions, and smooth scrolling when reduced motion is requested', () => {
    const reducedMotion = css.match(/@media \(prefers-reduced-motion: reduce\)[\s\S]*$/)?.[0] ?? '';

    expect(reducedMotion).toContain('transition-duration: 0.01ms');
    expect(reducedMotion).toContain('animation-duration: 0.01ms');
    expect(reducedMotion).toContain('scroll-behavior: auto');
  });

  it('defines ui enter/exit keyframes for dialog and page motion', () => {
    expect(css).toContain('@keyframes ui-fade-in');
    expect(css).toContain('@keyframes ui-fade-out');
    expect(css).toContain('@keyframes ui-scale-in');
    expect(css).toContain('@keyframes ui-scale-out');
    expect(css).toContain('@keyframes ui-slide-up');
    expect(css).toContain('.animate-ui-overlay');
    expect(css).toContain('.animate-ui-panel');
    expect(css).toContain('.animate-ui-enter');
  });
});
