from langchain.agents import create_agent
from app.agents.qa.tools import query_knowledge_base
from app.agents.shared.models import get_gemini_llm

def get_qa_agent_graph(
    checkpointer=None,
    model_name: str | None = None,
    temperature: float = 0.2,
    system_prompt: str | None = None,
):
    """
    Biên dịch đồ thị LangGraph ReAct Agent sử dụng create_agent và tool query_knowledge_base.
    """
    llm = get_gemini_llm(model_name=model_name, temperature=temperature)

    agent_graph = create_agent(
        model=llm,
        tools=[query_knowledge_base],
        system_prompt=system_prompt,
        checkpointer=checkpointer,
    )
    return agent_graph


# Đồ thị mặc định không checkpointer
qa_agent_graph = get_qa_agent_graph()
