import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Dialog } from './Dialog';

describe('Dialog', () => {
  it('traps focus, closes on Escape, and restores the trigger', async () => {
    const onClose = vi.fn();
    const triggerRef = createRef<HTMLButtonElement>();
    const { rerender } = render(
      <>
        <button ref={triggerRef}>Open dialog</button>
        <Dialog onClose={onClose} open={false} title="Connection settings">
          <button>First action</button>
          <button>Last action</button>
        </Dialog>
      </>,
    );
    triggerRef.current?.focus();
    rerender(
      <>
        <button ref={triggerRef}>Open dialog</button>
        <Dialog onClose={onClose} open title="Connection settings">
          <button>First action</button>
          <button>Last action</button>
        </Dialog>
      </>,
    );

    expect(screen.getByRole('button', { name: 'First action' })).toHaveFocus();
    screen.getByRole('button', { name: 'Last action' }).focus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Last action' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();

    rerender(
      <>
        <button ref={triggerRef}>Open dialog</button>
        <Dialog onClose={onClose} open={false} title="Connection settings" />
      </>,
    );
    expect(triggerRef.current).toHaveFocus();
  });
});
