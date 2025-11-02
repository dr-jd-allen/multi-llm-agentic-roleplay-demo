const MultiLLMOrchestrator = require('../multi_llm_orchestrator');
const NotionLogger = require('../conversation_logger');

async function runBaldursGateScenario() {
    // Initialize orchestrator with roleplay configuration
    const orchestrator = new MultiLLMOrchestrator({
        mode: 'roleplay',
        maxTurns: 30,
        turnStrategy: 'interest-based', // Characters speak when they have something to contribute
        turnTimeout: 45000 // 45 seconds for rich roleplay responses
    });

    // Initialize conversation logger
    const logger = new NotionLogger('bg3_roleplay_log.md');

    // Set up event listeners
    orchestrator.on('conversation:started', (data) => {
        console.log(`\n🎭 Adventure begins! Session: ${data.conversationId}\n`);
        logger.logMessage('System', `Adventure started with ${data.participants.length} characters`);
    });

    orchestrator.on('message:sent', (message) => {
        console.log(`\n${message.role} (${message.agentId}):`);
        console.log(`"${message.content}"\n`);
        logger.logMessage(message.role, message.content);
    });

    orchestrator.on('conversation:ended', (summary) => {
        console.log('\n🏁 Adventure concluded!');
        console.log(`Duration: ${Math.round(summary.duration / 1000 / 60)} minutes`);
        console.log(`Total exchanges: ${summary.totalMessages}`);
        
        // Log character participation
        summary.participants.forEach(p => {
            console.log(`${p.role}: ${p.messageCount} contributions`);
        });
    });

    // Define the scenario
    const scenario = {
        setting: 'The Elfsong Tavern in Baldur\'s Gate',
        description: `The party has just returned from investigating mysterious disappearances in the Lower City. 
                     They've discovered clues pointing to a cult of Bhaal operating in the sewers.`,
        objective: 'Discuss findings and plan the next move',
        atmosphere: 'Tense but determined, with undercurrents of dark humor'
    };

    // Define characters and their players
    const participants = [
        {
            agentId: 'claude-3',
            role: 'Gale of Waterdeep',
            personality: 'Verbose wizard with a penchant for magical theory and bad timing',
            traits: ['intelligent', 'scholarly', 'slightly pompous', 'secretly worried about his condition']
        },
        {
            agentId: 'gpt-4',
            role: 'Karlach',
            personality: 'Enthusiastic tiefling barbarian with an infernal engine for a heart',
            traits: ['optimistic', 'loyal', 'battle-ready', 'touchingly vulnerable']
        },
        {
            agentId: 'gemini',
            role: 'Astarion',
            personality: 'Vampire spawn rogue with a sharp wit and questionable morals',
            traits: ['sarcastic', 'self-serving', 'charming', 'secretly traumatized']
        }
    ];

    // Optional: Add a fourth character if you have another agent
    // participants.push({
    //     agentId: 'llama-3',
    //     role: 'Shadowheart',
    //     personality: 'Mysterious cleric of Shar with hidden depths',
    //     traits: ['guarded', 'devoted', 'pragmatic', 'conflicted']
    // });

    try {
        // Start the roleplay session
        await orchestrator.startConversation({
            participants,
            scenario,
            mode: 'roleplay',
            topic: 'Planning assault on Bhaal cult hideout'
        });

        // The conversation will run automatically until a natural ending
        // or the turn limit is reached

        // Optional: Inject DM narration at specific points
        setTimeout(() => {
            orchestrator.injectMessage(
                '*The tavern door bursts open as a bloodied city guard stumbles in*',
                { type: 'narration' }
            );
        }, 60000); // After 1 minute

    } catch (error) {
        console.error('Error in roleplay session:', error);
    }
}

// Run the scenario
if (require.main === module) {
    runBaldursGateScenario().catch(console.error);
}

module.exports = { runBaldursGateScenario };