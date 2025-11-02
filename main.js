// Main initialization and UI handling for Multi-AI Conversation System

// Global variables
let messageBus = null;
let orchestrator = null;
let claudeAdapter = null;
let chatgptAdapter = null;
let geminiAdapter = null;
let conversationActive = false;

// Initialize the system when page loads
window.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Multi-AI Conversation System...');
    initializeSystem();
});

// Initialize all components
async function initializeSystem() {
    try {
        // Create message bus
        messageBus = new MessageBus();
        
        // Create orchestrator
        orchestrator = new ModelOrchestrator(messageBus);
        
        // Subscribe UI to message bus
        messageBus.subscribe('ui', handleMessageForUI);
        
        // Initialize AI adapters
        await initializeAdapters();
        
        // Update UI
        updateStatus('Ready', true);
        document.getElementById('startBtn').disabled = false;
        
        console.log('System initialized successfully');
    } catch (error) {
        console.error('Failed to initialize system:', error);
        updateStatus('Initialization failed', false);
    }
}

// Initialize AI adapters
async function initializeAdapters() {
    // Create adapters with mock API endpoints
    claudeAdapter = new ClaudeAdapter({
        modelId: 'claude',
        autonomyLevel: 0.8
    });
    
    chatgptAdapter = new ChatGPTAdapter({
        modelId: 'chatgpt',
        autonomyLevel: 0.7
    });
    
    geminiAdapter = new GeminiVisionAdapter({
        modelId: 'gemini',
        autonomyLevel: 0.9
    });
    
    // Override API calls with mock responses
    overrideAPICallsWithMocks();
    
    // Initialize adapters
    const claudeInit = await claudeAdapter.initialize(messageBus, orchestrator);
    const chatgptInit = await chatgptAdapter.initialize(messageBus, orchestrator);
    const geminiInit = await geminiAdapter.initialize(messageBus, orchestrator);
    
    if (!claudeInit || !chatgptInit || !geminiInit) {
        throw new Error('Failed to initialize one or more adapters');
    }
    
    // Update model status display
    document.getElementById('claude-status').textContent = 'Ready';
    document.getElementById('chatgpt-status').textContent = 'Ready';
    document.getElementById('gemini-status').textContent = 'Ready';
}

// Override API calls with mock responses for testing
function overrideAPICallsWithMocks() {
    // Mock responses for each AI
    const mockResponses = {
        claude: [
            "That's an interesting perspective. Let me think about this more deeply...",
            "I appreciate the nuanced view here. Building on what was said...",
            "This reminds me of a broader pattern we might consider...",
            "I'd like to explore the implications of this idea further..."
        ],
        chatgpt: [
            "From an analytical standpoint, we should consider...",
            "The data suggests several interesting possibilities here...",
            "Let me break this down into key components...",
            "This raises some important questions about..."
        ],
        gemini: [
            "Picture this: a vast digital landscape stretches before us, pixels shimmering like stars...",
            "The scene unfolds with vibrant colors - deep blues mixing with electric purples...",
            "Visualize a network of interconnected nodes, pulsing with data streams...",
            "Imagine standing at the intersection of technology and creativity..."
        ]
    };
    
    // Override Claude's API call
    claudeAdapter._callClaudeAPI = async function(prompt) {
        await simulateDelay();
        const responses = mockResponses.claude;
        return responses[Math.floor(Math.random() * responses.length)];
    };
    
    // Override ChatGPT's API call
    chatgptAdapter._callChatGPTAPI = async function(prompt) {
        await simulateDelay();
        const responses = mockResponses.chatgpt;
        return responses[Math.floor(Math.random() * responses.length)];
    };
    
    // Override Gemini's API call
    geminiAdapter._callGeminiAPI = async function(prompt) {
        await simulateDelay();
        const responses = mockResponses.gemini;
        return responses[Math.floor(Math.random() * responses.length)];
    };
}

// Simulate API delay
function simulateDelay() {
    return new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
}

// Start a conversation
function startConversation() {
    const topicInput = document.getElementById('topicInput');
    const topic = topicInput.value.trim() || 'General Discussion';
    
    console.log('Starting conversation on topic:', topic);
    
    // Start conversation through orchestrator
    const result = orchestrator.startConversation(topic);
    
    if (result.success) {
        conversationActive = true;
        
        // Update UI
        document.getElementById('startBtn').disabled = true;
        document.getElementById('stopBtn').disabled = false;
        document.getElementById('userInput').disabled = false;
        document.getElementById('sendBtn').disabled = false;
        updateStatus('Active', true);
        
        // Add system message
        addMessage('system', `Conversation started. Topic: ${topic}`);
        
        // Trigger initial conversation
        setTimeout(() => {
            messageBus.broadcastMessage('system', {
                type: 'control',
                content: 'initiate_conversation',
                metadata: { topic: topic }
            });
        }, 1000);
    }
}

// Stop the conversation
function stopConversation() {
    console.log('Stopping conversation');
    
    orchestrator.endConversation();
    conversationActive = false;
    
    // Update UI
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
    document.getElementById('userInput').disabled = true;
    document.getElementById('sendBtn').disabled = true;
    updateStatus('Inactive', false);
    
    // Add system message
    addMessage('system', 'Conversation ended');
}

// Send user message
function sendUserMessage() {
    const input = document.getElementById('userInput');
    const message = input.value.trim();
    
    if (!message || !conversationActive) return;
    
    // Clear input
    input.value = '';
    
    // Add user message to display
    addMessage('user', message);
    
    // Broadcast user message
    messageBus.broadcastMessage('user', {
        type: 'text',
        content: message
    });
}

// Handle messages for UI display
function handleMessageForUI(message) {
    console.log('UI received message:', message);
    
    // Don't display control or meta messages
    if (message.type === 'control' || message.type === 'meta') {
        return;
    }
    
    // Display the message
    if (message.from !== 'user' && message.from !== 'system') {
        addMessage(message.from, message.content);
    }
    
    // Update current speaker display
    const conversationState = orchestrator.getConversationState();
    updateCurrentSpeaker(conversationState.currentSpeaker);
}

// Add message to chat display
function addMessage(sender, content) {
    const messagesDiv = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const headerDiv = document.createElement('div');
    headerDiv.className = 'message-header';
    
    const senderSpan = document.createElement('span');
    senderSpan.textContent = sender.charAt(0).toUpperCase() + sender.slice(1);
    
    const timeSpan = document.createElement('span');
    timeSpan.className = 'message-time';
    timeSpan.textContent = new Date().toLocaleTimeString();
    
    headerDiv.appendChild(senderSpan);
    headerDiv.appendChild(timeSpan);
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;
    
    messageDiv.appendChild(headerDiv);
    messageDiv.appendChild(contentDiv);
    
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Update status indicator
function updateStatus(text, active) {
    document.getElementById('statusText').textContent = text;
    const dot = document.getElementById('statusDot');
    if (active) {
        dot.classList.add('active');
    } else {
        dot.classList.remove('active');
    }
}

// Update current speaker display
function updateCurrentSpeaker(speaker) {
    const speakerDiv = document.getElementById('currentSpeaker');
    if (speaker) {
        speakerDiv.textContent = speaker.charAt(0).toUpperCase() + speaker.slice(1);
        speakerDiv.style.color = '#333';
        speakerDiv.style.fontWeight = 'bold';
    } else {
        speakerDiv.textContent = 'None';
        speakerDiv.style.color = '#666';
        speakerDiv.style.fontWeight = 'normal';
    }
}

// Handle Enter key in input fields
document.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        if (event.target.id === 'userInput') {
            sendUserMessage();
        } else if (event.target.id === 'topicInput' && !conversationActive) {
            startConversation();
        }
    }
});