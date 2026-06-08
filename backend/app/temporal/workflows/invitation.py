from datetime import timedelta
from temporalio import workflow

with workflow.unsafe.imports_passed_through():
    from app.temporal.activities.invitation import send_invitation_email


@workflow.defn
class WorkspaceInvitationWorkflow:
    @workflow.run
    async def run(self, invitation_id: str) -> bool:
        # Thực hiện gọi activity để gửi email bất đồng bộ
        return await workflow.execute_activity(
            send_invitation_email,
            invitation_id,
            start_to_close_timeout=timedelta(minutes=2)
        )
