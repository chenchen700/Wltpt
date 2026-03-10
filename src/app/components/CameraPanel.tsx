import React, { useEffect, useRef, useState } from 'react';
import type { CameraNodeState } from './TopologyMap';

interface CameraPanelProps {
  cameras: CameraNodeState[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const ZONE_LABELS: Record<string, string> = { A: '产线A区', B: '仓储B区', C: '质检C区' };
const ZONE_COLORS: Record<string, string> = { A: '#00b4d8', B: '#8b5cf6', C: '#f59e0b' };

function CameraFeed({ camera, large = false }: { camera: CameraNodeState; large?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [ts, setTs] = useState('');

  useEffect(() => {
    const t = setInterval(() => {
      const now = new Date();
      setTs(now.toLocaleTimeString('zh-CN', { hour12: false }) + '.' + String(now.getMilliseconds()).padStart(3, '0'));
    }, 100);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Simulate different "scenes" per zone
    const hue = camera.zone === 'A' ? 210 : camera.zone === 'B' ? 260 : 40;
    const satBase = camera.status === 'offline' ? 0 : camera.zone === 'C' ? 10 : 5;

    const draw = () => {
      const { width: w, height: h } = canvas;
      if (camera.status === 'offline') {
        ctx.fillStyle = '#080e18';
        ctx.fillRect(0, 0, w, h);
        // Draw NO SIGNAL
        ctx.fillStyle = '#1a2a3a';
        ctx.font = `${large ? 16 : 9}px 'Share Tech Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('NO SIGNAL', w / 2, h / 2);
        ctx.fillText('CAMERA OFFLINE', w / 2, h / 2 + (large ? 22 : 14));
        return;
      }

      // Dark industrial scene background
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, `hsl(${hue}, ${satBase + 15}%, 6%)`);
      grad.addColorStop(0.4, `hsl(${hue}, ${satBase + 5}%, 8%)`);
      grad.addColorStop(1, `hsl(${hue}, ${satBase + 10}%, 5%)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Simulate scene elements (machinery silhouettes)
      const seed = parseInt(camera.id.replace(/\D/g, ''), 10) || 1;
      ctx.fillStyle = `hsla(${hue}, 20%, 12%, 0.8)`;
      for (let j = 0; j < 4; j++) {
        const bx = (seed * (j + 1) * 37) % (w - 20);
        const bh = 10 + (seed * (j + 2) * 19) % (h * 0.4);
        ctx.fillRect(bx, h - bh, 18, bh);
      }

      // Horizontal conveyor belt lines
      if (camera.zone === 'A') {
        const t = Date.now() / 400;
        ctx.strokeStyle = `hsla(${hue}, 40%, 25%, 0.5)`;
        ctx.lineWidth = 1;
        for (let y = h * 0.55; y < h * 0.65; y += 5) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
        // Moving items on belt
        const bx = ((t * 30) % (w + 20)) - 20;
        ctx.fillStyle = `hsla(${hue}, 30%, 30%, 0.7)`;
        ctx.fillRect(bx, h * 0.55, 14, 9);
        ctx.fillRect((bx + 40) % (w + 20) - 20, h * 0.55, 10, 9);
      }

      // Noise overlay
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      const intensity = camera.status === 'warning' ? 6 : 3;
      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * intensity;
        data[i] = Math.max(0, Math.min(255, data[i] + noise));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
      }
      ctx.putImageData(imageData, 0, 0);

      // Scan line
      const scanY = ((Date.now() / 5000) % 1) * h * 2;
      const scanGrad = ctx.createLinearGradient(0, scanY - 12, 0, scanY + 12);
      scanGrad.addColorStop(0, 'rgba(0,212,255,0)');
      scanGrad.addColorStop(0.5, 'rgba(0,212,255,0.04)');
      scanGrad.addColorStop(1, 'rgba(0,212,255,0)');
      ctx.fillStyle = scanGrad;
      ctx.fillRect(0, scanY - 12, w, 24);
    };

    const loop = () => {
      draw();
      animRef.current = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animRef.current);
  }, [camera, large]);

  const statusColor = camera.status === 'online' ? '#00e676' : camera.status === 'warning' ? '#ffca28' : '#ff1744';
  const rtspUrl = `rtsp://192.168.1.${100 + parseInt(camera.id.replace(/\D/g, ''), 10) || 1}:554/live/stream`;

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%',
      background: '#060d18', borderRadius: large ? 4 : 3,
      overflow: 'hidden',
      border: `1px solid ${camera.status === 'online' ? '#1a3a5c' : statusColor + '40'}`,
    }}>
      <canvas
        ref={canvasRef}
        width={large ? 640 : 160}
        height={large ? 360 : 100}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />

      {/* Scan line overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)',
        pointerEvents: 'none',
      }} />

      {/* Top overlay: camera info */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: large ? '6px 8px' : '3px 5px',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%)',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <div style={{
          width: large ? 8 : 5, height: large ? 8 : 5, borderRadius: '50%',
          background: statusColor,
          boxShadow: `0 0 ${large ? 6 : 4}px ${statusColor}`,
          animation: camera.status !== 'offline' ? 'data-blink 2s infinite' : undefined,
          flexShrink: 0,
        }} />
        <span style={{
          color: '#cdd9e5',
          fontSize: large ? 10 : 7,
          fontFamily: "'Share Tech Mono', monospace",
          letterSpacing: 0.5,
        }}>
          {camera.id}
        </span>
        {large && (
          <>
            <span style={{ color: '#4a7fa5', fontSize: 9, fontFamily: "'Share Tech Mono', monospace" }}>|</span>
            <span style={{ color: ZONE_COLORS[camera.zone], fontSize: 9, fontFamily: "'Share Tech Mono', monospace" }}>
              {ZONE_LABELS[camera.zone]}
            </span>
          </>
        )}
        {camera.status === 'online' && large && (
          <span style={{
            marginLeft: 'auto',
            background: 'rgba(255,23,68,0.2)',
            border: '1px solid rgba(255,23,68,0.4)',
            borderRadius: 2,
            padding: '1px 5px',
            color: '#ff6d8b',
            fontSize: 8,
            fontFamily: "'Share Tech Mono', monospace",
            animation: 'data-blink 1.5s infinite',
          }}>
            ● REC
          </span>
        )}
      </div>

      {/* Bottom overlay: tech info */}
      {large && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '6px 8px',
          background: 'linear-gradient(0deg, rgba(0,0,0,0.85) 0%, transparent 100%)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ color: '#4a7fa5', fontSize: 8, fontFamily: "'Share Tech Mono', monospace", marginBottom: 2 }}>
                {rtspUrl}
              </div>
              <div style={{ color: '#7b9bc0', fontSize: 9, fontFamily: "'Share Tech Mono', monospace" }}>
                {camera.resolution} · {camera.fps}fps · H.264
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#00e676', fontSize: 9, fontFamily: "'Share Tech Mono', monospace" }}>
                {ts}
              </div>
              <div style={{ color: '#4a7fa5', fontSize: 7.5, fontFamily: "'Share Tech Mono', monospace" }}>
                LIVE STREAM
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Corner crosshairs (large only) */}
      {large && camera.status === 'online' && (
        <>
          {([
            { top: 4, left: 4 } as React.CSSProperties,
            { top: 4, right: 4 } as React.CSSProperties,
            { bottom: 4, left: 4 } as React.CSSProperties,
            { bottom: 4, right: 4 } as React.CSSProperties,
          ]).map((pos, i) => (
            <div key={i} style={{
              position: 'absolute',
              ...pos,
              width: 12, height: 12,
              borderTop: i < 2 ? '1px solid rgba(0,212,255,0.4)' : undefined,
              borderBottom: i >= 2 ? '1px solid rgba(0,212,255,0.4)' : undefined,
              borderLeft: i % 2 === 0 ? '1px solid rgba(0,212,255,0.4)' : undefined,
              borderRight: i % 2 === 1 ? '1px solid rgba(0,212,255,0.4)' : undefined,
            }} />
          ))}
        </>
      )}

      {/* Warning overlay */}
      {camera.status === 'warning' && (
        <div style={{
          position: 'absolute', inset: 0,
          border: '2px solid rgba(255,202,40,0.3)',
          borderRadius: 'inherit',
          animation: 'data-blink 1s infinite',
          pointerEvents: 'none',
        }} />
      )}
    </div>
  );
}

export function CameraPanel({ cameras, selectedId, onSelect }: CameraPanelProps) {
  const [activeZone, setActiveZone] = useState<'ALL' | 'A' | 'B' | 'C'>('ALL');
  const [viewMode, setViewMode] = useState<'single' | 'quad'>('single');

  const selectedCamera = cameras.find(c => c.id === selectedId) || cameras[0];

  const filteredCameras = activeZone === 'ALL'
    ? cameras
    : cameras.filter(c => c.zone === activeZone);

  const zones: ('ALL' | 'A' | 'B' | 'C')[] = ['ALL', 'A', 'B', 'C'];
  const zoneCounts = {
    ALL: cameras.length,
    A: cameras.filter(c => c.zone === 'A').length,
    B: cameras.filter(c => c.zone === 'B').length,
    C: cameras.filter(c => c.zone === 'C').length,
  };

  // For quad view, show 4 cameras around selected
  const quadCameras = (() => {
    const idx = cameras.findIndex(c => c.id === selectedId);
    const base = Math.max(0, Math.min(idx, cameras.length - 4));
    return cameras.slice(base, base + 4);
  })();

  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#060d18',
      borderLeft: '1px solid #1a3a5c',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Rajdhani', sans-serif",
    }}>
      {/* Panel Header */}
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid #1a3a5c',
        background: 'linear-gradient(90deg, #0a1628 0%, #0d1f38 100%)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 20, height: 20, borderRadius: 3,
              background: 'linear-gradient(135deg, #00b4d8, #0077b6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg viewBox="0 0 16 16" width={11} height={11} fill="none" stroke="#fff" strokeWidth={1.5}>
                <rect x="1" y="3" width="11" height="9" rx="1.5"/>
                <path d="M12 6l3-2v6l-3-2"/>
              </svg>
            </div>
            <div>
              <div style={{ color: '#00d4ff', fontSize: 12, letterSpacing: 1, fontWeight: 700 }}>
                RTSP 多相机监控
              </div>
              <div style={{ color: '#4a7fa5', fontSize: 9, fontFamily: "'Share Tech Mono', monospace" }}>
                MULTI-CAMERA SWITCHING PANEL
              </div>
            </div>
          </div>

          {/* View mode toggle */}
          <div style={{ display: 'flex', gap: 4 }}>
            {(['single', 'quad'] as const).map(mode => (
              <button key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  padding: '3px 8px',
                  borderRadius: 3,
                  border: `1px solid ${viewMode === mode ? '#00d4ff' : '#1a3a5c'}`,
                  background: viewMode === mode ? 'rgba(0,212,255,0.12)' : 'transparent',
                  color: viewMode === mode ? '#00d4ff' : '#4a7fa5',
                  fontSize: 10,
                  cursor: 'pointer',
                  fontFamily: "'Rajdhani', sans-serif",
                  letterSpacing: 0.5,
                }}>
                {mode === 'single' ? '单路' : '四分'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main View */}
      <div style={{ padding: 8, flexShrink: 0 }}>
        {viewMode === 'single' ? (
          <div style={{ height: 200, position: 'relative' }}>
            {selectedCamera && <CameraFeed camera={selectedCamera} large={true} />}
          </div>
        ) : (
          <div style={{
            height: 200,
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '1fr 1fr', gap: 3,
          }}>
            {quadCameras.map(cam => (
              <div key={cam.id} style={{ position: 'relative', cursor: 'pointer' }}
                onClick={() => { onSelect(cam.id); setViewMode('single'); }}>
                <CameraFeed camera={cam} large={false} />
                {selectedId === cam.id && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    border: '2px solid #00d4ff',
                    borderRadius: 3,
                    pointerEvents: 'none',
                  }} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Camera Info (single mode) */}
      {viewMode === 'single' && selectedCamera && (
        <div style={{
          margin: '0 8px 6px',
          padding: '6px 10px',
          background: 'rgba(10,22,40,0.8)',
          border: '1px solid #1a3a5c',
          borderRadius: 4,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '4px 12px',
          flexShrink: 0,
        }}>
          {[
            { label: '相机ID', value: selectedCamera.id },
            { label: '所属区域', value: ZONE_LABELS[selectedCamera.zone] },
            { label: '分辨率', value: selectedCamera.resolution },
            { label: '帧率', value: `${selectedCamera.fps} fps` },
            { label: '编码格式', value: 'H.264 / RTSP' },
            { label: '状态', value: selectedCamera.status === 'online' ? '在线录制' : selectedCamera.status === 'warning' ? '信号弱' : '离线', color: selectedCamera.status === 'online' ? '#00e676' : '#ffca28' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#4a7fa5', fontSize: 9, fontFamily: "'Share Tech Mono', monospace" }}>
                {item.label}
              </span>
              <span style={{
                color: (item as any).color || '#cdd9e5',
                fontSize: 9.5, fontFamily: "'Share Tech Mono', monospace",
                letterSpacing: 0.5,
              }}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Zone Tabs */}
      <div style={{
        display: 'flex', gap: 4, padding: '4px 8px',
        borderBottom: '1px solid #1a3a5c',
        flexShrink: 0,
      }}>
        {zones.map(zone => {
          const count = zoneCounts[zone];
          const zoneColor = zone === 'ALL' ? '#00d4ff' : ZONE_COLORS[zone];
          return (
            <button key={zone}
              onClick={() => setActiveZone(zone)}
              style={{
                flex: 1,
                padding: '4px 6px',
                borderRadius: 3,
                border: `1px solid ${activeZone === zone ? zoneColor : '#1a3a5c'}`,
                background: activeZone === zone ? `${zoneColor}18` : 'transparent',
                color: activeZone === zone ? zoneColor : '#4a7fa5',
                fontSize: 10,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                fontFamily: "'Rajdhani', sans-serif",
                letterSpacing: 0.5,
                transition: 'all 0.15s',
              }}>
              <span>{zone === 'ALL' ? '全部' : `${zone}区`}</span>
              <span style={{
                background: activeZone === zone ? zoneColor : '#1a3a5c',
                color: activeZone === zone ? '#040c18' : '#4a7fa5',
                borderRadius: 2,
                padding: '0 4px',
                fontSize: 9,
                fontFamily: "'Share Tech Mono', monospace",
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Camera Grid */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: 8,
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 5,
        alignContent: 'start',
      }}>
        {filteredCameras.map(cam => {
          const isSelected = cam.id === selectedId;
          const statusColor = cam.status === 'online' ? '#00e676' : cam.status === 'warning' ? '#ffca28' : '#ff1744';

          return (
            <div
              key={cam.id}
              onClick={() => { onSelect(cam.id); setViewMode('single'); }}
              style={{
                cursor: 'pointer',
                borderRadius: 4,
                border: `1px solid ${isSelected ? '#00d4ff' : '#1a3a5c'}`,
                background: isSelected ? 'rgba(0,212,255,0.06)' : '#080e18',
                overflow: 'hidden',
                transition: 'border-color 0.15s',
                position: 'relative',
              }}
            >
              {/* Camera thumbnail */}
              <div style={{ height: 56, position: 'relative' }}>
                <CameraFeed camera={cam} large={false} />
              </div>

              {/* Camera label */}
              <div style={{
                padding: '3px 5px',
                background: 'rgba(4,12,24,0.9)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    color: isSelected ? '#00d4ff' : '#7b9bc0',
                    fontSize: 8.5,
                    fontFamily: "'Share Tech Mono', monospace",
                    letterSpacing: 0.5,
                  }}>
                    {cam.id}
                  </span>
                  <span style={{
                    color: statusColor,
                    fontSize: 7,
                    fontFamily: "'Share Tech Mono', monospace",
                    display: 'flex', alignItems: 'center', gap: 2,
                  }}>
                    <span style={{
                      display: 'inline-block',
                      width: 4, height: 4,
                      borderRadius: '50%',
                      background: statusColor,
                      animation: cam.status === 'online' ? 'data-blink 2s infinite' : undefined,
                    }} />
                    {cam.status === 'online' ? 'ON' : cam.status === 'warning' ? 'WN' : 'OFF'}
                  </span>
                </div>
                <div style={{
                  color: ZONE_COLORS[cam.zone],
                  fontSize: 7,
                  fontFamily: "'Rajdhani', sans-serif",
                  opacity: 0.7,
                }}>
                  {ZONE_LABELS[cam.zone]}
                </div>
              </div>

              {/* Selection indicator */}
              {isSelected && (
                <div style={{
                  position: 'absolute', top: 3, right: 3,
                  background: '#00d4ff', borderRadius: 1,
                  width: 4, height: 4,
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Camera Stats Footer */}
      <div style={{
        padding: '6px 12px',
        borderTop: '1px solid #1a3a5c',
        background: '#0a1628',
        display: 'flex', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        {[
          { label: '在线', count: cameras.filter(c => c.status === 'online').length, color: '#00e676' },
          { label: '警告', count: cameras.filter(c => c.status === 'warning').length, color: '#ffca28' },
          { label: '离线', count: cameras.filter(c => c.status === 'offline').length, color: '#ff1744' },
          { label: '总计', count: cameras.length, color: '#00d4ff' },
        ].map(s => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <div style={{ color: s.color, fontSize: 14, fontFamily: "'Share Tech Mono', monospace", lineHeight: 1.2 }}>
              {s.count}
            </div>
            <div style={{ color: '#4a7fa5', fontSize: 8, fontFamily: "'Rajdhani', sans-serif" }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}