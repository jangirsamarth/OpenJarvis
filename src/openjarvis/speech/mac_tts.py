"""macOS native say-based text-to-speech backend."""

from __future__ import annotations

import os
import platform
import shutil
import subprocess
import tempfile
from typing import List

from openjarvis.core.registry import TTSRegistry
from openjarvis.speech.tts import TTSBackend, TTSResult


@TTSRegistry.register("mac")
class MacTTSBackend(TTSBackend):
    """Local macOS TTS using the built-in 'say' command."""

    backend_id = "mac"

    def synthesize(
        self,
        text: str,
        *,
        voice_id: str = "",
        speed: float = 1.0,
        output_format: str = "wav",
    ) -> TTSResult:
        if platform.system() != "Darwin":
            raise RuntimeError("mac TTS is only available on macOS")

        # Fallback to a good default if none specified
        if not voice_id:
            voice_id = "Daniel"

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            temp_path = f.name

        # Rate mapping (say defaults to ~175 wpm)
        wpm = int(175 * speed)

        cmd = [
            "say",
            "-o", temp_path,
            "--data-format=LEI16@24000",
            "-v", voice_id,
            "-r", str(wpm),
            text,
        ]

        try:
            subprocess.run(cmd, check=True, capture_output=True)
            with open(temp_path, "rb") as f:
                audio = f.read()
        finally:
            if os.path.exists(temp_path):
                os.unlink(temp_path)

        return TTSResult(
            audio=audio,
            format="wav",
            voice_id=voice_id,
            sample_rate=24000,
            duration_seconds=0.0,  # Could be derived but not strictly necessary
            metadata={"backend": "mac"},
        )

    def available_voices(self) -> List[str]:
        if platform.system() != "Darwin":
            return []
        
        # We could parse `say -v ?` but returning a standard list is faster
        return ["Daniel", "Samantha", "Alex", "Fred", "Victoria", "Karen"]

    def health(self) -> bool:
        return platform.system() == "Darwin" and shutil.which("say") is not None
