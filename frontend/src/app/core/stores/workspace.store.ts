import { signal, computed, inject } from '@angular/core';
import { Workspace } from '../models/workspace.model';

export const workspaceStore = () => {
  const currentWorkspaceId = signal<string | null>(null);
  const workspaces = signal<Workspace[]>([]);
  
  const currentWorkspace = computed(() => {
    const id = currentWorkspaceId();
    if (!id) return null;
    return workspaces().find(w => w.id === id) || null;
  });

  return {
    currentWorkspaceId: currentWorkspaceId.asReadonly(),
    workspaces: workspaces.asReadonly(),
    currentWorkspace,
    
    setWorkspaces: (data: Workspace[]) => {
      workspaces.set(data);
    },
    
    addWorkspace: (workspace: Workspace) => {
      workspaces.update(list => [...list, workspace]);
    },
    
    setCurrentWorkspaceId: (id: string | null) => {
      currentWorkspaceId.set(id);
      if (id) {
        localStorage.setItem('current_workspace_id', id);
      } else {
        localStorage.removeItem('current_workspace_id');
      }
    },
    
    loadCurrentWorkspaceIdFromStorage: () => {
      const id = localStorage.getItem('current_workspace_id');
      if (id) {
        currentWorkspaceId.set(id);
      }
    }
  };
};

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class WorkspaceStore {
  private store = workspaceStore();
  
  readonly currentWorkspaceId = this.store.currentWorkspaceId;
  readonly workspaces = this.store.workspaces;
  readonly currentWorkspace = this.store.currentWorkspace;
  
  setWorkspaces(data: Workspace[]) {
    this.store.setWorkspaces(data);
  }
  
  addWorkspace(workspace: Workspace) {
    this.store.addWorkspace(workspace);
  }
  
  setCurrentWorkspaceId(id: string | null) {
    this.store.setCurrentWorkspaceId(id);
  }
  
  loadCurrentWorkspaceIdFromStorage() {
    this.store.loadCurrentWorkspaceIdFromStorage();
  }
}
