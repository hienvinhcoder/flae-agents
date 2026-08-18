from typing import TypedDict

from temporalio import activity

from app.services.knowledge.discovery.topic_summary import TopicSummaryService


class TopicSummaryParams(TypedDict):
    workspace_id: str
    topic_id: str


@activity.defn
async def update_topic_summary_activity(
    params: TopicSummaryParams,
) -> dict[str, object]:
    return await TopicSummaryService().update(
        workspace_id=params["workspace_id"],
        topic_id=params["topic_id"],
    )
