import { useParams } from 'react-router-dom';
import { PlaceholderPage } from '../../../shared/ui/PlaceholderPage';
export function AgentConfigPage() { const { agentId } = useParams(); return <PlaceholderPage description="Configure instructions, tools, and access for this agent." title={agentId ? 'Edit agent' : 'Create agent'} />; }
