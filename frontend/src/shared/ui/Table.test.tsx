import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Table } from './Table';

describe('Table', () => {
  it('renders caller-provided mobile rows without duplicating desktop semantics', () => {
    render(
      <Table
        caption="Members"
        columns={[{ header: 'Name', key: 'name', render: (row: { name: string }) => row.name }]}
        emptyMessage="No members"
        renderMobileRow={(row) => <article>{row.name}</article>}
        rows={[{ name: 'Ada' }]}
      />,
    );

    expect(screen.getByRole('table', { name: 'Members' })).toBeInTheDocument();
    expect(screen.getByRole('article')).toHaveTextContent('Ada');
  });

  it('preserves headers and renders a meaningful empty state', () => {
    render(
      <Table
        caption="Workspace list"
        columns={[{ key: 'name', header: 'Workspace', render: (row: { name: string }) => row.name }]}
        emptyMessage="No workspaces available"
        rows={[]}
      />,
    );

    expect(screen.getByRole('columnheader', { name: 'Workspace' })).toBeInTheDocument();
    expect(screen.getByText('No workspaces available')).toBeInTheDocument();
  });

  it('disables row transitions for reduced motion', () => {
    render(
      <Table
        caption="Members"
        columns={[{ header: 'Name', key: 'name', render: (row: { name: string }) => row.name }]}
        emptyMessage="No members"
        rows={[{ name: 'Ada' }]}
      />,
    );

    expect(screen.getByRole('row', { name: 'Ada' })).toHaveClass('motion-reduce:transition-none');
  });
});
