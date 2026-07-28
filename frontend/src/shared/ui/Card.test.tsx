import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Card } from './Card';

describe('Card', () => {
  it('renders a semantic surface with selectable padding and variant', () => {
    render(
      <Card as="section" aria-label="Memory" padding="sm" variant="muted">
        Content
      </Card>,
    );

    expect(screen.getByRole('region', { name: 'Memory' })).toHaveClass(
      'border',
      'border-ui-divider',
      'rounded-ui-panel',
      'bg-ui-interactive',
      'p-4',
    );
  });

  it('provides an inverse surface without changing content semantics', () => {
    render(
      <Card as="article" aria-label="Welcome" variant="inverse">
        Welcome
      </Card>,
    );

    expect(screen.getByRole('article', { name: 'Welcome' })).toHaveClass(
      'bg-sidebar',
      'text-sidebar-foreground',
    );
  });
});
