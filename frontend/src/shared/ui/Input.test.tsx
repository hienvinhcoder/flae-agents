import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Input } from './Input';

describe('Input', () => {
  it('provides a 44px target and disables transitions for reduced motion', () => {
    render(<Input label="Email" />);

    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveClass(
      'min-h-10',
      'rounded-ui-control',
      'border-input',
      'bg-card',
      'shadow-none',
      'motion-reduce:transition-none',
    );
  });

  it('associates its label, hint, and validation error', () => {
    render(<Input error="Enter a valid email" hint="Use your work email" id="email" label="Email" />);

    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Use your work email Enter a valid email');
  });
});
