# Multi-LLM Agentic Roleplay Demo

This repository contains several experiments for multi-agent conversations. The supported starting point is the **Python MVP**: a FastAPI backend that streams responses from OpenAI and Anthropic agents to a dependency-light browser client.

## Quick start: Python MVP

Prerequisites: Python 3.10+ and an OpenAI or Anthropic API key.

```bash
cp .env.example .env
python -m pip install -r requirements.txt
uvicorn server.app:app --reload --port 8000
```

Set `OPENAI_API_KEY` and/or `ANTHROPIC_API_KEY` in your environment (or an environment loader of your choice). Open `client/index.html` and set its server URL to `http://localhost:8000`.

The MVP supports chat, plan, review, and auto modes. In auto mode, generated files are confined to `workspace/`; snapshots are stored in `snapshots/`. See [README-mvp.md](README-mvp.md) for the API and event protocol.

## Repository map

| Path | Purpose |
| --- | --- |
| `server/` | Supported FastAPI/SSE backend |
| `client/` | Supported static browser client |
| `tests/` | Python regression tests |
| `agents/` | Experimental provider integrations |
| `examples/` | Legacy scenario examples |
| `*_orchestrator.js`, `server.js` | Legacy Node/Dify/Socket.IO prototypes |

## Legacy Node prototypes

The Node projects are retained as historical experiments and require Dify/Notion configuration. Install their dependencies with `npm install`, then use:

```bash
npm run start:dify
# or
npm run start:legacy-gui
```

Run `npm run check:js` to validate the primary legacy scripts' syntax. The old GUI details are in [GUI_README.md](GUI_README.md).

## Development

```bash
python -m pytest
npm run check:js
```

Never commit `.env` files, API keys, generated workspaces, or snapshots. Copy `.env.example` to get the complete configuration reference.

## License

MIT