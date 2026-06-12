from typing import List, Dict
from typing_extensions import TypedDict
from langchain_google_genai import ChatGoogleGenerativeAI

class ExtractionState(TypedDict):
    """
    Định nghĩa Graph State cho Entity Extraction Agent.
    """
    # Inputs
    chunk_id: str
    chunk_text: str
    entity_types: List[str]
    language: str
    glean_max: int
    
    # Model instance
    model: ChatGoogleGenerativeAI
    
    # Prompts prepared
    system_prompt: str
    user_prompt: str
    glean_user_prompt: str
    
    # Message history
    messages: list
    
    # Outputs
    first_pass_result: str
    second_pass_result: str
    entities: List[dict]
    relations: List[dict]
    tokens_used: int
