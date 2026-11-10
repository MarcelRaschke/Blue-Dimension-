# DJJJ Signature Bridge v2
## OSC/MIDI/DMX Live Performance Architecture

**Version:** 2.0 | **Status:** Production Specification | **Date:** 2026-11-10

---

## Executive Summary

DJJJ Signature Bridge v2 is a network-synchronized protocol framework connecting:
- **Rekordbox/CDJ** (audio, beat grid, hot cues) → OSC
- **TouchDesigner** (generative visuals, real-time rendering) → DMX/ArtNet
- **Audio Interface** (latency reference, sync) → PTP/audio clock
- **Venue DMX** (lighting rig, stage effects, video wall) ← DMX512

Designed for **sub-10ms latency** synchronization across 100Mbps+ Ethernet in live club and broadcast environments.

---

## System Architecture

### Network Topology

```
┌─────────────────────────────────────────────────────────┐
│                    VENUE NETWORK (100Mbps)              │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐      ┌──────────────┐                 │
│  │  Rekordbox   │      │   Audio I/O  │                 │
│  │  (CDJ XDJ)   │      │  (RME Babyface)                │
│  │              │      │              │                 │
│  │ OSC Send:    │      │ Dante/AES3   │                 │
│  │ :6969 (UDP)  │      │ PTP Master   │                 │
│  └──────┬───────┘      └──────┬───────┘                 │
│         │                     │                          │
│         └─────────────────────┴──────────────────┐       │
│                                                  │       │
│                                          ┌───────▼──────┐│
│                                          │ TouchDesigner││
│                                          │  (Host PC)   ││
│                                          │              ││
│                                          │ OSC Listen   ││
│                                          │ :6969 (UDP)  ││
│                                          │              ││
│                                          │ DMX Output   ││
│                                          │ (Enttec Pro) ││
│                                          └───────┬──────┘│
│                                                  │       │
│         ┌────────────────────────────────────────┘       │
│         │                                                │
│  ┌──────▼──────────────┐                                │
│  │   DMX512 Universe   │                                │
│  │  (512ch per line)   │                                │
│  │                     │                                │
│  │ Ch 1-12: Spots      │                                │
│  │ Ch 13-48: LED Bars  │                                │
│  │ Ch 49-64: Video Wall│                                │
│  │ Ch 65+: Future      │                                │
│  └─────────────────────┘                                │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### Latency Budget

| Component | Latency | Notes |
|-----------|---------|-------|
| Rekordbox OSC encode | 2ms | Real-time thread |
| Network transit (100m) | 1ms | Copper ethernet |
| TouchDesigner OSC decode | 1ms | GPU thread |
| TouchDesigner → DMX render | 3ms | GPU processing |
| DMX transmit (512ch) | 23ms | ~46µs per channel |
| **Total end-to-end** | **~30ms** | Acceptable for visual sync |

**Audio sync reference:** PTP clock ±100µs for frame-accurate timing.

---

## Protocol Specification

### 1. OSC Message Schema (Rekordbox → TouchDesigner)

#### Deck State Messages (30Hz)

```
/deck/1/playing       | int     | 0=stopped, 1=playing
/deck/1/bpm           | float   | Current BPM (e.g., 120.5)
/deck/1/beat_grid     | int     | Current beat position (0-3)
/deck/1/time_position | float   | Milliseconds since start
/deck/1/jog_position  | float   | Jog wheel position (0.0-1.0, wrap)
/deck/1/tempo_adjust  | float   | Tempo %: 1.0 = 100%, 1.1 = +10%
/deck/1/pitch         | float   | Frequency shift in semitones
```

#### Hot Cue / Marker Messages (on-trigger)

```
/cue/1/hit            | int     | Hot cue ID (1-8)
/cue/1/color          | int     | RGB packed (0xRRGGBB)
/cue/1/name           | string  | Cue name ("Build", "Drop", etc.)
/cue/1/time           | float   | Cue position in ms
```

#### Master Clock (10Hz)

```
/master/time          | float   | Unix timestamp (seconds.fractional)
/master/beat          | int     | Master beat counter (wraps at 4)
/master/bar           | int     | Bar number (for 4-beat grouping)
```

#### Example OSC Bundle (30Hz tick)

```
#bundle 1730773536.128
  /deck/1/playing i 1
  /deck/1/bpm f 122.5
  /deck/1/beat_grid i 2
  /deck/1/time_position f 1543200.0
  /deck/1/jog_position f 0.342
  /deck/1/tempo_adjust f 1.04
  /deck/2/playing i 0
  /master/time f 1730773536.128
  /master/beat i 3
```

### 2. MIDI CC Mapping (Rekordbox Outputs)

| CC# | Parameter | Range | Purpose |
|-----|-----------|-------|---------|
| 1 | Modulation (Deck 1 Jog) | 0-127 | Jog wheel position |
| 2 | Breath (Deck 1 Tempo) | 0-127 | Tempo adjustment (64=100%) |
| 3 | Foot (Deck 2 Jog) | 0-127 | Deck 2 jog wheel |
| 4 | Foot Volume (Master Volume) | 0-127 | Master fader |
| 7 | Channel Volume (Deck 1) | 0-127 | Deck 1 fader |
| 10 | Pan (Crossfader) | 0-127 | Left deck (0) → Right deck (127) |
| 11 | Expression (Deck 2 Tempo) | 0-127 | Deck 2 tempo |
| 64-71 | Hot Cue 1-8 | 0/127 | On/off triggers |

**Note:** Use OSC for beat-grid and time-code; MIDI CC for continuous fader feedback.

### 3. DMX512 Channel Assignment

```
Universe 1 (Channels 1-512):

MOVING LIGHTS (Chauvet Professional, ETC)
  1-3:   Spotlight 1 (Pan/Tilt/Intensity)
  4-6:   Spotlight 2 (Pan/Tilt/Intensity)
  7-9:   Spotlight 3 (Pan/Tilt/Intensity)

LED BARS (8x RGB LED fixtures)
  10-12: Bar 1 (R/G/B)
  13-15: Bar 2 (R/G/B)
  16-18: Bar 3 (R/G/B)
  19-21: Bar 4 (R/G/B)
  22-24: Bar 5 (R/G/B)
  25-27: Bar 6 (R/G/B)
  28-30: Bar 7 (R/G/B)
  31-33: Bar 8 (R/G/B)

VIDEO WALL (4x 128ch LED panels in series)
  34-161:  Panel 1 (128ch RGB PWM)
  162-289: Panel 2 (128ch RGB PWM)
  290-417: Panel 3 (128ch RGB PWM)
  418-512: Panel 4 (128ch RGB PWM, partial)

RESERVED
  513+:    Universe 2+ (daisy-chain as needed)
```

---

## Implementation Guide

### A. TouchDesigner OSC Listener Setup

#### Node Architecture

```
CHOP ├─ OSC In (UDP :6969)
     ├─ Parse Bundle
     ├─ Beat Detector (jitter smoothing)
     └─ DMX Out (Enttec USB Pro)

SOP  ├─ Audio Reactive Geometry
     ├─ Particle System (BPM-locked)
     └─ Shader (HSV color shift by beat)
```

#### Python Script: OSC Decoder

```python
# op('oscin').appendDAT -> callbacks on message arrival

def messageReceived(args, argString):
    """
    OSC message handler in TouchDesigner CHOP
    args = [address, value, ...]
    """
    addr = args[0]
    
    # Deck 1 OSC messages
    if addr == '/deck/1/playing':
        op('const_playing').val = args[1]
    elif addr == '/deck/1/bpm':
        bpm = args[1]
        op('chop_bpm').val = bpm
        # Calculate beat duration in seconds
        beat_s = 60.0 / bpm
        op('chop_beat_period').val = beat_s
    elif addr == '/deck/1/beat_grid':
        op('chop_beat_pos').val = args[1]  # 0-3
    elif addr == '/deck/1/jog_position':
        op('chop_jog').val = args[1]
    elif addr == '/cue/1/hit':
        cue_id = args[1]
        triggerCueAnimation(cue_id)
    
    # Master time for frame-accurate sync
    elif addr == '/master/time':
        unix_time = args[1]
        op('chop_sync_time').val = unix_time
```

#### OSC Parameter Table (DAT op)

| Parameter | CHOP Channel | Update Rate | Use |
|-----------|--------------|-------------|-----|
| deck1_playing | const_playing | Event | Gate animation |
| deck1_bpm | chop_bpm | 30Hz | Scale animations, tempo sync |
| deck1_beat_grid | chop_beat_pos | 30Hz | Quantize particle bursts |
| deck1_jog_position | chop_jog | 30Hz | Modulate visual position |
| master_beat | chop_beat | 10Hz | Global beat counter |
| master_time | chop_sync_time | 10Hz | Frame accuracy reference |

### B. Rekordbox OSC Export (Via PACEMAKER or Custom Bridge)

#### Option 1: Use Pacemaker (Recommended)

Pacemaker is a standalone Rekordbox OSC bridge that requires:
- Rekordbox 6.7+ with Pioneer Link enabled
- macOS/Windows host on same network
- Output: UDP port 6969

Configuration:
```yaml
# pacemaker-config.yaml
output:
  protocol: osc
  port: 6969
  target: 192.168.1.50  # TouchDesigner host IP
  rate: 30  # Hz

decks: [1, 2]
include_beat_grid: true
include_hot_cues: true
```

#### Option 2: Custom Node.js Bridge (Raw Protocol)

```javascript
// rekordbox-osc-bridge.js
const osc = require('osc');
const Pioneer = require('pioneer-sdk');

const oscUdp = new osc.UDPPort({
  remoteAddress: "192.168.1.50",
  remotePort: 6969,
  localAddress: "0.0.0.0",
  localPort: 6970
});

const pioneer = new Pioneer.DeviceManager();

pioneer.on('deck_updated', (deck) => {
  oscUdp.send({
    address: `/deck/${deck.id}/playing`,
    args: [{type: 'i', value: deck.isPlaying ? 1 : 0}]
  });
  
  oscUdp.send({
    address: `/deck/${deck.id}/bpm`,
    args: [{type: 'f', value: deck.bpm}]
  });
  
  oscUdp.send({
    address: `/deck/${deck.id}/beat_grid`,
    args: [{type: 'i', value: deck.beatGrid}]
  });
});

oscUdp.open();
```

### C. DMX Output (TouchDesigner → Lighting Rig)

#### Python: DMX Channel Writer

```python
# Enttec Pro DMX USB interface
import struct

class DMXController:
    def __init__(self, port='/dev/ttyUSB0'):
        self.port = port
        self.universe = [0] * 512
    
    def set_channel(self, ch, value):
        """Set single DMX channel (1-512)"""
        self.universe[ch - 1] = max(0, min(255, int(value)))
    
    def set_rgb(self, fixture_base, r, g, b):
        """Set RGB fixture (3-channel)"""
        self.set_channel(fixture_base, r)
        self.set_channel(fixture_base + 1, g)
        self.set_channel(fixture_base + 2, b)
    
    def send_dmx(self):
        """Transmit universe via USB/serial"""
        header = struct.pack('>BBB', 0x7E, 0x06, 0x01)
        payload = bytes(self.universe)
        footer = b'\xE7'
        msg = header + struct.pack('<H', len(payload)) + payload + footer
        # Write to serial port
        serial.write(msg)

# Usage in TouchDesigner
dmx = DMXController()

# Beat-sync RGB bars
for bar_idx in range(8):
    ch_base = 10 + (bar_idx * 3)
    hue = (op('chop_beat_pos').val / 4.0) * 360  # Hue advances per beat
    r, g, b = hsv_to_rgb(hue, 1.0, 1.0)
    dmx.set_rgb(ch_base, r, g, b)

dmx.send_dmx()
```

#### TouchDesigner CHOP DMX Op Configuration

```
DMX Out (Enttec Pro):
  Device: /dev/ttyUSB0 (or COM3 on Windows)
  Universe: 0 (first 512 channels)
  Frame Rate: 44Hz (23ms per frame at 512ch)
  
Script callbacks:
  - ON_BEAT_CHANGE: Retrigger color animation
  - ON_JOG_UPDATE: Modulate intensity/pan
```

---

## Synchronization Strategy

### Audio Sync Reference (PTP Grandmaster)

**Precision Time Protocol (IEEE 1588-2008)**

Use audio interface as PTP grandmaster to synchronize all networked devices to master audio clock:

```bash
# Linux host running PTP daemon
sudo apt-get install linuxptp

# ptp4l config
[global]
network_transport ip
logMinPdelayReqInterval 0
logAnnounceInterval -3
logSyncInterval -4
logMinDelayReqInterval -4

clockClass 6
clockAccuracy 0x25
offsetScaledLogVariance 0xC000
free_running 1
freq_est_interval 1

[eth0]
network_transport ip
```

**Master sync:** Audio interface sends PTP packets on sub-millisecond cadence.
**Slave sync:** TouchDesigner + DMX receive and align to PTP master clock within ±100µs.

### Jitter Smoothing (Beat Grid)

Beat grid jitter from Rekordbox (~5-10ms variance) is smoothed via low-pass filter:

```python
# First-order IIR low-pass
alpha = 0.3  # 0.1 (heavy) to 0.9 (light)
beat_smooth = (alpha * beat_raw) + ((1 - alpha) * beat_prev)
```

---

## Production Deployment Checklist

### Pre-Show Setup (30 min before doors open)

- [ ] Network connectivity: All devices on same subnet (192.168.x.x/24)
- [ ] Rekordbox → OSC bridge running, logging heartbeat
- [ ] TouchDesigner listening on UDP :6969 (verify firewall)
- [ ] DMX USB adapter recognized by OS (lsusb / Device Manager)
- [ ] DMX universe programmed (all channels to 0)
- [ ] Test beat sync: Play track in Rekordbox, watch beat counter in TouchDesigner
- [ ] Test cue trigger: Hit hot cue, watch animation trigger
- [ ] Test DMX: Manually set channels, observe lighting rig response

### Network Diagnostics

```bash
# Verify OSC traffic
tcpdump -i eth0 -n udp port 6969

# Watch packet latency
ping 192.168.1.50 -i 0.1 -c 30

# Check PTP sync status
ptp4l -i eth0 -m

# Monitor DMX serial traffic
strace -e write -p $(pgrep touchdesigner)
```

### Failsafe Protocols

| Failure | Cause | Mitigation |
|---------|-------|-----------|
| OSC timeout (>500ms) | Network disconnect | DMX freeze on last values |
| Rekordbox crash | Software fault | Manual DMX controller fallback |
| PTP sync loss | Clock slippage | Drift <100µs tolerable for club |
| DMX USB error | Device disconnect | Auto-retry with exponential backoff |

---

## Real-World Tuning

### Beat Detection Stability

```python
# Hysteresis to prevent jitter on threshold
def is_beat_onset(raw_val, threshold=0.5, hysteresis=0.1):
    global last_was_high
    
    if raw_val > (threshold + hysteresis):
        last_was_high = True
        return True
    elif raw_val < (threshold - hysteresis):
        last_was_high = False
        return False
    else:
        return last_was_high
```

### Tempo Interpolation (for smooth visual scaling)

```python
# Bezier ease between tempo changes
def ease_tempo(old_bpm, new_bpm, elapsed_ms, duration_ms=500):
    t = min(1.0, elapsed_ms / duration_ms)
    # Cubic ease-in-out
    eased_t = t * t * (3 - 2*t)
    return old_bpm + (new_bpm - old_bpm) * eased_t
```

### DMX Frame Budget

**Max latency goal: 30ms end-to-end**

- Rekordbox encode: 2ms
- Network: 1ms
- TouchDesigner decode+render: 5ms
- DMX transmit (512ch @24fps): 22ms

Optimize by:
1. Reduce DMX universe to <256 channels if possible (halves latency)
2. Use DMX-over-Ethernet (Art-Net, sACN) instead of serial for <5ms transmit
3. Use GPU-accelerated shaders in TouchDesigner (GLSL) for sub-1ms render

---

## Appendix: Example Live Show Scenario

**Track:** 120 BPM Progressive House | **Duration:** 6 minutes

### Timeline

```
0:00 - Track intro (8 bars)
  OSC: /deck/1/playing → 1
       /deck/1/bpm → 120.0
  DMX: Fade in LED bars (RGB hue rotation by beat)

0:30 - First hot cue hit (build section)
  OSC: /cue/1/hit → 1 (hot cue ID)
       name: "Build"
  TouchDesigner: Trigger particle burst
  DMX: Spot intensity → 200, pan begins sweep

1:00 - Beat grid shift (tempo +8%)
  OSC: /deck/1/tempo_adjust → 1.08
  TouchDesigner: Scale all animations 1.08x
  DMX: Lighting pattern frequency increases

3:00 - Drop (Second hot cue)
  OSC: /cue/1/hit → 2
       name: "Drop"
  TouchDesigner: Freeze particles, flash white
  DMX: All fixtures full intensity, strobe effect

5:00 - Outro (fade)
  OSC: /deck/1/tempo_adjust → 0.95
  TouchDesigner: Slow all motion
  DMX: Crossfade to ambient blue

5:55 - Track end
  OSC: /deck/1/playing → 0
  DMX: All channels → 0
```

---

## References

- **OSC Spec:** http://opensoundcontrol.org/
- **DMX512:** ANSI E1.11-2022
- **Rekordbox SDK:** https://cdj.world/development/
- **TouchDesigner Docs:** https://docs.derivative.ca/
- **PTP (IEEE 1588):** https://en.wikipedia.org/wiki/Precision_Time_Protocol

---

**Status:** Ready for production deployment | **Last Update:** 2026-11-10 | **Author:** DJ Jesse Jay (cy8er)
