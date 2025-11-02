const EventEmitter = require('events');
const axios = require('axios');
require('dotenv').config();

class MultiLLMOrchestrator extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            difyApiUrl: process.env.DIFY_API_URL || 'https://api.dify.ai/v1',
            difyApiKey: process.env.DIFY_API_KEY,
            maxTurns: config.maxTurns || 50,
            turnTimeout: config.turnTimeout || 30000,
            conversationMode: config.mode || 'collaboration',
            parallelProcessing: config.parallelProcessing || false,
            ...config
        };

        this.agentRegistry = {};
        this.conversationState = {
            id: this.generateConversationId(),
            mode: this.config.conversationMode,
            participants: [],
            messages: [],
            currentSpeaker: null,
            turnCount: 0,
            startTime: null,
            endTime: null,
            topic: null,
            context: {},
            speakerQueue: [],
            active: false
        };

        this.turnManager = {
            strategy: config.turnStrategy || 'round-robin',
            moderator: config.moderator || null,
            speakingHistory: new Map()
        };

        this.initializeDefaultAgents();
    }

    initializeDefaultAgents() {
        // Default agent configurations - can be overridden
        this.registerAgent('claude-3', {
            name: 'Claude',
            workflowId: process.env.CLAUDE_WORKFLOW_ID,
            capabilities: ['analysis', 'ethics', 'creativity', 'coding'],
            personality: 'thoughtful and analytical',
            defaultRoles: ['wizard', 'strategist', 'advisor', 'architect']
        });

        this.registerAgent('gpt-4', {
            name: 'GPT-4',
            workflowId: process.env.GPT4_WORKFLOW_ID,
            capabilities: ['reasoning', 'planning', 'dialogue', 'problem-solving'],
            personality: 'practical and direct',
            defaultRoles: ['fighter', 'tactician', 'project-manager', 'engineer']
        });

        this.registerAgent('gemini', {
            name: 'Gemini',
            workflowId: process.env.GEMINI_WORKFLOW_ID,
            capabilities: ['research', 'synthesis', 'innovation', 'exploration'],
            personality: 'curious and exploratory',
            defaultRoles: ['rogue', 'researcher', 'creative-director', 'scout']
        });
    }

    registerAgent(agentId, config) {
        this.agentRegistry[agentId] = {
            id: agentId,
            ...config,
            active: false,
            currentRole: null,
            memory: {
                private: [],
                relationships: new Map()
            }
        };
        this.emit('agent:registered', { agentId, config });
    }

    async startConversation(options = {}) {
        const { participants, topic, scenario, mode } = options;
        
        this.conversationState.mode = mode || this.config.conversationMode;
        this.conversationState.topic = topic;
        this.conversationState.scenario = scenario;
        this.conversationState.startTime = new Date();
        this.conversationState.active = true;

        // Initialize participants
        for (const participant of participants) {
            await this.addParticipant(participant);
        }

        this.emit('conversation:started', {
            conversationId: this.conversationState.id,
            participants: this.conversationState.participants,
            mode: this.conversationState.mode,
            topic
        });

        // Start the conversation loop
        if (this.conversationState.mode === 'roleplay') {
            await this.initiateRoleplay(scenario);
        } else {
            await this.initiateDiscussion(topic);
        }
    }

    async addParticipant(participant) {
        const { agentId, role, personality, traits } = participant;
        
        if (!this.agentRegistry[agentId]) {
            throw new Error(`Agent ${agentId} not registered`);
        }

        const agent = this.agentRegistry[agentId];
        agent.active = true;
        agent.currentRole = role || agent.defaultRoles[0];
        agent.personality = personality || agent.personality;
        agent.traits = traits || [];

        this.conversationState.participants.push({
            agentId,
            role: agent.currentRole,
            joinedAt: new Date()
        });

        this.turnManager.speakingHistory.set(agentId, []);

        this.emit('participant:joined', { agentId, role: agent.currentRole });
    }

    async removeParticipant(agentId) {
        const index = this.conversationState.participants.findIndex(p => p.agentId === agentId);
        if (index !== -1) {
            this.conversationState.participants.splice(index, 1);
            this.agentRegistry[agentId].active = false;
            this.emit('participant:left', { agentId });
        }
    }

    async initiateDiscussion(topic) {
        const systemPrompt = this.buildSystemPrompt('discussion', topic);
        
        // Send initial context to all participants
        for (const participant of this.conversationState.participants) {
            await this.sendContextToAgent(participant.agentId, systemPrompt);
        }

        // Start conversation loop
        while (this.conversationState.active && this.conversationState.turnCount < this.config.maxTurns) {
            const nextSpeaker = await this.selectNextSpeaker();
            if (!nextSpeaker) break;

            await this.processTurn(nextSpeaker);
        }

        await this.endConversation();
    }

    async initiateRoleplay(scenario) {
        const systemPrompt = this.buildSystemPrompt('roleplay', scenario);
        
        // Initialize roleplay context
        this.conversationState.context.scenario = scenario;
        this.conversationState.context.setting = scenario.setting || 'fantasy tavern';
        
        // Send scenario to all participants with their character details
        for (const participant of this.conversationState.participants) {
            const agent = this.agentRegistry[participant.agentId];
            const characterPrompt = `${systemPrompt}\n\nYou are playing: ${agent.currentRole}\nPersonality: ${agent.personality}\nTraits: ${agent.traits?.join(', ')}`;
            await this.sendContextToAgent(participant.agentId, characterPrompt);
        }

        // Start roleplay
        while (this.conversationState.active && this.conversationState.turnCount < this.config.maxTurns) {
            const nextSpeaker = await this.selectNextSpeaker();
            if (!nextSpeaker) break;

            await this.processTurn(nextSpeaker);
        }

        await this.endConversation();
    }

    async selectNextSpeaker() {
        const { strategy } = this.turnManager;
        const activeParticipants = this.conversationState.participants.filter(
            p => this.agentRegistry[p.agentId].active
        );

        if (activeParticipants.length === 0) return null;

        let nextSpeaker;

        switch (strategy) {
            case 'round-robin':
                nextSpeaker = this.selectRoundRobin(activeParticipants);
                break;
            case 'interest-based':
                nextSpeaker = await this.selectByInterest(activeParticipants);
                break;
            case 'expertise-based':
                nextSpeaker = this.selectByExpertise(activeParticipants);
                break;
            case 'moderator-controlled':
                nextSpeaker = await this.selectByModerator(activeParticipants);
                break;
            case 'random':
                nextSpeaker = activeParticipants[Math.floor(Math.random() * activeParticipants.length)];
                break;
            default:
                nextSpeaker = this.selectRoundRobin(activeParticipants);
        }

        return nextSpeaker;
    }

    selectRoundRobin(participants) {
        const lastSpeaker = this.conversationState.currentSpeaker;
        if (!lastSpeaker) return participants[0];

        const lastIndex = participants.findIndex(p => p.agentId === lastSpeaker);
        const nextIndex = (lastIndex + 1) % participants.length;
        return participants[nextIndex];
    }

    async selectByInterest(participants) {
        // Ask each agent if they want to speak
        const interests = await Promise.all(
            participants.map(async (p) => {
                const interest = await this.queryAgentInterest(p.agentId);
                return { participant: p, interest };
            })
        );

        // Select the most interested agent
        interests.sort((a, b) => b.interest - a.interest);
        return interests[0]?.participant;
    }

    selectByExpertise(participants) {
        const lastMessage = this.conversationState.messages[this.conversationState.messages.length - 1];
        if (!lastMessage) return participants[0];

        // Match topic to agent capabilities
        const scores = participants.map(p => {
            const agent = this.agentRegistry[p.agentId];
            const score = this.calculateExpertiseScore(lastMessage.content, agent.capabilities);
            return { participant: p, score };
        });

        scores.sort((a, b) => b.score - a.score);
        return scores[0]?.participant;
    }

    async processTurn(speaker) {
        this.conversationState.currentSpeaker = speaker.agentId;
        this.conversationState.turnCount++;

        const agent = this.agentRegistry[speaker.agentId];
        const context = this.buildAgentContext(speaker.agentId);

        try {
            // Get response from agent via Dify
            const response = await this.callDifyWorkflow(agent.workflowId, context);
            
            const message = {
                id: this.generateMessageId(),
                agentId: speaker.agentId,
                role: agent.currentRole,
                content: response.content,
                timestamp: new Date(),
                turnNumber: this.conversationState.turnCount,
                metadata: response.metadata || {}
            };

            this.conversationState.messages.push(message);
            this.turnManager.speakingHistory.get(speaker.agentId).push(message);

            this.emit('message:sent', message);

            // Check for conversation end conditions
            if (await this.shouldEndConversation(message)) {
                this.conversationState.active = false;
            }

        } catch (error) {
            this.emit('error', { agentId: speaker.agentId, error });
            console.error(`Error processing turn for ${speaker.agentId}:`, error);
        }
    }

    buildAgentContext(agentId) {
        const agent = this.agentRegistry[agentId];
        const recentMessages = this.conversationState.messages.slice(-10);
        
        const context = {
            conversationId: this.conversationState.id,
            mode: this.conversationState.mode,
            agentRole: agent.currentRole,
            agentPersonality: agent.personality,
            agentTraits: agent.traits,
            scenario: this.conversationState.scenario,
            messages: recentMessages.map(m => ({
                speaker: this.agentRegistry[m.agentId].name,
                role: m.role,
                content: m.content,
                timestamp: m.timestamp
            })),
            privateMemory: agent.memory.private.slice(-5),
            relationships: Array.from(agent.memory.relationships.entries())
        };

        return context;
    }

    async callDifyWorkflow(workflowId, context) {
        const payload = {
            inputs: {
                context: JSON.stringify(context),
                mode: this.conversationState.mode,
                instruction: this.buildInstruction(context)
            },
            response_mode: 'blocking',
            user: context.agentRole
        };

        try {
            const response = await axios.post(
                `${this.config.difyApiUrl}/workflows/run`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${this.config.difyApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    params: { workflow_id: workflowId }
                }
            );

            return {
                content: response.data.data.outputs.text || response.data.data.outputs.response,
                metadata: response.data.data.outputs.metadata || {}
            };
        } catch (error) {
            console.error('Dify API error:', error.response?.data || error.message);
            throw error;
        }
    }

    buildInstruction(context) {
        const { mode, agentRole, messages } = context;
        
        let instruction = `You are ${agentRole} in a ${mode} conversation. `;
        
        if (mode === 'roleplay') {
            instruction += `Stay in character and respond naturally to the ongoing scenario. `;
        } else if (mode === 'collaboration') {
            instruction += `Contribute constructively to the discussion, building on others' ideas. `;
        }

        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            instruction += `The last speaker was ${lastMessage.speaker}. Respond appropriately.`;
        }

        return instruction;
    }

    buildSystemPrompt(mode, context) {
        const prompts = {
            roleplay: `You are participating in a collaborative roleplay scenario. ${context.description || ''}
Setting: ${context.setting || 'A fantasy world'}
Objective: Create an engaging, collaborative story with other participants.
Rules:
- Stay in character at all times
- Build on what others contribute
- Don't contradict established facts
- Keep responses concise but engaging`,

            discussion: `You are participating in a multi-agent discussion about: ${context}
Your goal is to contribute meaningfully to the conversation by:
- Sharing relevant insights from your perspective
- Building on others' ideas
- Asking clarifying questions when needed
- Helping reach constructive conclusions`,

            collaboration: `You are part of a team working on: ${context}
Your role is to:
- Contribute your expertise to the project
- Coordinate with other team members
- Identify actionable next steps
- Help build consensus on decisions`,

            debate: `You are participating in a structured debate on: ${context}
Guidelines:
- Present clear arguments with evidence
- Respectfully challenge other viewpoints  
- Acknowledge valid points from others
- Work toward understanding different perspectives`
        };

        return prompts[mode] || prompts.discussion;
    }

    async shouldEndConversation(lastMessage) {
        // Natural ending detection
        const endingPhrases = [
            'goodbye', 'farewell', 'see you later', 'that concludes',
            'meeting adjourned', 'let\'s wrap up', 'that\'s all for now'
        ];

        const hasEndingPhrase = endingPhrases.some(phrase => 
            lastMessage.content.toLowerCase().includes(phrase)
        );

        // Check if all participants have spoken recently
        const recentSpeakers = new Set(
            this.conversationState.messages.slice(-this.conversationState.participants.length)
                .map(m => m.agentId)
        );
        const allHaveSpoken = recentSpeakers.size === this.conversationState.participants.length;

        // Mode-specific ending conditions
        if (this.conversationState.mode === 'collaboration' && this.hasReachedConsensus()) {
            return true;
        }

        return hasEndingPhrase && allHaveSpoken;
    }

    hasReachedConsensus() {
        // Simple consensus detection - can be made more sophisticated
        const recentMessages = this.conversationState.messages.slice(-5);
        const agreements = recentMessages.filter(m => 
            m.content.toLowerCase().includes('agree') ||
            m.content.toLowerCase().includes('consensus') ||
            m.content.toLowerCase().includes('aligned')
        );
        
        return agreements.length >= Math.floor(this.conversationState.participants.length * 0.7);
    }

    async endConversation() {
        this.conversationState.endTime = new Date();
        this.conversationState.active = false;

        const summary = {
            conversationId: this.conversationState.id,
            mode: this.conversationState.mode,
            topic: this.conversationState.topic,
            participants: this.conversationState.participants.map(p => ({
                ...p,
                messageCount: this.turnManager.speakingHistory.get(p.agentId)?.length || 0
            })),
            duration: this.conversationState.endTime - this.conversationState.startTime,
            totalMessages: this.conversationState.messages.length,
            turns: this.conversationState.turnCount
        };

        this.emit('conversation:ended', summary);
        
        return summary;
    }

    generateConversationId() {
        return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    calculateExpertiseScore(content, capabilities) {
        // Simple keyword matching - can be enhanced with embeddings
        let score = 0;
        const keywords = content.toLowerCase().split(/\s+/);
        
        for (const capability of capabilities) {
            if (keywords.includes(capability.toLowerCase())) {
                score += 2;
            }
            // Partial matches
            if (keywords.some(k => k.includes(capability.toLowerCase().substr(0, 4)))) {
                score += 1;
            }
        }
        
        return score;
    }

    async queryAgentInterest(agentId) {
        // Simplified interest calculation - can be enhanced
        const agent = this.agentRegistry[agentId];
        const recentMessages = this.turnManager.speakingHistory.get(agentId) || [];
        
        // Less recent participation = higher interest
        const timeSinceLastSpoke = recentMessages.length > 0 
            ? Date.now() - recentMessages[recentMessages.length - 1].timestamp
            : Infinity;
            
        return Math.min(10, timeSinceLastSpoke / 10000);
    }

    // Parallel processing for brainstorming mode
    async processParallelResponses(topic) {
        const responses = await Promise.all(
            this.conversationState.participants.map(async (participant) => {
                const agent = this.agentRegistry[participant.agentId];
                const context = this.buildAgentContext(participant.agentId);
                
                try {
                    const response = await this.callDifyWorkflow(agent.workflowId, {
                        ...context,
                        instruction: `Contribute a brief idea about: ${topic}`
                    });
                    
                    return {
                        agentId: participant.agentId,
                        content: response.content,
                        timestamp: new Date()
                    };
                } catch (error) {
                    console.error(`Error getting response from ${participant.agentId}:`, error);
                    return null;
                }
            })
        );

        return responses.filter(r => r !== null);
    }

    async sendContextToAgent(agentId, context) {
        // Store context for the agent - this is a simplified implementation
        // In a real system, you might send this to the Dify workflow
        const agent = this.agentRegistry[agentId];
        if (agent) {
            agent.lastContext = context;
        }
    }

    // Utility methods for external control
    async injectMessage(content, metadata = {}) {
        const message = {
            id: this.generateMessageId(),
            agentId: 'system',
            role: 'moderator',
            content,
            timestamp: new Date(),
            turnNumber: this.conversationState.turnCount,
            metadata
        };

        this.conversationState.messages.push(message);
        this.emit('message:injected', message);
    }

    getConversationState() {
        return { ...this.conversationState };
    }

    getAgentState(agentId) {
        return { ...this.agentRegistry[agentId] };
    }

    updateAgentPersonality(agentId, updates) {
        const agent = this.agentRegistry[agentId];
        if (agent) {
            Object.assign(agent, updates);
            this.emit('agent:updated', { agentId, updates });
        }
    }
}

module.exports = MultiLLMOrchestrator;