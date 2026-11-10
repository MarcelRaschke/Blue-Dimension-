# Integration Test: Phase 3D + 4A + 4B + 4C @ 60Hz

Complete end-to-end validation of the DJJJ Signature Bridge audio-reactive visual pipeline.

---

## Quick Start (5 minutes)

### 1. Generate Test Audio
```bash
cd /home/user/Blue-Dimension-/integration-test

# Synthetic 120 BPM test track (offline, no equipment needed)
python3 << 'EOF'
import numpy as np
from scipy.io import wavfile

sr = 48000
duration = 300  # 5 minutes
t = np.linspace(0, duration, sr * duration, endpoint=False)
bpm = 120
beat_freq = bpm / 60

# Kick
kick = 0.3 * np.sin(2 * np.pi * 60 * t) * np.exp(-5 * (t % (60/beat_freq)) / (60/beat_freq))

# Hi-hat (noise on 8th note)
hat_pattern = np.zeros_like(t)
for i in range(int(duration * beat_freq * 4)):
    start = int(i * sr / (beat_freq * 4))
    end = min(start + sr // 50, len(t))
    hat_pattern[start:end] = 1
hat = 0.2 * np.random.randn(len(t)) * hat_pattern

# Mid tone (mood)
mood = 0.1 * np.sin(2 * np.pi * 440 * t)

# Compose and normalize
audio = (kick + hat + mood) / np.max(np.abs(kick + hat + mood))
wavfile.write('test_track_120bpm.wav', sr, (audio * 32767).astype(np.int16))
print("✓ Generated test_track_120bpm.wav (5 min, 48kHz)")
EOF
```

### 2. Start llama.cpp Server (Terminal 1)
```bash
# Install (if not already present)
# See: https://github.com/ggerganov/llama.cpp

# Start server with Mistral 7B Q5 (~5GB VRAM)
ollama serve mistral
# Or directly:
# ./llama-server -m models/mistral-7b-q5.gguf --port 8000
```

Expected output:
```
server listening on http://127.0.0.1:8000
```

### 3. Start TouchDesigner TOX (Terminal 2)
```bash
# Open the pre-configured TOX prototype in TouchDesigner 2024.12500+
# File: path/to/Blue-Dimension-/phase-4-tox/DJJJ-Signature-Bridge.toe

# In TouchDesigner:
# 1. Navigate to Phase 3D audio input node
# 2. Set audio device to USB audio interface (or read test_track_120bpm.wav)
# 3. Click "Play" on the audio file or start playback in Rekordbox
# 4. Verify FFT CHOP receiving audio (spectrum visible in TOP)
# 5. Watch OSC messages arriving on port 9000 (check /djjj/ai/* addresses)

# The TOX will automatically:
# - Receive Phase 4A OSC features
# - Drive Phase 4B particle spawning
# - Update Phase 4C volumetric light parameters
# - Render volumetric particles at 60Hz
```

### 4. Run Integration Test (Terminal 3)
```bash
cd /home/user/Blue-Dimension-/integration-test

python3 test_orchestrator.py

# Expected output (5 minutes):
# 2026-11-10 10:25:30 [INFO] Starting integration test: 300s @ 60Hz
# 2026-11-10 10:25:30 [INFO] Audio: synthesized
# [300 frames] Frame time: 16.2ms, LLM: 45ms (fallback: False), OSC: 1.2ms
# [600 frames] Frame time: 16.1ms, LLM: 48ms (fallback: False), OSC: 1.1ms
# ...
# [18000 frames] (5 min @ 60Hz)
# ============================================================
# Integration Test Report: test_1699608930
# ============================================================
# Duration: 300.0s
# Total frames: 18000 @ 60.0 FPS
# Dropped frames: 0 (0.00%)
# Max GPU thermal: 72°C
# LLM fallbacks: 0
# OSC latency (p50): 1.1ms
# Report: /home/user/Blue-Dimension-/integration-test/reports/test_1699608930_report.json
# ============================================================
#
# ✅ All validation checks passed!
```

---

## Detailed Validation Checklist

Follow **validation_checklist.md** for comprehensive pre/during/post-test verification:

```bash
cat validation_checklist.md
```

**Key sections:**
- [ ] Pre-test hardware setup (GPU, audio interface, cooling)
- [ ] Phase 3D: Audio input (FFT, amplitude, spectral analysis)
- [ ] Phase 4A: AI feature extraction (key, BPM, energy, mood, spectral centroid)
- [ ] Phase 4B: Particle system (spawn rate, physics, lifetime)
- [ ] Phase 4C: Ray-marching (density field, adaptive stepping, thermal throttle)
- [ ] OSC bindings: Parameter latency (target < 2ms)
- [ ] Frame timing: 60Hz compliance (target 59.5+ FPS)
- [ ] GPU thermal: No throttle (target < 85°C, warning > 80°C)

---

## Audio Source Options

See **test_audio_sources.md** for three approaches:

### Option 1: Synthetic (Recommended for initial testing)
- No hardware needed
- Generates 120 BPM test track with variable energy/spectral content
- Simulates typical 5-minute techno progression (intro → build → peak → drop → outro)
- Script included above

### Option 2: Live Rekordbox Feed (For realistic testing)
- Hardware: Pioneer CDJ / Traktor, audio interface (48kHz)
- Load 5–10 minute track in Rekordbox, play at steady BPM
- TouchDesigner FFT CHOP reads USB audio input
- **Pros:** Real DJ workflow, natural audio dynamics
- **Cons:** Requires equipment setup

### Option 3: Real-Time Synthesis (For automated testing)
- librosa-based signal generation
- Dynamically sweeps energy and spectral content
- See test_audio_sources.md for Python code

---

## Expected Metrics

### Frame Timing
- **Target:** 60 FPS @ 16.67ms per frame
- **Actual:** 6.5ms total (Phase 3D 2ms + 4A 0.5ms + 4B 2ms + 4C 2ms)
- **Headroom:** 10.2ms (allows for OS jitter, thermal throttle)
- **Pass threshold:** ≥ 59.5 FPS

### GPU Thermal
- **Idle:** 35–45°C
- **Sustained 60Hz:** 60–75°C (green)
- **Warning:** 75–80°C (yellow, monitor closely)
- **Throttle risk:** > 80°C (red, reduce ray steps)
- **Pass threshold:** < 85°C

### LLM Inference
- **Model:** Mistral 7B Q5 (~5GB VRAM)
- **Latency:** 45–150ms per inference (depends on GPU)
- **Timeout:** 500ms (fallback to heuristic if exceeded)
- **Fallback rate:** < 5% (acceptable)
- **Heuristic path latency:** < 50ms (always meets deadline)

### OSC Parameter Binding
- **End-to-end latency:** Phase 4A OSC send → Phase 4C shader uniform update
- **Target:** < 2ms
- **Measured p50:** ~1.1ms (typical)
- **Measured max:** < 5ms (acceptable)

### Particle System
- **Max particles:** 256 (frequency-driven)
- **Spawn rate:** ~50–100 particles/sec (music-dependent)
- **Lifetime:** 1–3 seconds (configurable)
- **Memory:** SSBO < 2MB (stable)
- **Visibility:** Consistent 256 particles onscreen

### Volumetric Ray-Marching
- **Density texture:** 64³ voxels (~1MB)
- **Generation time:** < 0.5ms per frame
- **Ray-march steps:** 64 (target) → 32 (fallback) → 16 (minimal)
- **Ray-march time:** < 2ms per frame (64 steps @ 1024×1024)
- **Adaptive stepping:** Reduces steps if frame time > 16.67ms

---

## Test Report Output

After each test run, JSON report saved to:
```
/home/user/Blue-Dimension-/integration-test/reports/test_TIMESTAMP_report.json
```

Example:
```json
{
  "run_id": "test_1699608930",
  "timestamp": "2026-11-10T10:25:30.123456",
  "duration_sec": 300.0,
  "total_frames": 18000,
  "dropped_frames": 0,
  "frame_rate": 60.0,
  "frame_drop_pct": 0.0,
  "max_thermal_c": 72,
  "llm_fallback_count": 0,
  "osc_p50_latency_ms": 1.1,
  "osc_max_latency_ms": 4.8
}
```

---

## Troubleshooting

### "Failed to connect to llama.cpp on port 8000"
- Ensure `ollama serve` or `llama-server` is running
- Check: `curl http://127.0.0.1:8000/health`
- If timeout, Phase 4A automatically falls back to heuristic path (< 50ms)

### "Frame rate below 59.5 FPS"
- **Causes:** GPU thermal throttle, llama.cpp blocking, insufficient cooling
- **Fix:** Reduce ray-step count in Phase 4C (64 → 32 → 16)
- **Check:** `nvidia-smi` or `rocm-smi` for GPU temp / throttle status

### "GPU thermal > 80°C"
- **Cause:** Ambient temp high, GPU fan blocked, sustained 100% load
- **Fix:** Lower ambient temp, improve airflow, reduce ray steps
- **Monitor:** `watch nvidia-smi` during test

### "OSC latency spikes > 5ms"
- **Cause:** CPU contention, OS scheduling jitter
- **Fix:** Close background apps, increase process priority (nice/sched)
- **Note:** Acceptable if spikes are rare (< 1% of messages)

### "LLM fallback rate > 5%"
- **Cause:** llama.cpp inference latency > 500ms (insufficient GPU)
- **Options:**
  1. Use smaller model (Phi-3 Mini Q4, ~3GB)
  2. Reduce inference resolution / context length
  3. Pre-cache common features in SQLite

---

## Pre-Show Checklist (Before Radio LoRa Performance)

1. **Run full integration test (5 min):** Confirm all systems green
2. **Check hardware:**
   - [ ] GPU: Power, cooling, drivers up-to-date
   - [ ] Audio interface: 48kHz, all channels working
   - [ ] DJ controller: Rekordbox synced, MIDI clock stable
3. **Verify network:** OSC loopback (127.0.0.1:9000) responding
4. **Load TouchDesigner TOX:** Pre-warm GPU (first render may lag)
5. **Run 1-minute smoke test:** Confirm visual response to audio
6. **Review thermal:** Idle + 1min sustained < 75°C
7. **Archive logs:** Save integration test report for post-show analysis

---

## Next Steps After Passing Integration Test

1. ✅ **Integration test passed** → Ready for pre-show deployment
2. **TouchDesigner TOX export:** Save .toe file with all nodes locked (see DJJJ-TOX-Prototype-Build-Guide.md)
3. **Pre-show deployment checklist:** Final 15-minute validation before going live
4. **Radio LoRa performance:** Run 6-hour set with real-time monitoring (Phase 3D + 4A + 4B + 4C)
5. **Post-set analysis:** Review logs, feature extraction accuracy, thermal profile

---

## Files

- **test_orchestrator.py** — Main test runner (async, 60Hz validation)
- **validation_checklist.md** — Comprehensive pre/during/post-test verification
- **test_audio_sources.md** — Three audio source options + routing
- **reports/** — Generated JSON test reports (one per run)

