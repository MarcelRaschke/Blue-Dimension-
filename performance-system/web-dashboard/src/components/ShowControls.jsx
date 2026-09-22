import { Play, Square, Settings, Clock } from 'lucide-react';
import { useState } from 'react';

export default function ShowControls({ show, onShowUpdated }) {
  const [loading, setLoading] = useState(false);

  const startShow = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/shows/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Blue Dimension Radio',
          startTime: new Date().toISOString(),
        }),
      });
      if (response.ok) {
        onShowUpdated();
      }
    } catch (e) {
      console.error('Failed to start show:', e);
    } finally {
      setLoading(false);
    }
  };

  const endShow = async () => {
    if (!show) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/shows/${show.id}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        onShowUpdated();
      }
    } catch (e) {
      console.error('Failed to end show:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="metric-card">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Settings className="w-5 h-5 text-neon-purple" />
        Show Control
      </h2>

      {show ? (
        <div className="space-y-3">
          <div className="bg-dark-bg rounded p-3">
            <p className="text-xs text-gray-500 mb-1">ACTIVE SHOW</p>
            <p className="font-semibold text-neon-cyan mb-3">{show.name}</p>

            <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
              <Clock className="w-4 h-4" />
              <span>Started {new Date(show.startTime).toLocaleTimeString()}</span>
            </div>

            <button
              onClick={endShow}
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 py-2 rounded font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Square className="w-4 h-4" />
              {loading ? 'Ending...' : 'End Show'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-dark-bg rounded p-3 text-center">
            <p className="text-gray-500 text-sm mb-3">No active show</p>
          </div>

          <button
            onClick={startShow}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 py-2 rounded font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            {loading ? 'Starting...' : 'Start Show'}
          </button>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-dark-border space-y-2">
        <button className="w-full bg-dark-bg hover:bg-dark-border py-2 rounded text-sm transition-colors">
          Show History
        </button>
        <button className="w-full bg-dark-bg hover:bg-dark-border py-2 rounded text-sm transition-colors">
          Export Analytics
        </button>
      </div>
    </div>
  );
}
