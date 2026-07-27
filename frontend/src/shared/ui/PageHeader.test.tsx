import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('presents the page identity, context, metadata, and actions', () => {
    render(
      <PageHeader
        actions={<button type="button">Create agent</button>}
        description="Build focused assistants."
        eyebrow="Specialized assistance"
        metadata="12 active"
        title="AI agents"
      />,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'AI agents' })).toBeInTheDocument();
    expect(screen.getByText('Specialized assistance')).toBeInTheDocument();
    expect(screen.getByText('12 active')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create agent' })).toBeInTheDocument();
  });
});
