// Minimal client for the MVP backend (SSE over GET with base64 JSON query).

const serverUrlEl = document.getElementById('serverUrl');
const modeEl = document.getElementById('mode');
const msgEl = document.getElementById('message');
const sendBtn = document.getElementById('sendBtn');
const agentListEl = document.getElementById('agentList');
const addAgentBtn = document.getElementById('addAgentBtn');
const streamArea = document.getElementById('streamArea');
const snapshotBtn = document.getElementById('snapshotBtn');
const restoreBtn = document.getElementById('restoreBtn');

// Defaults
serverUrlEl.value = localStorage.getItem('serverUrl') || 'http://localhost:8000';
modeEl.value = localStorage.getItem('mode') || 'chat';

const defaultAgents = [
  { id: 'oai', name: 'GPT‑4o mini', provider: 'openai', model: 'gpt-4o-mini', temperature: 0.2, system_prompt: '' },
  { id: 'claude', name: 'Claude Sonnet 3.7', provider: 'anthropic', model: 'claude-3-7-sonnet', temperature: 0.2, system_prompt: '' },
];

let agents = JSON.parse(localStorage.getItem('agents') || 'null') || defaultAgents;
renderAgents();

serverUrlEl.addEventListener('change', () => localStorage.setItem('serverUrl', serverUrlEl.value));
modeEl.addEventListener('change', () => localStorage.setItem('mode', modeEl.value));

addAgentBtn.addEventListener('click', () => {
  agents.push({ id: `agent${Date.now()}`, name: 'New Agent', provider: 'openai', model: 'gpt-4o-mini', temperature: 0.2, system_prompt: '' });
  saveAgents();
  renderAgents();
});

sendBtn.addEventListener('click', () => {
  const message = msgEl.value.trim();
  if (!message) return;
  const mode = modeEl.value;
  const payload = { message, mode, agents };
  const q = btoa(JSON.stringify(payload));
  const url = `${serverUrlEl.value.replace(/\/$/, '')}/api/chat?q=${encodeURIComponent(q)}`;

  // Create panels
  streamArea.innerHTML = '';
  agents.forEach(a => addStreamPanel(a));

  const es = new EventSource(url);
  es.onmessage = (evt) => {
    // Default event type is "message" — we only use named events.
  };
  es.addEventListener('token', (evt) => {
    const data = JSON.parse(evt.data);
    const panel = document.querySelector(`.stream[data-agent="${data.agent_id}"] pre`);
    if (panel) panel.textContent += data.delta;
  });
  es.addEventListener('write', (evt) => {
    const data = JSON.parse(evt.data);
    const writes = document.querySelector(`.stream[data-agent="${data.agent_id}"] .writes`);
    if (!writes) return;
    const el = document.createElement('div');
    el.className = 'write-item';
    el.innerHTML = `<span class="${data.applied ? 'applied' : 'preview'}">[${data.applied ? 'applied' : 'preview'}]</span>
      <code>${data.file_path}</code> <small>(${data.size} bytes)</small>`;
    writes.appendChild(el);
  });
  es.addEventListener('done', (evt) => {
    const data = JSON.parse(evt.data);
    const head = document.querySelector(`.stream[data-agent="${data.agent_id}"] header`);
    if (head) head.querySelector('.status').textContent = 'done';
  });
  es.addEventListener('error', (evt) => {
    try {
      const data = JSON.parse(evt.data);
      const head = document.querySelector(`.stream[data-agent="${data.agent_id}"] header`);
      const pre = document.querySelector(`.stream[data-agent="${data.agent_id}"] pre`);
      if (head) head.querySelector('.status').textContent = 'error';
      if (pre) pre.textContent += `\n\n[error] ${data.error}`;
    } catch {
      console.warn('raw error event', evt.data);
    }
  });
});

snapshotBtn.addEventListener('click', async () => {
  const r = await fetch(`${serverUrlEl.value.replace(/\/$/, '')}/api/snapshot`, { method: 'POST' });
  const js = await r.json();
  alert(`Snapshot created: ${js.timestamp}`);
});

restoreBtn.addEventListener('click', async () => {
  const r = await fetch(`${serverUrlEl.value.replace(/\/$/, '')}/api/restore`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({}) });
  const js = await r.json();
  alert(`Restored snapshot: ${js.restored}`);
});

function renderAgents() {
  agentListEl.innerHTML = '';
  agents.forEach((a, idx) => agentListEl.appendChild(agentRow(a, idx)));
}

function agentRow(a, idx) {
  const row = document.createElement('div');
  row.className = 'agent';
  row.innerHTML = `
    <input class="wide" placeholder="Name" value="${a.name}"/>
    <select class="provider">
      <option value="openai" ${a.provider==='openai'?'selected':''}>openai</option>
      <option value="anthropic" ${a.provider==='anthropic'?'selected':''}>anthropic</option>
    </select>
    <input class="wide model" placeholder="model" value="${a.model}"/>
    <input class="temp" type="number" step="0.1" min="0" max="2" value="${a.temperature || 0.2}"/>
    <textarea class="system" placeholder="(optional) system prompt overrides">${a.system_prompt || ''}</textarea>
    <button class="secondary remove">Remove</button>
  `;
  const [nameEl, providerEl, modelEl, tempEl, systemEl] = [
    row.querySelector('input.wide'),
    row.querySelector('select.provider'),
    row.querySelector('input.model'),
    row.querySelector('input.temp'),
    row.querySelector('textarea.system'),
  ];
  nameEl.addEventListener('input', () => { a.name = nameEl.value; saveAgents(); });
  providerEl.addEventListener('change', () => { a.provider = providerEl.value; saveAgents(); });
  modelEl.addEventListener('input', () => { a.model = modelEl.value; saveAgents(); });
  tempEl.addEventListener('change', () => { a.temperature = parseFloat(tempEl.value); saveAgents(); });
  systemEl.addEventListener('input', () => { a.system_prompt = systemEl.value; saveAgents(); });

  row.querySelector('.remove').addEventListener('click', () => {
    agents.splice(idx, 1);
    saveAgents();
    renderAgents();
  });
  return row;
}

function saveAgents() {
  localStorage.setItem('agents', JSON.stringify(agents));
}

function addStreamPanel(a) {
  const div = document.createElement('div');
  div.className = 'stream';
  div.dataset.agent = a.id;
  div.innerHTML = `
    <header>
      <strong>${a.name}</strong>
      <span class="status">streaming…</span>
    </header>
    <pre></pre>
    <div class="writes"></div>
  `;
  streamArea.appendChild(div);
}
