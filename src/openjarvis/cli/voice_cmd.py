"""``jarvis voice`` — real-time voice-to-voice interaction."""

from __future__ import annotations

import logging
import sys
from typing import Optional

import click
from rich.console import Console

from openjarvis.core.config import load_config
from openjarvis.system import SystemBuilder

logger = logging.getLogger(__name__)


@click.command()
@click.option("-e", "--engine", "engine_key", default=None, help="Engine backend.")
@click.option("-m", "--model", "model_name", default=None, help="Model to use.")
@click.option("-a", "--agent", "agent_name", default=None, help="Agent type.")
@click.option("--tts", "tts_backend", default=None, help="TTS backend.")
@click.option("--voice", "voice_id", default=None, help="Voice ID.")
@click.option("--stt", "stt_backend", default=None, help="STT backend.")
@click.option("--listen-threshold", "--energy", "listen_threshold", default=300.0, help="Energy threshold for VAD.")
@click.option("--wake-word", is_flag=True, help="Only active after 'Jarvis' wake-word.")
def voice(
    engine_key: str | None,
    model_name: str | None,
    agent_name: str | None,
    tts_backend: str | None,
    voice_id: str | None,
    stt_backend: str | None,
    listen_threshold: float,
    wake_word: bool,
) -> None:
    """Start real-time voice-to-voice interaction.

    Jarvis listens for speech, transcribes it, generates a response,
    synthesizes speech, and plays it back.
    """
    console = Console(stderr=True)
    config = load_config()

    # Apply STT override if provided
    if stt_backend:
        config.speech.backend = stt_backend

    try:
        from openjarvis.speech.listener import VoiceListener
        from openjarvis.speech.speaker import VoiceSpeaker
        from openjarvis.core.registry import TTSRegistry
        import openjarvis.agents  # trigger registration
        import openjarvis.speech  # trigger registration
    except ImportError as exc:
        console.print(f"[red]Speech dependencies missing: {exc}[/red]")
        sys.exit(1)

    # Initialize System
    builder = SystemBuilder(config)
    if engine_key:
        builder.engine(engine_key)
    if model_name:
        builder.model(model_name)
    if agent_name:
        builder.agent(agent_name)

    system = builder.build()

    # Resolve TTS
    tts_key = tts_backend or config.digest.tts_backend or "cartesia"
    if not TTSRegistry.contains(tts_key):
        # Fallback to first available if requested one isn't there
        available = TTSRegistry.keys()
        if not available:
            console.print("[red]No TTS backends available.[/red]")
            sys.exit(1)
        tts_key = available[0]

    tts = TTSRegistry.get(tts_key)
    # Instantiate TTS with config if needed
    if isinstance(tts, type):
        tts = tts()

    # Fallback to macOS local TTS if the chosen backend is unhealthy (e.g., missing API keys)
    if not tts.health():
        import platform
        if platform.system() == "Darwin" and TTSRegistry.contains("mac"):
            tts_key = "mac"
            tts = TTSRegistry.get("mac")()
            console.print("[yellow]Original TTS unhealthy (missing key?), falling back to local 'mac' TTS.[/yellow]")

    available_voices = tts.available_voices()
    
    vid = voice_id
    if not vid:
        # Only use the config default voice if the TTS backend matches the config's TTS backend
        configured_tts = getattr(config.digest, "tts_backend", "") or "cartesia"
        if tts_key == configured_tts and getattr(config.digest, "voice_id", ""):
            vid = config.digest.voice_id
        
    if not vid and available_voices:
        vid = available_voices[0]
    elif not vid:
        vid = ""

    console.print(
        f"[green bold]OpenJarvis Voice[/green bold]\n"
        f"  STT: [cyan]{system.speech_backend.backend_id if system.speech_backend else 'None'}[/cyan]\n"
        f"  TTS: [cyan]{tts_key}[/cyan] (Voice: {vid})\n"
        f"  Agent: [cyan]{system.agent_name}[/cyan]\n"
    )

    if not system.speech_backend:
        console.print("[red]No STT backend available.[/red]")
        sys.exit(1)

    console.print("[dim]Listening... (Ctrl+C to stop)[/dim]")

    listener = VoiceListener(energy_threshold=listen_threshold)
    speaker = VoiceSpeaker()

    is_active = not wake_word  # If no wake-word, we start active

    with listener, speaker:
        while True:
            try:
                # 1. Listen for audio
                audio_data = listener.listen()
                if not audio_data:
                    continue

                console.print("[blue]... transcribing ...[/blue]", end="\r")

                # 2. Transcribe
                transcription = system.speech_backend.transcribe(audio_data)
                text = transcription.text.strip()
                if not text:
                    continue

                # Wake-Word logic
                if wake_word:
                    lower_text = text.lower()
                    if "jarvis" in lower_text:
                        # Activate or reset inactivity timer
                        if not is_active:
                            console.print("[yellow]System Activated.[/yellow]")
                        is_active = True
                        # Optional: strip "Jarvis" from the start for cleaner prompt
                        text = text.replace("Jarvis", "").replace("jarvis", "").strip(",. ")
                    elif not is_active:
                        # Ignore silence/background noise if not addressed
                        continue
                
                if not text:
                   continue

                console.print(f"[bold]You:[/bold] {text}")

                # 3. Ask Jarvis
                console.print("[yellow]... thinking ...[/yellow]", end="\r")
                result = system.ask(text)
                response_text = result.get("content", "")
                if not response_text:
                    continue

                console.print(f"[bold]Jarvis:[/bold] {response_text}")

                # 4. Synthesize
                console.print("[magenta]... synthesizing ...[/magenta]", end="\r")
                # Request WAV for speaker compatibility
                tts_result = tts.synthesize(
                    response_text,
                    voice_id=vid,
                    output_format="wav",
                )

                # 5. Play
                speaker.play(tts_result.audio)
                console.print("[dim]Listening...[/dim]")

            except KeyboardInterrupt:
                console.print("\n[dim]Stopping voice session...[/dim]")
                break
            except Exception as exc:
                console.print(f"\n[red]Error: {exc}[/red]")
                logger.exception("Voice session error")


__all__ = ["voice"]
