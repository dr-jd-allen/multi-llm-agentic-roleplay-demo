import os

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

DEFAULT_PROVIDER = os.getenv("DEFAULT_PROVIDER", "openai")
DEFAULT_OPENAI_MODEL = os.getenv("DEFAULT_OPENAI_MODEL", "gpt-4o-mini")
DEFAULT_ANTHROPIC_MODEL = os.getenv("DEFAULT_ANTHROPIC_MODEL", "claude-3-7-sonnet")

ALLOWED_ORIGINS = [o for o in os.getenv("ALLOWED_ORIGINS", "*").split(",") if o]
WORKSPACE_DIR = os.getenv("WORKSPACE_DIR", os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "workspace")))
SNAPSHOT_DIR = os.getenv("SNAPSHOT_DIR", os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "snapshots")))
os.makedirs(WORKSPACE_DIR, exist_ok=True)
os.makedirs(SNAPSHOT_DIR, exist_ok=True)
