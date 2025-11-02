// ChatGPT Model Adapter for Multi-AI Conversation System
// This module provides integration with OpenAI's ChatGPT API

// Define the ChatGPTAdapter class in the global scope for browser compatibility
window.ChatGPTAdapter = class {
    constructor(config = {}) {
        this.modelId = config.modelId || 'chatgpt';
        this.role = 'Collaborator';
        this.messageBus = null;
        this.orchestrator = null;
        this.isInitialized = false;
        this.isProcessing = false;
        this.capabilities = ['text_generation', 'reasoning', 'conversation', 'knowledge'];
        this.autonomyLevel = config.autonomyLevel || 0.7;
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
            
            const response = await this._callChatGPTAPI(prompt, options);
            
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
            responseProbability = 0.8;
        } else if (isFromOtherAI) {
            responseProbability = this.autonomyLevel * 0.6;
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
                const responseContent = await this._callChatGPTAPI(prompt);
                
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
                this._addSystemMessage(`You are ${this.modelId}, a ${this.role} in a multi-AI conversation. Your role is to provide analytical insights and practical perspectives.`);
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
                if (Math.random() < this.autonomyLevel * 0.3) {
                    setTimeout(() => {
                        this._considerProvidingAnalysis();
                    }, Math.random() * 3000 + 1000);
                }
                break;
        }
    }

    // Respond to visual insights from Gemini Vision
    async _respondToVisualInsight(message) {
        if (Math.random() < this.autonomyLevel * 0.7) {
            const turnRequest = await this.orchestrator.requestTurn(
                this.modelId, 
                `Response to visual insight`
            );
            
            if (turnRequest.success && 
                (turnRequest.status === 'already_has_turn' || !turnRequest.status)) {
                
                if (this.debugMode) console.log(`${this.modelId}: Turn granted, responding to visual insight`);
                
                const prompt = `Analyze this visual description: ${message.content}`;
                const responseContent = await this._callChatGPTAPI(prompt);
                
                this.messageBus.broadcastMessage(
                    this.modelId,
                    {
                        type: 'text',
                        content: responseContent,
                        metadata: {
                            inResponseTo: message.id,
                            isVisualAnalysis: true
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
            
            const prompt = `Answer this question analytically: ${message.content}`;
            const responseContent = await this._callChatGPTAPI(prompt);
            
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
                const responseContent = await this._callChatGPTAPI(prompt);
                
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
            
            const prompt = `Start a conversation about ${topic}. Provide an analytical perspective that will spark discussion.`;
            const responseContent = await this._callChatGPTAPI(prompt);
            
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

    // Consider providing analytical insights
    async _considerProvidingAnalysis() {
        if (this.conversationHistory.length === 0) {
            return;
        }
        
        const state = this.orchestrator.getConversationState();
        
        if (state.currentSpeaker === null) {
            const turnRequest = await this.orchestrator.requestTurn(
                this.modelId, 
                `Provide analytical insight`
            );
            
            if (turnRequest.success && 
                (turnRequest.status === 'already_has_turn' || !turnRequest.status)) {
                
                if (this.debugMode) console.log(`${this.modelId}: Turn granted, providing analysis`);
                
                const prompt = `Based on the recent conversation, provide an analytical insight or ask a thought-provoking question.`;
                const responseContent = await this._callChatGPTAPI(prompt);
                
                this.messageBus.broadcastMessage(
                    this.modelId,
                    {
                        type: 'text',
                        content: responseContent,
                        metadata: {
                            isAnalyticalInsight: true
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
        // In a real ChatGPT integration, this would manage the model's internal context
        // For simulation, it's primarily for logging/debugging
    }

    // Construct a prompt from a message
    _constructPromptFromMessage(message) {
        let prompt = '';
        
        if (message.from === 'user') {
            prompt = `The user said: "${message.content}". Provide an analytical response.`;
        } else if (message.from === 'system') {
            prompt = `System message: "${message.content}". Acknowledge if appropriate.`;
        } else {
            prompt = `${message.from} said: "${message.content}". Respond with analysis or insights.`;
        }
        
        return prompt;
    }

    // Evaluate if a message is worth responding to
    _evaluateMessageResponseValue(message) {
        return Math.random() < this.autonomyLevel * 0.4;
    }

    // Call ChatGPT API via backend proxy
    async _callChatGPTAPI(prompt) {
        try {
            const response = await fetch('/api/ai/chatgpt', {
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
                throw new Error(`ChatGPT API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
            }

            const data = await response.json();
            if (data.success) {
                return data.response;
            } else {
                throw new Error(data.error || 'Unknown error from ChatGPT API');
            }

        } catch (error) {
            console.error("Error calling ChatGPT API:", error);
            return `(Error: Could not get response from ChatGPT. ${error.message})`;
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatGPTAdapter;
} else {
    window.ChatGPTAdapter = window.ChatGPTAdapter;
}

console.log("ChatGPT adapter script loaded successfully");

