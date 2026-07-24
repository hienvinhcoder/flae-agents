import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button } from './Button';

describe('Button', () => {
  it('disables interaction and announces its loading label', async () => {
    const onClick = vi.fn();
    render(<Button isLoading loadingText="Saving workspace" onClick={onClick}>Save</Button>);

    const button = screen.getByRole('button', { name: 'Saving workspace' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
