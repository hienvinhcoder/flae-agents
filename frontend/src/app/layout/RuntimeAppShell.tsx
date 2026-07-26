import { useLogout } from '../../core/auth/useLogout';
import { AppShell } from './AppShell';

const fetchRuntimeWorkspaces = async () => (await import('../../features/settings/api/workspace-runtime-api')).fetchWorkspaces();
const syncRuntimeSelection = async (workspaceId: string) => (await import('../../features/settings/api/workspace-runtime-api')).syncWorkspaceSelection(workspaceId);

export function RuntimeAppShell() {
  const logoutController = useLogout();
  return <AppShell fetchWorkspaces={fetchRuntimeWorkspaces} logoutController={logoutController} syncSelection={syncRuntimeSelection} />;
}
