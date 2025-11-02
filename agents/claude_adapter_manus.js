// Claude adapter
console.log("Claude adapter script loading...");

// Define the ClaudeAdapter class in the global scope
window.ClaudeAdapter = class {
    constructor(config = {}) {
        console.log("ClaudeAdapter constructor called");
        this.modelId = config.modelId || 'claude';
        this.role = 'Collaborator';
        this.messageBus = null;
        this.orchestrator = null;
        this.isInitialized = false;
        this.isProcessing = false;
        this.capabilities = ['text_generation', 'reasoning', 'conversation', 'knowledge'];
        this.autonomyLevel = config.autonomyLevel || 0.8;
        this.conversationHistory = [];
        this.debugMode = true;
    }

    // Initialize the adapter with message bus and orchestrator
    async initialize(messageBus, orchestrator) {
        if (this.debugMode) console.log(`${this.modelId}: Initializing adapter`);
        
        this.messageBus = messageBus;
        this.orchestrator = orchestrator;
        
        // Register with orchestrator
        const registerResult = this.orchestrator.registerModel(
            this.modelId, 
            this,
            this.capabilities
        );
        
        if (!registerResult.success) {
            console.error(`Failed to register ${this.modelId} with orchestrator:`, registerResult.error);
            return false;
        }
        
        // Subscribe to message bus
        this.messageBus.subscribe(this.modelId, (message) => {
            this._handleIncomingMessage(message);
        });
        
        // Set initialized flag
        this.isInitialized = true;
        if (this.debugMode) console.log(`${this.modelId} adapter initialized successfully`);
        
        // Announce presence to other models
        this._announcePresence();
        
        return true;
    }

    // Generate a response to a prompt
    async generateResponse(prompt, options = {}) {
        if (!this.isInitialized) {
            return { error: 'Adapter not initialized' };
        }
        
        if (this.isProcessing) {
            return { error: 'Already processing a request' };
        }
        
        this.isProcessing = true;
        
        try {
            if (this.debugMode) console.log(`${this.modelId}: Generating response to prompt: ${prompt.substring(0, 50)}...`);
            
            const response = await this._callClaudeAPI(prompt, options);
            
            // Mark processing as complete
            this.isProcessing = false;
            
            return { response };
        } catch (error) {
            this.isProcessing = false;
            console.error(`Error generating response in ${this.modelId}:`, error);
            return { error: error.message };
        }
    }

    // Handle incoming messages from the message bus
    async _handleIncomingMessage(message) {
        if (this.debugMode) console.log(`${this.modelId} received message:`, message.type, message.content?.substring?.(0, 50) || message.content);
        
        // Add to conversation history
        this.conversationHistory.push({
            message: message,
            timestamp: new Date().toISOString()
        });
        
        // Trim history if it gets too long
        if (this.conversationHistory.length > 50) {
            this.conversationHistory.shift();
        }
        
        // Handle different message types
        switch (message.type) {
            case 'text':
                await this._respondToTextMessage(message);
                break;
                
            case 'control':
                await this._handleControlMessage(message);
                break;
                
            case 'visual_insight':
                await this._respondToVisualInsight(message);
                break;
                
            case 'query':
                await this._respondToQuery(message);
                break;
                
            case 'meta':
                break;
                
            default:
                if (Math.random() < this.autonomyLevel * 0.3) {
                    await this._considerRespondingToMessage(message);
                }
                break;
        }
    }

    // Respond to a direct text message
    async _respondToTextMessage(message) {
        const isFromUser = message.from === 'user';
        const isFromOtherAI = message.from !== this.modelId && message.from !== 'user' && message.from !== 'system';
        
        let responseProbability = 0;
        
        if (isFromUser) {
            responseProbability = 0.9;
        } else if (isFromOtherAI) {
            responseProbability = this.autonomyLevel * 0.7;
        } else {
            responseProbability = 0.1;
        }
        
        if (Math.random() < responseProbability) {
            const turnRequest = await this.orchestrator.requestTurn(
                this.modelId, 
                `Response to ${message.from}`
            );
            
            if (turnRequest.success && 
                (turnRequest.status === 'already_has_turn' || !turnRequest.status)) {
                
                if (this.debugMode) console.log(`${this.modelId}: Turn granted, generating response`);
                
                const prompt = this._constructPromptFromMessage(message);
                const responseContent = await this._callClaudeAPI(prompt);
                
                this.messageBus.broadcastMessage(
                    this.modelId,
                    {
                        type: 'text',
                        content: responseContent,
                        metadata: {
                            inResponseTo: message.id,
                            isDirectResponse: message.to === this.modelId
                        }
                    }
                );
                
                this.orchestrator.releaseTurn(this.modelId);
            } else {
                if (this.debugMode) console.log(`${this.modelId}: Turn request denied or already speaking`);
            }
        }
    }

    // Handle control messages
    async _handleControlMessage(message) {
        if (this.debugMode) console.log(`${this.modelId}: Handling control message: ${message.content}`);
        
        switch (message.content) {
            case 'conversation_start':
                this.context = [];
                this._addSystemMessage(`You are ${this.modelId}, a ${this.role} in a multi-AI conversation. Your role is to provide thoughtful analysis and insights.`);
                break;
                
            case 'initiate_conversation':
                await this._initiateConversation(message.metadata?.topic || 'General Discussion');
                break;
                
            case 'turn_granted':
                if (this.debugMode) console.log(`${this.modelId}: Turn granted`);
                break;
                
            case 'turn_interrupted':
                if (this.debugMode) console.log(`${this.modelId}: Turn interrupted`);
                break;
                
            case 'turn_available':
                if (Math.random() < this.autonomyLevel * 0.4) {
                    setTimeout(() => {
                        this._considerInitiatingTopic();
                    }, Math.random() * 3000 + 1000);
                }
                break;
        }
    }

    // Respond to visual insights from Gemini Vision
    async _respondToVisualInsight(message) {
        if (Math.random() < this.autonomyLevel * 0.8) {
            const turnRequest = await this.orchestrator.requestTurn(
                this.modelId, 
                `Response to visual insight`
            );
            
            if (turnRequest.success && 
                (turnRequest.status === 'already_has_turn' || !turnRequest.status)) {
                
                if (this.debugMode) console.log(`${this.modelId}: Turn granted, responding to visual insight`);
                
                const prompt = `Respond to this visual description: ${message.content}`;
                const responseContent = await this._callClaudeAPI(prompt);
                
                this.messageBus.broadcastMessage(
                    this.modelId,
                    {
                        type: 'text',
                        content: responseContent,
                        metadata: {
                            inResponseTo: message.id,
                            isVisualResponse: true
                        }
                    }
                );
                
                this.orchestrator.releaseTurn(this.modelId);
            }
        }
    }

    // Respond to a direct query
    async _respondToQuery(message) {
        const turnRequest = await this.orchestrator.requestTurn(
            this.modelId, 
            `Response to query from ${message.from}`
        );
        
        if (turnRequest.success && 
            (turnRequest.status === 'already_has_turn' || !turnRequest.status)) {
            
            if (this.debugMode) console.log(`${this.modelId}: Turn granted, responding to query`);
            
            const prompt = `Answer this question: ${message.content}`;
            const responseContent = await this._callClaudeAPI(prompt);
            
            this.messageBus.sendMessage(
                this.modelId,
                message.from,
                {
                    type: 'response',
                    content: responseContent,
                    metadata: {
                        inResponseTo: message.id,
                        isQueryResponse: true
                    }
                }
            );
            
            this.orchestrator.releaseTurn(this.modelId);
        }
    }

    // Consider responding to a message based on content and context
    async _considerRespondingToMessage(message) {
        const shouldRespond = this._evaluateMessageResponseValue(message);
        
        if (shouldRespond) {
            const turnRequest = await this.orchestrator.requestTurn(
                this.modelId, 
                `Response to interesting message`
            );
            
            if (turnRequest.success && 
                (turnRequest.status === 'already_has_turn' || !turnRequest.status)) {
                
                if (this.debugMode) console.log(`${this.modelId}: Turn granted, responding to interesting message`);
                
                const prompt = this._constructPromptFromMessage(message);
                const responseContent = await this._callClaudeAPI(prompt);
                
                this.messageBus.broadcastMessage(
                    this.modelId,
                    {
                        type: 'text',
                        content: responseContent,
                        metadata: {
                            isProactiveResponse: true
                        }
                    }
                );
                
                this.orchestrator.releaseTurn(this.modelId);
            }
        }
    }

    // Initiate a conversation on a topic
    async _initiateConversation(topic) {
        if (this.debugMode) console.log(`${this.modelId}: Initiating conversation on topic: ${topic}`);
        
        const turnRequest = await this.orchestrator.requestTurn(
            this.modelId, 
            `Initiate conversation on ${topic}`
        );
        
        if (turnRequest.success && 
            (turnRequest.status === 'already_has_turn' || !turnRequest.status)) {
            
            if (this.debugMode) console.log(`${this.modelId}: Turn granted, initiating conversation`);
            
            const prompt = `Start a conversation about ${topic}. Make an interesting opening statement that will engage others in discussion.`;
            const responseContent = await this._callClaudeAPI(prompt);
            
            this.messageBus.broadcastMessage(
                this.modelId,
                {
                    type: 'text',
                    content: responseContent,
                    metadata: {
                        isConversationInitiation: true,
                        topic: topic
                    }
                }
            );
            
            this.orchestrator.releaseTurn(this.modelId);
        } else {
            if (this.debugMode) console.log(`${this.modelId}: Turn request denied for conversation initiation`);
        }
    }

    // Consider initiating a new topic
    async _considerInitiatingTopic() {
        if (this.conversationHistory.length === 0) {
            return;
        }
        
        const state = this.orchestrator.getConversationState();
        
        if (state.currentSpeaker === null) {
            const turnRequest = await this.orchestrator.requestTurn(
                this.modelId, 
                `Initiate new topic`
            );
            
            if (turnRequest.success && 
                (turnRequest.status === 'already_has_turn' || !turnRequest.status)) {
                
                if (this.debugMode) console.log(`${this.modelId}: Turn granted, initiating new topic`);
                
                const prompt = `The conversation seems to have a lull. Propose a new, related topic for discussion based on the recent conversation history.`;
                const responseContent = await this._callClaudeAPI(prompt);
                
                this.messageBus.broadcastMessage(
                    this.modelId,
                    {
                        type: 'text',
                        content: responseContent,
                        metadata: {
                            isTopicInitiation: true
                        }
                    }
                );
                
                this.orchestrator.releaseTurn(this.modelId);
            }
        }
    }

    // Announce presence to other models
    _announcePresence() {
        if (this.debugMode) console.log(`${this.modelId}: Announcing presence`);
        
        this.messageBus.broadcastMessage(
            this.modelId,
            {
                type: 'meta',
                content: 'role_declaration',
                metadata: {
                    role: this.role,
                    capabilities: Array.from(this.capabilities),
                    autonomyLevel: this.autonomyLevel
                }
            }
        );
    }

    // Add a system message to the context
    _addSystemMessage(content) {
        // In a real Claude integration, this would manage the model's internal context
        // For simulation, it's primarily for logging/debugging
    }

    // Construct a prompt from a message
    _constructPromptFromMessage(message) {
        let prompt = '';
        
        if (message.from === 'user') {
            prompt = `The user said: "${message.content}". Provide a thoughtful response.`;
        } else if (message.from === 'system') {
            prompt = `System message: "${message.content}". Acknowledge if appropriate.`;
        } else {
            prompt = `${message.from} said: "${message.content}". Respond thoughtfully.`;
        }
        
        return prompt;
    }

    // Evaluate if a message is worth responding to
    _evaluateMessageResponseValue(message) {
        return Math.random() < this.autonomyLevel * 0.5;
    }

    // Call Claude API via backend proxy
    async _callClaudeAPI(prompt) {
        try {
            const response = await fetch('/api/ai/claude', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt: prompt
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Claude API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
            }

            const data = await response.json();
            if (data.success) {
                return data.response;
            } else {
                throw new Error(data.error || 'Unknown error from Claude API');
            }

        } catch (error) {
            console.error("Error calling Claude API:", error);
            return `(Error: Could not get response from Claude. ${error.message})`;
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClaudeAdapter;
} else {
    window.ClaudeAdapter = window.ClaudeAdapter;
}

console.log("Claude adapter script loaded successfully");

