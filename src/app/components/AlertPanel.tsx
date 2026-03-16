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
  CRITICAL: { color: '#ff1744', bg: 'rgba(255,23,68,0.14)',   border: 'rgba(255,23,68,0.55)',  label: '严重' },
  HIGH:     { color: '#ff6d00', bg: 'rgba(255,109,0,0.12)',   border: 'rgba(255,109,0,0.45)',  label: '高危' },
  MEDIUM:   { color: '#ffca28', bg: 'rgba(255,202,40,0.12)',  border: 'rgba(255,202,40,0.45)', label: '中等' },
  LOW:      { color: '#00d4ff', bg: 'rgba(0,212,255,0.09)',   border: 'rgba(0,212,255,0.38)',  label: '低级' },
  INFO:     { color: '#8ab8d8', bg: 'rgba(138,184,216,0.07)', border: 'rgba(138,184,216,0.3)', label: '信息' },
};

export function AlertPanel({ alerts, onClear }: AlertPanelProps) {
  const [expanded, setExpanded] = useState(false);

  // Only show non-INFO alerts (信息 tab removed)
  const filtered = alerts.filter(a => a.level !== 'INFO');
  const criticalCount = alerts.filter(a => a.level === 'CRITICAL').length;

  const panelH = expanded ? 220 : 120;

  return (
    <div style={{
      height: panelH,
      background: '#081C2C',
      borderTop: '1px solid #1E5A80',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      transition: 'height 0.25s ease',
      fontFamily: "'Rajdhani', sans-serif",
    }}>
      {/* Alert Header */}
      <div style={{
        height: 38,
        padding: '0 14px',
        background: 'linear-gradient(90deg, #0C2030 0%, #102840 100%)',
        borderBottom: '1px solid #1E5A80',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        flexShrink: 0,
      }}>
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {criticalCount > 0 && (
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: '#ff1744',
              animation: 'data-blink 0.7s infinite',
              boxShadow: '0 0 6px #ff1744',
            }} />
          )}
          <span style={{ color: '#D4EEFF', fontSize: 11, fontWeight: 700, letterSpacing: 1.2 }}>
            异常告警中心
          </span>
          <span style={{ color: '#7FC3DF', fontSize: 9, fontFamily: "'Share Tech Mono', monospace" }}>
            ANOMALY ALERT CENTER
          </span>
        </div>

        {/* Single "告警" tab badge */}
        <div style={{
          padding: '2px 12px',
          borderRadius: 3,
          border: '1px solid rgba(255,23,68,0.55)',
          background: 'rgba(255,23,68,0.14)',
          color: '#ff1744',
          fontSize: 9.5,
          display: 'flex', alignItems: 'center', gap: 5,
          fontFamily: "'Rajdhani', sans-serif",
          letterSpacing: 0.8,
        }}>
          告警
          {filtered.length > 0 && (
            <span style={{
              background: '#ff1744',
              color: '#fff',
              borderRadius: 2,
              padding: '0 4px',
              fontSize: 8,
              fontFamily: "'Share Tech Mono', monospace",
              minWidth: 14,
              textAlign: 'center',
            }}>
              {filtered.length}
            </span>
          )}
        </div>

        <div style={{ flex: 1 }} />

        {/* Stats */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {criticalCount > 0 && (
            <span style={{
              color: '#ff1744', fontSize: 9, fontFamily: "'Share Tech Mono', monospace",
              animation: 'data-blink 1s infinite',
            }}>
              ⚡ {criticalCount} CRITICAL
            </span>
          )}
          <span style={{ color: '#7FC3DF', fontSize: 9, fontFamily: "'Share Tech Mono', monospace" }}>
            TOTAL: {alerts.length}
          </span>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(v => !v)}
          style={{
            padding: '2px 9px', borderRadius: 3,
            border: '1px solid #1E5A80',
            background: 'transparent',
            color: '#7FC3DF', fontSize: 9, cursor: 'pointer',
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
        padding: '4px 10px',
      }}>
        {filtered.length === 0 ? (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#2E5878', fontSize: 11, fontFamily: "'Rajdhani', sans-serif", letterSpacing: 1,
          }}>
            ✓ 暂无告警记录
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
                  padding: '4px 10px',
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
                  background: `${s.color}25`,
                  border: `1px solid ${s.color}60`,
                  borderRadius: 2,
                }}>
                  <span style={{ color: s.color, fontSize: 8.5, fontFamily: "'Rajdhani', sans-serif", letterSpacing: 0.5 }}>
                    {s.label}
                  </span>
                </div>

                {/* Time */}
                <span style={{
                  color: '#7FC3DF', fontSize: 9,
                  fontFamily: "'Share Tech Mono', monospace",
                  minWidth: 76, flexShrink: 0,
                }}>
                  {alert.time}
                </span>

                {/* Source */}
                <span style={{
                  color: s.color, fontSize: 9,
                  fontFamily: "'Share Tech Mono', monospace",
                  minWidth: 160, flexShrink: 0,
                  opacity: 0.9,
                }}>
                  [{alert.source}]
                </span>

                {/* Message */}
                <span style={{
                  color: '#D4EEFF', fontSize: 9.5,
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
                    background: `${s.color}20`,
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
                      color: '#2E5878', cursor: 'pointer',
                      fontSize: 11, padding: '0 2px',
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