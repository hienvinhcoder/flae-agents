import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Toast, ToastViewport } from './Toast';

afterEach(() => vi.useRealTimers());

describe('Toast', () => {
  it('announces notices and dismisses them after the requested duration', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(
      <ToastViewport>
        <Toast duration={2000} message="Workspace updated" onDismiss={onDismiss} tone="success" />
      </ToastViewport>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Workspace updated');
    void act(() => vi.advanceTimersByTime(2000));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
