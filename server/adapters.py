from typing import AsyncGenerator, Dict, Any, Optional
import asyncio
import json

import httpx

from .settings import OPENAI_API_KEY, ANTHROPIC_API_KEY

# We keep adapters minimal & robust for streaming text.
# For OpenAI we default to Chat Completions as it's widely compatible.
# You can switch to the Responses API if desired.

class OpenAIAdapter:
    def __init__(self, model: str = "gpt-4o-mini", temperature: float = 0.2):
        self.model = model
        self.temperature = temperature
        self._base = "https://api.openai.com/v1"
        if not OPENAI_API_KEY:
            raise RuntimeError("OPENAI_API_KEY not set")

    async def stream(self, system_prompt: str, user_message: str) -> AsyncGenerator[str, None]:
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model,
            "temperature": self.temperature,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            "stream": True
        }
        url = f"{self._base}/chat/completions"
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream("POST", url, headers=headers, json=payload) as r:
                async for line in r.aiter_lines():
                    if not line or not line.startswith("data:"):
                        continue
                    data = line.removeprefix("data:").strip()
                    if data == "[DONE]":
                        break
                    try:
                        obj = json.loads(data)
                        delta = obj["choices"][0]["delta"].get("content")
                        if delta:
                            yield delta
                    except Exception:
                        # Be permissive in MVP
                        continue


class AnthropicAdapter:
    def __init__(self, model: str = "claude-3-7-sonnet", temperature: float = 0.2):
        self.model = model
        self.temperature = temperature
        self._base = "https://api.anthropic.com/v1/messages"
        if not ANTHROPIC_API_KEY:
            raise RuntimeError("ANTHROPIC_API_KEY not set")

    async def stream(self, system_prompt: str, user_message: str) -> AsyncGenerator[str, None]:
        headers = {
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        payload = {
            "model": self.model,
            "max_tokens": 1024,
            "temperature": self.temperature,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_message}],
            "stream": True
        }
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream("POST", self._base, headers=headers, json=payload) as r:
                async for line in r.aiter_lines():
                    if not line or not line.startswith("data:"):
                        continue
                    data = line.removeprefix("data:").strip()
                    if data == "[DONE]":
                        break
                    try:
                        obj = json.loads(data)
                        if obj.get("type") == "content_block_delta" and obj.get("delta", {}).get("type") == "text_delta":
                            delta = obj["delta"].get("text")
                            if delta:
                                yield delta
                    except Exception:
                        continue


def get_adapter(provider: str, model: str, temperature: float = 0.2):
    if provider == "openai":
        return OpenAIAdapter(model=model, temperature=temperature)
    elif provider == "anthropic":
        return AnthropicAdapter(model=model, temperature=temperature)
    raise ValueError(f"Unsupported provider: {provider}")
