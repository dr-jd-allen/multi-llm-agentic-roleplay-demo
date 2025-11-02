>>> import livekit
>>> print (dir(livekit)
... )
['__doc__', '__file__', '__loader__', '__name__', '__package__', '__path__', '__spec__', 'agents', 'api', 'protocol', 'rtc']
>>> import livekit
>>> from livekit import __doc__, __file__, __name__, __loader__, __path__, agents, api, rtc
>>> from livekit.agents import (
...     Agent,
...     AgentEvent,
...     AgentStateChangedEvent,
...     ChatContent,
...     ChatContext,
...     ChatItem,
...     ChatMessage,
...     ChatRole,
...     APIConnectOptions,
...     AgentSession,
...     AgentChangedEvent,
...     ConversationItemAddedEvent,
...     BuiltinAudioClip,
...     CloseEvent,
...     DEFAULT_API_CONNECT_OPTIONS,
...     JobContext,
...     JobExecutorType,
...     JobProcess,
...     JobRequest,
...     Model Settings,
...     RoomInputOptions,
...     RoomOutputOptions,
...     RunContext,
...     SpeechCreatedEvent,
...     StopResponse,
...     UserInputTranscribedEvent,
...     UserStateChangedEvent,
...     Worker,
...     WorkerOptions,
...     WorkerPermissions,
...     WorkerType,
...     llm,
...     log,
...     tts,
...     types,
...     vad,
...     voice
... )
>>> from livekit.plugins import openai, anthropic, google, elevenlabs
>>> import asyncio

>>>class WizardAgent(Agent):
    def __init__(self):
        super().__init__(
            instructions="""
            You are Gale, a wizard with a verbose speaking style and deep knowledge of magic.
            You often reference obscure magical theory and have strong opinions about proper spellcasting.
            Respond to game events and other characters in character.
            """,
            llm=anthropic.LLM(model="claude-3-5-sonnet-20241022", temperature=0.7),
            tts=elevenlabs.TTS(
                voice="your-wizard-voice-id",
                model="eleven_turbo_v2_5",
                voice_settings=elevenlabs.VoiceSettings(
                    stability=0.8,
                    similarity_boost=0.7
                )
            )
        )

class WarriorAgent(Agent):
    def __init__(self):
        super().__init__(
            instructions="""
            You are Karlach, a tiefling barbarian with a fiery personality.
            You speak with enthusiasm and directness, often making combat-focused observations.
            You're loyal but quick to suggest violent solutions to problems.
            """,
            llm=openai.LLM(model="gpt-4o", temperature=0.8),
            tts=elevenlabs.TTS(
                voice="your-warrior-voice-id",
                model="eleven_turbo_v2_5",
                voice_settings=elevenlabs.VoiceSettings(
                    stability=0.4,
                    similarity_boost=0.9,
                    style=0.7
                )
            )
        )

class RogueAgent(Agent):
    def __init__(self):
        super().__init__(
            instructions="""
            You are Astarion, a vampire spawn rogue with a sarcastic wit.
            You make dark jokes, comment on the absurdity of situations, and occasionally
            hint at your vampiric nature. You're self-serving but can show surprising depth.
            """,
            llm=google.LLM(model="gemini-2.0-flash-001", temperature=0.9),
            tts=elevenlabs.TTS(
                voice="your-rogue-voice-id",
                model="eleven_turbo_v2_5",
                voice_settings=elevenlabs.VoiceSettings(
                    stability=0.6,
                    similarity_boost=0.8,
                    style=0.5
                )
            )
        )

