import { BarChart3, Cpu, HardDrive, Network } from 'lucide-react';

export default function SystemHealth({ health }) {
  const getStatusColor = (value, thresholds = { warning: 70, critical: 90 }) => {
    if (value >= thresholds.critical) return 'text-red-400';
    if (value >= thresholds.warning) return 'status-warning';
    return 'status-online';
  };

  const MetricGauge = ({ label, value, icon: Icon, max = 100 }) => (
    <div className="bg-dark-bg rounded p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-gray-400" />
          <p className="text-xs text-gray-500">{label}</p>
        </div>
        <p className={`text-sm font-bold ${getStatusColor(value)}`}>{value}%</p>
      </div>
      <div className="w-full bg-dark-surface rounded h-2 overflow-hidden">
        <div
          className={`h-full transition-all ${value >= 90 ? 'bg-red-500' : value >= 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
          style={{ width: `${value}%` }}
        ></div>
      </div>
    </div>
  );

  return (
    <div className="metric-card">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-neon-cyan" />
        System Health
      </h2>

      <div className="space-y-3">
        <MetricGauge label="CPU" value={health.cpu} icon={Cpu} />
        <MetricGauge label="Memory" value={health.memory} icon={BarChart3} />
        <MetricGauge label="Disk" value={health.disk} icon={HardDrive} />

        <div className="bg-dark-bg rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-gray-400" />
              <p className="text-xs text-gray-500">LATENCY</p>
            </div>
            <p
              className={`text-sm font-bold ${
                health.latency < 20 ? 'status-online' : health.latency < 50 ? 'status-warning' : 'text-red-400'
              }`}
            >
              {health.latency}ms
            </p>
          </div>
          <div className="w-full bg-dark-surface rounded h-2 overflow-hidden">
            <div
              className={`h-full transition-all ${
                health.latency < 20 ? 'bg-green-500' : health.latency < 50 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(health.latency, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-dark-border">
        <p className="text-xs text-gray-400">Last update: now</p>
      </div>
    </div>
  );
}
