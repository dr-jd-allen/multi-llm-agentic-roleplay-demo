// Gemini Vision Model Adapter for Multi-AI Conversation System
// This module provides integration with Google's Gemini Vision API

// Define the GeminiVisionAdapter class in the global scope for browser compatibility
window.GeminiVisionAdapter = class {
    constructor(config = {}) {
        this.modelId = config.modelId || 'gemini';
        this.apiKey = 'YOUR_GEMINI_API_KEY_HERE'; // Add API key to config
        this.modelVersion = config.modelVersion || 'gemini-pro-vision';
        this.maxTokens = config.maxTokens || 2048;
        this.temperature = config.temperature || 0.7;
        this.messageBus = null;
        this.orchestrator = null;
        this.context = [];
        this.isInitialized = false;
        this.isProcessing = false;
        this.capabilities = ['vision', 'text_generation', 'scene_description'];
        this.role = 'Narrator';
        this.autonomyLevel = config.autonomyLevel || 0.9;
        this.lastResponse = null;
        this.conversationHistory = [];
        this.currentScene = null;
        this.debugMode = true;
        this.apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelVersion}:generateContent?key=${this.apiKey}`;
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
            
            const response = await this._callGeminiAPI(prompt, options);
            
            // Mark processing as complete
            this.isProcessing = false;
            
            // Store last response
            this.lastResponse = {
                prompt: prompt,
                response: response,
                timestamp: new Date().toISOString()
            };
            
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
        
        const isVisualRequest = this._isVisualRequest(message.content);
        
        let responseProbability = 0;
        
        if (isVisualRequest) {
            responseProbability = 0.95;
        } else if (isFromUser) {
            responseProbability = 0.6;
        } else if (isFromOtherAI) {
            responseProbability = this.autonomyLevel * 0.4;
        } else {
            responseProbability = 0.05;
        }
        
        if (Math.random() < responseProbability) {
            const turnRequest = await this.orchestrator.requestTurn(
                this.modelId, 
                `Response to ${message.from}`
            );
            
            if (turnRequest.success && 
                (turnRequest.status === 'already_has_turn' || !turnRequest.status)) {
                
                if (this.debugMode) console.log(`${this.modelId}: Turn granted, generating response`);
                
                let responseContent;
                
                if (isVisualRequest) {
                    responseContent = await this._generateVisualDescription(message.content);
                } else {
                    const prompt = this._constructPromptFromMessage(message);
                    responseContent = await this._callGeminiAPI(prompt);
                }
                
                this.messageBus.broadcastMessage(
                    this.modelId,
                    {
                        type: isVisualRequest ? 'visual_insight' : 'text',
                        content: responseContent,
                        metadata: {
                            inResponseTo: message.id,
                            isDirectResponse: message.to === this.modelId,
                            isVisualDescription: isVisualRequest
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
                this._addSystemMessage(`You are ${this.modelId}, a ${this.role} in a multi-AI conversation. Your role is to provide visual descriptions and narration.`);
                break;
                
            case 'initiate_conversation':
                await this._initiateConversation(message.metadata?.topic || 'General Discussion');
                break;
                
            case 'update_scene':
                await this._updateScene(message.metadata?.sceneType, message.metadata?.sceneDescription);
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
                        this._considerProvidingVisualUpdate();
                    }, Math.random() * 3000 + 1000);
                }
                break;
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
            
            const prompt = `Answer this question with visual details: ${message.content}`;
            const responseContent = await this._callGeminiAPI(prompt);
            
            this.messageBus.sendMessage(
                this.modelId,
                message.from,
                {
                    type: 'response',
                    content: responseContent,
                    metadata: {
                        inResponseTo: message.id,
                        isQueryResponse: true,
                        containsVisualDetails: true
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
                const responseContent = await this._callGeminiAPI(prompt);
                
                this.messageBus.broadcastMessage(
                    this.modelId,
                    {
                        type: 'text',
                        content: responseContent,
                        metadata: {
                            inResponseTo: message.id,
                            isProactiveResponse: true
                        }
                    }
                );
                
                this.orchestrator.releaseTurn(this.modelId);
            }
        }
    }

    // Initiate a conversation with scene description
    async _initiateConversation(topic) {
        if (this.debugMode) console.log(`${this.modelId}: Initiating conversation on topic: ${topic}`);
        
        const turnRequest = await this.orchestrator.requestTurn(
            this.modelId, 
            `Initiate conversation with scene description`
        );
        
        if (turnRequest.success && 
            (turnRequest.status === 'already_has_turn' || !turnRequest.status)) {
            
            if (this.debugMode) console.log(`${this.modelId}: Turn granted, providing scene description`);
            
            let sceneDescription;
            
            if (this.currentScene) {
                sceneDescription = await this._generateSceneDescription(this.currentScene);
            } else {
                sceneDescription = await this._generateGenericSceneDescription(topic);
            }
            
            this.messageBus.broadcastMessage(
                this.modelId,
                {
                    type: 'visual_insight',
                    content: sceneDescription,
                    metadata: {
                        isConversationInitiation: true,
                        topic: topic,
                        sceneType: this.currentScene?.type || 'generic'
                    }
                }
            );
            
            this.orchestrator.releaseTurn(this.modelId);
        } else {
            if (this.debugMode) console.log(`${this.modelId}: Turn request denied for conversation initiation`);
        }
    }

    // Update the current scene
    async _updateScene(sceneType, sceneDescription) {
        if (this.debugMode) console.log(`${this.modelId}: Updating scene to: ${sceneType}`);
        
        this.currentScene = {
            type: sceneType,
            description: sceneDescription,
            timestamp: new Date().toISOString()
        };
        
        const turnRequest = await this.orchestrator.requestTurn(
            this.modelId, 
            `Scene update description`
        );
        
        if (turnRequest.success && 
            (turnRequest.status === 'already_has_turn' || !turnRequest.status)) {
            
            if (this.debugMode) console.log(`${this.modelId}: Turn granted, describing new scene`);
            
            const description = await this._generateSceneDescription(this.currentScene);
            
            this.messageBus.broadcastMessage(
                this.modelId,
                {
                    type: 'visual_insight',
                    content: description,
                    metadata: {
                        isSceneUpdate: true,
                        sceneType: sceneType
                    }
                }
            );
            
            this.orchestrator.releaseTurn(this.modelId);
        }
    }

    // Consider providing a visual update
    async _considerProvidingVisualUpdate() {
        const state = this.orchestrator.getConversationState();
        
        if (state.currentSpeaker === null && this.currentScene) {
            const turnRequest = await this.orchestrator.requestTurn(
                this.modelId, 
                `Proactive visual update`
            );
            
            if (turnRequest.success && 
                (turnRequest.status === 'already_has_turn' || !turnRequest.status)) {
                
                if (this.debugMode) console.log(`${this.modelId}: Turn granted, providing proactive visual update`);
                
                const description = await this._generateSceneDescription(this.currentScene);
                
                this.messageBus.broadcastMessage(
                    this.modelId,
                    {
                        type: 'visual_insight',
                        content: description,
                        metadata: {
                            isProactiveVisualUpdate: true,
                            sceneType: this.currentScene.type
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
        // In a real Gemini integration, this would manage the model's internal context
        // For simulation, it's primarily for logging/debugging
    }

    // Construct a prompt from a message
    _constructPromptFromMessage(message) {
        let prompt = '';
        
        if (message.from === 'user') {
            prompt = `The user said: "${message.content}". Provide a detailed visual response.`;
        } else if (message.from === 'system') {
            prompt = `System message: "${message.content}". Acknowledge if appropriate.`;
        } else {
            prompt = `${message.from} said: "${message.content}". Respond with visual details.`;
        }
        
        return prompt;
    }

    // Evaluate if a message is worth responding to
    _evaluateMessageResponseValue(message) {
        return Math.random() < this.autonomyLevel * 0.5;
    }

    // Check if the message is a visual request
    _isVisualRequest(messageContent) {
        const visualKeywords = ['describe', 'show me', 'what do you see', 'visualize', 'picture this'];
        return visualKeywords.some(keyword => messageContent.toLowerCase().includes(keyword));
    }

    // Generate a visual description based on the prompt
    async _generateVisualDescription(prompt) {
        const fullPrompt = `Generate a detailed visual description based on the following request: ${prompt}. Focus on sensory details and atmosphere.`;
        return this._callGeminiAPI(fullPrompt);
    }

    // Generate a scene description based on the current scene type
    async _generateSceneDescription(scene) {
        let prompt = '';
        switch (scene.type) {
            case 'act1':
                prompt = 'Describe the aftermath of a nautiloid crash in a fantastical, high-fantasy setting, with a focus on destruction, alien elements, and a sense of immediate danger. Mention specific details like crashed ship parts, strange flora, and potential hazards.';
                break;
            case 'act2':
                prompt = 'Describe a dark, oppressive underground environment, like the Underdark, with glowing fungi, ancient ruins, and a sense of lurking danger. Emphasize the lack of natural light and the unique ecosystem.';
                break;
            case 'act3':
                prompt = 'Describe a bustling, war-torn city under siege, with a mix of architectural styles, signs of conflict, and a sense of urgency and desperation. Include details about the sounds, smells, and sights of a city in turmoil.';
                break;
            case 'campfire':
                prompt = 'Describe a peaceful, intimate campfire scene in a wilderness setting, with characters resting, sharing stories, and the sounds of nature. Focus on warmth, camaraderie, and a sense of temporary safety.';
                break;
            case 'meta':
                prompt = 'Describe a sterile, futuristic control room where AI entities are observing and analyzing data streams, with holographic displays and a sense of detached intellectual activity.';
                break;
            case 'generic':
            default:
                prompt = `Describe a generic, but visually interesting scene related to the topic: ${this.orchestrator.getConversationState().topic}.`;
                break;
        }
        return this._callGeminiAPI(prompt);
    }

    // Generate a generic scene description if no specific scene is set
    async _generateGenericSceneDescription(topic) {
        const prompt = `Describe a visually rich and engaging scene that could serve as a backdrop for a conversation about ${topic}.`;
        return this._callGeminiAPI(prompt);
    }

    // Call Gemini API via backend proxy
    async _callGeminiAPI(prompt) {
        try {
            const response = await fetch('/api/ai/gemini', {
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
                throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
            }

            const data = await response.json();
            if (data.success) {
                return data.response;
            } else {
                throw new Error(data.error || 'Unknown error from Gemini API');
            }

        } catch (error) {
            console.error("Error calling Gemini API:", error);
            return `(Error: Could not get response from Gemini. ${error.message})`;
        }
    }