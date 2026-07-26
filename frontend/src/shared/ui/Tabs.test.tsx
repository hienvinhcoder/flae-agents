import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Tabs } from './Tabs';

describe('Tabs', () => {
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
