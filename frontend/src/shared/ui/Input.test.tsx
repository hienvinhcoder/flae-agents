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

  it('applies compact density tokens for Linear-tight forms', () => {
    render(<Input density="compact" label="Title" />);
    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveClass(
      'min-h-9',
      'text-[13px]',
      'shadow-sm',
    );
  });

  it('appends optional hint to the accessible name', () => {
    render(
      <Input density="compact" label="Description" optionalHint="optional" />,
    );
    expect(
      screen.getByRole('textbox', { name: /description \(optional\)/i }),
    ).toBeInTheDocument();
  });
});
