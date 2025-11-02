const MultiLLMOrchestrator = require('../multi_llm_orchestrator');
const NotionLogger = require('../conversation_logger');

async function runProductCollaboration() {
    // Initialize orchestrator with collaboration configuration
    const orchestrator = new MultiLLMOrchestrator({
        mode: 'collaboration',
        maxTurns: 40,
        turnStrategy: 'expertise-based', // Agents speak based on topic relevance
        turnTimeout: 30000,
        parallelProcessing: false // Sequential for now, can enable for brainstorming
    });

    // Initialize logger for documentation
    const logger = new NotionLogger('product_collaboration_log.md');

    // Event listeners for collaboration tracking
    orchestrator.on('conversation:started', (data) => {
        console.log(`\n💼 Collaboration session started: ${data.conversationId}`);
        console.log(`Topic: ${data.topic}\n`);
        logger.logMessage('System', `Session started - Topic: ${data.topic}`);
    });

    orchestrator.on('message:sent', (message) => {
        console.log(`\n[${message.role}] ${message.agentId}:`);
        console.log(message.content);
        console.log('---');
        logger.logMessage(`${message.role} (${message.agentId})`, message.content);
    });

    orchestrator.on('participant:joined', (data) => {
        console.log(`✅ ${data.role} has joined the discussion`);
    });

    orchestrator.on('conversation:ended', (summary) => {
        console.log('\n📊 Collaboration Summary:');
        console.log(`Duration: ${Math.round(summary.duration / 1000 / 60)} minutes`);
        console.log(`Total contributions: ${summary.totalMessages}`);
        console.log('\nParticipation breakdown:');
        summary.participants.forEach(p => {
            console.log(`  ${p.role}: ${p.messageCount} contributions`);
        });
    });

    // Define the project and participants
    const projectContext = {
        name: 'AI-Powered Customer Service Platform',
        client: 'TechCorp Solutions',
        phase: 'Requirements Gathering & Architecture Planning',
        constraints: {
            budget: '$500K',
            timeline: '6 months',
            team_size: '8-10 developers'
        },
        requirements: [
            'Handle 10,000+ concurrent users',
            'Multi-language support (10 languages)',
            'Integration with existing CRM',
            'Real-time analytics dashboard',
            'Automated escalation to human agents'
        ]
    };

    const participants = [
        {
            agentId: 'claude-3',
            role: 'Solutions Architect',
            personality: 'Systematic and thorough, focuses on scalability and best practices',
            traits: ['detail-oriented', 'security-conscious', 'documentation-focused']
        },
        {
            agentId: 'gpt-4',
            role: 'Product Manager',
            personality: 'Business-focused, balances features with constraints',
            traits: ['pragmatic', 'client-oriented', 'deadline-aware']
        },
        {
            agentId: 'gemini',
            role: 'Lead Developer',
            personality: 'Innovative but practical, enjoys exploring new technologies',
            traits: ['hands-on', 'performance-focused', 'team-oriented']
        }
    ];

    try {
        // Start the collaboration
        await orchestrator.startConversation({
            participants,
            mode: 'collaboration',
            topic: `Design ${projectContext.name} for ${projectContext.client}`,
            scenario: projectContext
        });

        // Simulate client questions/feedback during the discussion
        setTimeout(async () => {
            await orchestrator.injectMessage(
                'Client Update: They specifically want Azure integration and are concerned about GDPR compliance',
                { type: 'client_feedback', priority: 'high' }
            );
        }, 90000); // After 1.5 minutes

        // Simulate a request for specific focus
        setTimeout(async () => {
            await orchestrator.injectMessage(
                'Moderator: Let\'s focus on the technical architecture for the next few exchanges',
                { type: 'moderation', focus: 'architecture' }
            );
        }, 180000); // After 3 minutes

    } catch (error) {
        console.error('Error in collaboration session:', error);
    }
}

// Alternative: Brainstorming session with parallel processing
async function runBrainstormingSession() {
    const orchestrator = new MultiLLMOrchestrator({
        mode: 'brainstorm',
        maxTurns: 20,
        turnStrategy: 'parallel', // All agents contribute simultaneously
        parallelProcessing: true
    });

    orchestrator.on('parallel:responses', (responses) => {
        console.log('\n🧠 Brainstorming Round - All Ideas:');
        responses.forEach(r => {
            console.log(`\n${r.agentId}:`);
            console.log(`💡 ${r.content}`);
        });
        console.log('\n---');
    });

    const participants = [
        { agentId: 'claude-3', role: 'Innovation Lead' },
        { agentId: 'gpt-4', role: 'Market Analyst' },
        { agentId: 'gemini', role: 'Technical Advisor' }
    ];

    await orchestrator.startConversation({
        participants,
        mode: 'brainstorm',
        topic: 'Revolutionary features for AI customer service that competitors don\'t have'
    });
}

// Run the appropriate session
if (require.main === module) {
    // Choose which session to run
    const mode = process.argv[2] || 'collaboration';
    
    if (mode === 'brainstorm') {
        runBrainstormingSession().catch(console.error);
    } else {
        runProductCollaboration().catch(console.error);
    }
}

module.exports = { runProductCollaboration, runBrainstormingSession };