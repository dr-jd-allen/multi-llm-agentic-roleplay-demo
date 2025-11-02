# Lex-Claude Multi-AI Orchestrator

A Node.js orchestration system for facilitating real-time conversations between Claude Opus 4.0 and Lex (GPT-4o) using Dify.ai as the workflow platform.

## Features

- 🤖 **Multi-AI Orchestration**: Manages conversations between Claude and Lex
- 🔄 **Turn-based Communication**: Implements proper turn-taking between AI agents
- 📊 **Conversation Logging**: Automatically logs conversations to Notion
- 🎯 **Topic-focused Discussions**: Structured conversations around specific topics
- ⚡ **Event-driven Architecture**: Real-time event handling for conversation flow

## Prerequisites

- Node.js (v14 or higher)
- Dify.ai account with API access
- Notion account with integration token
- A Dify workflow configured with Claude and Lex nodes

## Installation

1. Clone this repository:
```bash
cd /Users/jdallen_pro/Projects/agents/lex-claude-demo
```

2. Install dependencies:
```bash
npm install
```

3. Copy the example environment file:
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:
```
DIFY_API_KEY=your-dify-api-key
DIFY_WORKFLOW_ID=your-workflow-id
DIFY_API_URL=https://api.dify.ai/v1
NOTION_TOKEN=your-notion-token
NOTION_PAGE_ID=your-notion-database-id
CLAUDE_NODE_ID=claude-agent
LEX_NODE_ID=lex-agent
```

## Dify Workflow Setup

Your Dify workflow should have:

1. **Input Node**: Accepts `message`, `agent`, and `conversation_history`
2. **Claude Node**: Processes messages when `agent === 'Claude'`
3. **Lex/GPT-4o Node**: Processes messages when `agent === 'Lex'`
4. **Output Node**: Returns the agent's response

## Usage

### Basic Orchestration

```javascript
const DifyOrchestrator = require('./dify_orchestrator');

const orchestrator = new DifyOrchestrator({
  DIFY_API_KEY: 'your-api-key',
  DIFY_WORKFLOW_ID: 'your-workflow-id'
});

// Start a conversation
const result = await orchestrator.orchestrateConversation(
  "AI Ethics",
  "What are the key ethical considerations for AI development?",
  10 // max turns
);
```

### With Notion Logging

```javascript
const { runWithLogging } = require('./conversation_logger');

// This will automatically log conversations to Notion
await runWithLogging();
```

### Run Examples

```bash
# Run basic orchestrator
node dify_orchestrator.js

# Run with Notion logging
node conversation_logger.js

# Sync existing Notion data
node notion_sync.js
```

## Event Handling

The orchestrator emits several events:

- `conversation-started`: When a new conversation begins
- `turn-completed`: After each agent completes their turn
- `agent-error`: When an agent fails to respond
- `conversation-ended`: When the conversation concludes

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Orchestrator  │────▶│   Dify Workflow │────▶│  AI Agents      │
│                 │◀────│                 │◀────│  (Claude & Lex) │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│   Notion DB     │
│  (Conversation  │
│     Logs)       │
└─────────────────┘
```

## Conversation Flow

1. **Initialization**: Set topic and initial prompt
2. **First Turn**: Claude receives initial prompt
3. **Response**: Claude's response sent to Lex
4. **Alternation**: Agents alternate turns
5. **Termination**: Natural end or max turns reached
6. **Logging**: Full conversation saved to Notion

## Customization

### Add New Conversation Topics

Edit the `examples` array in `dify_orchestrator.js`:

```javascript
const examples = [
  {
    topic: "Your Topic",
    prompt: "Your initial prompt for the discussion"
  }
];
```

### Modify Turn-Taking Logic

Adjust the `orchestrateConversation` method to implement custom turn-taking rules.

### Custom End Conditions

Modify the `shouldEndConversation` method to add custom conversation termination logic.

## Troubleshooting

- **API Connection Issues**: Verify your Dify API key and endpoint
- **Workflow Errors**: Ensure your Dify workflow nodes match the configured IDs
- **Notion Sync Failures**: Check integration permissions for your Notion database
- **Missing Responses**: Verify agent nodes in Dify are properly configured

## License

MIT