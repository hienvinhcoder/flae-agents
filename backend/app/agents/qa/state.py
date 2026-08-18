from typing import Annotated, NotRequired, Sequence
from typing_extensions import TypedDict
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


class QAContextChunk(TypedDict):
    source_document: NotRequired[str]
    content: NotRequired[str]
    score: NotRequired[float | int | str | None]


class QACitation(TypedDict):
    source_document: str
    content: str
    score: float | None


class QAAgentState(TypedDict):
    """
    State định nghĩa cho Q&A Agent.
    """
    messages: Annotated[Sequence[BaseMessage], add_messages]
    context: list[QAContextChunk]
    citations: list[QACitation]

    # Cấu hình Agent và Context Workspace
    agent_id: str
    workspace_id: str
    system_prompt: str
    model_name: str
    temperature: float
