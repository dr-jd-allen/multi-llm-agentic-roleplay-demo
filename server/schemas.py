from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict, Any

class AgentConfig(BaseModel):
    id: str
    name: str
    provider: Literal["openai", "anthropic", "google"]
    model: str
    system_prompt: Optional[str] = None
    temperature: Optional[float] = 0.2

class ChatPayload(BaseModel):
    message: str
    mode: Literal["chat", "plan", "review", "auto"] = "chat"
    agents: List[AgentConfig]

class SnapshotRequest(BaseModel):
    timestamp: Optional[str] = None  # latest if None

class WritePreview(BaseModel):
    file_path: str
    size: int
    applied: bool = False
    note: Optional[str] = None
