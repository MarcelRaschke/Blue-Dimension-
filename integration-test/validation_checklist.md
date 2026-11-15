# Integration Test Validation Checklist

**Test Date:** ___________  
**Test Duration:** 5–10 minutes @ 60Hz sustained  
**Audio Source:** ☐ Test track / ☐ Live Rekordbox feed  

---

## Pre-Test Hardware Setup

- [ ] GPU: RTX 2080+ (or equivalent AMD) with 6GB+ VRAM
- [ ] Audio Interface: 48kHz, connected to DJ controller
- [ ] Cooling: Ambient temp < 22°C, GPU fans at normal speed
- [ ] Monitor: 1920×1080 @ 60Hz, connected via DisplayPort/HDMI
- [ ] Network: Local OSC loopback (127.0.0.1:9000 reachable)

---

## Phase 3D: Audio Input (Rekordbox / Test Track)

- [ ] FFT CHOP receiving 48kHz audio
- [ ] Amplitude tracking active (0–100 scale)
- [ ] Spectral analysis (20Hz–20kHz bands computed)
- [ ] MIDI sync active (beat clock from DJ controller or 120 BPM default)
- [ ] Frequency bins forwarded to Phase 4A (OSC/UDP working)

**Expected:** 100% packet delivery, < 1ms OSC latency

---

## Phase 4A: AI Track-Analyse (llama.cpp)

- [ ] llama.cpp server running on port 8000 (Mistral 7B Q5 or smaller)
- [ ] Model loaded in < 5 seconds at startup
- [ ] Inference latency < 500ms (LLM) or < 50ms (heuristic path)
- [ ] Feature extraction every 30Hz frame:
  - [ ] Key detection (C, C#, D, … B)
  - [ ] BPM estimation (120–180 range typical)
  - [ ] Energy level (0–100, mapped from amplitude)
  - [ ] Mood classification (energetic_techno / warm_dark / balanced / etc.)
  - [ ] Spectral centroid (Hz, mapped to light color)
- [ ] Fallback to heuristic if LLM timeout (> 500ms)
- [ ] SQLite cache populated for post-set analysis

**Expected:** < 5% LLM fallback rate, < 10ms Phase 4A OSC broadcast latency

---

## Phase 4B: GPU Particle System

- [ ] 256-thread compute shader blocks dispatched
- [ ] Particle spawning tied to frequency bins (256 max particles)
- [ ] Physics update every frame:
  - [ ] Gravity applied (downward acceleration)
  - [ ] Frequency-driven acceleration (horizontal/vertical from energy)
  - [ ] Lifetime management (particles fade out)
  - [ ] Beat-synced respawn (on MIDI clock / 120 BPM)
- [ ] GPU memory stable (SSBO < 2MB)
- [ ] Particle positions readable by Phase 4C

**Expected:** Consistent 256 particles visible, no memory leaks, < 1ms compute time

---

## Phase 4C: Volumetric Ray-Marching

- [ ] 64³ density texture generated per frame (< 0.5ms)
- [ ] Ray-march 64 steps @ 1024×1024 (< 2ms per frame)
- [ ] Scattering coefficient mapped from Phase 4A energy:
  - coeff = 0.1 + (energy / 100) * 0.9
- [ ] Absorption coefficient mapped from Phase 4A mood:
  - energetic_techno → 0.3 (transparent)
  - warm_dark → 0.8 (absorptive)
  - balanced → 0.5 (neutral)
- [ ] Light color mapped from spectral centroid:
  - < 2kHz → warm (RGB 1.0, 0.6, 0.2)
  - 2–4kHz → balanced (RGB 1.0, 0.8, 0.6)
  - > 4kHz → bright (RGB 1.0, 1.0, 0.8)
- [ ] Adaptive ray-stepping active (reduce steps if > 2ms budget)
- [ ] Depth-of-field bokeh (optional, test if enabled)

**Expected:** Smooth volumetric scattering visible, color shifts with music, < 3ms Phase 4C latency total

---

## OSC Parameter Binding (4A → 4C)

- [ ] Phase 4A broadcasts on:
  - `/djjj/ai/key` (string)
  - `/djjj/ai/bpm` (float 120–180)
  - `/djjj/ai/energy` (float 0–100)
  - `/djjj/ai/mood` (string)
  - `/djjj/ai/spectral_centroid` (float Hz)
  - `/djjj/ai/source` (string: "llm" or "heuristic")
- [ ] Phase 4C receives and applies within 1ms
- [ ] CHOP nodes update in sync with TouchDesigner timeline
- [ ] Shader uniforms reflect latest parameter values

**Expected:** Color/density changes visible within 2 frames of audio event

---

## Frame Timing & 60Hz Compliance

- [ ] Target: 60 FPS sustained (16.67ms per frame)
- [ ] Measured frame time per phase:
  - Phase 3D: 2ms (audio → FFT)
  - Phase 4A: < 0.5ms (OSC broadcast, not LLM)
  - Phase 4B: 2ms (particle compute)
  - Phase 4C: 2ms (ray-march)
  - Composite: 0.5ms
  - **Total: 6.5ms (headroom: 10.2ms)**
- [ ] Dropped frames: < 1% of total
- [ ] Frame time variance: < ±2ms jitter

**Validation:**
```
python test_orchestrator.py
# Expected output: ✅ Frame rate 59.8 FPS, 0 dropped frames, max thermal 72°C
```

---

## GPU Thermal Monitoring

- [ ] GPU temperature logged every 1 second
- [ ] Peak temperature during test: _____ °C
- [ ] Throttle detection: ☐ None / ☐ Detected (when?)
- [ ] Fan speed at test end: _____ %

**Thresholds:**
- ✅ Green: < 75°C
- 🟡 Yellow: 75–80°C (acceptable, monitor)
- ❌ Red: > 80°C (throttle risk, review cooling)

---

## Fallback & Graceful Degradation

- [ ] LLM timeout (> 500ms) triggers heuristic path
- [ ] Heuristic features reliable (key, BPM, energy) within 50ms
- [ ] Ray-march step count reduced if frame time > 16.67ms:
  - 64 steps → 32 steps → 16 steps → off (fallback levels)
- [ ] Particle system continues if volumetric rendering fails
- [ ] No hard crashes observed during test

**Expected:** Any failure mode gracefully degrades, visual continues at reduced quality

---

## Post-Test Analysis

- [ ] Test report generated: `integration-test/reports/test_TIMESTAMP_report.json`
- [ ] Latency profiles reviewed:
  - Phase 4A LLM: _____ ms (avg)
  - Phase 4B compute: _____ ms (avg)
  - Phase 4C ray-march: _____ ms (avg)
  - OSC round-trip: _____ ms (p50)
- [ ] No memory leaks observed (GPU memory stable)
- [ ] Audio-reactive features responsive (< 2 frame latency)

---

## Sign-Off

- [ ] All tests passed ✅
- [ ] System ready for pre-show deployment
- [ ] Issues identified: _________________________________

**Tested by:** ________________  
**Date:** ________________  
**Notes:** ________________________________________
