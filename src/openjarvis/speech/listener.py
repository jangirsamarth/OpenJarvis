"""Audio listener for capturing speech from the microphone."""

from __future__ import annotations

import io
import logging
import wave
from typing import Callable, Optional

import numpy as np

try:
    import pyaudio
except ImportError:
    pyaudio = None


logger = logging.getLogger(__name__)


class VoiceListener:
    """Microphone listener with energy-based Voice Activity Detection (VAD)."""

    def __init__(
        self,
        sample_rate: int = 16000,
        chunk_size: int = 1024,
        energy_threshold: float = 300.0,
        pause_threshold_seconds: float = 1.0,
        phrase_time_limit_seconds: Optional[float] = None,
    ) -> None:
        self.sample_rate = sample_rate
        self.chunk_size = chunk_size
        self.energy_threshold = energy_threshold
        self.pause_threshold = pause_threshold_seconds
        self.phrase_time_limit = phrase_time_limit_seconds

        self._pyaudio: Optional[pyaudio.PyAudio] = None
        self._stream: Optional[pyaudio.Stream] = None

    def __enter__(self) -> VoiceListener:
        if pyaudio is None:
            raise ImportError(
                "pyaudio is not installed. Install with: brew install portaudio && uv pip install pyaudio"
            )
        self._pyaudio = pyaudio.PyAudio()
        return self

    def __exit__(self, *args) -> None:
        if self._stream:
            self._stream.stop_stream()
            self._stream.close()
        if self._pyaudio:
            self._pyaudio.terminate()

    def listen(self, status_callback: Optional[Callable[[str], None]] = None) -> bytes:
        """Listen until speech is detected and silence follows.

        Returns:
            The captured audio as WAV bytes.
        """
        if self._pyaudio is None:
            raise RuntimeError("VoiceListener must be used as a context manager.")

        if self._stream is None:
            self._stream = self._pyaudio.open(
                format=pyaudio.paInt16,
                channels=1,
                rate=self.sample_rate,
                input=True,
                frames_per_buffer=self.chunk_size,
            )

        if status_callback:
            status_callback("Listening...")

        # Clear any stale frames
        frames: list[bytes] = []
        silent_chunks = 0
        speaking = False
        pause_chunks = int(self.pause_threshold * self.sample_rate / self.chunk_size)
        
        # Flush the buffer of any noise from during the speaker's playback
        # This helps ignore background noise that occurred while Jarvis was talking
        for _ in range(2):
           if self._stream.get_read_available() >= self.chunk_size:
               self._stream.read(self.chunk_size, exception_on_overflow=False)

        max_frames = None
        if self.phrase_time_limit:
            max_frames = int(self.phrase_time_limit * self.sample_rate / self.chunk_size)

        while True:
            data = self._stream.read(self.chunk_size, exception_on_overflow=False)
            audio_data = np.frombuffer(data, dtype=np.int16).astype(np.float64)
            energy = np.sqrt(np.mean(audio_data**2))

            if energy > self.energy_threshold:
                if not speaking:
                    speaking = True
                    if status_callback:
                        status_callback("Speaking...")
                silent_chunks = 0
                frames.append(data)
            elif speaking:
                silent_chunks += 1
                frames.append(data)
                if silent_chunks > pause_chunks:
                    break
            else:
                # Still waiting for speech, keep a small buffer of pre-speech audio
                frames.append(data)
                if len(frames) > pause_chunks // 2:
                    frames.pop(0)
            
            # Check time limit
            if max_frames and len(frames) > max_frames:
                if status_callback:
                    status_callback("Time limit reached.")
                break

        if status_callback:
            status_callback("Processing...")

        # Convert to WAV
        buf = io.BytesIO()
        with wave.open(buf, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(self._pyaudio.get_sample_size(pyaudio.paInt16))
            wf.setframerate(self.sample_rate)
            wf.writeframes(b"".join(frames))
        
        return buf.getvalue()
