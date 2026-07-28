import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageToolbar } from './PageToolbar';

describe('PageToolbar', () => {
  it('groups page controls in a named toolbar', () => {
    render(
      <PageToolbar ariaLabel="Knowledge filters">
        <input aria-label="Search documents" />
      </PageToolbar>,
    );

    const toolbar = screen.getByRole('toolbar', { name: 'Knowledge filters' });
    expect(toolbar).toHaveClass('border-ui-divider', 'bg-ui-interactive/60');
    expect(within(toolbar).getByRole('textbox', { name: 'Search documents' })).toBeInTheDocument();
  });
});
