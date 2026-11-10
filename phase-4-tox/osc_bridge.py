#!/usr/bin/env python3
"""
OSC Bridge: Phase 4A (AI Track-Analyse) → TouchDesigner TOX
Integrates semantic audio features into real-time shader parameters.

Runs as external Python process, sends OSC to TouchDesigner on port 9000.
"""

import asyncio
import json
import logging
import time
from dataclasses import asdict
from typing import Dict, Any, Optional

from pythonosc import udp_client, osc_server, dispatcher

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class OSCBridge:
    """Relay Phase 4A (AI Track-Analyse) features to TouchDesigner."""

    def __init__(
        self,
        touchdesigner_host: str = "127.0.0.1",
        touchdesigner_port: int = 9000,
        listen_port: int = 8000,
    ):
        self.td_client = udp_client.SimpleUDPClient(touchdesigner_host, touchdesigner_port)
        self.listen_port = listen_port

        self.dispatcher = dispatcher.Dispatcher()
        self._register_handlers()

        self.server = osc_server.AsyncIOOSCUDPServer(
            ("0.0.0.0", listen_port),
            self.dispatcher,
            asyncio.get_event_loop(),
        )

        self.stats = {
            "messages_received": 0,
            "messages_sent": 0,
            "last_energy": 0.0,
            "last_mood": "balanced",
        }

    def _register_handlers(self):
        """Register OSC message handlers."""
        self.dispatcher.map("/djjj/ai/key", self._handle_key)
        self.dispatcher.map("/djjj/ai/bpm", self._handle_bpm)
        self.dispatcher.map("/djjj/ai/energy", self._handle_energy)
        self.dispatcher.map("/djjj/ai/mood", self._handle_mood)
        self.dispatcher.map("/djjj/ai/sonic_descriptor", self._handle_sonic)
        self.dispatcher.map("/djjj/ai/source", self._handle_source)
        self.dispatcher.map("/djjj/ai/spectral_centroid", self._handle_spectral)

    def _handle_key(self, address: str, key: str):
        """Forward key to TouchDesigner."""
        self.td_client.send_message("/td/ai/key", key)
        self.stats["messages_sent"] += 1

    def _handle_bpm(self, address: str, bpm: float):
        """Forward BPM to TouchDesigner."""
        self.td_client.send_message("/td/ai/bpm", bpm)
        self.stats["messages_sent"] += 1

    def _handle_energy(self, address: str, energy: float):
        """Forward energy and compute scattering coefficient."""
        self.td_client.send_message("/td/ai/energy", energy)

        # Compute shader uniform: scattering_coeff = 0.1 + (energy / 100) * 0.9
        scattering = 0.1 + (energy / 100.0) * 0.9
        self.td_client.send_message("/td/gpu/scattering_coeff", scattering)

        self.stats["last_energy"] = energy
        self.stats["messages_sent"] += 2

    def _handle_mood(self, address: str, mood: str):
        """Forward mood and compute absorption coefficient."""
        self.td_client.send_message("/td/ai/mood", mood)

        # Compute shader uniform: absorption_coeff based on mood
        mood_absorption_map = {
            "energetic_techno": 0.3,
            "hypnotic_deep": 0.5,
            "soulful": 0.6,
            "melodic": 0.4,
            "minimal": 0.35,
            "peak_time": 0.25,
            "warm_dark": 0.8,
            "bright_energetic": 0.2,
            "balanced": 0.5,
        }
        absorption = mood_absorption_map.get(mood, 0.5)
        self.td_client.send_message("/td/gpu/absorption_coeff", absorption)

        self.stats["last_mood"] = mood
        self.stats["messages_sent"] += 2

    def _handle_sonic(self, address: str, descriptor: str):
        """Forward sonic descriptor (for display)."""
        self.td_client.send_message("/td/ai/sonic_descriptor", descriptor)
        self.stats["messages_sent"] += 1

    def _handle_source(self, address: str, source: str):
        """Forward feature source (llm vs heuristic)."""
        source_val = 1.0 if source == "llm" else 0.0
        self.td_client.send_message("/td/ai/source", source_val)
        self.stats["messages_sent"] += 1

    def _handle_spectral(self, address: str, centroid_hz: float):
        """
        Forward spectral centroid and compute light color.

        Mapping:
        - < 2000 Hz (warm): RGB(1.0, 0.6, 0.2)
        - 2000–4000 Hz (balanced): RGB(1.0, 0.8, 0.6)
        - > 4000 Hz (bright): RGB(1.0, 1.0, 0.8)
        """
        self.td_client.send_message("/td/ai/spectral_centroid", centroid_hz)

        # Compute light color
        if centroid_hz < 2000:
            r, g, b = 1.0, 0.6, 0.2
        elif centroid_hz < 4000:
            r, g, b = 1.0, 0.8, 0.6
        else:
            r, g, b = 1.0, 1.0, 0.8

        # Send as individual floats (OSC doesn't have vec3 type)
        self.td_client.send_message("/td/gpu/light_color_r", r)
        self.td_client.send_message("/td/gpu/light_color_g", g)
        self.td_client.send_message("/td/gpu/light_color_b", b)

        self.stats["messages_sent"] += 4

    async def start(self):
        """Start OSC server (async)."""
        transport, protocol = await self.server
        logger.info(f"OSC Bridge listening on port {self.listen_port}")
        logger.info(f"Forwarding to TouchDesigner on 127.0.0.1:9000")

    def get_stats(self) -> Dict[str, Any]:
        """Return runtime statistics."""
        return self.stats


async def main():
    """Run OSC bridge."""
    bridge = OSCBridge(listen_port=8000)
    await bridge.start()

    logger.info("OSC Bridge ready. Waiting for Phase 4A messages...")

    # Keep server running
    try:
        while True:
            await asyncio.sleep(5)
            stats = bridge.get_stats()
            logger.debug(f"Stats: {stats}")
    except KeyboardInterrupt:
        logger.info("Shutdown")


if __name__ == "__main__":
    asyncio.run(main())
