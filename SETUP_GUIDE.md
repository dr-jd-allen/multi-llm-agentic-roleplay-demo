# Multi-LLM Discussion System Setup Guide

## Overview
This system orchestrates real-time discussions between multiple LLM agents through Dify.ai, supporting various conversation modes from creative roleplay to professional collaboration.

## Prerequisites
- Node.js 16+ installed
- Dify.ai account with API access
- Notion account (optional, for conversation logging)
- Access to LLM APIs (Claude, GPT-4, Gemini, etc.)

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

### 3. Set Up Dify Workflows

For each LLM agent, create a workflow in Dify:

#### Basic Agent Workflow Structure:
1. **Input Node**
   - `context`: JSON string with conversation history
   - `instruction`: Specific prompt for this turn
   - `mode`: Conversation mode (roleplay/collaboration/etc)

2. **LLM Node** (Claude/GPT-4/Gemini)
   - Model: Select your preferred model
   - System Prompt: 
   ```
   {{context}}
   
   {{instruction}}
   ```
   - Temperature: 0.7-0.9 for creative, 0.3-0.5 for analytical

3. **Output Node**
   - `response`: The agent's message
   - `metadata`: (optional) Additional context

4. **Save the workflow and copy its ID** to your `.env` file

### 4. Run Examples

#### For Baldur's Gate 3 Roleplay:
```bash
node examples/baldurs_gate_roleplay.js
```

#### For Client Collaboration:
```bash
node examples/client_collaboration.js
```

#### For Brainstorming:
```bash
node examples/client_collaboration.js brainstorm
```

## Detailed Configuration

### Agent Registry
Register custom agents in the orchestrator:

```javascript
orchestrator.registerAgent('custom-llm', {
    name: 'Custom Agent',
    workflowId: 'your-workflow-id',
    capabilities: ['analysis', 'creativity'],
    personality: 'thoughtful and innovative',
    defaultRoles: ['analyst', 'creator']
});
```

### Conversation Modes

#### 1. **Roleplay Mode**
- Agents maintain character throughout
- Scenario and setting drive the conversation
- Natural, narrative-style interactions

#### 2. **Collaboration Mode**
- Task-focused discussions
- Expertise-based turn taking
- Consensus building features

#### 3. **Debate Mode**
- Structured argumentation
- Position tracking
- Moderator-controlled flow

#### 4. **Brainstorm Mode**
- Parallel idea generation
- No turn limits on creativity
- Automatic idea synthesis

### Turn-Taking Strategies

- **round-robin**: Each agent speaks in order
- **interest-based**: Agents indicate desire to speak
- **expertise-based**: Topic matching to capabilities
- **moderator-controlled**: External control of speaker
- **random**: Unpredictable but fair distribution

### Advanced Features

#### Dynamic Agent Management
```javascript
// Add agent mid-conversation
await orchestrator.addParticipant({
    agentId: 'new-agent',
    role: 'Domain Expert'
});

// Remove agent
await orchestrator.removeParticipant('agent-id');
```

#### Message Injection
```javascript
// Inject moderator message
orchestrator.injectMessage('Let\'s focus on the security aspects', {
    type: 'moderation',
    priority: 'high'
});
```

#### Custom Event Handling
```javascript
orchestrator.on('message:sent', (message) => {
    // Custom processing
    if (message.content.includes('ACTION:')) {
        handleAction(message);
    }
});
```

## Dify Workflow Best Practices

### 1. Context Window Management
- Limit context to last 10-15 messages
- Summarize older context if needed
- Use message filtering based on relevance

### 2. Response Quality
- Add validation nodes to check response length
- Implement retry logic for failed responses
- Use different temperatures for different modes

### 3. Performance Optimization
- Cache frequently used prompts
- Implement request queuing
- Set appropriate timeouts

### 4. Error Handling
- Add fallback responses
- Log errors to separate workflow
- Implement graceful degradation

## Troubleshooting

### Common Issues:

1. **Agents not responding**
   - Check workflow IDs in .env
   - Verify Dify API key permissions
   - Check workflow is published

2. **Conversation ends abruptly**
   - Increase MAX_TURNS
   - Check for error events
   - Verify turn timeout settings

3. **Poor response quality**
   - Adjust temperature settings
   - Improve context formatting
   - Enhance system prompts

4. **Notion logging fails**
   - Verify NOTION_TOKEN
   - Check database permissions
   - Ensure correct PAGE_ID

## Extending the System

### Adding New Conversation Modes
1. Define mode in `buildSystemPrompt()`
2. Add mode-specific logic in `initiate[Mode]()`
3. Implement custom turn selection if needed
4. Add mode-specific event emissions

### Integrating New LLMs
1. Create Dify workflow for the LLM
2. Register agent in orchestrator
3. Define capabilities and personality
4. Test in isolation before group conversations

### Custom Features
- Implement memory persistence
- Add emotion/mood tracking  
- Create conversation templates
- Build web interface
- Add voice integration

## Production Considerations

1. **Rate Limiting**: Implement per-agent rate limits
2. **Cost Tracking**: Monitor API usage per conversation
3. **Logging**: Use structured logging for debugging
4. **Monitoring**: Track conversation metrics
5. **Security**: Validate all inputs, sanitize outputs

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review Dify.ai documentation
3. Examine example implementations
4. Check agent workflow configurations

Happy orchestrating! 🎭🤖