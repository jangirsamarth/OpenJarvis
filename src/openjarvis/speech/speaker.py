"""Audio output utility for playing speech."""

from __future__ import annotations

import io
import logging
import wave
from typing import Optional

try:
    import pyaudio
except ImportError:
    pyaudio = None

logger = logging.getLogger(__name__)


class VoiceSpeaker:
    """Simple audio player using PyAudio."""

    def __init__(self, chunk_size: int = 1024) -> None:
        self.chunk_size = chunk_size
        self._pyaudio: Optional[pyaudio.PyAudio] = None

    def __enter__(self) -> VoiceSpeaker:
        if pyaudio is None:
            raise ImportError("pyaudio is not installed.")
        self._pyaudio = pyaudio.PyAudio()
        return self

    def __exit__(self, *args) -> None:
        if self._pyaudio:
            self._pyaudio.terminate()

    def play(self, audio_bytes: bytes) -> None:
        """Play WAV audio bytes."""
        if not self._pyaudio:
            raise RuntimeError("VoiceSpeaker must be used as a context manager.")

        with wave.open(io.BytesIO(audio_bytes), "rb") as wf:
            stream = self._pyaudio.open(
                format=self._pyaudio.get_format_from_width(wf.getsampwidth()),
                channels=wf.getnchannels(),
                rate=wf.getframerate(),
                output=True,
            )
            try:
                data = wf.readframes(self.chunk_size)
                while data:
                    stream.write(data)
                    data = wf.readframes(self.chunk_size)
            finally:
                stream.stop_stream()
                stream.close()
