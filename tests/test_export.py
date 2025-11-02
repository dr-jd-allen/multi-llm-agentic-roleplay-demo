#!/usr/bin/env python3
"""Test the ChatGPT export script with sample data."""

from chatgpt_export import ConversationExporter
import os

# Test with sample conversation
exporter = ConversationExporter("/Users/jdallen_pro/Projects/agents/lex-claude-demo")

# Process the sample conversation
try:
    filename, content = exporter.process_conversation_file("sample_conversation.json")
    print(f"Generated filename: {filename}")
    print("\nMarkdown content preview (first 1000 chars):")
    print("-" * 50)
    print(content[:1000])
    print("-" * 50)
    
    # Save the file
    output_path = os.path.join("/Users/jdallen_pro/Projects/agents/lex-claude-demo", filename)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"\n✓ Successfully exported to: {output_path}")
    
except Exception as e:
    print(f"✗ Error during test: {e}")
    import traceback
    traceback.print_exc()