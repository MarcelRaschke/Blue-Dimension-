import { Music, Disc3, Clock, Gauge } from 'lucide-react';

export default function CDJMetadata({ cdj }) {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = cdj.track ? (cdj.position / cdj.track.duration) * 100 : 0;

  return (
    <div className="metric-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Music className="w-5 h-5 text-neon-magenta" />
          Now Playing
        </h2>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${cdj.connected ? 'bg-green-400' : 'bg-gray-600'}`}
          ></div>
          <span className="text-xs text-gray-400">
            CDJ {cdj.connected ? 'Connected' : 'Offline'}
          </span>
        </div>
      </div>

      {cdj.track ? (
        <div className="space-y-4">
          <div className="bg-dark-bg rounded p-4">
            <div className="flex gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-neon-cyan to-neon-magenta rounded flex items-center justify-center flex-shrink-0">
                <Disc3 className="w-8 h-8 text-dark-bg animate-spin" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-400 mb-1">TRACK</p>
                <p className="font-semibold text-lg">{cdj.track.title}</p>
                <p className="text-sm text-gray-400">{cdj.track.artist}</p>
                <p className="text-xs text-neon-cyan mt-2">{cdj.track.key || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span>{formatTime(cdj.position)}</span>
              <span>{formatTime(cdj.track.duration || 0)}</span>
            </div>
            <div className="w-full bg-dark-bg rounded h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-neon-cyan to-neon-magenta h-full transition-all"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-dark-bg rounded p-3">
              <p className="text-xs text-gray-500 mb-1">BPM</p>
              <p className="text-xl font-bold font-mono text-neon-cyan">{cdj.bpm}</p>
            </div>
            <div className="bg-dark-bg rounded p-3">
              <p className="text-xs text-gray-500 mb-1">STATUS</p>
              <p className="text-sm font-mono">
                {cdj.playing ? '▶ Playing' : '⏸ Paused'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-dark-bg rounded p-8 text-center">
          <Music className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No track loaded</p>
          <p className="text-xs text-gray-500 mt-2">Waiting for CDJ connection...</p>
        </div>
      )}
    </div>
  );
}
