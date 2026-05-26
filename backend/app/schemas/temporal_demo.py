from pydantic import BaseModel


class GreetingRequest(BaseModel):
    name: str


class GreetingResponse(BaseModel):
    workflow_id: str
    result: str
