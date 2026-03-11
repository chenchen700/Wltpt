import React from 'react';

interface StatusBarProps {
  currentTime: Date;
  onlineNodes: number;
  totalNodes: number;
  activeCameras: number;
  totalCameras: number;
  alertCount: number;
  networkLoad: number;
}

export function StatusBar({
  currentTime,
  onlineNodes,
  totalNodes,
  activeCameras,
  totalCameras,
  alertCount,
  networkLoad,
}: StatusBarProps) {
  const timeStr = currentTime.toLocaleTimeString('zh-CN', { hour12: false });
  const dateStr = currentTime.toLocaleDateString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  });

  const healthPct = Math.round((onlineNodes / totalNodes) * 100);

  return (
    <div
      style={{
        height: 48,
        background: 'linear-gradient(90deg, #060e20 0%, #0a1628 50%, #060e20 100%)',
        borderBottom: '1px solid #1a3a5c',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 20,
        fontFamily: "'Rajdhani', sans-serif",
        flexShrink: 0,
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* Logo / Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 320 }}>
        <div style={{
          width: 28, height: 28,
          background: 'linear-gradient(135deg, #00d4ff 0%, #0077b6 100%)',
          borderRadius: 4,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="#fff" strokeWidth={2}>
            <circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/>
            <circle cx="19" cy="19" r="2"/>
            <line x1="12" y1="7" x2="5" y2="17"/>
            <line x1="12" y1="7" x2="19" y2="17"/>
            <line x1="5" y1="19" x2="19" y2="19"/>
          </svg>
        </div>
        <div>
          <div style={{ color: '#00d4ff', fontSize: 13, letterSpacing: 2, lineHeight: 1.2, fontWeight: 700 }}>
            网络拓扑图
          </div>
          <div style={{ color: '#4a7fa5', fontSize: 10, letterSpacing: 1, lineHeight: 1 }}>
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
      <MetricChip
        label="网络负载"
        value={`${networkLoad}%`}
        color={networkLoad < 70 ? '#00e676' : networkLoad < 85 ? '#ffca28' : '#ff1744'}
        icon="≈"
      />

      {alertCount > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,23,68,0.15)',
          border: '1px solid rgba(255,23,68,0.5)',
          borderRadius: 4, padding: '3px 10px',
        }}>
          <span style={{ color: '#ff1744', fontSize: 11, animation: 'data-blink 1s infinite' }}>⚠</span>
          <span style={{ color: '#ff6d8b', fontSize: 11, fontFamily: "'Share Tech Mono', monospace" }}>
            {alertCount} ALERT{alertCount > 1 ? 'S' : ''}
          </span>
        </div>
      )}

      {/* Divider */}
      <div style={{ width: 1, height: 28, background: '#1a3a5c' }} />

      {/* Clock */}
      <div style={{ textAlign: 'right', minWidth: 120 }}>
        <div style={{
          color: '#00d4ff', fontSize: 15, letterSpacing: 1.5,
          fontFamily: "'Share Tech Mono', monospace", lineHeight: 1.2,
        }}>
          {timeStr}
        </div>
        <div style={{ color: '#4a7fa5', fontSize: 10, letterSpacing: 1, fontFamily: "'Share Tech Mono', monospace" }}>
          {dateStr}
        </div>
      </div>

      {/* Corner decoration */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: 'linear-gradient(90deg, rgba(0,212,255,0.03) 0%, transparent 30%, transparent 70%, rgba(0,212,255,0.03) 100%)',
        pointerEvents: 'none',
      }} />
    </div>
  );
}

function MetricChip({
  label, value, color, icon,
}: {
  label: string; value: string; color: string; icon: string;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: 'rgba(10,22,40,0.8)',
      border: '1px solid #1a3a5c',
      borderRadius: 4, padding: '3px 10px',
    }}>
      <span style={{ color, fontSize: 10 }}>{icon}</span>
      <div>
        <div style={{ color: '#4a7fa5', fontSize: 9, letterSpacing: 0.5, lineHeight: 1 }}>{label}</div>
        <div style={{
          color,
          fontSize: 13,
          fontFamily: "'Share Tech Mono', monospace",
          letterSpacing: 1,
          lineHeight: 1.2,
        }}>
          {value}
        </div>
      </div>
    </div>
  );
}