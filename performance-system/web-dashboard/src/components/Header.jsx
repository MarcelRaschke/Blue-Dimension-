import { Radio, Wifi, WifiOff } from 'lucide-react';

export default function Header({ connected, currentShow }) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <header className="bg-dark-surface border-b border-dark-border sticky top-0 z-50">
      <div className="px-6 py-4 max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-neon-cyan bg-opacity-20 rounded-lg">
            <Radio className="w-6 h-6 text-neon-cyan" />
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Blue Dimension
              {connected ? (
                <Wifi className="w-5 h-5 text-green-400 animate-pulse" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-400" />
              )}
            </h1>
            <p className="text-sm text-gray-400">Live Performance Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {currentShow && (
            <div className="text-right">
              <p className="text-xs text-gray-500">CURRENT SHOW</p>
              <p className="font-mono font-semibold text-neon-cyan">{currentShow.name || 'Blue Dimension'}</p>
            </div>
          )}
          <div className="text-right">
            <p className="text-xs text-gray-500">TIME</p>
            <p className="font-mono font-semibold">{timeStr}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
