import { render, screen } from '@testing-library/react';
import { Inbox } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('explains an empty collection and offers its next action', () => {
    render(
      <EmptyState
        action={<button type="button">Upload document</button>}
        description="Upload a source to build company memory."
        icon={Inbox}
        title="No documents yet"
      />,
    );

    expect(screen.getByRole('heading', { level: 2, name: 'No documents yet' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload document' })).toBeInTheDocument();
  });
});
