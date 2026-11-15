#!/usr/bin/env python3
"""
Integration Test Orchestrator: Phase 3D + 4A + 4B + 4C @ 60Hz sustained.

Monitors:
  - Phase 4A: llama.cpp latency, feature accuracy, fallback rate
  - Phase 4B: particle spawning, physics latency, GPU memory
  - Phase 4C: ray-march time, density texture generation, light color mapping
  - OSC binding: parameter update latency end-to-end
  - GPU thermal: peak temp, throttle events
  - Frame timing: 60Hz compliance, dropped frames
"""

import asyncio
import json
import logging
import time
import subprocess
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger(__name__)


@dataclass
class PhaseMetrics:
    """Per-phase performance snapshot."""
    phase: str
    timestamp: float
    latency_ms: float
    gpu_time_ms: Optional[float] = None
    memory_mb: Optional[float] = None
    thermal_c: Optional[float] = None
    error_count: int = 0


@dataclass
class TestRun:
    """Integration test run results."""
    run_id: str
    start_time: float
    end_time: float
    duration_sec: float
    total_frames: int
    dropped_frames: int
    phase_metrics: List[PhaseMetrics]
    max_thermal_c: float
    llm_fallback_count: int
    osc_latency_ms: List[float]

    def frame_rate(self) -> float:
        return self.total_frames / self.duration_sec if self.duration_sec > 0 else 0

    def frame_drop_pct(self) -> float:
        total = self.total_frames + self.dropped_frames
        return (self.dropped_frames / total * 100) if total > 0 else 0

    def osc_p50_latency(self) -> float:
        if not self.osc_latency_ms:
            return 0
        sorted_latency = sorted(self.osc_latency_ms)
        return sorted_latency[len(sorted_latency) // 2]


class GPUMonitor:
    """Monitor GPU thermal and memory status."""

    async def get_thermal(self) -> Optional[float]:
        """Get GPU temperature in Celsius. Nvidia or AMD."""
        try:
            # Nvidia
            result = subprocess.run(
                ["nvidia-smi", "--query-gpu=temperature.gpu", "--format=csv,noheader"],
                capture_output=True,
                timeout=1,
                text=True
            )
            if result.returncode == 0:
                return float(result.stdout.strip())
        except Exception:
            pass

        try:
            # AMD rocm
            result = subprocess.run(
                ["rocm-smi", "--showtemp"],
                capture_output=True,
                timeout=1,
                text=True
            )
            if result.returncode == 0:
                lines = result.stdout.strip().split('\n')
                for line in lines:
                    if 'Temperature' in line:
                        temp_str = line.split(':')[1].strip().split()[0]
                        return float(temp_str)
        except Exception:
            pass

        return None

    async def get_memory_mb(self) -> Optional[float]:
        """Get GPU memory used in MB."""
        try:
            result = subprocess.run(
                ["nvidia-smi", "--query-gpu=memory.used", "--format=csv,noheader"],
                capture_output=True,
                timeout=1,
                text=True
            )
            if result.returncode == 0:
                return float(result.stdout.strip().split()[0])
        except Exception:
            pass
        return None


class LLMLatencyTracker:
    """Track Phase 4A llama.cpp inference latency."""

    def __init__(self, llm_port: int = 8000):
        self.llm_port = llm_port
        self.latencies = []
        self.fallback_count = 0

    async def measure_inference(self) -> tuple[float, bool]:
        """
        Measure latency of one llama.cpp inference.
        Returns (latency_ms, was_fallback).
        """
        # Mock: in real test, hit llama.cpp /completion endpoint
        start = time.time()
        try:
            # Simulate HTTP call to http://127.0.0.1:llm_port/v1/completions
            await asyncio.sleep(0.05)  # Simulated 50ms inference
            latency_ms = (time.time() - start) * 1000
            self.latencies.append(latency_ms)
            return latency_ms, False
        except Exception as e:
            logger.warning(f"LLM inference failed, using fallback: {e}")
            self.fallback_count += 1
            return -1, True


class OSCLatencyTracker:
    """Track Phase 4A → Phase 4C OSC parameter binding latency."""

    def __init__(self, osc_port: int = 9000):
        self.osc_port = osc_port
        self.latencies = []

    async def measure_osc_round_trip(self) -> float:
        """Measure time from OSC send to TouchDesigner parameter update."""
        # Mock: real test subscribes to TouchDesigner CHOP and measures update delay
        await asyncio.sleep(0.001)  # Simulated 1ms OSC latency
        latency_ms = 1.0
        self.latencies.append(latency_ms)
        return latency_ms


class IntegrationTestRunner:
    """Orchestrate end-to-end 60Hz test."""

    def __init__(
        self,
        duration_sec: int = 300,  # 5 minutes
        target_fps: int = 60,
        audio_file: Optional[str] = None,
        gpu_monitor_interval_sec: float = 1.0,
    ):
        self.duration_sec = duration_sec
        self.target_fps = target_fps
        self.target_frame_time_ms = 1000 / target_fps
        self.audio_file = audio_file
        self.gpu_monitor_interval_sec = gpu_monitor_interval_sec

        self.gpu_monitor = GPUMonitor()
        self.llm_tracker = LLMLatencyTracker()
        self.osc_tracker = OSCLatencyTracker()

        self.start_time = 0
        self.frame_count = 0
        self.dropped_frames = 0
        self.phase_metrics = []
        self.max_thermal = 0

    async def run(self) -> TestRun:
        """Execute integration test."""
        logger.info(f"Starting integration test: {self.duration_sec}s @ {self.target_fps}Hz")
        logger.info(f"Audio: {self.audio_file or 'synthesized'}")

        self.start_time = time.time()
        test_start = self.start_time

        # Start GPU monitoring task
        gpu_task = asyncio.create_task(self._monitor_gpu())

        # Main loop: 60Hz frame timing
        frame_time = 0
        try:
            while time.time() - self.start_time < self.duration_sec:
                frame_start = time.time()

                # Phase 4A: AI Track-Analyse
                llm_latency, was_fallback = await self.llm_tracker.measure_inference()

                # Phase 4B: GPU particles (mock: assume 2ms)
                await asyncio.sleep(0.002)

                # Phase 4C: Ray-march (mock: assume 2ms)
                await asyncio.sleep(0.002)

                # OSC binding
                osc_latency = await self.osc_tracker.measure_osc_round_trip()

                # Frame timing check
                frame_time = (time.time() - frame_start) * 1000
                if frame_time > self.target_frame_time_ms:
                    self.dropped_frames += 1
                    logger.warning(f"Frame drop: {frame_time:.2f}ms > {self.target_frame_time_ms:.2f}ms budget")
                else:
                    sleep_ms = self.target_frame_time_ms - frame_time
                    await asyncio.sleep(sleep_ms / 1000)

                self.frame_count += 1

                if self.frame_count % 300 == 0:  # Log every 5 seconds @ 60Hz
                    logger.info(
                        f"[{self.frame_count} frames] "
                        f"Frame time: {frame_time:.2f}ms, "
                        f"LLM: {llm_latency:.2f}ms (fallback: {was_fallback}), "
                        f"OSC: {osc_latency:.2f}ms"
                    )
        finally:
            gpu_task.cancel()
            try:
                await gpu_task
            except asyncio.CancelledError:
                pass

        test_end = time.time()

        return TestRun(
            run_id=f"test_{int(test_start)}",
            start_time=test_start,
            end_time=test_end,
            duration_sec=test_end - test_start,
            total_frames=self.frame_count,
            dropped_frames=self.dropped_frames,
            phase_metrics=self.phase_metrics,
            max_thermal_c=self.max_thermal,
            llm_fallback_count=self.llm_tracker.fallback_count,
            osc_latency_ms=self.osc_tracker.latencies,
        )

    async def _monitor_gpu(self):
        """Background GPU monitoring task."""
        try:
            while True:
                await asyncio.sleep(self.gpu_monitor_interval_sec)
                thermal = await self.gpu_monitor.get_thermal()
                memory = await self.gpu_monitor.get_memory_mb()

                if thermal is not None:
                    self.max_thermal = max(self.max_thermal, thermal)
                    if thermal > 80:
                        logger.warning(f"GPU thermal warning: {thermal}°C")
        except asyncio.CancelledError:
            pass


async def main():
    """Run integration test and save report."""
    runner = IntegrationTestRunner(
        duration_sec=300,  # 5 minutes
        target_fps=60,
        audio_file=None,  # Set to path for real audio
    )

    test_result = await runner.run()

    # Save report
    report_dir = Path(__file__).parent / "reports"
    report_dir.mkdir(exist_ok=True)

    report_path = report_dir / f"{test_result.run_id}_report.json"
    with open(report_path, 'w') as f:
        json.dump(
            {
                "run_id": test_result.run_id,
                "timestamp": datetime.now().isoformat(),
                "duration_sec": test_result.duration_sec,
                "total_frames": test_result.total_frames,
                "dropped_frames": test_result.dropped_frames,
                "frame_rate": test_result.frame_rate(),
                "frame_drop_pct": test_result.frame_drop_pct(),
                "max_thermal_c": test_result.max_thermal_c,
                "llm_fallback_count": test_result.llm_fallback_count,
                "osc_p50_latency_ms": test_result.osc_p50_latency(),
                "osc_max_latency_ms": max(test_result.osc_latency_ms) if test_result.osc_latency_ms else 0,
            },
            f,
            indent=2,
        )

    logger.info(f"\n{'='*60}")
    logger.info(f"Integration Test Report: {test_result.run_id}")
    logger.info(f"{'='*60}")
    logger.info(f"Duration: {test_result.duration_sec:.1f}s")
    logger.info(f"Total frames: {test_result.total_frames} @ {test_result.frame_rate():.1f} FPS")
    logger.info(f"Dropped frames: {test_result.dropped_frames} ({test_result.frame_drop_pct():.2f}%)")
    logger.info(f"Max GPU thermal: {test_result.max_thermal_c}°C")
    logger.info(f"LLM fallbacks: {test_result.llm_fallback_count}")
    logger.info(f"OSC latency (p50): {test_result.osc_p50_latency():.2f}ms")
    logger.info(f"Report: {report_path}")
    logger.info(f"{'='*60}\n")

    # Validation checks
    passed = True
    if test_result.frame_rate() < 59.5:
        logger.error(f"❌ Frame rate {test_result.frame_rate():.1f} FPS < 59.5 FPS target")
        passed = False
    if test_result.frame_drop_pct() > 1.0:
        logger.error(f"❌ Frame drop rate {test_result.frame_drop_pct():.2f}% > 1.0% threshold")
        passed = False
    if test_result.max_thermal_c > 85:
        logger.error(f"❌ GPU thermal {test_result.max_thermal_c}°C > 85°C threshold")
        passed = False
    if test_result.llm_fallback_count > test_result.total_frames * 0.05:
        logger.error(f"❌ LLM fallback rate > 5%")
        passed = False

    if passed:
        logger.info("✅ All validation checks passed!")
    else:
        logger.error("❌ Some validation checks failed. Review report.")

    return 0 if passed else 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)
