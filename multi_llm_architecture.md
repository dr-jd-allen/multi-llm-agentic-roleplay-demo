# Multi-LLM Realtime Discussion Architecture

## Overview
A flexible system for orchestrating conversations between multiple LLM agents, supporting various conversation modes from creative roleplay to professional collaboration.

## Core Components

### 1. Enhanced Orchestrator (`multi_llm_orchestrator.js`)
- **Dynamic Agent Management**: Add/remove agents during conversations
- **Conversation Modes**:
  - **Roleplay**: Character-based interactions with personality profiles
  - **Collaboration**: Task-focused discussions with expertise-based routing
  - **Debate**: Structured arguments with position tracking
  - **Brainstorm**: Free-form idea generation with all agents contributing
  - **Panel**: Expert-based discussions with moderator control

### 2. Agent Registry System
```javascript
agentRegistry: {
  'claude-3': {
    endpoint: 'dify-workflow-id-1',
    capabilities: ['analysis', 'ethics', 'creativity'],
    personality: 'thoughtful and analytical',
    roles: ['wizard', 'strategist', 'advisor']
  },
  'gpt-4': {
    endpoint: 'dify-workflow-id-2',
    capabilities: ['reasoning', 'planning', 'dialogue'],
    personality: 'practical and direct',
    roles: ['fighter', 'tactician', 'project-manager']
  },
  'gemini': {
    endpoint: 'dify-workflow-id-3',
    capabilities: ['research', 'synthesis', 'innovation'],
    personality: 'curious and exploratory',
    roles: ['rogue', 'researcher', 'creative-director']
  }
}
```

### 3. Conversation Flow Manager
- **Turn-Taking Strategies**:
  - Round-robin (default)
  - Interest-based (agents request to speak)
  - Expertise-based (topic matching)
  - Moderator-controlled
  - Parallel (all speak, then synthesize)

### 4. Context Management
- **Shared Memory**: All agents access conversation history
- **Private Memory**: Agent-specific knowledge/state
- **Topic Tracking**: Monitor conversation themes
- **Relationship Dynamics**: Track inter-agent interactions

### 5. Real-time Features
- **WebSocket Support**: For true real-time updates
- **Event Streaming**: Progressive message delivery
- **Presence Tracking**: Know which agents are "active"
- **Interrupt Handling**: Allow dynamic interjections

## Implementation Phases

### Phase 1: Core Multi-Agent Support
1. Extend orchestrator for N agents
2. Implement agent registry
3. Basic round-robin conversation
4. Update Dify workflows

### Phase 2: Advanced Turn-Taking
1. Interest-based speaking
2. Expertise routing
3. Parallel processing
4. Consensus building

### Phase 3: Role & Personality System
1. Character profile management
2. Dynamic personality switching
3. Relationship tracking
4. Emotion/mood states

### Phase 4: Real-time Enhancements
1. WebSocket integration
2. Progressive streaming
3. Live agent addition/removal
4. Interrupt handling

## Use Case Examples

### Baldur's Gate 3 Roleplay
```javascript
conversation = {
  mode: 'roleplay',
  setting: 'Forgotten Realms tavern',
  agents: [
    { id: 'claude-3', character: 'Elven Wizard', traits: ['wise', 'cautious'] },
    { id: 'gpt-4', character: 'Human Fighter', traits: ['brave', 'impulsive'] },
    { id: 'gemini', character: 'Halfling Rogue', traits: ['clever', 'mischievous'] }
  ],
  scenario: 'Planning the next adventure'
}
```

### Client Product Collaboration
```javascript
conversation = {
  mode: 'collaboration',
  project: 'New Mobile App Design',
  agents: [
    { id: 'claude-3', role: 'UX Designer', focus: 'user experience' },
    { id: 'gpt-4', role: 'Tech Lead', focus: 'architecture' },
    { id: 'gemini', role: 'Product Manager', focus: 'requirements' }
  ],
  goal: 'Define MVP features'
}
```

## Dify.ai Workflow Structure

### Hub Workflow
- Receives all messages
- Routes to appropriate agent workflows
- Manages conversation state
- Handles special commands

### Agent Workflows
- Receive context + prompt
- Apply personality/role filters
- Generate responses
- Return with metadata

### Synthesis Workflow
- Aggregates multiple responses
- Resolves conflicts
- Builds consensus
- Formats final output

## Configuration Schema

```yaml
conversation:
  mode: roleplay|collaboration|debate|brainstorm|panel
  participants:
    - agent_id: string
      role: string
      personality: object
      expertise: array
  settings:
    max_turns: number
    turn_timeout: seconds
    parallel_allowed: boolean
    interrupts_enabled: boolean
  memory:
    shared_context_limit: number
    private_memory_size: number
  output:
    format: text|structured|narrative
    logging: notion|file|both
```