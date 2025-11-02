# Multi‑Modal AI Chat Room — MVP Pack

This pack gives you a minimal, working skeleton to compare different *automation levels* for coding-focused AI apps:

**Automation modes**
- `chat`: normal chat (no planning, no file writes)
- `plan`: model returns a task plan + suggested changes (streamed)
- `review`: model proposes concrete file writes using annotated code blocks; the server **does not** write files — you get a preview
- `auto`: same as `review`, but the server **applies** file writes to `./workspace/` after the model finishes

**Key Features**
- FastAPI backend with SSE streaming (`/api/chat`) — packaged for Replit or local
- Multi‑agent fan‑out: select multiple agents; each streams back in its own channel
- Model router with OpenAI (default) and Anthropic adapters (optional)
- Simple, explicit file‑write protocol using code blocks:  
  Place code in blocks like  
  ```
  ```file: path/to/file.py
  <entire file content here>
  ```
  ```
- Snapshot/restore of the `./workspace/` folder
- Minimal, dependency‑light front‑end (vanilla HTML/JS)

> **Security note:** The `auto` mode can write files inside `./workspace/` only; it *never* executes code. You should still review results before using them.

---

## Quickstart (Replit or local)

1) **Set API keys** in your environment:
```
export OPENAI_API_KEY=sk-...
# optionally:
export ANTHROPIC_API_KEY=...   # only if you'll use Anthropic
```

2) **Install deps**:
```
pip install -r requirements.txt
```

3) **Run**:
```
uvicorn server.app:app --host 0.0.0.0 --port 8000 --reload
```

4) Open the client:
- If serving statics via the same host: open `client/index.html` directly in your browser and set the **Server URL** to your backend (e.g., `http://localhost:8000`).
- On Replit, the backend public URL is shown in the console; paste it into the client "Server URL" field.

---

## How it works

### Endpoint
- **GET `/api/chat`** (SSE): The client sends a Base64‑encoded JSON query (`q`) with shape:
```json
{
  "message": "Write a FastAPI route for SSE",
  "mode": "chat" | "plan" | "review" | "auto",
  "agents": [
    {"id": "oai", "name": "GPT‑4o mini", "provider": "openai", "model": "gpt-4o-mini"},
    {"id": "claude", "name": "Claude Sonnet 3.7", "provider": "anthropic", "model": "claude-3-7-sonnet"}
  ]
}
```

### Streaming events
Each agent streams back with `event: token` and JSON payloads like:
```json
{"agent_id":"oai","delta":"text chunk"}
```
Other events:
- `event: write` — file write preview or confirmation
- `event: done` — agent completed
- `event: error` — error message

### File‑write protocol
The model is instructed (in `agents.py`) to propose file writes as code blocks:
````
```file: path/to/file.py
# full file content here
```
````
In **review** mode, the server parses and emits `write` events (preview).  
In **auto** mode, the server writes the files into `./workspace/` and emits confirmations.

### Snapshots
- **POST `/api/snapshot`** — create a timestamped zip of `./workspace/` in `./snapshots/`
- **POST `/api/restore`** with `{"timestamp":"..."}` — restore a snapshot into `./workspace/`

---

## Notes

- Default model is `gpt-4o-mini` via OpenAI's **Chat Completions** streaming for broad compatibility.  
  You can switch to the **Responses API** if preferred.
- Anthropic support is optional — set `ANTHROPIC_API_KEY` and use a valid `model` (e.g., `claude-3-7-sonnet`).

---

## License
MIT — use freely, modify shamelessly.
