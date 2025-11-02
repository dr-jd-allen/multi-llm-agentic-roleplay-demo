# Multi-LLM Discussion System - Web GUI

## Overview
A web-based interface for orchestrating real-time discussions between multiple LLM agents. Perfect for both creative roleplay (like Baldur's Gate 3 scenarios) and professional collaboration.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

Your Dify API key is already included: `app-tj7XQcH61Fiml3L3QomCa3Jc`

### 3. Start the GUI Server
```bash
npm run gui
```

Then open your browser to: `http://localhost:3000`

## Features

### 🎭 Multiple Conversation Modes
- **Collaboration**: Professional team discussions
- **Roleplay**: Character-based storytelling
- **Debate**: Structured arguments
- **Brainstorm**: Parallel idea generation

### 🤖 Flexible Agent Management
- Add/remove participants dynamically
- Customize roles and personalities
- Choose from pre-configured agents (Claude, GPT-4, Gemini)

### 🔄 Turn-Taking Strategies
- Round-robin (default)
- Interest-based (agents request to speak)
- Expertise-based (topic matching)
- Random selection

### 📊 Real-time Features
- Live message streaming
- Conversation statistics
- Duration tracking
- Moderator message injection

### 💾 Conversation Presets
Pre-configured scenarios for quick start:
- Baldur's Gate 3 tavern planning
- D&D character creation
- Product design sprints
- Architecture reviews

## Using the GUI

### Starting a Conversation

1. **Select Mode**: Choose between collaboration, roleplay, debate, or brainstorm

2. **Add Participants**: 
   - Click "Add Participant"
   - Select an agent
   - Define their role (e.g., "Wizard", "Product Manager")
   - Optionally customize personality and traits

3. **Configure Topic/Scenario**:
   - For collaboration: Enter the discussion topic
   - For roleplay: Describe the setting and scenario

4. **Advanced Options**:
   - Max turns (default: 50)
   - Turn timeout (default: 30 seconds)
   - Enable/disable Notion logging

5. **Start**: Click "Start Conversation" to begin

### During Conversation

- **Watch Messages**: Real-time display of agent responses
- **Track Stats**: Turn count, message count, duration
- **Inject Messages**: Add moderator messages to guide discussion
- **Stop**: End the conversation at any time

### Using Presets

1. Select a preset from the dropdown
2. It will automatically configure:
   - Conversation mode
   - Participants with roles
   - Topic or scenario
3. Customize further if needed
4. Start the conversation

## Example Scenarios

### Baldur's Gate 3 Roleplay
```
Mode: Roleplay
Participants:
- Claude as Gale (Wizard)
- GPT-4 as Karlach (Barbarian)  
- Gemini as Astarion (Rogue)

Scenario: The Elfsong Tavern
The party discusses their next move after discovering Bhaal cult activity
```

### Product Collaboration
```
Mode: Collaboration
Participants:
- Claude as Solutions Architect
- GPT-4 as Product Manager
- Gemini as Lead Developer

Topic: Design AI-powered customer service platform
```

## Troubleshooting

### Connection Issues
- Ensure server is running (`npm run gui`)
- Check browser console for errors
- Verify port 3000 is available

### Agents Not Responding
- Check Dify API key in .env
- Verify workflow IDs are configured
- Check browser developer console

### Performance
- Reduce max turns for shorter conversations
- Increase turn timeout for complex responses
- Disable logging if not needed

## Advanced Configuration

### Custom Agents
Edit `server.js` to add more agents:
```javascript
{
    id: 'custom-llm',
    name: 'Custom Agent',
    capabilities: ['your', 'capabilities'],
    personality: 'agent personality',
    defaultRoles: ['role1', 'role2']
}
```

### Custom Presets
Add your own presets in `server.js`:
```javascript
roleplay: [
    {
        name: "Your Custom Scenario",
        mode: 'roleplay',
        participants: [...],
        scenario: {...}
    }
]
```

## API Endpoints

The server exposes Socket.IO events:
- `start_conversation`: Begin a new discussion
- `stop_conversation`: End active discussion
- `add_participant`: Add agent to conversation
- `remove_participant`: Remove agent
- `inject_message`: Add moderator message
- `get_agents`: List available agents
- `get_presets`: Get conversation presets

## Next Steps

1. **Set up Dify Workflows**: Create workflows for each agent in your Dify account
2. **Configure Workflow IDs**: Add them to your .env file
3. **Customize Agents**: Modify personalities and capabilities
4. **Create Custom Presets**: Add your own scenarios
5. **Extend Features**: Add voice, avatars, or export functionality

Enjoy orchestrating your multi-LLM discussions! 🎭🤖