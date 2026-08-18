from langchain.agents import create_agent
from app.agents.qa.tools import search_knowledge, list_domains, get_domain_topics, get_topic_detail
from app.agents.shared.models import get_gemini_llm


def get_qa_agent_graph(
    checkpointer=None,
    model_name: str | None = None,
    temperature: float = 0.2,
    system_prompt: str | None = None,
):
    """
    Biên dịch đồ thị LangGraph ReAct Agent sử dụng create_agent và 4 tools điều hướng.
    """
    llm = get_gemini_llm(model_name=model_name, temperature=temperature)

    agent_graph = create_agent(
        model=llm,
        tools=[search_knowledge, list_domains, get_domain_topics, get_topic_detail],
        system_prompt=system_prompt,
        checkpointer=checkpointer,
    )
    return agent_graph


# Đồ thị mặc định không checkpointer
qa_agent_graph = get_qa_agent_graph()
