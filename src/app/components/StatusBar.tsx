import React from 'react';

interface StatusBarProps {
  currentTime: Date;
  onlineNodes: number;
  totalNodes: number;
  activeCameras: number;
  totalCameras: number;
  alertCount: number;
}

export function StatusBar({
  currentTime,
  onlineNodes,
  totalNodes,
  activeCameras,
  totalCameras,
  alertCount,
}: StatusBarProps) {
  const timeStr = currentTime.toLocaleTimeString('zh-CN', { hour12: false });
  const dateStr = currentTime.toLocaleDateString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  });

  const healthPct = Math.round((onlineNodes / totalNodes) * 100);

  return (
    <div style={{
      height: 52,
      background: 'linear-gradient(90deg, #081E30 0%, #0C2840 50%, #081E30 100%)',
      borderBottom: '1px solid #1E5A80',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      gap: 16,
      fontFamily: "'Rajdhani', sans-serif",
      flexShrink: 0,
      position: 'relative',
      zIndex: 10,
    }}>
      {/* Logo / Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 340 }}>
        <div style={{
          width: 30, height: 30,
          background: 'linear-gradient(135deg, #00e5ff 0%, #0096c7 100%)',
          borderRadius: 5,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 0 12px rgba(0,229,255,0.35)',
        }}>
          <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="#fff" strokeWidth={2}>
            <circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/>
            <circle cx="19" cy="19" r="2"/>
            <line x1="12" y1="7" x2="5" y2="17"/>
            <line x1="12" y1="7" x2="19" y2="17"/>
            <line x1="5" y1="19" x2="19" y2="19"/>
          </svg>
        </div>
        <div>
          <div style={{ color: '#00F1FF', fontSize: 14, letterSpacing: 2.5, lineHeight: 1.2, fontWeight: 700 }}>
            网络拓扑图
          </div>
          <div style={{ color: '#7FC3DF', fontSize: 9.5, letterSpacing: 1.2, lineHeight: 1 }}>
            INDUSTRIAL NETWORK TOPOLOGY MONITORING SYSTEM v2.4.1
          </div>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* Metrics Row */}
      <MetricChip
        label="节点在线"
        value={`${onlineNodes}/${totalNodes}`}
        color={onlineNodes === totalNodes ? '#00e676' : onlineNodes > totalNodes * 0.8 ? '#ffca28' : '#ff1744'}
        icon="●"
      />
      <MetricChip
        label="相机在线"
        value={`${activeCameras}/${totalCameras}`}
        color={activeCameras === totalCameras ? '#00e676' : '#ffca28'}
        icon="◉"
      />
      <MetricChip
        label="系统健康度"
        value={`${healthPct}%`}
        color={healthPct >= 95 ? '#00e676' : healthPct >= 80 ? '#ffca28' : '#ff1744'}
        icon="▲"
      />

      {alertCount > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,23,68,0.18)',
          border: '1px solid rgba(255,23,68,0.6)',
          borderRadius: 4, padding: '3px 12px',
        }}>
          <span style={{ color: '#ff1744', fontSize: 12, animation: 'data-blink 1s infinite' }}>⚠</span>
          <span style={{ color: '#ff6d8b', fontSize: 11, fontFamily: "'Share Tech Mono', monospace" }}>
            {alertCount} ALERT{alertCount > 1 ? 'S' : ''}
          </span>
        </div>
      )}

      {/* Divider */}
      <div style={{ width: 1, height: 30, background: '#1E5A80' }} />

      {/* Clock */}
      <div style={{ textAlign: 'right', minWidth: 120 }}>
        <div style={{
          color: '#00F1FF', fontSize: 16, letterSpacing: 2,
          fontFamily: "'Share Tech Mono', monospace", lineHeight: 1.2,
        }}>
          {timeStr}
        </div>
        <div style={{ color: '#7FC3DF', fontSize: 10, letterSpacing: 1, fontFamily: "'Share Tech Mono', monospace" }}>
          {dateStr}
        </div>
      </div>

      {/* Scan line decoration */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: 'linear-gradient(90deg, rgba(0,229,255,0.04) 0%, transparent 25%, transparent 75%, rgba(0,229,255,0.04) 100%)',
        pointerEvents: 'none',
      }} />
    </div>
  );
}

function MetricChip({ label, value, color, icon }: {
  label: string; value: string; color: string; icon: string;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: 'rgba(10,28,44,0.95)',
      border: `1px solid #1E5A80`,
      borderRadius: 5, padding: '4px 12px',
    }}>
      <span style={{ color, fontSize: 11 }}>{icon}</span>
      <div>
        <div style={{ color: '#7FC3DF', fontSize: 9, letterSpacing: 0.6, lineHeight: 1 }}>{label}</div>
        <div style={{
          color,
          fontSize: 14,
          fontFamily: "'Share Tech Mono', monospace",
          letterSpacing: 1,
          lineHeight: 1.25,
        }}>
          {value}
        </div>
      </div>
    </div>
  );
}