from datetime import timedelta
from temporalio import workflow

with workflow.unsafe.imports_passed_through():
    from app.temporal.activities.topic import update_topic_summary_activity


@workflow.defn
class TopicUpdateWorkflow:
    """
    Workflow cập nhật tóm tắt và trạng thái hiện tại của Topic.
    Workflow ID format: "topic-update-{workspace_id}-{topic_id}"
    """

    @workflow.run
    async def run(self, params: dict) -> dict:
        workspace_id = params["workspace_id"]
        topic_id = params["topic_id"]

        # Debounce: ngủ 20 giây trước khi chạy tóm tắt (LLM call)
        # Giúp gộp các chunks mới được ingest liên tiếp trong cùng một thời gian ngắn.
        await workflow.sleep(timedelta(seconds=20))

        # Thực thi activity cập nhật tóm tắt
        res = await workflow.execute_activity(
            update_topic_summary_activity,
            {
                "workspace_id": workspace_id,
                "topic_id": topic_id
            },
            start_to_close_timeout=timedelta(minutes=5)
        )
        return res
