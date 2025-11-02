import base64, json, asyncio
from typing import Dict, Any
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

from .schemas import ChatPayload, SnapshotRequest
from .settings import ALLOWED_ORIGINS
from . import agents
from .file_ops import parse_file_blocks, snapshot as snapshot_ws, restore as restore_ws, list_snapshots

app = FastAPI(title="Multi-Modal AI Chat Room — MVP")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if not ALLOWED_ORIGINS else ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status":"ok"}

@app.get("/api/chat")
async def chat(q: str):
    try:
        payload_json = base64.b64decode(q.encode("utf-8")).decode("utf-8")
        data = json.loads(payload_json)
        payload = ChatPayload(**data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid payload: {e}")

    async def event_gen():
        # fan-out across agents
        async def run_agent(agent_cfg):
            text_buf = []
            try:
                async for delta in agents.stream_agent(agent_cfg["provider"], agent_cfg["model"], agent_cfg.get("temperature", 0.2), payload.mode, payload.message):
                    text_buf.append(delta)
                    yield {"event": "token", "data": json.dumps({"agent_id": agent_cfg["id"], "delta": delta})}
                full_text = "".join(text_buf)

                # Post-process for review/auto
                if payload.mode in ("review", "auto"):
                    writes = parse_file_blocks(full_text)
                    if writes:
                        if payload.mode == "review":
                            for (path, content) in writes:
                                yield {"event": "write", "data": json.dumps({"agent_id": agent_cfg["id"], "file_path": path, "size": len(content), "applied": False})}
                        else:
                            # auto apply
                            applied = agents.apply_writes(writes)
                            for item in applied:
                                yield {"event": "write", "data": json.dumps({"agent_id": agent_cfg["id"], **item})}
                yield {"event": "done", "data": json.dumps({"agent_id": agent_cfg["id"]})}
            except Exception as e:
                yield {"event": "error", "data": json.dumps({"agent_id": agent_cfg["id"], "error": str(e)})}

        # Drive them sequentially to simplify the SSE; easy to parallelize later.
        for agent_cfg in payload.agents:
            async for ev in run_agent(agent_cfg.dict() if hasattr(agent_cfg, "dict") else agent_cfg):
                yield ev

    return EventSourceResponse(event_gen())

@app.post("/api/snapshot")
async def snapshot():
    ts = snapshot_ws()
    return {"timestamp": ts, "snapshots": list_snapshots()}

@app.post("/api/restore")
async def restore(req: SnapshotRequest):
    ts = restore_ws(req.timestamp)
    return {"restored": ts, "snapshots": list_snapshots()}
