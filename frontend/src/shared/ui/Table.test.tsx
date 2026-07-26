import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Table } from './Table';

describe('Table', () => {
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
});
