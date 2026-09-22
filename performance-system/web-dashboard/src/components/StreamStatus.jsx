import { Activity, Users, Radio, Clock } from 'lucide-react';

export default function StreamStatus({ status }) {
  const formatUptime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="metric-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Radio className="w-5 h-5 text-neon-cyan" />
          Stream Status
        </h2>
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${status.active ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`}
          ></div>
          <span className={`text-sm font-semibold ${status.active ? 'status-online' : 'status-offline'}`}>
            {status.active ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-dark-bg rounded p-3">
          <p className="text-xs text-gray-500 mb-1">BITRATE</p>
          <p className="text-2xl font-bold font-mono text-neon-cyan">
            {status.bitrate}
            <span className="text-sm ml-1">kbps</span>
          </p>
        </div>

        <div className="bg-dark-bg rounded p-3">
          <p className="text-xs text-gray-500 mb-1">LISTENERS</p>
          <p className="text-2xl font-bold font-mono text-neon-magenta">{status.listeners}</p>
        </div>

        <div className="bg-dark-bg rounded p-3">
          <p className="text-xs text-gray-500 mb-1">UPTIME</p>
          <p className="text-lg font-mono">{formatUptime(status.uptime)}</p>
        </div>

        <div className="bg-dark-bg rounded p-3">
          <p className="text-xs text-gray-500 mb-1">STATUS</p>
          <p className="text-sm font-mono">
            {status.active ? '✓ Streaming' : '✗ Standby'}
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded font-semibold transition-colors">
          Start Stream
        </button>
        <button className="flex-1 bg-red-600 hover:bg-red-700 py-2 rounded font-semibold transition-colors">
          Stop Stream
        </button>
      </div>
    </div>
  );
}
