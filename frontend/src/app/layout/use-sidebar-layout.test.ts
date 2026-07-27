import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  SIDEBAR_LAYOUT_STORAGE_KEY,
  type SidebarLayout,
  useSidebarLayout,
} from './use-sidebar-layout';

describe('useSidebarLayout', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to expanded and persists each toggle', () => {
    const { result } = renderHook(() => useSidebarLayout());

    expect(result.current.layout).toBe('expanded');

    act(() => result.current.toggle());
    expect(result.current.layout).toBe('collapsed');
    expect(localStorage.getItem(SIDEBAR_LAYOUT_STORAGE_KEY)).toBe('collapsed');

    act(() => result.current.toggle());
    expect(result.current.layout).toBe('expanded');
    expect(localStorage.getItem(SIDEBAR_LAYOUT_STORAGE_KEY)).toBe('expanded');
  });

  it.each<SidebarLayout>(['expanded', 'collapsed'])(
    'restores a valid %s layout',
    (storedLayout) => {
      localStorage.setItem(SIDEBAR_LAYOUT_STORAGE_KEY, storedLayout);

      const { result } = renderHook(() => useSidebarLayout());

      expect(result.current.layout).toBe(storedLayout);
    },
  );

  it('defaults to expanded when the stored layout is invalid', () => {
    localStorage.setItem(SIDEBAR_LAYOUT_STORAGE_KEY, 'compact');

    const { result } = renderHook(() => useSidebarLayout());

    expect(result.current.layout).toBe('expanded');
  });

  it('defaults to expanded when reading storage fails', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage unavailable', 'SecurityError');
    });

    const { result } = renderHook(() => useSidebarLayout());

    expect(result.current.layout).toBe('expanded');
  });

  it('keeps toggling in memory when writing storage fails', () => {
    const setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('Storage unavailable', 'SecurityError');
      });
    const { result } = renderHook(() => useSidebarLayout());

    act(() => result.current.toggle());

    expect(setItemSpy).toHaveBeenCalledWith(
      SIDEBAR_LAYOUT_STORAGE_KEY,
      'collapsed',
    );
    expect(result.current.layout).toBe('collapsed');

    act(() => result.current.toggle());
    expect(result.current.layout).toBe('expanded');
  });
});
