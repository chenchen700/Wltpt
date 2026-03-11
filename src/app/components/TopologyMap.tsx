import React, { useEffect, useState } from 'react';

export type NodeStatus = 'normal' | 'warning' | 'error' | 'lost';

export interface TopoNodeState {
  status: NodeStatus;
  heartbeatMs: number;
  packetLoss: number;
  uptime: string;
}

export interface EdgeBoxState extends TopoNodeState {
  id: string;
  name: string;
  algorithmModel: string;
}

export interface CameraNodeState {
  id: string;
  name: string;
  zone: 'A' | 'B' | 'C';
  zoneLabel: string;
  status: 'online' | 'offline' | 'warning';
  fps: number;
  resolution: string;
  edgeBoxId: string;
}

interface TopologyMapProps {
  edgeBoxes: EdgeBoxState[];
  edgeManagementState: TopoNodeState;
  dcsState: TopoNodeState;
  virtualState: TopoNodeState;
  algorithmStates: Record<string, TopoNodeState>;
  cameraStates: CameraNodeState[];
  selectedCameraId: string | null;
  onCameraSelect: (id: string) => void;
}

const STATUS_COLOR: Record<NodeStatus, string> = {
  normal: '#00e676',
  warning: '#ffca28',
  error: '#ff1744',
  lost: '#ff6d00',
};

const SVG_W = 1200;
const SVG_H = 720;

// Layer Y coordinates
const CAMERA_LAYER_Y = 48;
const EDGE_BOX_LAYER_Y = 230;
const MANAGEMENT_LAYER_Y = 455;
const APP_LAYER_Y = 600;

// Camera grid: 10 in row1, 9 in row2
const CAM_ROW1_Y = 82;
const CAM_ROW2_Y = 152;
const CAM_H_SPACING = 100;
const CAM_ROW1_START_X = 155;
const CAM_ROW1_COUNT = 10;
// Row 2 centered relative to row 1
const CAM_ROW1_CENTER = CAM_ROW1_START_X + (CAM_ROW1_COUNT - 1) * CAM_H_SPACING / 2; // = 155 + 450 = 605
const CAM_ROW2_COUNT = 9;
const CAM_ROW2_START_X = CAM_ROW1_CENTER - (CAM_ROW2_COUNT - 1) * CAM_H_SPACING / 2; // = 605 - 400 = 205

// Edge boxes layout (6 in a row)
const EDGE_BOX_START_X = 200;
const EDGE_BOX_SPACING = 140;

// Management layer
const EDGE_MGMT_POS = { x: 300, y: MANAGEMENT_LAYER_Y, w: 200, h: 80 };
const DCS_POS = { x: 700, y: MANAGEMENT_LAYER_Y, w: 200, h: 80 };

// App layer
const VIRTUAL_POS = { x: 500, y: APP_LAYER_Y, w: 240, h: 80 };

// Short display labels for camera icons
const CAM_SHORT_LABELS: Record<string, string> = {
  'CAM01': '矩振筛',
  'CAM02': '水针01',
  'CAM03': '水针02',
  'CAM04': '扬克缸',
  'CAM05': '进施胶1',
  'CAM06': '进施胶2',
  'CAM07': '出施胶1',
  'CAM08': '出施胶2',
  'CAM09': '喂料机',
  'CAM10': '进料01',
  'CAM11': '进料02',
  'CAM12': '进料03',
  'CAM13': '料位01',
  'CAM14': '料位02',
  'CAM15': '料位03',
  'CAM16': '料位04',
  'CAM17': '出料01',
  'CAM18': '出料02',
  'CAM19': '分切机',
};

function getCameraPosition(index: number): { x: number; y: number } {
  if (index < CAM_ROW1_COUNT) {
    return { x: CAM_ROW1_START_X + index * CAM_H_SPACING, y: CAM_ROW1_Y };
  } else {
    return { x: CAM_ROW2_START_X + (index - CAM_ROW1_COUNT) * CAM_H_SPACING, y: CAM_ROW2_Y };
  }
}

function getEdgeBoxPosition(index: number): { x: number; y: number } {
  return {
    x: EDGE_BOX_START_X + index * EDGE_BOX_SPACING,
    y: EDGE_BOX_LAYER_Y,
  };
}

function CameraIcon({ x, y, status, id, label, name, selected, onClick }: {
  x: number; y: number; status: string; id: string; label: string; name: string;
  selected: boolean; onClick: () => void;
}) {
  const color = status === 'online' ? '#00b4d8' : status === 'warning' ? '#ffca28' : '#555e70';
  const selColor = '#00d4ff';
  return (
    <g transform={`translate(${x}, ${y})`} style={{ cursor: 'pointer' }} onClick={onClick}>
      <title>{name}</title>
      {selected && (
        <rect x="-18" y="-19" width="36" height="50" rx="4"
          fill="none" stroke={selColor} strokeWidth="1.5" strokeDasharray="3 2" opacity="0.8" />
      )}
      {/* Camera body */}
      <rect x="-14" y="-10" width="28" height="20" rx="3"
        fill={selected ? 'rgba(0,212,255,0.15)' : 'rgba(10,22,40,0.9)'}
        stroke={selected ? selColor : color} strokeWidth={selected ? 1.5 : 1} />
      {/* Mount */}
      <rect x="-5" y="-15" width="10" height="6" rx="2"
        fill="rgba(10,22,40,0.9)" stroke={color} strokeWidth="1" />
      {/* Lens outer ring */}
      <circle cx="0" cy="0" r="6" fill="none" stroke={color} strokeWidth="1.2" />
      {/* Lens inner */}
      <circle cx="0" cy="0" r="2.5" fill={color} />
      {/* Status dot */}
      <circle cx="11" cy="-7" r="3" fill={color} opacity="0.9">
        {status === 'warning' && (
          <animate attributeName="opacity" values="1;0.2;1" dur="1s" repeatCount="indefinite" />
        )}
        {status === 'offline' && (
          <animate attributeName="opacity" values="1;0.1;1" dur="0.5s" repeatCount="indefinite" />
        )}
      </circle>
      {/* Camera ID number */}
      <text x="0" y="21" textAnchor="middle" fill="#4a7fa5" fontSize={8.5}
        fontFamily="'Share Tech Mono', monospace">
        {id.replace('CAM', '')}
      </text>
      {/* Short zone label */}
      <text x="0" y="33" textAnchor="middle" fill={color} fontSize={8.5}
        fontFamily="'Rajdhani', sans-serif" opacity="0.9">
        {label}
      </text>
    </g>
  );
}

function EdgeBoxNode({ box, pos, algorithmState }: {
  box: EdgeBoxState;
  pos: { x: number; y: number };
  algorithmState: TopoNodeState;
}) {
  const sc = STATUS_COLOR[box.status];
  const aiColor = STATUS_COLOR[algorithmState.status];
  const isAnomalous = box.status !== 'normal';
  const isAiAnomalous = algorithmState.status !== 'normal';

  return (
    <g>
      {(isAnomalous || isAiAnomalous) && (
        <rect
          x={pos.x - 3} y={pos.y - 3}
          width={126} height={106} rx={8}
          fill="none" stroke={isAnomalous ? sc : aiColor} strokeWidth="1.5" opacity="0.5"
          strokeDasharray={box.status === 'lost' ? '4 3' : undefined}
        >
          <animate attributeName="opacity" values="0.7;0.1;0.7" dur="1s" repeatCount="indefinite" />
        </rect>
      )}

      {/* Main box background */}
      <rect
        x={pos.x} y={pos.y}
        width={120} height={100} rx={6}
        fill="url(#grad-edge)"
        stroke={isAnomalous ? sc : '#2d7dd2'}
        strokeWidth={isAnomalous ? 1.5 : 1}
      />

      {/* Top accent stripe */}
      <rect
        x={pos.x} y={pos.y}
        width={120} height={3} rx={2}
        fill={isAnomalous ? sc : '#2d7dd2'}
        opacity={0.8}
      />

      {/* Edge box label - uses box.name which is "边缘算力服务器 0X" */}
      <text
        x={pos.x + 60} y={pos.y + 13}
        textAnchor="middle" dominantBaseline="middle"
        fill="#2d7dd2" fontSize={8.5} fontWeight={700}
        fontFamily="'Rajdhani', sans-serif" letterSpacing={0.8}
      >
        {box.name}
      </text>

      {/* Edge box status dot */}
      <circle cx={pos.x + 108} cy={pos.y + 10} r={4} fill={sc}>
        {box.status !== 'normal' && (
          <animate attributeName="opacity" values="1;0.2;1"
            dur={box.status === 'error' ? '0.6s' : '1.2s'} repeatCount="indefinite" />
        )}
      </circle>

      {/* Divider line */}
      <line
        x1={pos.x + 10} y1={pos.y + 28}
        x2={pos.x + 110} y2={pos.y + 28}
        stroke="#1a3a5c" strokeWidth="1" strokeDasharray="2 2"
      />

      {/* Algorithm model section */}
      <rect
        x={pos.x + 8} y={pos.y + 35}
        width={104} height={58} rx={4}
        fill="rgba(139,92,246,0.08)"
        stroke={isAiAnomalous ? aiColor : '#8b5cf6'}
        strokeWidth={isAiAnomalous ? 1.2 : 0.8}
        strokeDasharray="2 2"
      />

      {/* AI icon */}
      <text x={pos.x + 18} y={pos.y + 52} fill={isAiAnomalous ? aiColor : '#a78bfa'} fontSize={10}>◈</text>

      {/* Algorithm model label */}
      <text x={pos.x + 30} y={pos.y + 48} fill={isAiAnomalous ? aiColor : '#a78bfa'} fontSize={8}
        fontFamily="'Rajdhani', sans-serif">
        算法模型
      </text>
      <text x={pos.x + 30} y={pos.y + 60} fill={isAiAnomalous ? aiColor : '#a78bfa'} fontSize={7}
        fontFamily="'Share Tech Mono', monospace">
        {box.algorithmModel}
      </text>

      {/* Algorithm heartbeat */}
      <text x={pos.x + 30} y={pos.y + 75} fill={aiColor} fontSize={7}
        fontFamily="'Share Tech Mono', monospace">
        ♥ {algorithmState.heartbeatMs}ms
      </text>

      {/* Algorithm status dot */}
      <circle cx={pos.x + 100} cy={pos.y + 65} r={3} fill={aiColor}>
        {algorithmState.status !== 'normal' && (
          <animate attributeName="opacity" values="1;0.2;1"
            dur={algorithmState.status === 'error' ? '0.6s' : '1.2s'} repeatCount="indefinite" />
        )}
      </circle>

      {/* Connection dots top/bottom */}
      <circle cx={pos.x + 60} cy={pos.y} r={3.5} fill="#00b4d8" opacity="0.7">
        <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx={pos.x + 60} cy={pos.y + 100} r={3.5} fill="#2d7dd2" opacity="0.7">
        <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" begin="0.5s" />
      </circle>
    </g>
  );
}

function SystemNode({
  label, sublabel, pos, state, color, type
}: {
  label: string; sublabel: string;
  pos: { x: number; y: number; w: number; h: number };
  state: TopoNodeState;
  color: { border: string; icon: string; fill: string };
  type: 'edge' | 'dcs' | 'virtual';
}) {
  const sc = STATUS_COLOR[state.status];
  const isAnomalous = state.status !== 'normal';
  const cx = pos.x + pos.w / 2;

  return (
    <g>
      {isAnomalous && (
        <rect
          x={pos.x - 4} y={pos.y - 4}
          width={pos.w + 8} height={pos.h + 8} rx={8}
          fill="none" stroke={sc} strokeWidth="1.5" opacity="0.5"
          strokeDasharray={state.status === 'lost' ? '4 3' : undefined}
        >
          <animate attributeName="opacity" values="0.7;0.1;0.7" dur="1s" repeatCount="indefinite" />
        </rect>
      )}

      <rect
        x={pos.x} y={pos.y}
        width={pos.w} height={pos.h} rx={6}
        fill={`url(#grad-${type})`}
        stroke={isAnomalous ? sc : color.border}
        strokeWidth={isAnomalous ? 1.5 : 1}
      />

      <rect
        x={pos.x} y={pos.y}
        width={pos.w} height={3} rx={2}
        fill={isAnomalous ? sc : color.border}
        opacity={0.8}
      />

      <text
        x={cx} y={pos.y + 32}
        textAnchor="middle" dominantBaseline="middle"
        fill={color.icon} fontSize={12} fontWeight={700}
        fontFamily="'Rajdhani', sans-serif" letterSpacing={1}
      >
        {label}
      </text>
      <text
        x={cx} y={pos.y + 48}
        textAnchor="middle" dominantBaseline="middle"
        fill="#4a7fa5" fontSize={8.5} fontFamily="'Share Tech Mono', monospace"
      >
        {sublabel}
      </text>

      <circle cx={pos.x + pos.w - 12} cy={pos.y + 12} r={4} fill={sc}>
        {state.status !== 'normal' && (
          <animate attributeName="opacity" values="1;0.2;1"
            dur={state.status === 'error' ? '0.6s' : '1.2s'} repeatCount="indefinite" />
        )}
      </circle>

      <text
        x={cx} y={pos.y + pos.h - 14}
        textAnchor="middle" dominantBaseline="middle"
        fill={sc} fontSize={8}
        fontFamily="'Share Tech Mono', monospace"
      >
        {state.heartbeatMs > 0 ? `♥ ${state.heartbeatMs}ms` : 'N/A'}
      </text>

      <circle cx={cx} cy={pos.y} r={3.5} fill={color.border} opacity="0.7">
        <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
      </circle>
      {type === 'virtual' && (
        <circle cx={cx} cy={pos.y + pos.h} r={3.5} fill={color.border} opacity="0.7">
          <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" begin="0.3s" />
        </circle>
      )}
    </g>
  );
}

export function TopologyMap({
  edgeBoxes,
  edgeManagementState,
  dcsState,
  virtualState,
  algorithmStates,
  cameraStates,
  selectedCameraId,
  onCameraSelect,
}: TopologyMapProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  if (!edgeBoxes || !cameraStates || !algorithmStates) return null;

  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#040c18',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Rajdhani', sans-serif",
    }}>
      {/* Grid background */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(0,212,255,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,212,255,0.04) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
      }} />

      {/* Corner decorations */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: 120, height: 120, borderTop: '2px solid #1a3a5c', borderLeft: '2px solid #1a3a5c', borderRadius: '0 0 8px 0', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 0, right: 0, width: 120, height: 120, borderTop: '2px solid #1a3a5c', borderRight: '2px solid #1a3a5c', borderRadius: '0 0 0 8px', pointerEvents: 'none' }} />

      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block' }}
      >
        <defs>
          {/* Gradients */}
          <linearGradient id="grad-edge" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f2040" />
            <stop offset="100%" stopColor="#0a1628" />
          </linearGradient>
          <linearGradient id="grad-dcs" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#201208" />
            <stop offset="100%" stopColor="#140c04" />
          </linearGradient>
          <linearGradient id="grad-virtual" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#061a10" />
            <stop offset="100%" stopColor="#041208" />
          </linearGradient>

          {/* Arrow markers */}
          <marker id="arrow-cyan" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#00b4d8" />
          </marker>
          <marker id="arrow-blue" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#2d7dd2" />
          </marker>
          <marker id="arrow-purple" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#8b5cf6" />
          </marker>
          <marker id="arrow-amber" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#f59e0b" />
          </marker>
          <marker id="arrow-teal" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#10b981" />
          </marker>
          <filter id="glow-line">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Layer labels ──────────────────────────────────── */}
        {[
          { y: CAMERA_LAYER_Y, label: '感知层', sub: '19台工业相机', color: '#00b4d8' },
          { y: EDGE_BOX_LAYER_Y - 20, label: '边缘硬件层', sub: '6台边缘算力服务器 (内含6种算法模型)', color: '#2d7dd2' },
          { y: MANAGEMENT_LAYER_Y - 22, label: '管理与控制层', sub: '边缘管理后台 + DCS系统', color: '#8b5cf6' },
          { y: APP_LAYER_Y - 22, label: '应用展示层', sub: '虚拟产线平台', color: '#10b981' },
        ].map((l, i) => (
          <g key={i}>
            <text x="50" y={l.y} textAnchor="start"
              fill={l.color} fontSize={11} fontWeight={700}
              fontFamily="'Rajdhani', sans-serif" letterSpacing={1.5} opacity={0.9}>
              {l.label}
            </text>
            <text x="50" y={l.y + 14} textAnchor="start"
              fill={l.color} fontSize={8}
              fontFamily="'Share Tech Mono', monospace" opacity={0.5}>
              {l.sub}
            </text>
          </g>
        ))}

        {/* ── Horizontal layer separator lines ─────────────── */}
        {[192, 390, 550].map((y, i) => (
          <line key={i} x1="0" y1={y} x2={SVG_W} y2={y}
            stroke="#1a3a5c" strokeWidth="1" strokeDasharray="6 4" opacity="0.5" />
        ))}

        {/* ══════════════════════════════════════════════════ */}
        {/* CONNECTION LINES                                  */}
        {/* ══════════════════════════════════════════════════ */}

        {/* 1. Cameras → Edge Boxes (视频流接入) */}
        {cameraStates.map((cam, i) => {
          const camPos = getCameraPosition(i);
          const edgeBoxIndex = edgeBoxes.findIndex(box => box.id === cam.edgeBoxId);
          if (edgeBoxIndex === -1) return null;
          const edgePos = getEdgeBoxPosition(edgeBoxIndex);
          const pathD = `M${camPos.x},${camPos.y + 12} L${camPos.x},${camPos.y + 35} Q${camPos.x},${camPos.y + 65} ${edgePos.x + 60},${edgePos.y - 18} L${edgePos.x + 60},${edgePos.y}`;
          return (
            <g key={`cam-edge-${cam.id}`}>
              <path
                d={pathD}
                fill="none" stroke="#00b4d8" strokeWidth="0.7" opacity="0.28"
                markerEnd="url(#arrow-cyan)" />
              {i % 3 === 0 && (
                <circle r="2" fill="#00d4ff" opacity="0.8">
                  <animateMotion dur="3s" repeatCount="indefinite" path={pathD} />
                  <animate attributeName="opacity" values="0;0.9;0.9;0" dur="3s" repeatCount="indefinite" />
                </circle>
              )}
            </g>
          );
        })}

        {/* Label: 视频流接入 */}
        <text x="605" y="180" fill="#00b4d8" fontSize="9" fontFamily="'Share Tech Mono', monospace" textAnchor="middle" opacity="0.7">
          ── 视频流接入 ──
        </text>

        {/* 2. Edge Boxes → Edge Management (设备心跳上报) */}
        {edgeBoxes.map((box, i) => {
          const edgePos = getEdgeBoxPosition(i);
          const mgmtCenterX = EDGE_MGMT_POS.x + EDGE_MGMT_POS.w / 2;
          const pathD = `M${edgePos.x + 60},${edgePos.y + 100} Q${edgePos.x + 60},${edgePos.y + 155} ${mgmtCenterX},${EDGE_MGMT_POS.y}`;
          return (
            <g key={`edge-mgmt-${box.id}`}>
              <path
                d={pathD}
                fill="none" stroke="#2d7dd2" strokeWidth="1" opacity="0.5"
                markerEnd="url(#arrow-blue)" filter="url(#glow-line)" />
              {i % 2 === 0 && (
                <circle r="2.5" fill="#2d7dd2" opacity="0.9">
                  <animateMotion dur="2.5s" repeatCount="indefinite" begin={`${i * 0.4}s`} path={pathD} />
                  <animate attributeName="opacity" values="0;0.9;0.9;0" dur="2.5s" repeatCount="indefinite" begin={`${i * 0.4}s`} />
                </circle>
              )}
            </g>
          );
        })}

        {/* Label: 设备状态/设备心跳上报 */}
        <text x="395" y="390" fill="#2d7dd2" fontSize="9" fontFamily="'Share Tech Mono', monospace" textAnchor="middle" opacity="0.7">
          设备状态 / 设备心跳上报
        </text>

        {/* 3. Algorithm Models → Edge Management (算法模型实时心跳上报) */}
        {edgeBoxes.slice(0, 3).map((box, i) => {
          const edgePos = getEdgeBoxPosition(i);
          const mgmtCenterX = EDGE_MGMT_POS.x + EDGE_MGMT_POS.w / 2;
          return (
            <path
              key={`algo-mgmt-${box.id}`}
              d={`M${edgePos.x + 60},${edgePos.y + 85} Q${edgePos.x + 60},${edgePos.y + 145} ${mgmtCenterX - 30},${EDGE_MGMT_POS.y}`}
              fill="none" stroke="#8b5cf6" strokeWidth="1" opacity="0.4"
              strokeDasharray="4 3"
              markerEnd="url(#arrow-purple)" />
          );
        })}

        {/* Label: 算法模型实时心跳上报 */}
        <text x="310" y="375" fill="#8b5cf6" fontSize="9" fontFamily="'Share Tech Mono', monospace" textAnchor="middle" opacity="0.7">
          算法模型实时心跳上报
        </text>

        {/* 4. Algorithm Models → DCS (实时推理结果推送) */}
        {edgeBoxes.slice(3, 6).map((box, i) => {
          const edgePos = getEdgeBoxPosition(i + 3);
          const dcsCenterX = DCS_POS.x + DCS_POS.w / 2;
          const pathD = `M${edgePos.x + 60},${edgePos.y + 85} Q${edgePos.x + 60},${edgePos.y + 145} ${dcsCenterX + 30},${DCS_POS.y}`;
          return (
            <g key={`algo-dcs-${box.id}`}>
              <path
                d={pathD}
                fill="none" stroke="#f59e0b" strokeWidth="1.2" opacity="0.6"
                markerEnd="url(#arrow-amber)" filter="url(#glow-line)" />
              {i % 2 === 0 && (
                <circle r="2.5" fill="#fbbf24" opacity="0.9">
                  <animateMotion dur="2s" repeatCount="indefinite" begin={`${i * 0.5}s`} path={pathD} />
                  <animate attributeName="opacity" values="0;0.9;0.9;0" dur="2s" repeatCount="indefinite" begin={`${i * 0.5}s`} />
                </circle>
              )}
            </g>
          );
        })}

        {/* Label: 实时推理结果推送 */}
        <text x="890" y="375" fill="#f59e0b" fontSize="9" fontFamily="'Share Tech Mono', monospace" textAnchor="middle" opacity="0.7">
          实时推理结果推送
        </text>

        {/* 5. DCS → Virtual Platform (同步算法推理结果) */}
        {(() => {
          const pathD = `M${DCS_POS.x + DCS_POS.w / 2},${DCS_POS.y + DCS_POS.h} L${DCS_POS.x + DCS_POS.w / 2},${DCS_POS.y + DCS_POS.h + 35} Q${DCS_POS.x + DCS_POS.w / 2},${DCS_POS.y + DCS_POS.h + 55} ${VIRTUAL_POS.x + VIRTUAL_POS.w / 2 + 60},${VIRTUAL_POS.y - 18} L${VIRTUAL_POS.x + VIRTUAL_POS.w / 2 + 60},${VIRTUAL_POS.y}`;
          return (
            <g>
              <path d={pathD}
                fill="none" stroke="#10b981" strokeWidth="1.5" opacity="0.7"
                markerEnd="url(#arrow-teal)" filter="url(#glow-line)" />
              {[0, 1].map(i => (
                <circle key={`dcs-virt-${i}`} r="3" fill="#34d399" opacity="0.9">
                  <animateMotion dur="2.2s" repeatCount="indefinite" begin={`${i * 1.1}s`} path={pathD} />
                  <animate attributeName="opacity" values="0;0.9;0.9;0" dur="2.2s" repeatCount="indefinite" begin={`${i * 1.1}s`} />
                </circle>
              ))}
            </g>
          );
        })()}

        {/* Label: 同步算法推理结果 */}
        <text x="890" y="545" fill="#10b981" fontSize="9" fontFamily="'Share Tech Mono', monospace" textAnchor="middle" opacity="0.7">
          同步算法推理结果
        </text>

        {/* 6. Edge Management → Virtual Platform (同步设备状态+算法模型状态) */}
        {(() => {
          const pathD = `M${EDGE_MGMT_POS.x + EDGE_MGMT_POS.w / 2},${EDGE_MGMT_POS.y + EDGE_MGMT_POS.h} L${EDGE_MGMT_POS.x + EDGE_MGMT_POS.w / 2},${EDGE_MGMT_POS.y + EDGE_MGMT_POS.h + 35} Q${EDGE_MGMT_POS.x + EDGE_MGMT_POS.w / 2},${EDGE_MGMT_POS.y + EDGE_MGMT_POS.h + 55} ${VIRTUAL_POS.x + VIRTUAL_POS.w / 2 - 60},${VIRTUAL_POS.y - 18} L${VIRTUAL_POS.x + VIRTUAL_POS.w / 2 - 60},${VIRTUAL_POS.y}`;
          return (
            <g>
              <path d={pathD}
                fill="none" stroke="#10b981" strokeWidth="1.5" opacity="0.7"
                markerEnd="url(#arrow-teal)" filter="url(#glow-line)" />
              {[0, 1].map(i => (
                <circle key={`mgmt-virt-${i}`} r="3" fill="#34d399" opacity="0.9">
                  <animateMotion dur="2.5s" repeatCount="indefinite" begin={`${i * 1.25}s`} path={pathD} />
                  <animate attributeName="opacity" values="0;0.9;0.9;0" dur="2.5s" repeatCount="indefinite" begin={`${i * 1.25}s`} />
                </circle>
              ))}
            </g>
          );
        })()}

        {/* Label: 同步设备状态+算法模型状态 */}
        <text x="320" y="545" fill="#10b981" fontSize="9" fontFamily="'Share Tech Mono', monospace" textAnchor="middle" opacity="0.7">
          同步设备状态 + 算法模型状态
        </text>

        {/* ══════════════════════════════════════════════════ */}
        {/* CAMERA LAYER                                       */}
        {/* ══════════════════════════════════════════════════ */}
        {cameraStates.map((cam, i) => {
          const pos = getCameraPosition(i);
          return (
            <CameraIcon
              key={cam.id}
              x={pos.x}
              y={pos.y}
              status={cam.status}
              id={cam.id}
              label={CAM_SHORT_LABELS[cam.id] || ''}
              name={cam.name}
              selected={selectedCameraId === cam.id}
              onClick={() => onCameraSelect(cam.id)}
            />
          );
        })}

        {/* ══════════════════════════════════════════════════ */}
        {/* EDGE BOX LAYER (边缘算力服务器)                    */}
        {/* ══════════════════════════════════════════════════ */}
        {edgeBoxes.map((box, i) => (
          <EdgeBoxNode
            key={box.id}
            box={box}
            pos={getEdgeBoxPosition(i)}
            algorithmState={algorithmStates[box.algorithmModel]}
          />
        ))}

        {/* EDGE MANAGEMENT NODE */}
        <SystemNode
          label="边缘管理后台"
          sublabel="Edge Management"
          pos={EDGE_MGMT_POS}
          state={edgeManagementState}
          color={{ border: '#2d7dd2', icon: '#2d7dd2', fill: '#0d1f38' }}
          type="edge"
        />

        {/* DCS NODE */}
        <SystemNode
          label="DCS 工控系统"
          sublabel="DCS Control System"
          pos={DCS_POS}
          state={dcsState}
          color={{ border: '#f59e0b', icon: '#fbbf24', fill: '#1f160a' }}
          type="dcs"
        />

        {/* VIRTUAL PLATFORM NODE */}
        <SystemNode
          label="虚拟产线平台"
          sublabel="Virtual Line Platform"
          pos={VIRTUAL_POS}
          state={virtualState}
          color={{ border: '#10b981', icon: '#34d399', fill: '#081f16' }}
          type="virtual"
        />
      </svg>
    </div>
  );
}