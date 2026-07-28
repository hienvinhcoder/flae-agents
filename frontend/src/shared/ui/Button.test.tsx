import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button } from './Button';

describe('Button', () => {
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
      'border-ui-divider',
      'bg-ui-raised',
    );
  });
});
