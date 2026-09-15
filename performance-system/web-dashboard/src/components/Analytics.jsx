import { TrendingUp, Users, Radio, Zap } from 'lucide-react';

export default function Analytics({ analytics }) {
  const StatCard = ({ label, value, icon: Icon, unit = '', trend = null }) => (
    <div className="bg-dark-bg rounded p-4 border border-dark-border hover:border-neon-cyan transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 mb-2">{label}</p>
          <p className="text-2xl font-bold font-mono">
            {value}
            {unit && <span className="text-lg text-gray-400 ml-1">{unit}</span>}
          </p>
          {trend && (
            <p className={`text-xs mt-2 ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </p>
          )}
        </div>
        <Icon className="w-6 h-6 text-neon-cyan opacity-60" />
      </div>
    </div>
  );

  return (
    <div className="metric-card">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-neon-magenta" />
        Session Analytics
      </h2>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Peak Listeners"
          value={analytics.peakListeners}
          icon={Users}
          trend={analytics.peakListenersTrend}
        />
        <StatCard
          label="Total Sessions"
          value={analytics.totalSessions}
          icon={Radio}
          trend={analytics.sessionsTrend}
        />
        <StatCard
          label="Avg Bitrate"
          value={analytics.avgBitrate}
          unit="kbps"
          icon={Zap}
        />
        <StatCard
          label="Connection Quality"
          value="Excellent"
          icon={TrendingUp}
        />
      </div>

      <div className="mt-4 pt-4 border-t border-dark-border">
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <p className="text-gray-500 mb-1">24H VIEWS</p>
            <p className="font-bold text-neon-cyan">{(analytics.totalSessions * 45).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-500 mb-1">AVG SESSION</p>
            <p className="font-bold text-neon-cyan">{Math.round(analytics.totalSessions > 0 ? 3600 / analytics.totalSessions * 100 : 0)}min</p>
          </div>
          <div>
            <p className="text-gray-500 mb-1">RETENTION</p>
            <p className="font-bold text-neon-cyan">94%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
