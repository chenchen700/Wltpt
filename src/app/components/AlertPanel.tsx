import React, { useState } from 'react';

export type AlertLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export interface AlertItem {
  id: string;
  level: AlertLevel;
  time: string;
  source: string;
  message: string;
  count: number;
}

interface AlertPanelProps {
  alerts: AlertItem[];
  onClear?: (id: string) => void;
}

const LEVEL_STYLE: Record<AlertLevel, { color: string; bg: string; border: string; label: string }> = {
  CRITICAL: { color: '#ff1744', bg: 'rgba(255,23,68,0.12)',  border: 'rgba(255,23,68,0.5)',  label: '严重' },
  HIGH:     { color: '#ff6d00', bg: 'rgba(255,109,0,0.1)',   border: 'rgba(255,109,0,0.4)',  label: '高危' },
  MEDIUM:   { color: '#ffca28', bg: 'rgba(255,202,40,0.1)',  border: 'rgba(255,202,40,0.4)', label: '中等' },
  LOW:      { color: '#00b4d8', bg: 'rgba(0,180,216,0.08)',  border: 'rgba(0,180,216,0.35)', label: '低级' },
  INFO:     { color: '#7b9bc0', bg: 'rgba(123,155,192,0.06)', border: 'rgba(123,155,192,0.3)', label: '信息' },
};

// Only two filter tabs: 告警 (non-INFO) and 信息 (INFO)
type AlertFilter = 'ALERT' | 'INFO';

export function AlertPanel({ alerts, onClear }: AlertPanelProps) {
  const [filter, setFilter] = useState<AlertFilter>('ALERT');
  const [expanded, setExpanded] = useState(false);

  const alertCount = alerts.filter(a => a.level !== 'INFO').length;
  const infoCount  = alerts.filter(a => a.level === 'INFO').length;

  const filtered = filter === 'ALERT'
    ? alerts.filter(a => a.level !== 'INFO')
    : alerts.filter(a => a.level === 'INFO');

  const criticalCount = alerts.filter(a => a.level === 'CRITICAL').length;

  const panelH = expanded ? 220 : 120;

  const TAB_DEFS: Array<{ key: AlertFilter; label: string; count: number; color: string; bg: string; border: string }> = [
    {
      key: 'ALERT',
      label: '告警',
      count: alertCount,
      color: '#ff1744',
      bg: 'rgba(255,23,68,0.12)',
      border: 'rgba(255,23,68,0.5)',
    },
    {
      key: 'INFO',
      label: '信息',
      count: infoCount,
      color: '#7b9bc0',
      bg: 'rgba(123,155,192,0.08)',
      border: 'rgba(123,155,192,0.35)',
    },
  ];

  return (
    <div style={{
      height: panelH,
      background: '#060d18',
      borderTop: '1px solid #1a3a5c',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      transition: 'height 0.25s ease',
      fontFamily: "'Rajdhani', sans-serif",
    }}>
      {/* Alert Header */}
      <div style={{
        height: 36,
        padding: '0 12px',
        background: 'linear-gradient(90deg, #0a1628 0%, #0d1f38 100%)',
        borderBottom: '1px solid #1a3a5c',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
      }}>
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {criticalCount > 0 && (
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: '#ff1744',
              animation: 'data-blink 0.7s infinite',
            }} />
          )}
          <span style={{ color: '#cdd9e5', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
            异常告警中心
          </span>
          <span style={{ color: '#4a7fa5', fontSize: 9, fontFamily: "'Share Tech Mono', monospace" }}>
            ANOMALY ALERT CENTER
          </span>
        </div>

        {/* Tab filter buttons: only 告警 and 信息 */}
        <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
          {TAB_DEFS.map(tab => {
            const isActive = filter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                style={{
                  padding: '1px 10px',
                  borderRadius: 3,
                  border: `1px solid ${isActive ? tab.border : '#1a3a5c'}`,
                  background: isActive ? tab.bg : 'transparent',
                  color: isActive ? tab.color : '#4a7fa5',
                  fontSize: 9.5,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontFamily: "'Rajdhani', sans-serif",
                  letterSpacing: 0.8,
                  transition: 'all 0.12s',
                }}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span style={{
                    background: isActive ? tab.color : '#1a3a5c',
                    color: isActive ? '#040c18' : '#4a7fa5',
                    borderRadius: 2,
                    padding: '0 4px',
                    fontSize: 8,
                    fontFamily: "'Share Tech Mono', monospace",
                    minWidth: 14,
                    textAlign: 'center',
                  }}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1 }} />

        {/* Stats */}
        <div style={{ display: 'flex', gap: 8 }}>
          {criticalCount > 0 && (
            <span style={{
              color: '#ff1744', fontSize: 9, fontFamily: "'Share Tech Mono', monospace",
              animation: 'data-blink 1s infinite',
            }}>
              ⚡ {criticalCount} CRITICAL
            </span>
          )}
          <span style={{ color: '#4a7fa5', fontSize: 9, fontFamily: "'Share Tech Mono', monospace" }}>
            TOTAL: {alerts.length}
          </span>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(v => !v)}
          style={{
            padding: '2px 8px', borderRadius: 3,
            border: '1px solid #1a3a5c',
            background: 'transparent',
            color: '#4a7fa5', fontSize: 9, cursor: 'pointer',
            fontFamily: "'Share Tech Mono', monospace",
          }}>
          {expanded ? '▼ 收起' : '▲ 展开'}
        </button>
      </div>

      {/* Alert List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: '4px 8px',
      }}>
        {filtered.length === 0 ? (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#2a4a6a', fontSize: 11, fontFamily: "'Rajdhani', sans-serif", letterSpacing: 1,
          }}>
            ✓ 暂无{filter === 'ALERT' ? '告警' : '信息'}记录
          </div>
        ) : (
          filtered.map(alert => {
            const s = LEVEL_STYLE[alert.level];
            return (
              <div
                key={alert.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 8px',
                  background: s.bg,
                  border: `1px solid ${s.border}`,
                  borderLeft: `3px solid ${s.color}`,
                  borderRadius: 3,
                  animation: alert.level === 'CRITICAL' ? 'alert-slide-in 0.3s ease' : undefined,
                  flexShrink: 0,
                }}
              >
                {/* Level badge */}
                <div style={{
                  minWidth: 44, textAlign: 'center',
                  padding: '1px 0',
                  background: `${s.color}22`,
                  border: `1px solid ${s.color}55`,
                  borderRadius: 2,
                }}>
                  <span style={{ color: s.color, fontSize: 8.5, fontFamily: "'Rajdhani', sans-serif", letterSpacing: 0.5 }}>
                    {s.label}
                  </span>
                </div>

                {/* Time */}
                <span style={{
                  color: '#4a7fa5', fontSize: 9,
                  fontFamily: "'Share Tech Mono', monospace",
                  minWidth: 76, flexShrink: 0,
                }}>
                  {alert.time}
                </span>

                {/* Source */}
                <span style={{
                  color: s.color, fontSize: 9,
                  fontFamily: "'Share Tech Mono', monospace",
                  minWidth: 140, flexShrink: 0,
                  opacity: 0.85,
                }}>
                  [{alert.source}]
                </span>

                {/* Message */}
                <span style={{
                  color: '#cdd9e5', fontSize: 9.5,
                  fontFamily: "'Rajdhani', sans-serif",
                  flex: 1,
                }}>
                  {alert.message}
                </span>

                {/* Count */}
                {alert.count > 1 && (
                  <span style={{
                    color: s.color, fontSize: 8,
                    fontFamily: "'Share Tech Mono', monospace",
                    padding: '1px 5px',
                    background: `${s.color}18`,
                    borderRadius: 2,
                    flexShrink: 0,
                  }}>
                    ×{alert.count}
                  </span>
                )}

                {/* Clear */}
                {onClear && (
                  <button
                    onClick={() => onClear(alert.id)}
                    style={{
                      background: 'transparent', border: 'none',
                      color: '#2a4a6a', cursor: 'pointer',
                      fontSize: 10, padding: '0 2px',
                      flexShrink: 0,
                    }}>
                    ✕
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}