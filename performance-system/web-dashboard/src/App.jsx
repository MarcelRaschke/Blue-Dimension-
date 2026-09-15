import { useEffect, useState, useRef } from 'react';
import Header from './components/Header';
import StreamStatus from './components/StreamStatus';
import CDJMetadata from './components/CDJMetadata';
import SystemHealth from './components/SystemHealth';
import Analytics from './components/Analytics';
import ShowControls from './components/ShowControls';

export default function App() {
  const [connected, setConnected] = useState(false);
  const [currentShow, setCurrentShow] = useState(null);
  const [streamStatus, setStreamStatus] = useState({
    active: false,
    bitrate: 0,
    listeners: 0,
    uptime: 0,
  });
  const [cdj, setCdj] = useState({
    connected: false,
    track: null,
    bpm: 0,
    position: 0,
    playing: false,
  });
  const [health, setHealth] = useState({
    cpu: 0,
    memory: 0,
    disk: 0,
    latency: 0,
  });
  const [analytics, setAnalytics] = useState({
    peakListeners: 0,
    totalSessions: 0,
    avgBitrate: 0,
  });
  const wsRef = useRef(null);

  useEffect(() => {
    connectWebSocket();
    fetchCurrentShow();
    const interval = setInterval(fetchCurrentShow, 30000);
    return () => {
      if (wsRef.current) wsRef.current.close();
      clearInterval(interval);
    };
  }, []);

  const connectWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const apiUrl = process.env.REACT_APP_API_URL || 'localhost:5000';
    const wsUrl = `${protocol}//${apiUrl}/ws`;

    try {
      wsRef.current = new WebSocket(wsUrl);
      wsRef.current.onopen = () => setConnected(true);
      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };
      wsRef.current.onerror = () => setConnected(false);
      wsRef.current.onclose = () => {
        setConnected(false);
        setTimeout(connectWebSocket, 3000);
      };
    } catch (e) {
      console.error('WebSocket connection failed:', e);
      setTimeout(connectWebSocket, 3000);
    }
  };

  const handleWebSocketMessage = (data) => {
    if (data.type === 'stream-status') {
      setStreamStatus(data.payload);
    } else if (data.type === 'cdj-metadata') {
      setCdj(data.payload);
    } else if (data.type === 'system-health') {
      setHealth(data.payload);
    } else if (data.type === 'analytics') {
      setAnalytics(data.payload);
    }
  };

  const fetchCurrentShow = async () => {
    try {
      const response = await fetch('/api/shows/current');
      if (response.ok) {
        const data = await response.json();
        setCurrentShow(data);
      }
    } catch (e) {
      console.error('Failed to fetch current show:', e);
    }
  };

  return (
    <div className="w-full h-screen bg-dark-bg text-white overflow-auto">
      <Header connected={connected} currentShow={currentShow} />

      <main className="p-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <StreamStatus status={streamStatus} />
            <CDJMetadata cdj={cdj} />
            <Analytics analytics={analytics} />
          </div>

          <div className="space-y-6">
            <SystemHealth health={health} />
            <ShowControls show={currentShow} onShowUpdated={fetchCurrentShow} />
          </div>
        </div>
      </main>
    </div>
  );
}
