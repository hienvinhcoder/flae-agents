import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Badge } from './Badge';

describe('Badge', () => {
  it.each(['neutral', 'primary', 'success', 'warning', 'destructive'] as const)(
    'renders the %s semantic variant',
    (variant) => {
      render(<Badge variant={variant}>Connected</Badge>);

      expect(screen.getByText('Connected')).toHaveAttribute('data-variant', variant);
    },
  );
});
