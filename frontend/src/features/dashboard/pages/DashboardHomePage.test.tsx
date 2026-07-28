import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { TestI18nProvider } from '../../../../tests/TestI18nProvider';
import { DashboardHomePage } from './DashboardHomePage';

function renderPage() {
  return render(
    <TestI18nProvider>
      <MemoryRouter>
        <DashboardHomePage />
      </MemoryRouter>
    </TestI18nProvider>,
  );
}

describe('DashboardHomePage', () => {
  it('renders every approved section in document order', () => {
    renderPage();

    const headings = screen.getAllByRole('heading').map((heading) => heading.textContent);
    const approvedOrder = [
      'Welcome back, Amelia',
      'Knowledge graph',
      'Recent memory updates',
      'Give your AI agents context',
      'Connected agents',
      'Risks & gaps',
      'Connected sources',
    ];
    const positions = approvedOrder.map((heading) => headings.indexOf(heading));

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((left, right) => left - right));
    expect(screen.getByText('12.4k')).toBeInTheDocument();
    expect(screen.getByText('Google Drive')).toBeInTheDocument();
  });

  it('keeps real destinations navigable and demo controls inert', () => {
    renderPage();

    expect(screen.getByRole('link', { name: 'View all' })).toHaveAttribute(
      'href',
      '/dashboard/knowledge',
    );
    expect(screen.getByRole('link', { name: 'View agents' })).toHaveAttribute(
      'href',
      '/dashboard/agents',
    );
    const mcp = screen.getByRole('region', { name: 'Give your AI agents context' });
    expect(within(mcp).getByRole('button', { name: 'Copy connection' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Manage connectors' })).toBeDisabled();
  });
});
