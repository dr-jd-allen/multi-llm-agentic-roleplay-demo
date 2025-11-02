async function sequentialThinkingTool(prompt) {
    const steps = [
        "1. Define the problem clearly",
        "2. Identify available resources",
        "3. Break the goal into sub-goals",
        "4. Sequence tasks and assign agents"
    ];
    return `Here’s a step-by-step plan:\n${steps.join('\n')}`;
}

module.exports = sequentialThinkingTool;
