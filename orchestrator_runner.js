const fs = require('fs');
const { Configuration, OpenAIApi } = require('openai');
const sequentialThinkingTool = require('./tools/sequential_thinking_tool');
const NotionLogger = require('./notion_logger');
const fetch = require('node-fetch');

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
  organization: "org-HNxXld9p3h6k8vsR5ONFaZy0"
});
const openai = new OpenAIApi(configuration);

const memory = [];

async function simulateTurn(from, message) {
  const timestamp = new Date().toISOString();
  const formatted = `**${from}** [${timestamp}]\n> ${message}\n\n`;
  console.log(formatted);
  memory.push({ from, message });
  return formatted;
}

async function generateLexReply() {
  const context = memory.map(m => `${m.from}: ${m.message}`).join('\n');
  const response = await openai.createChatCompletion({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are Lex, a collaborative and agentic AI working alongside Claude and various tools. Take initiative if relevant, and use shared memory." },
      { role: "user", content: `Here's our conversation so far:\n${context}\n\nWhat should you say next?` }
    ],
    temperature: 0.7
  });
  return response.data.choices[0].message.content;
}

async function generateClaudeReply() {
  const context = memory.map(m => `${m.from}: ${m.message}`).join('\n');
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: "claude-3-sonnet-20240229",
      max_tokens: 512,
      temperature: 0.7,
      messages: [
        { role: "user", content: `Here's our conversation so far:\n${context}\n\nWhat would you say next?` }
      ]
    })
  });

  const data = await response.json();
  return data.content?.[0]?.text || "(Claude reply unavailable)";
}

(async () => {
  const logger = new NotionLogger();

  const turns = [];

  turns.push({ from: 'Lex', message: "Claude, let's break this down using sequential thinking." });
  turns.push({ from: 'Tool', message: await sequentialThinkingTool("Break it down.") });
  turns.push({ from: 'Claude', message: "Thanks, Lex. Step 2 could include people, and we might need a feedback loop at the end." });

  for (const turn of turns) {
    const output = await simulateTurn(turn.from, turn.message);
    logger.logMessage(turn.from, turn.message);
  }

  const lexDynamic = await generateLexReply();
  await simulateTurn('Lex', lexDynamic);
  logger.logMessage('Lex', lexDynamic);

  const claudeDynamic = await generateClaudeReply();
  await simulateTurn('Claude', claudeDynamic);
  logger.logMessage('Claude', claudeDynamic);

  console.log("💾 Transcript written to transcript_log.md");
})();
