const axios = require('axios');
const EventEmitter = require('events');

class DifyOrchestrator extends EventEmitter {
  constructor(config) {
    super();
    this.config = {
      difyApiKey: config.DIFY_API_KEY || process.env.DIFY_API_KEY,
      difyApiUrl: config.DIFY_API_URL || 'https://api.dify.ai/v1',
      workflowId: config.WORKFLOW_ID || process.env.DIFY_WORKFLOW_ID,
      claudeNodeId: config.CLAUDE_NODE_ID || 'claude-node',
      lexNodeId: config.LEX_NODE_ID || 'lex-node',
      conversationId: null,
      turnTimeout: config.TURN_TIMEOUT || 30000, // 30 seconds default
    };
    
    this.conversationState = {
      currentSpeaker: null,
      turnCount: 0,
      messages: [],
      participants: ['Claude', 'Lex'],
      topic: null,
    };
  }

  // Initialize a new conversation
  async startConversation(topic, initialPrompt) {
    console.log('\n🚀 Starting Multi-AI Conversation');
    console.log(`📋 Topic: ${topic}`);
    console.log(`💬 Initial Prompt: ${initialPrompt}\n`);

    this.conversationState.topic = topic;
    this.conversationState.conversationId = Date.now().toString();
    
    // Add initial prompt to messages
    this.conversationState.messages.push({
      role: 'system',
      content: `Topic: ${topic}\nInitial Prompt: ${initialPrompt}`,
      timestamp: new Date().toISOString()
    });

    // Start with Claude
    const claudeResponse = await this.sendToAgent('Claude', initialPrompt);
    
    if (claudeResponse) {
      // Now send Claude's response to Lex
      const lexResponse = await this.sendToAgent('Lex', claudeResponse);
      
      // Continue the conversation
      this.emit('conversation-started', {
        topic,
        participants: this.conversationState.participants,
        conversationId: this.conversationState.conversationId
      });
      
      return {
        conversationId: this.conversationState.conversationId,
        initialExchange: {
          claude: claudeResponse,
          lex: lexResponse
        }
      };
    }
  }

  // Send message to specific agent via Dify
  async sendToAgent(agentName, message) {
    try {
      console.log(`\n🤖 ${agentName}'s turn:`);
      console.log(`📨 Receiving: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`);

      const nodeId = agentName === 'Claude' ? this.config.claudeNodeId : this.config.lexNodeId;
      
      // Call Dify workflow API
      const response = await axios.post(
        `${this.config.difyApiUrl}/workflows/${this.config.workflowId}/run`,
        {
          inputs: {
            message: message,
            agent: agentName,
            conversation_history: JSON.stringify(this.conversationState.messages),
            node_id: nodeId
          },
          response_mode: 'blocking',
          user: 'orchestrator'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.difyApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const agentResponse = response.data.data.outputs.response || response.data.data.outputs.text;
      
      // Log the response
      console.log(`💭 ${agentName} responds: "${agentResponse.substring(0, 100)}${agentResponse.length > 100 ? '...' : ''}"`);
      
      // Update conversation state
      this.conversationState.messages.push({
        role: agentName.toLowerCase(),
        content: agentResponse,
        timestamp: new Date().toISOString()
      });
      
      this.conversationState.currentSpeaker = agentName;
      this.conversationState.turnCount++;
      
      // Emit turn completed event
      this.emit('turn-completed', {
        speaker: agentName,
        message: agentResponse,
        turnNumber: this.conversationState.turnCount
      });
      
      return agentResponse;
      
    } catch (error) {
      console.error(`❌ Error sending to ${agentName}:`, error.message);
      this.emit('agent-error', {
        agent: agentName,
        error: error.message
      });
      return null;
    }
  }

  // Orchestrate a full conversation
  async orchestrateConversation(topic, initialPrompt, maxTurns = 10) {
    const startResult = await this.startConversation(topic, initialPrompt);
    
    if (!startResult) {
      console.error('Failed to start conversation');
      return;
    }

    let lastResponse = startResult.initialExchange.lex;
    let currentSpeaker = 'Claude'; // Next speaker after initial exchange
    
    // Continue conversation for maxTurns
    for (let i = 2; i < maxTurns; i++) {
      if (this.shouldEndConversation(lastResponse)) {
        console.log('\n🏁 Natural conversation end detected');
        break;
      }
      
      lastResponse = await this.sendToAgent(currentSpeaker, lastResponse);
      
      if (!lastResponse) {
        console.log('\n⚠️ No response received, ending conversation');
        break;
      }
      
      // Alternate speakers
      currentSpeaker = currentSpeaker === 'Claude' ? 'Lex' : 'Claude';
      
      // Add a small delay to simulate natural conversation pace
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return this.endConversation();
  }

  // Check if conversation should naturally end
  shouldEndConversation(message) {
    const endPhrases = [
      'goodbye', 'bye', 'see you', 'take care',
      'that concludes', 'final thoughts', 'in conclusion',
      'thank you for the discussion', 'great talking'
    ];
    
    const lowerMessage = message.toLowerCase();
    return endPhrases.some(phrase => lowerMessage.includes(phrase));
  }

  // End conversation and generate summary
  async endConversation() {
    console.log('\n📊 Conversation Summary:');
    console.log(`Total Turns: ${this.conversationState.turnCount}`);
    console.log(`Topic: ${this.conversationState.topic}`);
    
    const summary = {
      conversationId: this.conversationState.conversationId,
      topic: this.conversationState.topic,
      turnCount: this.conversationState.turnCount,
      messages: this.conversationState.messages,
      duration: new Date() - new Date(this.conversationState.messages[0].timestamp),
      timestamp: new Date().toISOString()
    };
    
    this.emit('conversation-ended', summary);
    
    // Reset state for next conversation
    this.resetState();
    
    return summary;
  }

  // Reset conversation state
  resetState() {
    this.conversationState = {
      currentSpeaker: null,
      turnCount: 0,
      messages: [],
      participants: ['Claude', 'Lex'],
      topic: null,
    };
  }

  // Get current conversation state
  getState() {
    return { ...this.conversationState };
  }
}

// Example usage
async function runExample() {
  // Initialize orchestrator
  const orchestrator = new DifyOrchestrator({
    DIFY_API_KEY: process.env.DIFY_API_KEY,
    DIFY_API_URL: process.env.DIFY_API_URL || 'https://api.dify.ai/v1',
    WORKFLOW_ID: process.env.DIFY_WORKFLOW_ID,
    CLAUDE_NODE_ID: 'claude-agent',
    LEX_NODE_ID: 'lex-agent',
  });

  // Set up event listeners
  orchestrator.on('turn-completed', (data) => {
    console.log(`\n✅ Turn ${data.turnNumber} completed by ${data.speaker}`);
  });

  orchestrator.on('agent-error', (data) => {
    console.error(`\n❌ Agent Error: ${data.agent} - ${data.error}`);
  });

  orchestrator.on('conversation-ended', (summary) => {
    console.log('\n🎉 Conversation completed!');
    console.log(`Duration: ${Math.round(summary.duration / 1000)} seconds`);
  });

  // Example conversations
  const examples = [
    {
      topic: "AI Ethics and Future of Work",
      prompt: "Let's discuss how AI will impact employment in the next decade. Claude, what are your thoughts on job displacement versus job creation?"
    },
    {
      topic: "Consensus Building Strategy",
      prompt: "We need to reach consensus on the best approach for implementing real-time AI collaboration. What frameworks should we consider?"
    },
    {
      topic: "Technical Architecture Review",
      prompt: "Let's review the proposed multi-agent architecture. What are the key components we need for scalable AI-to-AI communication?"
    }
  ];

  // Run a conversation
  try {
    const selectedExample = examples[0]; // Change index to try different examples
    
    console.log('🎭 Dify Multi-AI Orchestrator Demo');
    console.log('==================================\n');
    
    const result = await orchestrator.orchestrateConversation(
      selectedExample.topic,
      selectedExample.prompt,
      8 // max turns
    );
    
    console.log('\n📄 Final Summary:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

// Export for use in other modules
module.exports = DifyOrchestrator;

// Run example if this file is executed directly
if (require.main === module) {
  // Check for required environment variables
  const requiredEnvVars = ['DIFY_API_KEY', 'DIFY_WORKFLOW_ID'];
  const missingVars = requiredEnvVars.filter(v => !process.env[v]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    console.log('\nPlease set the following environment variables:');
    console.log('export DIFY_API_KEY="your-dify-api-key"');
    console.log('export DIFY_WORKFLOW_ID="your-workflow-id"');
    console.log('export DIFY_API_URL="https://api.dify.ai/v1" (optional)');
    process.exit(1);
  }
  
  runExample();
}