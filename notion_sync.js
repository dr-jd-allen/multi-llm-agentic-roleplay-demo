const fs = require('fs');
const { spawn } = require('child_process');

const logText = fs.readFileSync('./transcript_log.md', 'utf8');

const headers = {
  Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
  'Notion-Version': '2022-06-28',
  'Content-Type': 'application/json'
};

const pageId = process.env.NOTION_PAGE_ID;

const payload = {
  parent: { page_id: pageId },
  properties: {
    title: {
      title: [{ text: { content: "Lex–Claude Transcript" } }]
    }
  },
  children: logText
    .split('\n\n')
    .filter(Boolean)
    .map((block) => ({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: block.replace(/\*\*/g, '') } }]
      }
    }))
};

const curl = spawn('curl', [
  '-X', 'POST',
  'https://api.notion.com/v1/pages',
  '-H', `Authorization: ${headers.Authorization}`,
  '-H', `Notion-Version: ${headers['Notion-Version']}`,
  '-H', `Content-Type: ${headers['Content-Type']}`,
  '--data', JSON.stringify(payload)
]);

curl.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
});
curl.stderr.on('data', (data) => {
  console.error(`stderr: ${data}`);
});
curl.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Transcript synced to Notion!');
  } else {
    console.error(`❌ Notion sync failed with exit code ${code}`);
  }
});
