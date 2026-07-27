import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Tabs } from './Tabs';

describe('Tabs', () => {
  it('keeps click selection behavior and provides accessible motion-safe targets', async () => {
    const onValueChange = vi.fn();
    render(<Tabs ariaLabel="Workspace sections" items={[
      { id: 'general', label: 'General', content: 'General panel' },
      { id: 'members', label: 'Members', content: 'Members panel' },
    ]} onValueChange={onValueChange} />);

    const members = screen.getByRole('tab', { name: 'Members' });
    expect(members).toHaveClass('min-h-11', 'motion-reduce:transition-none');
    await userEvent.click(members);
    expect(members).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Members panel');
    expect(onValueChange).toHaveBeenCalledOnce();
    expect(onValueChange).toHaveBeenCalledWith('members');
  });

  it('uses arrow, Home, and End keys to move focus and selection', async () => {
    render(<Tabs ariaLabel="Workspace sections" items={[
      { id: 'general', label: 'General', content: 'General panel' },
      { id: 'members', label: 'Members', content: 'Members panel' },
      { id: 'billing', label: 'Billing', content: 'Billing panel', disabled: true },
    ]} />);

    const general = screen.getByRole('tab', { name: 'General' });
    general.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Members' })).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Members panel');
    await userEvent.keyboard('{Home}');
    expect(general).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Members' })).toHaveFocus();
  });
});
