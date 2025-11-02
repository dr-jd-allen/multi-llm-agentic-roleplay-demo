// Message Bus for Multi-AI Conversation System
// This module provides a communication channel between different AI models

class MessageBus {
    constructor() {
        this.subscribers = new Map();
        this.messageHistory = [];
        this.messageCounter = 0;
        this.debugMode = true; // Enable debug logging
    }

    // Subscribe to messages
    subscribe(subscriberId, callback) {
        if (this.debugMode) console.log(`MessageBus: ${subscriberId} subscribing to messages`);
        
        if (typeof callback !== 'function') {
            console.error(`MessageBus: Invalid callback provided for ${subscriberId}`);
            return false;
        }
        
        this.subscribers.set(subscriberId, callback);
        
        if (this.debugMode) console.log(`MessageBus: ${subscriberId} subscribed successfully`);
        return true;
    }

    // Unsubscribe from messages
    unsubscribe(subscriberId) {
        if (this.debugMode) console.log(`MessageBus: ${subscriberId} unsubscribing from messages`);
        
        if (!this.subscribers.has(subscriberId)) {
            console.warn(`MessageBus: ${subscriberId} was not subscribed`);
            return false;
        }
        
        this.subscribers.delete(subscriberId);
        
        if (this.debugMode) console.log(`MessageBus: ${subscriberId} unsubscribed successfully`);
        return true;
    }

    // Send a message to a specific recipient
    sendMessage(from, to, content) {
        if (this.debugMode) console.log(`MessageBus: Sending message from ${from} to ${to}`);
        
        // Create message object
        const message = {
            id: `msg_${++this.messageCounter}`,
            from: from,
            to: to,
            timestamp: new Date().toISOString(),
            ...content
        };
        
        // Add to history
        this.messageHistory.push(message);
        
        // Trim history if it gets too long
        if (this.messageHistory.length > 1000) {
            this.messageHistory.shift();
        }
        
        // Deliver to recipient if subscribed
        if (this.subscribers.has(to)) {
            try {
                this.subscribers.get(to)(message);
                if (this.debugMode) console.log(`MessageBus: Message delivered to ${to}`);
            } catch (error) {
                console.error(`MessageBus: Error delivering message to ${to}:`, error);
            }
        } else {
            console.warn(`MessageBus: Recipient ${to} is not subscribed`);
        }
        
        // Also deliver to UI if subscribed
        if (this.subscribers.has('ui')) {
            try {
                this.subscribers.get('ui')(message);
            } catch (error) {
                console.error('MessageBus: Error delivering message to UI:', error);
            }
        }
        
        return message.id;
    }

    // Broadcast a message to all subscribers
    broadcastMessage(from, content) {
        if (this.debugMode) console.log(`MessageBus: Broadcasting message from ${from}`);
        
        // Create message object
        const message = {
            id: `msg_${++this.messageCounter}`,
            from: from,
            to: 'broadcast',
            timestamp: new Date().toISOString(),
            ...content
        };
        
        // Add to history
        this.messageHistory.push(message);
        
        // Trim history if it gets too long
        if (this.messageHistory.length > 1000) {
            this.messageHistory.shift();
        }
        
        // Deliver to all subscribers except sender
        let deliveryCount = 0;
        
        for (const [subscriberId, callback] of this.subscribers.entries()) {
            if (subscriberId !== from) {
                try {
                    callback(message);
                    deliveryCount++;
                } catch (error) {
                    console.error(`MessageBus: Error delivering broadcast to ${subscriberId}:`, error);
                }
            }
        }
        
        if (this.debugMode) console.log(`MessageBus: Broadcast delivered to ${deliveryCount} subscribers`);
        
        return message.id;
    }

    // Get message history
    getMessageHistory(limit = 100, filter = null) {
        let history = [...this.messageHistory];
        
        // Apply filter if provided
        if (filter) {
            if (filter.from) {
                history = history.filter(msg => msg.from === filter.from);
            }
            if (filter.to) {
                history = history.filter(msg => msg.to === filter.to || msg.to === 'broadcast');
            }
            if (filter.type) {
                history = history.filter(msg => msg.type === filter.type);
            }
        }
        
        // Apply limit
        if (history.length > limit) {
            history = history.slice(history.length - limit);
        }
        
        return history;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined') {
    module.exports = MessageBus;
}

// Make available in browser environment
if (typeof window !== 'undefined') {
    window.MessageBus = MessageBus;
}
