const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const MultiLLMOrchestrator = require('./multi_llm_orchestrator');
const NotionLogger = require('./conversation_logger');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Store active conversations
const activeConversations = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        // Clean up any active conversations for this socket
        const conversation = activeConversations.get(socket.id);
        if (conversation && conversation.orchestrator) {
            conversation.orchestrator.conversationState.active = false;
        }
        activeConversations.delete(socket.id);
    });

    // Start a new conversation
    socket.on('start_conversation', async (config) => {
        try {
            console.log('Starting conversation with config:', config);

            // Create orchestrator instance
            const orchestrator = new MultiLLMOrchestrator({
                mode: config.mode,
                maxTurns: config.maxTurns || 50,
                turnStrategy: config.turnStrategy || 'round-robin',
                turnTimeout: config.turnTimeout || 30000
            });

            // Create logger if enabled
            let logger;
            if (config.enableLogging) {
                logger = new NotionLogger(`conversation_${Date.now()}.md`);
            }

            // Set up event forwarding to client
            orchestrator.on('conversation:started', (data) => {
                socket.emit('conversation_started', data);
                if (logger) {
                    logger.logMessage('System', `Conversation started: ${data.topic || 'General discussion'}`);
                }
            });

            orchestrator.on('message:sent', (message) => {
                socket.emit('message', message);
                if (logger) {
                    logger.logMessage(`${message.role} (${message.agentId})`, message.content);
                }
            });

            orchestrator.on('participant:joined', (data) => {
                socket.emit('participant_joined', data);
            });

            orchestrator.on('participant:left', (data) => {
                socket.emit('participant_left', data);
            });

            orchestrator.on('conversation:ended', (summary) => {
                socket.emit('conversation_ended', summary);
                if (logger) {
                    logger.logMessage('System', `Conversation ended. Duration: ${Math.round(summary.duration / 1000 / 60)} minutes`);
                }
                activeConversations.delete(socket.id);
            });

            orchestrator.on('error', (error) => {
                socket.emit('error', error);
                console.error('Orchestrator error:', error);
            });

            // Store the conversation
            activeConversations.set(socket.id, { orchestrator, logger });

            // Start the conversation
            await orchestrator.startConversation({
                participants: config.participants,
                topic: config.topic,
                scenario: config.scenario,
                mode: config.mode
            });

        } catch (error) {
            console.error('Error starting conversation:', error);
            socket.emit('error', { message: error.message });
        }
    });

    // Stop conversation
    socket.on('stop_conversation', () => {
        const conversation = activeConversations.get(socket.id);
        if (conversation && conversation.orchestrator) {
            conversation.orchestrator.conversationState.active = false;
            activeConversations.delete(socket.id);
            socket.emit('conversation_stopped');
        }
    });

    // Add participant
    socket.on('add_participant', async (participant) => {
        const conversation = activeConversations.get(socket.id);
        if (conversation && conversation.orchestrator) {
            try {
                await conversation.orchestrator.addParticipant(participant);
                socket.emit('participant_added', participant);
            } catch (error) {
                socket.emit('error', { message: error.message });
            }
        }
    });

    // Remove participant
    socket.on('remove_participant', async (agentId) => {
        const conversation = activeConversations.get(socket.id);
        if (conversation && conversation.orchestrator) {
            try {
                await conversation.orchestrator.removeParticipant(agentId);
                socket.emit('participant_removed', { agentId });
            } catch (error) {
                socket.emit('error', { message: error.message });
            }
        }
    });

    // Inject message
    socket.on('inject_message', async (data) => {
        const conversation = activeConversations.get(socket.id);
        if (conversation && conversation.orchestrator) {
            try {
                await conversation.orchestrator.injectMessage(data.content, data.metadata);
                socket.emit('message_injected');
            } catch (error) {
                socket.emit('error', { message: error.message });
            }
        }
    });

    // Get available agents
    socket.on('get_agents', () => {
        // Return default agents configuration
        const agents = [
            {
                id: 'claude-3',
                name: 'Claude',
                capabilities: ['analysis', 'ethics', 'creativity', 'coding'],
                personality: 'thoughtful and analytical',
                defaultRoles: ['wizard', 'strategist', 'advisor', 'architect']
            },
            {
                id: 'gpt-4',
                name: 'GPT-4',
                capabilities: ['reasoning', 'planning', 'dialogue', 'problem-solving'],
                personality: 'practical and direct',
                defaultRoles: ['fighter', 'tactician', 'project-manager', 'engineer']
            },
            {
                id: 'gemini',
                name: 'Gemini',
                capabilities: ['research', 'synthesis', 'innovation', 'exploration'],
                personality: 'curious and exploratory',
                defaultRoles: ['rogue', 'researcher', 'creative-director', 'scout']
            }
        ];
        socket.emit('agents_list', agents);
    });

    // Get conversation presets
    socket.on('get_presets', () => {
        const presets = {
            roleplay: [
                {
                    name: "Baldur's Gate 3 - Tavern Planning",
                    mode: 'roleplay',
                    participants: [
                        { agentId: 'claude-3', role: 'Gale of Waterdeep', traits: ['intelligent', 'scholarly'] },
                        { agentId: 'gpt-4', role: 'Karlach', traits: ['enthusiastic', 'loyal'] },
                        { agentId: 'gemini', role: 'Astarion', traits: ['sarcastic', 'charming'] }
                    ],
                    scenario: {
                        setting: 'The Elfsong Tavern',
                        description: 'Planning the next adventure after discovering cult activity'
                    }
                },
                {
                    name: "D&D Campaign - Character Creation",
                    mode: 'roleplay',
                    participants: [
                        { agentId: 'claude-3', role: 'Dungeon Master', traits: ['creative', 'fair'] },
                        { agentId: 'gpt-4', role: 'Player 1', traits: ['strategic', 'curious'] },
                        { agentId: 'gemini', role: 'Player 2', traits: ['imaginative', 'bold'] }
                    ],
                    scenario: {
                        setting: 'Session Zero',
                        description: 'Creating characters and establishing campaign tone'
                    }
                }
            ],
            collaboration: [
                {
                    name: "Product Design Sprint",
                    mode: 'collaboration',
                    participants: [
                        { agentId: 'claude-3', role: 'UX Designer' },
                        { agentId: 'gpt-4', role: 'Product Manager' },
                        { agentId: 'gemini', role: 'Tech Lead' }
                    ],
                    topic: 'Designing AI-powered features for mobile app'
                },
                {
                    name: "Architecture Review",
                    mode: 'collaboration',
                    participants: [
                        { agentId: 'claude-3', role: 'Solutions Architect' },
                        { agentId: 'gpt-4', role: 'Security Expert' },
                        { agentId: 'gemini', role: 'DevOps Engineer' }
                    ],
                    topic: 'Reviewing microservices architecture for scalability'
                }
            ],
            brainstorm: [
                {
                    name: "Feature Ideation",
                    mode: 'brainstorm',
                    participants: [
                        { agentId: 'claude-3', role: 'Innovation Lead' },
                        { agentId: 'gpt-4', role: 'Market Analyst' },
                        { agentId: 'gemini', role: 'Technical Advisor' }
                    ],
                    topic: 'Revolutionary features for next-gen AI assistant'
                }
            ]
        };
        socket.emit('presets_list', presets);
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Start server
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Open your browser to http://localhost:${PORT} to access the GUI`);
});