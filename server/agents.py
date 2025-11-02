from typing import AsyncGenerator, Dict, Any, List
from .adapters import get_adapter
from .file_ops import parse_file_blocks, write_file

SYSTEM_BASE = """You are a rigorous, transparent coding assistant.
When asked to propose code changes, emit *explicit file blocks* using this format exactly:

```file: relative/path.ext
<entire file content here>
```

If planning tasks, first output a short plan (bullets), then the file blocks.
Keep explanations concise. Avoid extra code fences or backticks besides the explicit file blocks.
"""

SYSTEM_PLAN = SYSTEM_BASE + "\n" + "Task: Create a plan and then propose concrete file writes as needed."

SYSTEM_CHAT = "You are a helpful, concise software assistant."

async def stream_agent(provider: str, model: str, temperature: float, mode: str, user_message: str) -> AsyncGenerator[str, None]:
    system = SYSTEM_CHAT if mode == "chat" else SYSTEM_PLAN
    adapter = get_adapter(provider, model, temperature)
    async for chunk in adapter.stream(system, user_message):
        yield chunk

def extract_writes_from_text(text: str):
    return parse_file_blocks(text)

def apply_writes(pairs: List[tuple]) -> List[dict]:
    applied = []
    for rel_path, content in pairs:
        abs_path = write_file(rel_path, content)
        applied.append({"file_path": rel_path, "abs_path": abs_path, "size": len(content), "applied": True})
    return applied
