import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TestI18nProvider } from '../../../tests/TestI18nProvider';
import { SidebarStatusCard } from './SidebarStatusCard';

describe('SidebarStatusCard', () => {
  it('presents indexing progress with text and meter semantics', () => {
    render(
      <TestI18nProvider>
        <SidebarStatusCard />
      </TestI18nProvider>,
    );

    expect(screen.getByText('Indexing status')).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: 'Indexing progress' })).toHaveAttribute(
      'aria-valuenow',
      '80',
    );
    expect(screen.getByText('42,180 nodes · 128k edges')).toBeInTheDocument();
  });
});
