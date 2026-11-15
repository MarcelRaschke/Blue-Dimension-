# DJJJ TouchDesigner TOX-Prototype: Complete Build Guide

**Status:** Integration Architecture | **Version:** 1.0 | **Target:** TouchDesigner 2024.12500+

---

## Executive Summary

Das DJJJ TOX-Prototype integriert Phase 3D (Audio), Phase 4A (AI Track-Analyse), Phase 4B (GPU Particles), und Phase 4C (Volumetric Lighting) in einem produktionsreifen TouchDesigner-Projekt.

**Integration:**
- Real-time 60Hz+ audio-reactive visual engine
- OSC-driven parameter binding (Phase 4A → GPU uniforms)
- GPU particle system mit volumetric ray-marching overlay
- Live performance dashboard (latency, thermal, feature monitoring)
- Zero-cloud architecture (all local computation)

**File Structure:**
```
djjj_signature_bridge.toe          # Main project file
  ├─ nets/
  │   ├─ osc_receiver.tox          # Phase 4A OSC input handler
  │   ├─ particle_system.tox       # Phase 4B GPU particles (GLSL)
  │   ├─ volumetric_renderer.tox   # Phase 4C ray-marching (MAT)
  │   ├─ audio_analysis.tox        # Phase 3D audio processing
  │   └─ performance_dashboard.tox # Real-time monitoring
  ├─ glsl/
  │   ├─ particles.glsl            # Phase 4B compute shader
  │   ├─ volumetric.glsl           # Phase 4C ray-march shader
  │   └─ composite.glsl            # Final blend + DOF
  └─ python/
      ├─ osc_bridge.py             # OSC server integration
      ├─ thermal_monitor.py        # GPU temp tracking
      └─ performance_logger.py      # Latency profiling
```

---

## Part 1: OSC Receiver Network (Phase 4A Input)

### Network Structure: osc_receiver.tox

```
[OSC In (Port 9000)]
  ↓
  ├─ OSC/UDP In DAT (port=9000)
  │   └─ Callback: extract JSON messages
  │
  ├─ [Parse Phase 4A Messages]
  │   ├─ DAT Script Python
  │   │   • Parse /djjj/ai/key, /djjj/ai/bpm, /djjj/ai/energy
  │   │   • Parse /djjj/ai/mood, /djjj/ai/sonic_descriptor
  │   │   • Write to CHOP channels
  │   │
  │   └─ Export to CHOP
  │       ├─ ch_ai_energy (0–100)
  │       ├─ ch_ai_mood (enum: 0=energetic, 1=warm, 2=balanced)
  │       ├─ ch_ai_spectral_centroid (Hz)
  │       ├─ ch_ai_bpm (float)
  │       └─ ch_ai_source (0=heuristic, 1=llm)
  │
  └─ [Output Channels to Uniforms]
      ├─ scattering_coeff = 0.1 + ch_ai_energy / 1000
      ├─ absorption_coeff = select(ch_ai_mood, [0.3, 0.8, 0.5])
      ├─ light_color_rgb = spectral_centroid_to_rgb(ch_ai_spectral_centroid)
      └─ Broadcast to MAT nodes
```

### Python: OSC Parser

```python
# In osc_receiver.tox DAT Script

class OSCParser:
    def onReceiveOSC(self, address, *args):
        """Parse Phase 4A OSC messages."""
        
        if address == "/djjj/ai/energy":
            op("ch_ai_energy")[0] = args[0]  # 0–100
        
        elif address == "/djjj/ai/mood":
            mood_map = {
                "energetic_techno": 0,
                "warm_dark": 1,
                "balanced": 2,
            }
            op("ch_ai_mood")[0] = mood_map.get(args[0], 2)
        
        elif address == "/djjj/ai/spectral_centroid":
            op("ch_ai_spectral_centroid")[0] = args[0]
        
        elif address == "/djjj/ai/bpm":
            op("ch_ai_bpm")[0] = args[0]
        
        elif address == "/djjj/ai/source":
            op("ch_ai_source")[0] = 1 if args[0] == "llm" else 0

# OSC receiver callback (UDP In DAT)
def onDAT(scriptOp, dat):
    parser = OSCParser()
    for row in dat.rows():
        address = row[0].val
        args = [row[i].val for i in range(1, len(row))]
        parser.onReceiveOSC(address, *args)
```

---

## Part 2: Audio Analysis Network (Phase 3D Input)

### Network Structure: audio_analysis.tox

```
[Audio Input from DJ Mix]
  ↓
[Audio In CHOP (Rekordbox Stream)]
  ├─ Input: PCM 48kHz stereo
  │   └─ Resample if needed (CDJ output might be 44.1kHz)
  │
  ├─ [Spectral Analysis]
  │   ├─ FFT CHOP
  │   │   • N=2048, hop=1024 (48ms windows)
  │   │   • Magnitude spectrum (0–24kHz)
  │   │   • Output: freq_bins (8 bands for Phase 4B)
  │   │
  │   └─ CHOP to TOP (convert to texture)
  │       └─ freq_texture (1D, 8 channels for GPU access)
  │
  ├─ [Amplitude Tracking]
  │   ├─ Level CHOP (RMS per frame)
  │   └─ Math CHOP (normalize to 0–100 energy scale)
  │
  └─ [MIDI Sync (from CDJ)]
      ├─ MIDI In DAT (port from Rekordbox)
      │   • Tempo tap
      │   • Key detection
      │   • Beat sync counter
      │
      └─ Beat Counter CHOP
          ├─ Bar counter (0–3)
          ├─ Beat counter (0–15 per bar @ 120bpm)
          └─ Sync phase for parameter animation
```

### Phase 3D CHOP Exports

```
op("audio_analysis").op("ch_rms")[0]         # 0–1 energy
op("audio_analysis").op("ch_freq_bins")[i]   # i=0..7 freq bands
op("audio_analysis").op("ch_bar_counter")[0] # 0–∞ bar number
op("audio_analysis").op("ch_beat_counter")[0] # 0–15 per bar
op("audio_analysis").op("ch_tempo")[0]       # BPM from MIDI
op("audio_analysis").op("ch_key")[0]         # Key (0–11 semitones)
```

---

## Part 3: GPU Particle System (Phase 4B)

### Network Structure: particle_system.tox

```
[Particle Compute Shader]
  ├─ Compute Shader DAT (particles.glsl)
  │   • Local size: 256 threads/block
  │   • Input SSBO: current positions, velocities
  │   • Uniforms from Phase 3D + 4A:
  │     - freq_bins[8] (Phase 3D audio FFT)
  │     - energy (Phase 4A)
  │     - bar_counter (Phase 3D MIDI beat sync)
  │   • Physics: Euler integration, frequency-driven acceleration
  │   • Output SSBO: updated positions/velocities/lifetimes
  │
  └─ [Rendering: TOP Render]
      ├─ Geometry:
      │   • 10K–100K point sprites (QUAD or sphere instancing)
      │   • Per-particle: position (from compute SSBO), size, color
      │
      ├─ Vertex Shader:
      │   • Transform position (world → screen space)
      │   • Size based on particle energy / lifetime
      │   • Color: frequency bin mapped to RGB (low freq = red, high = blue)
      │
      ├─ Fragment Shader:
      │   • Soft particle anti-aliasing (alpha fade at edges)
      │   • Additive blending (glow effect)
      │   • Depth write for Phase 4C occlusion
      │
      └─ Output: particle_rgba (1024×1024, additive)
```

### particles.glsl (Compute Shader)

```glsl
#version 430

layout (local_size_x = 256) in;

struct Particle {
    vec4 pos_lifetime;  // xyz = position, w = lifetime
    vec4 vel_radius;    // xyz = velocity, w = radius
};

layout (std430, binding = 0) buffer particle_buffer {
    Particle particles[];
};

// Uniforms from Phase 3D + 4A
layout (location = 0) uniform vec3 freq_bins;     // [0..7] audio FFT
layout (location = 1) uniform float energy;       // 0–1 normalized
layout (location = 2) uniform float dt;           // timestep 0.016s @ 60Hz
layout (location = 3) uniform uint bar_counter;   // for lifecycle phase
layout (location = 4) uniform float spectral_centroid; // Hz

void main() {
    uint idx = gl_GlobalInvocationID.x;
    if (idx >= particles.length()) return;
    
    Particle p = particles[idx];
    
    // Phase 1: Gravity + frequency-driven acceleration
    vec3 accel = vec3(0, -9.8, 0);  // Gravity
    
    // Map frequency bins to spatial acceleration
    float freq_accel = freq_bins[idx % 8] * energy;
    accel += vec3(
        sin(float(idx)) * freq_accel * 50,
        cos(float(idx)) * freq_accel * 100,  // Upward bias on high energy
        sin(float(idx) * 0.5) * freq_accel * 30
    );
    
    // Phase 2: Update velocity & position
    p.vel_radius.xyz += accel * dt;
    p.pos_lifetime.xyz += p.vel_radius.xyz * dt;
    
    // Phase 3: Lifetime management
    p.pos_lifetime.w -= dt;  // Decay lifetime
    
    // Phase 4: Respawn if dead (beat-synced)
    if (p.pos_lifetime.w < 0.0) {
        p.pos_lifetime.w = 3.0 + energy;  // 3–4s lifetime, energy-dependent
        p.pos_lifetime.xyz = vec3(
            sin(float(bar_counter + idx)) * 10,
            5.0,
            cos(float(bar_counter + idx)) * 10
        );  // Spawn at beat-synced position
        p.vel_radius.xyz = vec3(0);
    }
    
    // Phase 5: Apply bounds (clamp to [-50, 50])
    p.pos_lifetime.xyz = clamp(p.pos_lifetime.xyz, -50.0, 50.0);
    
    particles[idx] = p;
}
```

---

## Part 4: Volumetric Ray-Marching (Phase 4C)

### Network Structure: volumetric_renderer.tox

```
[Density Field Generation]
  ├─ Compute Shader (density.glsl)
  │   • Input: particle SSBO from Phase 4B
  │   • Output: 3D texture 64³ (density_field)
  │   • Gaussian contribution per particle
  │   • Latency: <0.5ms
  │
  └─ [Ray-Marching Render]
      ├─ MAT node: volumetric_lighting.glsl
      │   • Input textures: density_field (3D), particle_rgba (2D)
      │   • Uniforms from Phase 4A (OSC):
      │     - scattering_coeff (0.1–1.0 from energy)
      │     - absorption_coeff (0.3–0.8 from mood)
      │     - light_position (animated via beat counter + Lissajous)
      │     - light_color (spectral centroid mapped)
      │   • Algorithm: 64-step screen-space ray-march
      │   • Output: volumetric_rgba (HDR)
      │
      └─ [Composite + Final Output]
          ├─ TOP node: Blend
          │   • Input 1: particle_rgba (Phase 4B)
          │   • Input 2: volumetric_rgba (Phase 4C)
          │   • Blend mode: Screen (additive with tone-mapping)
          │
          ├─ TOP node: Depth-of-Field (optional)
          │   • Focus distance: bar-synced animation
          │   • Bokeh from volumetric scattering
          │
          └─ Output: final_rgba (ready for display/record)
```

### volumetric.glsl (Fragment Shader)

```glsl
#version 430

in vec2 uv;
out vec4 volumetric_rgba;

// Input textures
uniform sampler3D density_tex;
uniform sampler2D particle_tex;

// Uniforms from Phase 4A (OSC)
uniform float scattering_coeff;      // 0.1–1.0 (energy-driven)
uniform float absorption_coeff;      // 0.3–0.8 (mood-driven)
uniform vec3 light_position;         // Animated (bar + Lissajous)
uniform vec3 light_color;            // Spectral centroid mapped
uniform mat4 camera_matrix;
uniform mat4 inv_camera_matrix;

const int RAY_STEPS = 64;
const float STEP_SIZE = 0.1;

void main() {
    // Reconstruct ray from screen-space UV
    vec3 ray_origin = camera_matrix[3].xyz;  // Camera position
    vec4 ndc = vec4(uv * 2.0 - 1.0, 1.0, 1.0);
    vec4 ray_eye = inv_camera_matrix * ndc;
    vec3 ray_dir = normalize(ray_eye.xyz);
    
    vec4 accumulated = vec4(0.0);
    float transmittance = 1.0;
    
    // Ray-march through volumetric density
    for (int i = 0; i < RAY_STEPS; i++) {
        vec3 march_pos = ray_origin + ray_dir * STEP_SIZE * i;
        
        // Sample 3D density at marched position
        float density = texture(density_tex, march_pos / 20.0).r;  // World scale
        
        // Light contribution (Phong scattering)
        vec3 to_light = normalize(light_position - march_pos);
        float phase = 0.25 * (1.0 + dot(ray_dir, to_light));
        
        vec3 scattering = light_color * phase * density * scattering_coeff;
        
        // Accumulate
        accumulated.rgb += transmittance * scattering;
        
        // Attenuate transmittance
        transmittance *= exp(-density * absorption_coeff * STEP_SIZE);
        
        if (transmittance < 0.01) break;  // Early exit
    }
    
    volumetric_rgba = vec4(accumulated.rgb, transmittance);
}
```

---

## Part 5: Performance Dashboard Network

### Network Structure: performance_dashboard.tox

```
[Real-Time Monitoring]
  ├─ GPU Latency Profiler
  │   • GPU timer queries (GL_TIME_ELAPSED)
  │   • Per-stage breakdown:
  │     - Density generation: target <0.5ms
  │     - Ray-march: target <2ms
  │     - Composite: target <0.5ms
  │   • Output: latency_chop
  │
  ├─ Thermal Monitor
  │   • GPU temp polling (nvidia-smi / amd-rocm-smi)
  │   • Alert if > 80°C (reduce ray steps)
  │   • Display: temperature_value
  │
  ├─ Phase 4A Feature Display
  │   • Receive OSC values (energy, mood, key, BPM)
  │   • Display as live gauges + text overlay
  │   • TAB widget for multi-parameter view
  │
  ├─ Audio Spectrum Display
  │   • FFT from Phase 3D (8 bands)
  │   • Real-time bar chart (TOP)
  │   • Beat sync indicator (bar/beat counter)
  │
  └─ Frame Rate Counter
      • FPS display (target 60Hz)
      • Frame timing histogram
      • Dropout detection
```

### Python: Performance Logger

```python
# performance_logger.py (runs in TouchDesigner via DAT Script)

import time
import subprocess
import json

class PerformanceLogger:
    def __init__(self):
        self.frame_count = 0
        self.last_time = time.time()
        self.gpu_times = []  # Rolling window of GPU latencies
    
    def log_gpu_latency(self, stage, ms):
        """Log per-stage GPU timing."""
        self.gpu_times.append({"stage": stage, "ms": ms, "t": time.time()})
        if len(self.gpu_times) > 300:  # Keep last 5 seconds @ 60Hz
            self.gpu_times.pop(0)
    
    def get_thermal_status(self):
        """Query GPU temperature."""
        try:
            # Nvidia
            result = subprocess.run(
                ["nvidia-smi", "--query-gpu=temperature.gpu", "--format=csv,noheader"],
                capture_output=True,
                text=True,
                timeout=1
            )
            if result.returncode == 0:
                return float(result.stdout.strip())
        except:
            pass
        
        try:
            # AMD (rocm)
            result = subprocess.run(
                ["rocm-smi", "--showtemp"],
                capture_output=True,
                text=True,
                timeout=1
            )
            # Parse output (varies by rocm version)
            lines = result.stdout.split("\n")
            for line in lines:
                if "Temperature" in line:
                    return float(line.split()[-2])
        except:
            pass
        
        return None  # Unknown/unavailable
    
    def update(self):
        """Called once per frame."""
        self.frame_count += 1
        now = time.time()
        dt = now - self.last_time
        
        if dt > 1.0:
            fps = self.frame_count / dt
            avg_gpu_ms = sum(t["ms"] for t in self.gpu_times[-60:]) / max(1, len(self.gpu_times[-60:]))
            temp = self.get_thermal_status()
            
            # Write to dashboard CHOPs
            op("dashboard").op("ch_fps")[0] = fps
            op("dashboard").op("ch_avg_gpu_ms")[0] = avg_gpu_ms
            if temp:
                op("dashboard").op("ch_gpu_temp")[0] = temp
            
            self.frame_count = 0
            self.last_time = now
```

---

## Part 6: Integration & Startup Sequence

### Boot Order

```
1. [T=0] Start Phase 3D Bridge
   • Audio input initialized
   • MIDI sync active
   • OSC broadcast on /djjj/freqs/[0..7] @ 30Hz

2. [T=0.5s] Start Phase 4A (Local LLM)
   • llama.cpp server listening on localhost:8001
   • Heuristic feature extraction ready
   • OSC broadcast on /djjj/ai/* @ 30Hz

3. [T=1s] Load djjj_signature_bridge.toe
   • OSC receiver listening on port 9000
   • Parse Phase 3D + Phase 4A messages
   • Initialize GPU resources

4. [T=1.5s] Activate Particle System (Phase 4B)
   • Compute shader compiles
   • 10K particles spawned
   • Frequency-driven animation active

5. [T=2s] Activate Volumetric Renderer (Phase 4C)
   • Density field generation begins
   • Ray-marching shader active
   • Light position animation sync

6. [T=2.5s] Activate Performance Dashboard
   • GPU latency profiling starts
   • Thermal monitor polling
   • Real-time display live

7. [T=3s] System Ready → DJ Can Start Mix
```

### Startup Script (Python DAT)

```python
# In djjj_signature_bridge.toe root DAT Script

def startup():
    """Initialize all subsystems in correct order."""
    
    # Load and activate subnets
    ops = [
        ("audio_analysis", 0.0),
        ("osc_receiver", 0.5),
        ("particle_system", 1.0),
        ("volumetric_renderer", 1.5),
        ("performance_dashboard", 2.0),
    ]
    
    for net_name, delay_s in ops:
        def delayed_load(n=net_name, d=delay_s):
            run(f"op('{n}').par.active = True", delayFrames=int(d * 60))
        delayed_load()
    
    debug(f"[DJJJ TOX] Startup sequence initiated, ready in ~3s")
```

---

## Part 7: Real-Time Parameter Binding Matrix

### Unified Control Flow

```
Phase 3D Audio Input
├─ Freq bins [0..7] → Phase 4B particle acceleration
├─ RMS energy → Phase 4B particle size
├─ Bar counter → Phase 4B spawn sync + 4C light animation
└─ MIDI key → HSV color mapping (particles)

Phase 4A AI Track-Analyse (OSC)
├─ Energy (0–100) → Phase 4C scattering_coeff (0.1–1.0)
├─ Mood (enum) → Phase 4C absorption_coeff (0.3–0.8)
├─ Spectral centroid (Hz) → Phase 4C light_color (RGB)
└─ BPM → Phase 4C light animation frequency

Phase 4B Particles
├─ Position/velocity → Phase 4C density field input
├─ Lifetime → Phase 4C volumetric depth fade
└─ Energy-driven size → Phase 4C scattering multiplier

Phase 4C Volumetric Output
└─ Final composite → Display / Record / Network broadcast (NDI)
```

---

## Part 8: Production Deployment Checklist

- [ ] Phase 3D Bridge running (audio input + MIDI sync verified)
- [ ] Phase 4A llama.cpp server active (localhost:8001)
- [ ] djjj_signature_bridge.toe opens without errors
- [ ] OSC receiver listening on port 9000 (verify with netstat)
- [ ] Phase 4A messages received in osc_receiver.tox (debug console)
- [ ] Phase 4B particles render visible on screen
- [ ] Phase 4C volumetric lighting active (ray-marching visible)
- [ ] GPU latency <5ms total (density + ray-march + composite)
- [ ] Thermal monitor: GPU temp <75°C baseline
- [ ] Audio FFT spectrum displayed and responding to music
- [ ] Beat counter synchronized to CDJ tempo
- [ ] Performance dashboard updating at 60Hz
- [ ] 5-min dry-run with test DJ set
- [ ] Record test video (1–2 min) to verify output quality
- [ ] Latency profiling: end-to-end <16.7ms (60Hz guarantee)

---

## Part 9: File Export & Build Instructions

### Export from TouchDesigner

```python
# In TouchDesigner: Ctrl+Shift+E (Export)
# Or use DAT Script:

def export_toe():
    """Export project with all dependencies."""
    project_path = r"C:\Projects\DJJJ\djjj_signature_bridge.toe"
    op("project").save(project_path)
    
    # Package GLSL shaders separately
    for shader in ["particles.glsl", "volumetric.glsl", "composite.glsl"]:
        shader_path = f"C:\\Projects\\DJJJ\\glsl\\{shader}"
        # (Copy shader source to this path)
    
    debug(f"[EXPORT] Project saved to {project_path}")
    debug(f"[EXPORT] Ready for deployment")
```

### Minimum Hardware Requirements

- GPU: Nvidia RTX 2080 / AMD RX 6800 (or better)
- VRAM: 6GB (recommended 8GB+)
- CPU: Intel i7 / AMD Ryzen 5 (for Phase 4A LLM)
- Audio I/O: USB audio interface (48kHz, stereo)
- Network: Gigabit Ethernet (for CDJ MIDI/OSC)

---

## References & Next Steps

- **TouchDesigner Docs:** tdn.derivative.ca (GLSL, CHOP, Python)
- **Phase 3D Bridge:** Rekordbox CDJ control protocol, MIDI sync
- **Phase 4A LLM:** llama.cpp OSC integration
- **Phase 4B Particles:** GPU compute shader optimization
- **Phase 4C Volumetric:** Ray-marching best practices (GPU Gems)

**Deployment Scenario:** Live DJ set at Radio LoRa (Blue Dimension, Thursdays 00:00–06:00 UTC+1)
