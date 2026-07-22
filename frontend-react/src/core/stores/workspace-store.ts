import { create } from 'zustand';

const WORKSPACE_STORAGE_KEY = 'current_workspace_id';

function readWorkspaceId() {
  try {
    const value = localStorage.getItem(WORKSPACE_STORAGE_KEY);
    return value && value !== 'none' && value !== 'null' ? value : null;
  } catch {
    return null;
  }
}

function persistWorkspaceId(value: string | null) {
  try {
    if (value) {
      localStorage.setItem(WORKSPACE_STORAGE_KEY, value);
    } else {
      localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    }
  } catch {
    // In-memory selection remains usable when browser storage is unavailable.
  }
}

function normalizeWorkspaceId(value: string | null) {
  return value === '' || value === 'none' || value === 'null' ? null : value;
}

interface WorkspaceState {
  currentWorkspaceId: string | null;
  setCurrentWorkspaceId: (workspaceId: string | null) => void;
  reset: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  currentWorkspaceId: readWorkspaceId(),
  setCurrentWorkspaceId: (workspaceId) => {
    const normalizedId = normalizeWorkspaceId(workspaceId);
    persistWorkspaceId(normalizedId);
    set({ currentWorkspaceId: normalizedId });
  },
  reset: () => {
    persistWorkspaceId(null);
    set({ currentWorkspaceId: null });
  },
}));
