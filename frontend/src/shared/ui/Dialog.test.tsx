import { createRef } from 'react';
import { render, screen, act } from '@testing-library/react';
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

  it('keeps focus on the panel when a blocking dialog has no enabled control', async () => {
    render(
      <>
        <button>Outside</button>
        <Dialog dismissible={false} onClose={vi.fn()} open title="Checking connection">
          <button disabled>Checking...</button>
        </Dialog>
      </>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Checking connection' });
    expect(dialog).toHaveClass(
      'rounded-ui-dialog',
      'border-border',
      'bg-popover',
    );
    expect(dialog).toHaveFocus();
    await userEvent.tab();
    expect(dialog).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(dialog).toHaveFocus();
  });

  it('applies composer layout classes when layout is composer', () => {
    render(
      <Dialog layout="composer" onClose={vi.fn()} open size="xl" title="Composer">
        <p>Body</p>
      </Dialog>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Composer' });
    expect(dialog).toHaveClass('p-0', 'max-w-xl');
    expect(dialog.parentElement).toHaveClass('bg-foreground/10');
  });

  it('portals the overlay to document.body above shell overflow', () => {
    render(
      <div className="overflow-hidden">
        <Dialog onClose={vi.fn()} open title="Portaled">
          <p>Body</p>
        </Dialog>
      </div>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Portaled' });
    expect(dialog.parentElement?.parentElement).toBe(document.body);
    expect(dialog.parentElement).toHaveClass('z-[100]');
  });

  it('applies xl max width when size is xl', () => {
    render(
      <Dialog onClose={vi.fn()} open size="xl" title="Wide">
        <p>Body</p>
      </Dialog>,
    );
    expect(screen.getByRole('dialog', { name: 'Wide' })).toHaveClass('max-w-xl');
  });

  it('stays mounted with exit animation class when closing and unmounts after timeout', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const { rerender } = render(
      <Dialog onClose={onClose} open title="Animated">
        <button type="button">Inside</button>
      </Dialog>,
    );
    expect(screen.getByRole('dialog', { name: 'Animated' })).toBeInTheDocument();

    // When open becomes false, dialog should stay mounted with exit animation
    rerender(
      <Dialog onClose={onClose} open={false} title="Animated">
        <button type="button">Inside</button>
      </Dialog>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Animated' });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveClass('animate-ui-panel-out');
    
    // Advance timers to trigger fallback timeout (300ms)
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    // Dialog should now be unmounted
    expect(screen.queryByRole('dialog', { name: 'Animated' })).not.toBeInTheDocument();
    
    vi.useRealTimers();
  });
});
