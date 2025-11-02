const { Client } = require('@notionhq/client');
const DifyOrchestrator = require('./dify_orchestrator');

class ConversationLogger {
  constructor(notionToken, databaseId) {
    this.notion = new Client({ auth: notionToken });
    this.databaseId = databaseId;
  }

  async logConversation(summary) {
    try {
      // Format messages for Notion
      const formattedMessages = summary.messages.map((msg, idx) => ({
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            type: 'text',
            text: {
              content: `${msg.role.toUpperCase()}: ${msg.content}`
            }
          }]
        }
      }));

      // Create a new page in Notion database
      const response = await this.notion.pages.create({
        parent: { database_id: this.databaseId },
        properties: {
          Name: {
            title: [{
              text: {
                content: `AI Conversation: ${summary.topic}`
              }
            }]
          },
          Type: {
            multi_select: [{ name: 'AI Conversation' }, { name: 'MultiAI' }]
          },
          Status: {
            select: { name: 'Completed' }
          },
          // Add custom properties as needed
        },
        children: [
          {
            type: 'heading_2',
            heading_2: {
              rich_text: [{
                text: { content: 'Conversation Summary' }
              }]
            }
          },
          {
            type: 'paragraph',
            paragraph: {
              rich_text: [{
                text: {
                  content: `Topic: ${summary.topic}\nTotal Turns: ${summary.turnCount}\nDuration: ${Math.round(summary.duration / 1000)} seconds\nConversation ID: ${summary.conversationId}`
                }
              }]
            }
          },
          {
            type: 'divider',
            divider: {}
          },
          {
            type: 'heading_2',
            heading_2: {
              rich_text: [{
                text: { content: 'Full Conversation' }
              }]
            }
          },
          ...formattedMessages
        ]
      });

      console.log('✅ Conversation logged to Notion successfully');
      return response;
    } catch (error) {
      console.error('❌ Error logging to Notion:', error.message);
      throw error;
    }
  }
}

// Integrated example with logging
async function runWithLogging() {
  // Initialize components
  const orchestrator = new DifyOrchestrator({
    DIFY_API_KEY: process.env.DIFY_API_KEY,
    DIFY_WORKFLOW_ID: process.env.DIFY_WORKFLOW_ID,
  });

  const logger = new ConversationLogger(
    process.env.NOTION_TOKEN,
    process.env.NOTION_PAGE_ID
  );

  // Set up automatic logging
  orchestrator.on('conversation-ended', async (summary) => {
    try {
      await logger.logConversation(summary);
    } catch (error) {
      console.error('Failed to log conversation:', error);
    }
  });

  // Run conversation
  const result = await orchestrator.orchestrateConversation(
    "AI Collaboration Best Practices",
    "What are the key considerations for building effective AI-to-AI communication systems?",
    6
  );

  return result;
}

module.exports = { ConversationLogger, runWithLogging };

// Run if executed directly
if (require.main === module) {
  const requiredEnvVars = ['DIFY_API_KEY', 'DIFY_WORKFLOW_ID', 'NOTION_TOKEN', 'NOTION_PAGE_ID'];
  const missingVars = requiredEnvVars.filter(v => !process.env[v]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    process.exit(1);
  }
  
  runWithLogging().catch(console.error);
}