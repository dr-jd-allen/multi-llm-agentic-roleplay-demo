// Model Orchestrator for Multi-AI Conversation System
// This module manages the coordination between different AI models

class ModelOrchestrator {
    constructor(messageBus) {
        this.messageBus = messageBus;
        this.registeredModels = new Map();
        this.modelCapabilities = new Map();
        this.modelRoles = new Map();
        this.definedRoles = new Map();
        this.conversationActive = false;
        this.currentSpeaker = null;
        this.speakerQueue = [];
        this.turnHistory = [];
        this.modelStatuses = new Map();
        this.conversationTopic = null;
        this.debugMode = true; // Enable debug logging
    }

    // Register a model with the orchestrator
    registerModel(modelId, modelInstance, capabilities = []) {
        if (this.debugMode) console.log(`Orchestrator: Registering model ${modelId}`);
        
        if (this.registeredModels.has(modelId)) {
            return {
                success: false,
                error: `Model ${modelId} is already registered`
            };
        }
        
        // Register the model
        this.registeredModels.set(modelId, modelInstance);
        this.modelCapabilities.set(modelId, new Set(capabilities));
        this.modelStatuses.set(modelId, (
            modelInstance.isInitialized ? (modelInstance.isProcessing ? 'processing' : 'active') : 'idle'
        ));
        
        if (this.debugMode) console.log(`Orchestrator: Model ${modelId} registered successfully with capabilities: ${capabilities.join(", ")}`);
        
        return {
            success: true
        };
    }

    // Define a role with required capabilities and permissions
    defineRole(roleName, roleDefinition) {
        if (this.debugMode) console.log(`Orchestrator: Defining role ${roleName}`);
        
        if (this.definedRoles.has(roleName)) {
            return {
                success: false,
                error: `Role ${roleName} is already defined`
            };
        }
        
        // Define the role
        this.definedRoles.set(roleName, roleDefinition);
        
        if (this.debugMode) console.log(`Orchestrator: Role ${roleName} defined successfully`);
        
        return {
            success: true
        };
    }

    // Assign a role to a model
    assignRole(modelId, roleName) {
        if (this.debugMode) console.log(`Orchestrator: Assigning role ${roleName} to model ${modelId}`);
        
        if (!this.registeredModels.has(modelId)) {
            return {
                success: false,
                error: `Model ${modelId} is not registered`
            };
        }
        
        if (!this.definedRoles.has(roleName)) {
            return {
                success: false,
                error: `Role ${roleName} is not defined`
            };
        }
        
        // Check if model has required capabilities for the role
        const roleDefinition = this.definedRoles.get(roleName);
        const modelCapabilities = this.modelCapabilities.get(modelId);
        
        if (roleDefinition.requiredCapabilities) {
            for (const capability of roleDefinition.requiredCapabilities) {
                if (!modelCapabilities.has(capability)) {
                    return {
                        success: false,
                        error: `Model ${modelId} lacks required capability ${capability} for role ${roleName}`
                    };
                }
            }
        }
        
        // Assign the role
        this.modelRoles.set(modelId, roleName);
        
        if (this.debugMode) console.log(`Orchestrator: Role ${roleName} assigned to model ${modelId} successfully`);
        
        return {
            success: true
        };
    }

    // Start a conversation
    startConversation(topic = 'General Discussion') {
        if (this.debugMode) console.log(`Orchestrator: Starting conversation on topic: ${topic}`);
        
        if (this.conversationActive) {
            if (this.debugMode) console.log(`Orchestrator: Conversation already active, ending previous conversation`);
            this.endConversation();
        }
        
        // Set conversation state
        this.conversationActive = true;
        this.conversationTopic = topic;
        this.currentSpeaker = null;
        this.speakerQueue = [];
        this.turnHistory = [];
        
        // Reset model statuses
        for (const modelId of this.registeredModels.keys()) {
            this.modelStatuses.set(modelId, 'active');
        }
        
        // Notify all models that conversation has started
        for (const modelId of this.registeredModels.keys()) {
            this.messageBus.sendMessage('system', modelId, {
                type: 'control',
                content: 'conversation_start',
                metadata: {
                    topic: topic,
                    timestamp: new Date().toISOString()
                }
            });
        }
        
        if (this.debugMode) console.log(`Orchestrator: Conversation started successfully`);
        
        return {
            success: true,
            topic: topic
        };
    }

    // End a conversation
    endConversation() {
        if (this.debugMode) console.log(`Orchestrator: Ending conversation`);
        
        if (!this.conversationActive) {
            return {
                success: false,
                error: 'No active conversation'
            };
        }
        
        // Set conversation state
        this.conversationActive = false;
        this.conversationTopic = null;
        this.currentSpeaker = null;
        this.speakerQueue = [];
        
        // Reset model statuses
        for (const modelId of this.registeredModels.keys()) {
            this.modelStatuses.set(modelId, 'idle');
        }
        
        // Notify all models that conversation has ended
        for (const modelId of this.registeredModels.keys()) {
            this.messageBus.sendMessage('system', modelId, {
                type: 'control',
                content: 'conversation_end',
                metadata: {
                    timestamp: new Date().toISOString()
                }
            });
        }
        
        if (this.debugMode) console.log(`Orchestrator: Conversation ended successfully`);
        
        return {
            success: true
        };
    }

    // Request a turn to speak
    async requestTurn(modelId, reason = '') {
        if (this.debugMode) console.log(`Orchestrator: Model ${modelId} requesting turn to speak. Reason: ${reason}`);
        
        if (!this.conversationActive) {
            return {
                success: false,
                error: 'No active conversation'
            };
        }
        
        if (!this.registeredModels.has(modelId)) {
            return {
                success: false,
                error: `Model ${modelId} is not registered`
            };
        }
        
        // If model already has the turn, return success
        if (this.currentSpeaker === modelId) {
            return {
                success: true,
                status: 'already_has_turn'
            };
        }
        
        // Check if model can interrupt current speaker
        const canInterrupt = this._canModelInterrupt(modelId);
        
        if (this.currentSpeaker && !canInterrupt) {
            // Add to queue if can't interrupt
            this.speakerQueue.push({
                modelId: modelId,
                reason: reason,
                requestTime: new Date().toISOString()
            });
            
            if (this.debugMode) console.log(`Orchestrator: Model ${modelId} added to speaker queue`);
            
            return {
                success: false,
                status: 'queued',
                position: this.speakerQueue.length
            };
        }
        
        // If there's a current speaker, notify them they're being interrupted
        if (this.currentSpeaker) {
            this.messageBus.sendMessage('system', this.currentSpeaker, {
                type: 'control',
                content: 'turn_interrupted',
                metadata: {
                    interruptedBy: modelId,
                    reason: reason,
                    timestamp: new Date().toISOString()
                }
            });
            
            if (this.debugMode) console.log(`Orchestrator: Model ${this.currentSpeaker} interrupted by ${modelId}`);
        }
        
        // Grant the turn
        this.currentSpeaker = modelId;
        this.modelStatuses.set(modelId, 'speaking');
        
        // Record turn in history
        this.turnHistory.push({
            modelId: modelId,
            reason: reason,
            startTime: new Date().toISOString(),
            endTime: null
        });
        
        // Notify the model that they have the turn
        this.messageBus.sendMessage('system', modelId, {
            type: 'control',
            content: 'turn_granted',
            metadata: {
                timestamp: new Date().toISOString()
            }
        });
        
        if (this.debugMode) console.log(`Orchestrator: Turn granted to model ${modelId}`);
        
        return {
            success: true,
            status: 'turn_granted'
        };
    }

    // Release a turn after speaking
    releaseTurn(modelId) {
        if (this.debugMode) console.log(`Orchestrator: Model ${modelId} releasing turn`);
        
        if (!this.conversationActive) {
            return {
                success: false,
                error: 'No active conversation'
            };
        }
        
        if (this.currentSpeaker !== modelId) {
            return {
                success: false,
                error: `Model ${modelId} does not have the current turn`
            };
        }
        
        // Update turn history
        const currentTurn = this.turnHistory[this.turnHistory.length - 1];
        if (currentTurn && currentTurn.modelId === modelId) {
            currentTurn.endTime = new Date().toISOString();
        }
        
        // Reset current speaker
        this.currentSpeaker = null;
        this.modelStatuses.set(modelId, 'active');
        
        if (this.debugMode) console.log(`Orchestrator: Turn released by model ${modelId}`);
        
        // Check if there's anyone in the queue
        if (this.speakerQueue.length > 0) {
            const nextSpeaker = this.speakerQueue.shift();
            
            // Grant turn to next speaker
            this.currentSpeaker = nextSpeaker.modelId;
            this.modelStatuses.set(nextSpeaker.modelId, 'speaking');
            
            // Record turn in history
            this.turnHistory.push({
                modelId: nextSpeaker.modelId,
                reason: nextSpeaker.reason,
                startTime: new Date().toISOString(),
                endTime: null
            });
            
            // Notify the model that they have the turn
            this.messageBus.sendMessage('system', nextSpeaker.modelId, {
                type: 'control',
                content: 'turn_granted',
                metadata: {
                    timestamp: new Date().toISOString()
                }
            });
            
            if (this.debugMode) console.log(`Orchestrator: Turn granted to next speaker ${nextSpeaker.modelId} from queue`);
        } else {
            // Notify all models that turn is available
            for (const modelId of this.registeredModels.keys()) {
                this.messageBus.sendMessage('system', modelId, {
                    type: 'control',
                    content: 'turn_available',
                    metadata: {
                        timestamp: new Date().toISOString()
                    }
                });
            }
            
            if (this.debugMode) console.log(`Orchestrator: No speakers in queue, turn available notification sent`);
        }
        
        return {
            success: true
        };
    }

    // Get the current conversation state
    getConversationState() {
        return {
            active: this.conversationActive,
            topic: this.conversationTopic,
            currentSpeaker: this.currentSpeaker,
            queueLength: this.speakerQueue.length,
            modelStatuses: Object.fromEntries(this.modelStatuses)
        };
    }

    // Select a model based on required capabilities and optional preferred role
    selectModel(requiredCapabilities = [], preferredRole = null) {
        if (this.debugMode) console.log(`Orchestrator: Selecting model with capabilities: ${requiredCapabilities.join(', ')} and preferred role: ${preferredRole}`);

        let bestMatch = null;
        let bestScore = -1;

        for (const [modelId, modelInstance] of this.registeredModels.entries()) {
            const capabilities = this.modelCapabilities.get(modelId);
            const role = this.modelRoles.get(modelId);
            const status = this.modelStatuses.get(modelId);

            // Skip if model is not active or idle
            if (status !== 'active' && status !== 'idle') {
                continue;
            }

            let currentScore = 0;
            let hasAllRequiredCapabilities = true;

            // Check if model has all required capabilities
            for (const reqCap of requiredCapabilities) {
                if (!capabilities.has(reqCap)) {
                    hasAllRequiredCapabilities = false;
                    break;
                }
                currentScore++; // Reward for each matching capability
            }

            if (!hasAllRequiredCapabilities) {
                continue;
            }

            // Prioritize preferred role
            if (preferredRole && role === preferredRole) {
                currentScore += 100; // High bonus for preferred role
            }

            // Prioritize higher autonomy level
            currentScore += modelInstance.autonomyLevel * 10; // Scale autonomy level

            // Prioritize idle models over active ones
            if (status === 'idle') {
                currentScore += 5; 
            }

            if (currentScore > bestScore) {
                bestScore = currentScore;
                bestMatch = modelId;
            }
        }

        if (this.debugMode) {
            if (bestMatch) {
                console.log(`Orchestrator: Selected model ${bestMatch} with score ${bestScore}`);
            } else {
                console.log(`Orchestrator: No suitable model found.`);
            }
        }
        return bestMatch;
    }

    // Check if a model can interrupt the current speaker
    _canModelInterrupt(modelId) {
        // If no current speaker, no need to interrupt
        if (!this.currentSpeaker) {
            return true;
        }
        
        // Get model's role
        const roleName = this.modelRoles.get(modelId);
        if (!roleName) {
            return false;
        }
        
        // Get role definition
        const roleDefinition = this.definedRoles.get(roleName);
        if (!roleDefinition) {
            return false;
        }
        
        // Check if role has permission to interrupt
        return roleDefinition.permissions && roleDefinition.permissions.canInterruptOthers === true;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined') {
    module.exports = ModelOrchestrator;
}

// Make available in browser environment
if (typeof window !== 'undefined') {
    window.ModelOrchestrator = ModelOrchestrator;
}


