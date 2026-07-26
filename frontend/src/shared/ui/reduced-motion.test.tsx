import { describe, expect, it } from 'vitest';

import css from '../../styles.css?raw';

describe('motion accessibility', () => {
  it('disables animations, transitions, and smooth scrolling when reduced motion is requested', () => {
    const reducedMotion = css.match(/@media \(prefers-reduced-motion: reduce\)[\s\S]*$/)?.[0] ?? '';

    expect(reducedMotion).toContain('transition-duration: 0.01ms');
    expect(reducedMotion).toContain('animation-duration: 0.01ms');
    expect(reducedMotion).toContain('scroll-behavior: auto');
  });
});
