import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button } from './Button';

describe('Button', () => {
  it('uses the semantic high-contrast palette for primary actions', () => {
    render(<Button>Upload document</Button>);

    const button = screen.getByRole('button', { name: 'Upload document' });
    expect(button).toHaveClass(
      'flae-button-primary',
      'bg-primary-control',
      'text-primary-control-foreground',
      'hover:bg-primary-control-hover',
      'active:bg-primary-control-active',
    );
    expect(button).toHaveAttribute('data-variant', 'primary');
    expect(button).not.toHaveClass('button-primary');
  });

  it('keeps the semantic primary contract when callers add surface utilities', () => {
    render(<Button className="bg-secondary text-secondary-foreground">Upload document</Button>);

    expect(screen.getByRole('button', { name: 'Upload document' })).toHaveAttribute(
      'data-variant',
      'primary',
    );
  });

  it('provides a 44px target and disables transitions for reduced motion', () => {
    render(<Button>Save</Button>);

    expect(screen.getByRole('button', { name: 'Save' })).toHaveClass('min-h-10', 'motion-reduce:transition-none');
  });

  it('disables interaction and announces its loading label', async () => {
    const onClick = vi.fn();
    render(<Button isLoading loadingText="Saving workspace" onClick={onClick}>Save</Button>);

    const button = screen.getByRole('button', { name: 'Saving workspace' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('supports outline and icon-only contracts without shrinking the target', () => {
    render(
      <Button aria-label="Add source" size="icon" variant="outline">
        +
      </Button>,
    );

    expect(screen.getByRole('button', { name: 'Add source' })).toHaveClass(
      'min-h-10',
      'min-w-10',
      'border-border',
      'bg-card',
    );
  });
});
