# Phase 4A: AI Track-Analyse — Local LLM Feature Extraction

**Status:** Production Specification | **Version:** 1.0 | **Branch:** ccr-e54f0c59-jml2o8

---

## Executive Summary

AI Track-Analyse is an offline, GPU-accelerated local LLM feature extraction system integrated into the DJJJ Signature Bridge. It runs in parallel with Phase 3D (audio ingestion) and Phase 4B (shader automation), enabling real-time semantic analysis of DJ sets without cloud latency or data leakage.

**Key Capabilities:**
- Local llama.cpp inference (Mistral 7B Instruct or similar, Q5 quantization)
- Real-time feature extraction: key, BPM, spectral descriptors, mood, energy trajectory
- Token-efficient prompting (280–320 tokens context per track)
- Sub-500ms inference latency at 30Hz poll rate
- Automatic fallback to heuristic analysis (Key extraction via chromagram, BPM via onset detection)
- OSC broadcast of semantic features to TouchDesigner (Phase 4B uniforms)
- GDPR/revDSG compliance: zero cloud, zero external calls, encrypted local storage

**Integration Points:**
- **Input:** Audio chunks from Phase 3D Bridge (2048-sample buffers, 48kHz)
- **Output:** OSC /djjj/ai/* messages (key, bpm, mood, energy, spectral_centroid, etc.)
- **Fallback:** librosa + essentia heuristics when LLM unavailable
- **Compute:** GPU inference via llama.cpp CUDA acceleration (Nvidia/AMD/Intel)

---

## Architecture

### 1. System Topology

```
┌─────────────────────────────────────────────────────────────────┐
│  DJJJ Signature Bridge (Phase 3D)                               │
│  - Audio input: Rekordbox CDJ/XDJ live stream → 48kHz PCM       │
│  - MIDI: BPM sync, Key detection from CDJ metadata              │
│  - OSC broadcast: /djjj/audio/rms, /djjj/freqs/[0..7] @ 30Hz    │
└─────────────────────────────────────────────────────────────────┘
                             ↓
        ┌────────────────────┬────────────────────┐
        ↓                    ↓                    ↓
   ┌─────────┐         ┌──────────┐        ┌──────────┐
   │ Phase   │         │ Phase 4A │        │ Phase 4B │
   │ 3D FFT  │         │ AI Track │        │ GLSL GPU │
   │ OSC     │         │ -Analyse │        │ Shaders  │
   └─────────┘         └──────────┘        └──────────┘
        ↓                    ↓                    ↓
        └────────────────────┬────────────────────┘
                             ↓
        ┌─────────────────────────────────────────┐
        │ TouchDesigner: MAT/CHOP receivers        │
        │ - Audio-reactive particle system         │
        │ - Semantic-driven shader parameters     │
        │ - Real-time OSC animator                │
        └─────────────────────────────────────────┘
```

### 2. Feature Extraction Pipeline

#### 2a. Audio Feature Extraction (Heuristic Path)
**Runs every 30Hz poll, sub-50ms latency**

```
Audio Buffer (2048 samples, 48kHz)
    ↓
[Preprocessing]
    • Normalize to [-1, 1]
    • Apply Hann window
    • Compute magnitude spectrum (FFT)
    ↓
[Spectral Features]
    • Spectral Centroid: weighted mean of frequency bins
    • Spectral Spread: variance around centroid
    • Zero-Crossing Rate: signal transience
    • RMS Energy: loudness estimate
    ↓
[Perceptual Features]
    • Mel-spectrogram (128 bands, 0–24kHz)
    • Chromagram (12 pitch classes via Constant-Q)
    • Onset Detection: percussive events
    ↓
[Feature Vector (48D)]
    [rms, sc, ss, zcr, mfcc[0..12], chroma[0..11], onset_density, ...]
```

#### 2b. Local LLM Path (Optional, High-Context Tracks)
**Runs once per track or every 8–12 bars, ~300ms latency**

```
Track Metadata (from MIDI/CDJ)
    ├─ Estimated BPM (from tempo tap or sync)
    ├─ Key (from CDJ key detection or heuristic)
    ├─ Duration / bars elapsed
    └─ Artist / Title (if available)
    ↓
[Audio Context Extraction]
    • Last 3–5s waveform RMS envelope
    • Mel-spectrogram trend (rising/falling energy)
    • Estimated percussive vs. melodic ratio
    ↓
[Prompt Construction (280–320 tokens)]
    "Track: [Artist – Title]
     BPM: [est], Key: [est], Elapsed: [s]
     Energy Trend: [rising/stable/falling]
     Spectral Profile: [warm/bright/balanced]
     
     Provide a 1-sentence mood/energy assessment.
     Format: mood: [adj], energy: [0–100], sonic_desc: [2–3 words]"
    ↓
[llama.cpp Inference (CUDA)]
    • Model: Mistral 7B Instruct (Q5, ~5GB VRAM)
    • Temperature: 0.3 (deterministic)
    • Max tokens: 50
    • Latency: 150–400ms
    ↓
[JSON Extraction]
    {
      "mood": "energetic_techno",
      "energy": 82,
      "sonic_desc": "layered, hypnotic"
    }
```

### 3. Failsafe & Fallback Logic

```
┌─────────────────────────────────────┐
│ Request Feature Analysis            │
└─────────────────────────────────────┘
    ↓
[Try LLM Path (if available)]
    • Check llama.cpp socket (localhost:8001)
    • If responsive: run LLM inference
    • Timeout: 500ms
    • On failure → fallback
    ↓
[Fallback: Heuristic Analysis]
    • Chromagram-based key estimation (within ±1 semitone)
    • Onset-based BPM validation
    • Spectral centroid → brightness → mood proxy
    • Always succeeds, <50ms latency
    ↓
[Broadcast Result via OSC]
    • /djjj/ai/mood [string]
    • /djjj/ai/energy [float 0–100]
    • /djjj/ai/key_confidence [0–1]
    • /djjj/ai/source [string: "llm" | "heuristic"]
    ↓
[Cache Result]
    • Store in SQLite: {timestamp, key, bpm, mood, energy}
    • Retain last 1000 tracks (500MB max)
    • Enable post-set analysis & trend reporting
```

---

## Implementation

### Phase 4A: Component Structure

```
blue-dimension-/
├── phase-4a/
│   ├── ai_track_analyse.py           # Main orchestrator
│   ├── local_llm_inference.py         # llama.cpp client
│   ├── audio_feature_extractor.py     # librosa + essentia
│   ├── osc_broadcast.py               # OSC sender (Phase 3D bridge)
│   ├── cache_manager.py               # SQLite + local analysis
│   ├── failsafe_handler.py            # Timeout + fallback logic
│   └── config.yaml                    # Model paths, ports, tuning
├── models/
│   └── mistral-7b-instruct-q5.gguf   # (~5GB, download on demand)
└── test/
    ├── test_feature_extraction.py
    ├── test_llm_inference.py
    └── fixtures/
        └── sample_tracks/              # 5–10 test DJ tracks (30s clips)
```

### Phase 4A: Core Implementation

#### ai_track_analyse.py

```python
#!/usr/bin/env python3
"""
AI Track-Analyse: Local LLM feature extraction for DJJJ Signature Bridge.
Runs in parallel with Phase 3D (audio) and Phase 4B (shaders).

Behavior:
  • 30Hz polling: heuristic feature extraction (fast path)
  • Per-track or per-8-bars: LLM semantic analysis (optional)
  • Failsafe: if LLM unavailable, use heuristic exclusively
  • OSC broadcast: /djjj/ai/* messages to TouchDesigner
"""

import asyncio
import logging
import time
from dataclasses import dataclass
from typing import Optional, Dict, Any

import numpy as np
from pythonosc import udp_client

from audio_feature_extractor import AudioFeatureExtractor
from local_llm_inference import LlamaInferenceClient
from cache_manager import TrackCache
from failsafe_handler import FailsafeHandler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class TrackAnalysis:
    """Unified feature representation (heuristic + LLM)."""
    timestamp: float
    key: str
    bpm: float
    bpm_confidence: float
    energy: float
    mood: str
    sonic_descriptor: str
    spectral_centroid: float
    source: str  # "llm" | "heuristic"
    inference_time_ms: float


class AITrackAnalyser:
    """Main orchestrator: coordinate heuristic + LLM analysis."""

    def __init__(self, config_path: str = "phase-4a/config.yaml"):
        self.config = self._load_config(config_path)
        
        # Feature extraction (always available)
        self.feature_extractor = AudioFeatureExtractor(
            sr=self.config["audio"]["sample_rate"],
            hop_length=self.config["audio"]["hop_length"],
        )
        
        # LLM inference (optional, fallback on failure)
        self.llm_client = LlamaInferenceClient(
            host=self.config["llm"]["host"],
            port=self.config["llm"]["port"],
            model_path=self.config["llm"]["model_path"],
            timeout_ms=self.config["llm"]["timeout_ms"],
        )
        
        # Failsafe handler
        self.failsafe = FailsafeHandler(
            fallback_to_heuristic=True,
            log_failures=True,
        )
        
        # Local cache
        self.cache = TrackCache(db_path=self.config["cache"]["db_path"])
        
        # OSC broadcaster to TouchDesigner
        self.osc_client = udp_client.SimpleUDPClient(
            self.config["osc"]["host"],
            self.config["osc"]["port"],
        )
        
        # Statistics
        self.stats = {
            "total_tracks": 0,
            "llm_successful": 0,
            "heuristic_fallbacks": 0,
            "avg_inference_ms": 0.0,
        }

    def _load_config(self, path: str) -> Dict[str, Any]:
        """Load YAML config with sensible defaults."""
        import yaml
        try:
            with open(path, "r") as f:
                return yaml.safe_load(f)
        except FileNotFoundError:
            logger.warning(f"Config not found: {path}, using defaults")
            return self._default_config()

    @staticmethod
    def _default_config() -> Dict[str, Any]:
        return {
            "audio": {
                "sample_rate": 48000,
                "hop_length": 1024,
            },
            "llm": {
                "host": "localhost",
                "port": 8001,
                "model_path": "models/mistral-7b-instruct-q5.gguf",
                "timeout_ms": 500,
            },
            "cache": {
                "db_path": "/tmp/djjj_track_cache.db",
                "max_tracks": 1000,
            },
            "osc": {
                "host": "127.0.0.1",
                "port": 9000,
            },
        }

    async def analyze_audio_chunk(
        self,
        audio: np.ndarray,
        sr: int = 48000,
        track_metadata: Optional[Dict[str, Any]] = None,
    ) -> TrackAnalysis:
        """
        Extract features from audio chunk (heuristic path, <50ms).
        
        Args:
            audio: mono waveform, shape (n_samples,)
            sr: sample rate
            track_metadata: optional {key, bpm, artist, title} from CDJ
        
        Returns:
            TrackAnalysis with heuristic features + mood placeholder
        """
        t0 = time.perf_counter()
        
        # 1. Heuristic analysis
        features = self.feature_extractor.extract(audio, sr)
        
        # Estimate key from chromagram (fallback if CDJ unavailable)
        if track_metadata and "key" in track_metadata:
            key = track_metadata["key"]
            key_confidence = 0.95
        else:
            key, key_confidence = self.feature_extractor.estimate_key(audio, sr)
        
        # Estimate BPM from onset detection + tempo estimation
        if track_metadata and "bpm" in track_metadata:
            bpm = track_metadata["bpm"]
            bpm_confidence = 0.95
        else:
            bpm, bpm_confidence = self.feature_extractor.estimate_bpm(audio, sr)
        
        # Energy: normalized RMS
        energy = min(100, features["rms"] * 100)
        
        # Spectral centroid: 0–1 mapped to mood proxy
        spectral_centroid = features["spectral_centroid"]
        mood = self._spectral_to_mood(spectral_centroid)
        
        t_heuristic_ms = (time.perf_counter() - t0) * 1000
        
        analysis = TrackAnalysis(
            timestamp=time.time(),
            key=key,
            bpm=bpm,
            bpm_confidence=bpm_confidence,
            energy=energy,
            mood=mood,
            sonic_descriptor="[heuristic]",
            spectral_centroid=spectral_centroid,
            source="heuristic",
            inference_time_ms=t_heuristic_ms,
        )
        
        logger.info(f"Heuristic analysis: {key} @ {bpm:.0f}bpm, energy={energy:.0f}, {t_heuristic_ms:.1f}ms")
        return analysis

    async def analyze_with_llm(
        self,
        audio: np.ndarray,
        track_metadata: Dict[str, Any],
        sr: int = 48000,
    ) -> TrackAnalysis:
        """
        Enrich heuristic analysis with LLM semantic features (300–400ms, optional).
        
        Args:
            audio: full track waveform or 10–30s window
            track_metadata: {key, bpm, artist, title, elapsed_bars}
            sr: sample rate
        
        Returns:
            TrackAnalysis with LLM enrichment (mood, sonic_descriptor)
        """
        t0 = time.perf_counter()
        
        # Start with heuristic baseline
        heuristic_analysis = await self.analyze_audio_chunk(audio, sr, track_metadata)
        
        # Try LLM inference
        llm_result = await self.failsafe.run_with_timeout(
            self.llm_client.infer_semantic_features(
                audio,
                track_metadata,
                heuristic_analysis,
            ),
            timeout_ms=self.config["llm"]["timeout_ms"],
        )
        
        if llm_result:
            # LLM success
            heuristic_analysis.mood = llm_result.get("mood", heuristic_analysis.mood)
            heuristic_analysis.sonic_descriptor = llm_result.get("sonic_desc", "")
            heuristic_analysis.source = "llm"
            self.stats["llm_successful"] += 1
        else:
            # LLM timeout/error → use heuristic
            self.stats["heuristic_fallbacks"] += 1
        
        t_total_ms = (time.perf_counter() - t0) * 1000
        heuristic_analysis.inference_time_ms = t_total_ms
        
        logger.info(
            f"LLM analysis (source={heuristic_analysis.source}): "
            f"mood={heuristic_analysis.mood}, energy={heuristic_analysis.energy:.0f}, "
            f"{t_total_ms:.1f}ms"
        )
        return heuristic_analysis

    async def broadcast_to_osc(self, analysis: TrackAnalysis) -> None:
        """Send analysis results to TouchDesigner via OSC."""
        self.osc_client.send_message("/djjj/ai/key", analysis.key)
        self.osc_client.send_message("/djjj/ai/bpm", analysis.bpm)
        self.osc_client.send_message("/djjj/ai/energy", analysis.energy)
        self.osc_client.send_message("/djjj/ai/mood", analysis.mood)
        self.osc_client.send_message("/djjj/ai/sonic_descriptor", analysis.sonic_descriptor)
        self.osc_client.send_message("/djjj/ai/source", analysis.source)
        logger.debug(f"OSC broadcast: /djjj/ai/* (source={analysis.source})")

    async def cache_analysis(self, analysis: TrackAnalysis, track_id: str) -> None:
        """Store analysis in local SQLite cache."""
        self.cache.insert(
            track_id=track_id,
            key=analysis.key,
            bpm=analysis.bpm,
            energy=analysis.energy,
            mood=analysis.mood,
            timestamp=analysis.timestamp,
        )

    def _spectral_to_mood(self, spectral_centroid: float) -> str:
        """Heuristic mapping: spectral centroid (Hz) → mood descriptor."""
        # Low centroid (< 2kHz): warm, dark, bassy
        # Mid centroid (2–4kHz): balanced, neutral
        # High centroid (> 4kHz): bright, crisp, piercing
        if spectral_centroid < 2000:
            return "warm_dark"
        elif spectral_centroid < 4000:
            return "balanced"
        else:
            return "bright_energetic"

    def get_stats(self) -> Dict[str, Any]:
        """Return processing statistics for monitoring."""
        return {
            **self.stats,
            "llm_available": self.llm_client.is_available(),
            "cache_size": self.cache.count(),
        }


async def main():
    """Example: continuous 30Hz polling + LLM per-track."""
    analyser = AITrackAnalyser()
    
    # Simulate live audio stream
    sample_rate = 48000
    hop_length = 1024
    poll_interval_s = 1.0 / 30  # 30Hz
    
    logger.info("AI Track-Analyse started (30Hz polling, LLM optional)")
    
    try:
        while True:
            # In production: read from Phase 3D Bridge buffer
            # For now: synthetic audio
            audio_chunk = np.random.randn(hop_length) * 0.1
            
            # Heuristic analysis (fast path)
            analysis = await analyser.analyze_audio_chunk(audio_chunk, sample_rate)
            
            # Broadcast OSC
            await analyser.broadcast_to_osc(analysis)
            
            # Every 8 bars (~16s @ 120bpm): LLM enrichment (optional)
            # This would be triggered by bar counter from Phase 3D
            if np.random.random() < 0.05:  # ~5% of iterations
                track_metadata = {
                    "key": "C minor",
                    "bpm": 120,
                    "artist": "Test",
                    "title": "Track",
                }
                analysis = await analyser.analyze_with_llm(
                    audio_chunk, track_metadata, sample_rate
                )
                await analyser.cache_analysis(analysis, f"track_{int(time.time())}")
            
            logger.info(f"Stats: {analyser.get_stats()}")
            await asyncio.sleep(poll_interval_s)
    
    except KeyboardInterrupt:
        logger.info("Shutdown")


if __name__ == "__main__":
    asyncio.run(main())
```

#### local_llm_inference.py

```python
"""
llama.cpp Inference Client: token-efficient prompt for real-time semantic analysis.
Targets: Mistral 7B Instruct (Q5, ~5GB VRAM) or equivalent.

Fallback: if socket unavailable, heuristic analysis only.
"""

import asyncio
import json
import logging
import re
from typing import Optional, Dict, Any

import aiohttp

logger = logging.getLogger(__name__)


class LlamaInferenceClient:
    """Async HTTP client for llama.cpp server."""

    def __init__(
        self,
        host: str = "localhost",
        port: int = 8001,
        model_path: Optional[str] = None,
        timeout_ms: int = 500,
    ):
        self.host = host
        self.port = port
        self.base_url = f"http://{host}:{port}"
        self.timeout = aiohttp.ClientTimeout(total=timeout_ms / 1000)
        self.model_path = model_path
        self._session: Optional[aiohttp.ClientSession] = None
        self._available = False

    async def _ensure_session(self) -> aiohttp.ClientSession:
        """Lazily initialize HTTP session."""
        if self._session is None:
            self._session = aiohttp.ClientSession(timeout=self.timeout)
        return self._session

    async def is_available(self) -> bool:
        """Check if llama.cpp server is alive."""
        try:
            session = await self._ensure_session()
            async with session.get(f"{self.base_url}/health", timeout=aiohttp.ClientTimeout(total=1)) as resp:
                self._available = resp.status == 200
                return self._available
        except Exception as e:
            logger.debug(f"llama.cpp health check failed: {e}")
            self._available = False
            return False

    async def infer_semantic_features(
        self,
        audio: Any,  # np.ndarray, not used for LLM (metadata-driven)
        track_metadata: Dict[str, Any],
        heuristic_analysis: Any,  # TrackAnalysis from heuristic path
    ) -> Optional[Dict[str, Any]]:
        """
        LLM inference: semantic mood + sonic descriptor.
        
        Prompt is token-efficient (280–320 tokens) targeting Mistral 7B:
          • Temperature 0.3 (deterministic)
          • Max tokens 50
          • Few-shot examples in system message (not shown for brevity)
        
        Args:
            audio: (unused, metadata-driven inference)
            track_metadata: {key, bpm, artist, title, elapsed_bars}
            heuristic_analysis: TrackAnalysis with spectral features
        
        Returns:
            {"mood": "...", "sonic_desc": "..."} or None on timeout/error
        """
        prompt = self._build_prompt(track_metadata, heuristic_analysis)
        
        try:
            session = await self._ensure_session()
            
            payload = {
                "prompt": prompt,
                "n_predict": 50,
                "temperature": 0.3,
                "top_p": 0.95,
                "stop": ["\n"],
            }
            
            async with session.post(
                f"{self.base_url}/completion",
                json=payload,
                timeout=self.timeout,
            ) as resp:
                if resp.status != 200:
                    logger.warning(f"LLM server error: {resp.status}")
                    return None
                
                result = await resp.json()
                return self._parse_response(result.get("content", ""))
        
        except asyncio.TimeoutError:
            logger.debug("LLM inference timeout")
            return None
        except Exception as e:
            logger.error(f"LLM inference error: {e}")
            return None

    @staticmethod
    def _build_prompt(track_metadata: Dict[str, Any], heuristic: Any) -> str:
        """Construct token-efficient prompt (~280 tokens)."""
        artist = track_metadata.get("artist", "Unknown")
        title = track_metadata.get("title", "Unknown")
        key = track_metadata.get("key", heuristic.key)
        bpm = track_metadata.get("bpm", heuristic.bpm)
        energy = heuristic.energy
        elapsed_bars = track_metadata.get("elapsed_bars", "?")
        
        return f"""Track: {artist} – {title}
Key: {key} | BPM: {bpm:.0f} | Energy: {energy:.0f}/100 | Bar: {elapsed_bars}

Assess the vibe in one phrase:
mood: [energetic_techno|hypnotic_deep|soulful|melodic|minimal|peak_time]
sonic_desc: [2–3 words]

Answer:"""

    @staticmethod
    def _parse_response(response_text: str) -> Optional[Dict[str, Any]]:
        """Extract JSON from LLM response (best-effort)."""
        try:
            # Try direct JSON parse
            if "{" in response_text:
                json_str = response_text[response_text.index("{"):response_text.rindex("}") + 1]
                return json.loads(json_str)
            
            # Fallback: regex extraction
            mood_match = re.search(r'mood:\s*(\w+)', response_text)
            desc_match = re.search(r'sonic_desc:\s*(.+)', response_text)
            
            if mood_match:
                return {
                    "mood": mood_match.group(1),
                    "sonic_desc": desc_match.group(1) if desc_match else "unknown",
                }
        except Exception as e:
            logger.debug(f"Response parse error: {e}")
        
        return None

    async def close(self) -> None:
        """Cleanup session."""
        if self._session:
            await self._session.close()
```

---

## GPU Acceleration & Quantization

### Model Selection

| Model | Quantization | VRAM | Tokens/s | Context |
|-------|--------------|------|----------|---------|
| Mistral 7B Instruct | Q5 (5-bit) | 5GB | 45–60 | 32K |
| Llama 2 7B | Q4 (4-bit) | 4GB | 50–70 | 4K |
| Phi-3 Mini | Q4 | 2GB | 80–100 | 4K |

**Recommended:** Mistral 7B Q5 (balance of speed, context, and VRAM)

### llama.cpp Server Startup

```bash
# GPU-accelerated (CUDA):
./llama-server \
  -m models/mistral-7b-instruct-q5.gguf \
  --port 8001 \
  --n-gpu-layers 40 \
  --threads 8 \
  --ctx-size 2048

# Or with hipblas (AMD GPU):
export ROCM_PATH=/opt/rocm
./llama-server -m mistral-7b-instruct-q5.gguf --port 8001 -ngl 40

# CPU-only fallback (30–40 tokens/s):
./llama-server -m mistral-7b-instruct-q5.gguf --port 8001 -c 512
```

---

## Failsafe & Monitoring

### Failsafe Protocol

```python
class FailsafeHandler:
    """Ensure analysis never blocks real-time pipeline."""
    
    async def run_with_timeout(
        self,
        coroutine,
        timeout_ms: int = 500,
    ) -> Optional[Any]:
        """
        Run async operation with strict timeout.
        
        Returns:
            Result if successful within timeout, None otherwise.
            Never raises asyncio.TimeoutError (caught + logged).
        """
        try:
            return await asyncio.wait_for(
                coroutine,
                timeout=timeout_ms / 1000,
            )
        except asyncio.TimeoutError:
            logger.warning(f"Analysis timeout after {timeout_ms}ms, falling back to heuristic")
            return None
        except Exception as e:
            logger.error(f"Analysis error: {e}, falling back to heuristic")
            return None
```

### Monitoring Metrics

- **Inference Latency:** target <50ms (heuristic), <500ms (LLM, optional)
- **LLM Availability:** % of bars where server responds <500ms
- **Fallback Rate:** % of analyses using heuristic (target >95%)
- **Memory Usage:** llama.cpp + cache (<6GB total)
- **Thermal Status:** if LLM GPU temp > 80°C, pause inference

---

## OSC Broadcast Schema

**30Hz Polling Output:**

```
/djjj/ai/key              string         "C minor", "A# major"
/djjj/ai/bpm              float          120.5
/djjj/ai/energy           float          0–100 (normalized RMS)
/djjj/ai/mood             string         "energetic_techno" | "warm_dark"
/djjj/ai/sonic_descriptor string         "layered, hypnotic"
/djjj/ai/source           string         "llm" | "heuristic"
/djjj/ai/spectral_centroid float         Hz, raw feature
/djjj/ai/bpm_confidence   float          0–1, certainty of BPM estimate
```

**Cache Query (Post-Set Analysis):**

```python
# Example: trend analysis over last 20 tracks
last_20 = cache.query(limit=20)
avg_energy = np.mean([t["energy"] for t in last_20])
mood_distribution = Counter([t["mood"] for t in last_20])
```

---

## Pre-Performance Deployment Checklist

- [ ] llama.cpp server compiled with CUDA/HIP support
- [ ] Model file downloaded: `mistral-7b-instruct-q5.gguf` (5.2GB)
- [ ] llama.cpp listening on localhost:8001
- [ ] Audio feature extractor (librosa + essentia) installed
- [ ] OSC broadcaster connected to TouchDesigner CHOP receiver
- [ ] SQLite cache DB initialized (auto-create on first run)
- [ ] Test heuristic analysis: inject 10s synthetic track, verify OSC output
- [ ] Test LLM path: verify timeout recovery at 500ms threshold
- [ ] Monitor thermal status: GPU temp logging active
- [ ] Phase 3D Bridge running: OSC frequency bins @ 30Hz
- [ ] Phase 4B shaders subscribed to /djjj/ai/energy, /djjj/ai/mood for parameter binding

---

## References & Integration

- **Audio Features:** librosa.feature (spectral_centroid, chromagram, etc.)
- **Beat Tracking:** librosa.beat.tempo, librosa.frames_to_time
- **LLM Inference:** llama.cpp (https://github.com/ggerganov/llama.cpp)
- **OSC Broadcast:** python-osc library
- **Cache:** SQLite3 (stdlib)
- **Quantization:** GGML format (Q4, Q5 recommended for 7B models)

---

## Next Steps (Phase 4C & Beyond)

1. **Phase 4C (Volumetric Lighting):** Ray-marching shaders with 3D particle volume rendering
2. **Post-Set Analytics:** Aggregate cache data for DJ performance insights (energy arc, mood flow)
3. **Real-Time Latency Profiling:** Per-track inference time tracking for live optimization
4. **Multi-GPU Inference:** Distribute LLM + shader compute across separate GPUs if available
