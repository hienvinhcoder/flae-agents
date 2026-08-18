import { render, screen } from '@testing-library/react';
import { Inbox } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('explains an empty collection and offers its next action', () => {
    const { container } = render(
      <EmptyState
        action={<button type="button">Upload document</button>}
        description="Upload a source to build company memory."
        icon={Inbox}
        title="No documents yet"
      />,
    );

    expect(screen.getByRole('heading', { level: 2, name: 'No documents yet' })).toBeInTheDocument();
    expect(screen.getByText('Upload a source to build company memory.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload document' })).toBeInTheDocument();
    expect(container.querySelector('[aria-hidden="true"] svg')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders without an icon or action', () => {
    const { container } = render(
      <EmptyState description="Connect a source when you are ready." title="Nothing connected" />,
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Nothing connected' })).toBeInTheDocument();
    expect(screen.getByText('Connect a source when you are ready.')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });
});
