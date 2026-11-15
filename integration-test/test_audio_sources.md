# Integration Test Audio Sources

## Option 1: Test Track (Offline)

**File:** 5–10 minute electronic track, 48kHz, stereo WAV/MP3

**Recommended tracks** (open-source or royalty-free):
- "Unison 7" (lo-fi break, stable BPM) — if available locally
- Algorithmic generation: `librosa.generate_test_signal()` @ 120 BPM with varying spectral content

**Setup:**
```bash
# Generate synthetic test track (120 BPM, 5 minutes)
python -c "
import numpy as np
from scipy.io import wavfile

sr = 48000
duration = 300  # 5 minutes
t = np.linspace(0, duration, sr * duration, endpoint=False)
bpm = 120
beat_freq = bpm / 60

# Kick (kick drum synth)
kick = 0.3 * np.sin(2 * np.pi * 60 * t) * np.exp(-5 * (t % (60/beat_freq)) / (60/beat_freq))

# Hi-hat (noise burst on 8th note)
hat_pattern = np.zeros_like(t)
for i in range(int(duration * beat_freq * 4)):
    start = int(i * sr / (beat_freq * 4))
    end = min(start + sr // 50, len(t))
    hat_pattern[start:end] = 1

hat = 0.2 * np.random.randn(len(t)) * hat_pattern

# Mid-range tone (track mood)
mood_freq = 440  # A4
mood = 0.1 * np.sin(2 * np.pi * mood_freq * t)

# Compose
audio = kick + hat + mood
audio = audio / np.max(np.abs(audio))  # Normalize

wavfile.write('test_track_120bpm_5min.wav', sr, (audio * 32767).astype(np.int16))
print('Generated test_track_120bpm_5min.wav')
"
```

Then route through audio interface to DJ controller (Rekordbox or standalone).

---

## Option 2: Live Rekordbox Feed

**Hardware:**
- DJ Controller: Pioneer CDJ, Traktor, Rekordbox (USB audio output)
- Audio Interface: 48kHz I/O (RME Fireface, Focusrite Pro, etc.)
- Headphone output → TouchDesigner audio input

**Setup:**
1. Load a 5–10 minute track in Rekordbox/Traktor
2. Play at steady 120–130 BPM
3. TouchDesigner FFT CHOP: `input1` → audio interface input
4. Monitor Phase 3D panel for spectrum

---

## Option 3: Synthesized Real-Time Feed (Pure Testing)

**Generate on-the-fly:**
```python
# librosa-based test signal
import numpy as np
import librosa

sr = 48000
duration = 300

# Kick on quarter notes (120 BPM)
kick = librosa.onset.onset_strength_multi(
    S=librosa.stft(np.sin(2 * np.pi * 60 * np.linspace(0, duration, sr * duration))),
    sr=sr
)

# Vary energy (ramp up at 1:00, drop at 3:00, ramp to end)
energy = np.ones(sr * duration)
energy[sr*60:sr*120] = np.linspace(1, 1.5, sr*60)  # Build
energy[sr*180:sr*240] = 0.5  # Drop
energy[sr*240:] = np.linspace(0.5, 1.2, sr*60)  # Finale

# Spectral content sweep
freq_sweep = np.linspace(2000, 8000, sr * duration)  # Warm → bright
spectral = np.sin(2 * np.pi * freq_sweep * np.linspace(0, duration, sr * duration) / duration)

# Mix
audio = 0.5 * kick + 0.3 * energy + 0.2 * spectral
```

---

## Audio Input Routing

**TouchDesigner FFT CHOP:**
```
audiofileIn TOP
  ↓
reorder TOP (swap channels if needed)
  ↓
fft CHOP (2048 samples, Hann window, 48kHz)
  ↓
normalize CHOP (scale 0–100)
  ↓
[feed to Phase 4A: /djjj/ai/energy OSC]
```

**Or live audio device:**
```
audiodevicein CHOP (device: "USB Audio Interface")
  ↓
fft CHOP
  ↓
[same flow]
```

---

## Monitoring Phase 3D Output

**In TouchDesigner, check these channels:**

1. **Amplitude (0–100):**
   - Kick hits: 80–100
   - Sustain: 30–60
   - Silence: 5–20

2. **Spectral centroid (Hz):**
   - Kick-heavy: 500–2000 Hz (warm)
   - Balanced: 2000–4000 Hz
   - Hi-hat-heavy: > 5000 Hz (bright)

3. **Frequency bins (20 Hz–20 kHz, 32–64 bands):**
   - Sub (20–60 Hz): Kick content
   - Low (60–250 Hz): Bass
   - Mid (250–2000 Hz): Snare, synths
   - High (2000–20000 Hz): Hats, sizzle

**Expected during 5–10 min test:**
- Energy ramps from 30 → 80 → 50 → 90 (varied dynamics)
- Spectral centroid sweeps 1000–8000 Hz (genre progression)
- Consistent beat clock (120 BPM = 2 beats/sec)

---

## Running Integration Test with Audio

```bash
# Terminal 1: Start llama.cpp server
ollama serve mistral  # or other Q5/Q4 model

# Terminal 2: Start TouchDesigner TOX with audio input active
# (manually run Phase 3D audio node in TOX)

# Terminal 3: Run orchestrator
cd /home/user/Blue-Dimension-/integration-test
python test_orchestrator.py

# Watch output:
# [300 frames] Frame time: 16.2ms, LLM: 45ms, OSC: 1.2ms
# [600 frames] Frame time: 16.5ms, LLM: 38ms (fallback: False), OSC: 1.1ms
# ...
# [18000 frames] (5 min @ 60Hz)
# ✅ All validation checks passed!
```

---

## Expected Audio Feature Progression (120 BPM, 5 min track)

| Time | BPM | Energy | Spectral | Mood | Description |
|------|-----|--------|----------|------|---|
| 0:00 | 120 | 40 | 2000 Hz | balanced | Intro kick + bass |
| 1:00 | 120 | 60 | 4000 Hz | energetic_techno | Build: hi-hats added |
| 2:30 | 120 | 80 | 6000 Hz | bright_energetic | Peak: full spectrum |
| 3:00 | 120 | 30 | 1500 Hz | hypnotic_deep | Drop: back to kick/bass |
| 4:00 | 120 | 70 | 5000 Hz | soulful | Finale: melodic return |
| 5:00 | 120 | 50 | 3000 Hz | balanced | Outro fade |

This simulates a typical 5-minute techno set structure and validates all Phase 4A/4C color and particle dynamics.
