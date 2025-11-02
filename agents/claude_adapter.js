class ClaudeAdapter {
    constructor(config = {}) {
        this.modelId = config.modelId || 'claude';
    }

    async initialize(messageBus, orchestrator) {
        this.messageBus = messageBus;
        this.orchestrator = orchestrator;
        this.messageBus.subscribe(this.modelId, (msg) => this._handle(msg));
        return true;
    }

    async _handle(message) {
        console.log(`[Claude] received: ${message.content}`);
    }
}

module.exports = { ClaudeAdapter };
