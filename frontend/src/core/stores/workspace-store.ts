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
  isSelectionInitialized: boolean;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  clearSyncStatus: () => void;
  setCurrentWorkspaceId: (workspaceId: string | null) => void;
  setSelectionInitialized: (initialized: boolean) => void;
  setSyncStatus: (status: WorkspaceState['syncStatus']) => void;
  reset: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  currentWorkspaceId: readWorkspaceId(),
  isSelectionInitialized: false,
  syncStatus: 'idle',
  clearSyncStatus: () => set({ syncStatus: 'idle' }),
  setCurrentWorkspaceId: (workspaceId) => {
    const normalizedId = normalizeWorkspaceId(workspaceId);
    persistWorkspaceId(normalizedId);
    set({ currentWorkspaceId: normalizedId });
  },
  setSelectionInitialized: (isSelectionInitialized) => set({ isSelectionInitialized }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  reset: () => {
    persistWorkspaceId(null);
    set({ currentWorkspaceId: null, isSelectionInitialized: false, syncStatus: 'idle' });
  },
}));
