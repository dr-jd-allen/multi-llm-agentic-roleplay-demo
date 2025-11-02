const fs = require('fs');
const path = require('path');

class NotionLogger {
    constructor(logPath = 'transcript_log.md') {
        this.logFile = path.resolve(__dirname, logPath);
        fs.writeFileSync(this.logFile, `# Lex–Claude Transcript\n\n`, { flag: 'w' });
    }

    logMessage(from, content) {
        const timestamp = new Date().toISOString();
        const entry = `**${from}** [${timestamp}]\n> ${content}\n\n`;
        fs.appendFileSync(this.logFile, entry);
    }
}

module.exports = NotionLogger;
