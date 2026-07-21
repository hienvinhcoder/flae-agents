from typing import Annotated, Sequence, Dict, Any
from typing_extensions import TypedDict
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


class QAAgentState(TypedDict):
    """
    State định nghĩa cho Q&A Agent.
    """
    messages: Annotated[Sequence[BaseMessage], add_messages]
    context: list[Dict[str, Any]]
    citations: list[Dict[str, Any]]
    
    # Cấu hình Agent và Context Workspace
    agent_id: str
    workspace_id: str
    system_prompt: str
    model_name: str
    temperature: float
