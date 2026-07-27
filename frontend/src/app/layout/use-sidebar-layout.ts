import { useCallback, useState } from 'react';

export type SidebarLayout = 'expanded' | 'collapsed';

export const SIDEBAR_LAYOUT_STORAGE_KEY = 'flae_admin_sidebar_layout';

const DEFAULT_SIDEBAR_LAYOUT: SidebarLayout = 'expanded';

function readSidebarLayout(): SidebarLayout {
  try {
    const storedLayout = localStorage.getItem(SIDEBAR_LAYOUT_STORAGE_KEY);
    return storedLayout === 'expanded' || storedLayout === 'collapsed'
      ? storedLayout
      : DEFAULT_SIDEBAR_LAYOUT;
  } catch {
    return DEFAULT_SIDEBAR_LAYOUT;
  }
}

function persistSidebarLayout(layout: SidebarLayout): void {
  try {
    localStorage.setItem(SIDEBAR_LAYOUT_STORAGE_KEY, layout);
  } catch {
    // Storage can be unavailable while the in-memory preference remains usable.
  }
}

export function useSidebarLayout() {
  const [layout, setLayout] = useState<SidebarLayout>(readSidebarLayout);
  const toggle = useCallback(() => {
    setLayout((currentLayout) => {
      const nextLayout =
        currentLayout === 'expanded' ? 'collapsed' : 'expanded';
      persistSidebarLayout(nextLayout);
      return nextLayout;
    });
  }, []);

  return { layout, toggle } as const;
}
