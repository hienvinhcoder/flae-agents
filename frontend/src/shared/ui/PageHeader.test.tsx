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
    expect(screen.getByText('Build focused assistants.')).toBeInTheDocument();
    expect(screen.getByText('12 active')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create agent' })).toBeInTheDocument();
  });

  it('renders without optional content', () => {
    render(<PageHeader title="Settings" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('preserves numeric metadata content', () => {
    render(<PageHeader metadata={0} title="AI agents" />);

    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it.each([
    { actions: false, label: 'false' },
    { actions: [], label: 'an empty array' },
  ])('omits the action wrapper when actions is $label', ({ actions }) => {
    render(<PageHeader actions={actions} metadata={0} title="AI agents" />);

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByRole('banner').children).toHaveLength(1);
  });
});
