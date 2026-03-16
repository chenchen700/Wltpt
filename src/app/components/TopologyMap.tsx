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

// ── Color System ─────────────────────────────────────────────────────────────
const C = {
  cyan:        '#00F1FF',   // Primary brand — perception layer, cameras
  cyanDim:     'rgba(0,241,255,0.18)',
  blue:        '#47B2FF',   // Edge hardware layer
  blueDim:     'rgba(71,178,255,0.15)',
  purple:      '#C084FC',   // Management / algorithm
  purpleDim:   'rgba(192,132,252,0.12)',
  amber:       '#FCD34D',   // DCS
  amberDim:    'rgba(252,211,77,0.12)',
  teal:        '#4ADE80',   // Virtual platform
  tealDim:     'rgba(74,222,128,0.12)',
  textPrimary: '#D4EEFF',   // Main readable text
  textSub:     '#7FC3DF',   // Secondary text (labels, ids)
  textDim:     '#4A8FAA',   // Muted text
  border:      '#1E5A80',   // Panel / separator borders
  borderDim:   '#122E44',   // Dimmer borders
  bg:          '#082030',   // Main background
  bgNode:      '#0A1E30',   // Node fill base
};

const STATUS_COLOR: Record<NodeStatus, string> = {
  normal:  '#00E676',
  warning: '#FFD740',
  error:   '#FF1744',
  lost:    '#FF6D00',
};

const SVG_W = 1200;
const SVG_H = 720;

const CAMERA_LAYER_Y     = 48;
const EDGE_BOX_LAYER_Y   = 230;
const MANAGEMENT_LAYER_Y = 455;
const APP_LAYER_Y        = 600;

const CAM_ROW1_Y       = 82;
const CAM_ROW2_Y       = 152;
const CAM_H_SPACING    = 100;
const CAM_ROW1_START_X = 155;
const CAM_ROW1_COUNT   = 10;
const CAM_ROW1_CENTER  = CAM_ROW1_START_X + (CAM_ROW1_COUNT - 1) * CAM_H_SPACING / 2;
const CAM_ROW2_COUNT   = 9;
const CAM_ROW2_START_X = CAM_ROW1_CENTER - (CAM_ROW2_COUNT - 1) * CAM_H_SPACING / 2;

const EDGE_BOX_START_X  = 200;
const EDGE_BOX_SPACING  = 140;

const EDGE_MGMT_POS = { x: 300, y: MANAGEMENT_LAYER_Y, w: 200, h: 80 };
const DCS_POS       = { x: 700, y: MANAGEMENT_LAYER_Y, w: 200, h: 80 };
const VIRTUAL_POS   = { x: 500, y: APP_LAYER_Y,        w: 240, h: 80 };

const CAM_SHORT_LABELS: Record<string, string> = {
  'CAM01': '矩振筛',  'CAM02': '水针01', 'CAM03': '水针02',
  'CAM04': '扬克缸',  'CAM05': '进施胶1','CAM06': '进施胶2',
  'CAM07': '出施胶1', 'CAM08': '出施胶2','CAM09': '喂料机',
  'CAM10': '进料01',  'CAM11': '进料02', 'CAM12': '进料03',
  'CAM13': '料位01',  'CAM14': '料位02', 'CAM15': '料位03',
  'CAM16': '料位04',  'CAM17': '出料01', 'CAM18': '出料02',
  'CAM19': '分切机',
};

function getCameraPosition(index: number): { x: number; y: number } {
  if (index < CAM_ROW1_COUNT) {
    return { x: CAM_ROW1_START_X + index * CAM_H_SPACING, y: CAM_ROW1_Y };
  }
  return { x: CAM_ROW2_START_X + (index - CAM_ROW1_COUNT) * CAM_H_SPACING, y: CAM_ROW2_Y };
}

function getEdgeBoxPosition(index: number): { x: number; y: number } {
  return { x: EDGE_BOX_START_X + index * EDGE_BOX_SPACING, y: EDGE_BOX_LAYER_Y };
}

// ── Camera Icon ───────────────────────────────────────────────────────────────
function CameraIcon({ x, y, status, id, label, name, selected, onClick }: {
  x: number; y: number; status: string; id: string; label: string; name: string;
  selected: boolean; onClick: () => void;
}) {
  const onlineColor  = C.cyan;
  const warningColor = C.amber;
  const offlineColor = '#4A6070';
  const color = status === 'online' ? onlineColor : status === 'warning' ? warningColor : offlineColor;
  const selColor = C.cyan;

  return (
    <g transform={`translate(${x}, ${y})`} style={{ cursor: 'pointer' }} onClick={onClick}>
      <title>{name}</title>

      {/* Selection ring */}
      {selected && (
        <rect x="-18" y="-19" width="36" height="52" rx="4"
          fill={C.cyanDim} stroke={selColor} strokeWidth="1.5" strokeDasharray="3 2" opacity="0.95" />
      )}

      {/* Camera body */}
      <rect x="-14" y="-10" width="28" height="20" rx="3"
        fill={selected ? 'rgba(0,241,255,0.12)' : 'rgba(8,28,44,0.95)'}
        stroke={selected ? selColor : color} strokeWidth={selected ? 1.5 : 1} />

      {/* Mount */}
      <rect x="-5" y="-15" width="10" height="6" rx="2"
        fill="rgba(8,28,44,0.95)" stroke={color} strokeWidth="1" />

      {/* Lens ring */}
      <circle cx="0" cy="0" r="6" fill="none" stroke={color} strokeWidth="1.3" />
      {/* Lens core */}
      <circle cx="0" cy="0" r="2.8" fill={color} opacity="0.9" />

      {/* Status dot */}
      <circle cx="11" cy="-7" r="3" fill={color}>
        {status === 'warning' && (
          <animate attributeName="opacity" values="1;0.15;1" dur="1s" repeatCount="indefinite" />
        )}
        {status === 'offline' && (
          <animate attributeName="opacity" values="1;0.1;1" dur="0.5s" repeatCount="indefinite" />
        )}
      </circle>

      {/* CAM number — bright and readable */}
      <text x="0" y="21" textAnchor="middle"
        fill={C.textSub} fontSize={9}
        fontFamily="'Share Tech Mono', monospace" fontWeight="600">
        {id.replace('CAM', 'C')}
      </text>

      {/* Short label — bright white-ish */}
      <text x="0" y="33" textAnchor="middle"
        fill={C.textPrimary} fontSize={9}
        fontFamily="'Rajdhani', sans-serif" fontWeight="600" letterSpacing={0.3}>
        {label}
      </text>
    </g>
  );
}

// ── Edge Box Node ─────────────────────────────────────────────────────────────
function EdgeBoxNode({ box, pos, algorithmState }: {
  box: EdgeBoxState; pos: { x: number; y: number }; algorithmState: TopoNodeState;
}) {
  const sc        = STATUS_COLOR[box.status];
  const aiColor   = STATUS_COLOR[algorithmState.status];
  const isAnom    = box.status !== 'normal';
  const isAiAnom  = algorithmState.status !== 'normal';

  return (
    <g>
      {/* Anomaly halo */}
      {(isAnom || isAiAnom) && (
        <rect x={pos.x - 3} y={pos.y - 3} width={126} height={106} rx={8}
          fill="none" stroke={isAnom ? sc : aiColor} strokeWidth="1.5" opacity="0.55"
          strokeDasharray={box.status === 'lost' ? '4 3' : undefined}>
          <animate attributeName="opacity" values="0.7;0.1;0.7" dur="1s" repeatCount="indefinite" />
        </rect>
      )}

      {/* Body */}
      <rect x={pos.x} y={pos.y} width={120} height={100} rx={6}
        fill="url(#grad-edge)"
        stroke={isAnom ? sc : C.blue}
        strokeWidth={isAnom ? 1.5 : 1} />

      {/* Top accent stripe */}
      <rect x={pos.x} y={pos.y} width={120} height={3} rx={2}
        fill={isAnom ? sc : C.blue} opacity={0.9} />

      {/* Name label */}
      <text x={pos.x + 60} y={pos.y + 13}
        textAnchor="middle" dominantBaseline="middle"
        fill={C.blue} fontSize={8.5} fontWeight={700}
        fontFamily="'Rajdhani', sans-serif" letterSpacing={0.8}>
        {box.name}
      </text>

      {/* Status dot */}
      <circle cx={pos.x + 108} cy={pos.y + 10} r={4} fill={sc}>
        {box.status !== 'normal' && (
          <animate attributeName="opacity" values="1;0.2;1"
            dur={box.status === 'error' ? '0.6s' : '1.2s'} repeatCount="indefinite" />
        )}
      </circle>

      {/* Divider */}
      <line x1={pos.x + 10} y1={pos.y + 28} x2={pos.x + 110} y2={pos.y + 28}
        stroke={C.border} strokeWidth="1" strokeDasharray="2 2" />

      {/* Algorithm model inner box */}
      <rect x={pos.x + 8} y={pos.y + 35} width={104} height={58} rx={4}
        fill={C.purpleDim}
        stroke={isAiAnom ? aiColor : C.purple}
        strokeWidth={isAiAnom ? 1.2 : 0.8}
        strokeDasharray="2 2" />

      {/* AI icon */}
      <text x={pos.x + 18} y={pos.y + 52}
        fill={isAiAnom ? aiColor : C.purple} fontSize={10}>◈</text>

      {/* Algorithm label */}
      <text x={pos.x + 30} y={pos.y + 48}
        fill={isAiAnom ? aiColor : C.purple} fontSize={8}
        fontFamily="'Rajdhani', sans-serif">算法模型</text>
      <text x={pos.x + 30} y={pos.y + 60}
        fill={isAiAnom ? aiColor : C.purple} fontSize={7}
        fontFamily="'Share Tech Mono', monospace">{box.algorithmModel}</text>

      {/* Algorithm heartbeat */}
      <text x={pos.x + 30} y={pos.y + 75}
        fill={aiColor} fontSize={7}
        fontFamily="'Share Tech Mono', monospace">♥ {algorithmState.heartbeatMs}ms</text>

      {/* Algorithm status dot */}
      <circle cx={pos.x + 100} cy={pos.y + 65} r={3} fill={aiColor}>
        {algorithmState.status !== 'normal' && (
          <animate attributeName="opacity" values="1;0.2;1"
            dur={algorithmState.status === 'error' ? '0.6s' : '1.2s'} repeatCount="indefinite" />
        )}
      </circle>

      {/* Connection dots */}
      <circle cx={pos.x + 60} cy={pos.y} r={3.5} fill={C.cyan} opacity="0.8">
        <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx={pos.x + 60} cy={pos.y + 100} r={3.5} fill={C.blue} opacity="0.8">
        <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" begin="0.5s" />
      </circle>
    </g>
  );
}

// ── System Node ───────────────────────────────────────────────────────────────
function SystemNode({
  label, sublabel, pos, state, color, type
}: {
  label: string; sublabel: string;
  pos: { x: number; y: number; w: number; h: number };
  state: TopoNodeState;
  color: { border: string; icon: string };
  type: 'edge' | 'dcs' | 'virtual';
}) {
  const sc = STATUS_COLOR[state.status];
  const isAnom = state.status !== 'normal';
  const cx = pos.x + pos.w / 2;

  return (
    <g>
      {isAnom && (
        <rect x={pos.x - 4} y={pos.y - 4} width={pos.w + 8} height={pos.h + 8} rx={8}
          fill="none" stroke={sc} strokeWidth="1.5" opacity="0.5"
          strokeDasharray={state.status === 'lost' ? '4 3' : undefined}>
          <animate attributeName="opacity" values="0.7;0.1;0.7" dur="1s" repeatCount="indefinite" />
        </rect>
      )}

      <rect x={pos.x} y={pos.y} width={pos.w} height={pos.h} rx={6}
        fill={`url(#grad-${type})`}
        stroke={isAnom ? sc : color.border}
        strokeWidth={isAnom ? 1.5 : 1} />

      {/* Top accent */}
      <rect x={pos.x} y={pos.y} width={pos.w} height={3} rx={2}
        fill={isAnom ? sc : color.border} opacity={0.9} />

      <text x={cx} y={pos.y + 32}
        textAnchor="middle" dominantBaseline="middle"
        fill={color.icon} fontSize={13} fontWeight={700}
        fontFamily="'Rajdhani', sans-serif" letterSpacing={1}>
        {label}
      </text>
      <text x={cx} y={pos.y + 49}
        textAnchor="middle" dominantBaseline="middle"
        fill={C.textSub} fontSize={8.5} fontFamily="'Share Tech Mono', monospace">
        {sublabel}
      </text>

      <circle cx={pos.x + pos.w - 12} cy={pos.y + 12} r={4} fill={sc}>
        {state.status !== 'normal' && (
          <animate attributeName="opacity" values="1;0.2;1"
            dur={state.status === 'error' ? '0.6s' : '1.2s'} repeatCount="indefinite" />
        )}
      </circle>

      <text x={cx} y={pos.y + pos.h - 12}
        textAnchor="middle" dominantBaseline="middle"
        fill={sc} fontSize={8} fontFamily="'Share Tech Mono', monospace">
        {state.heartbeatMs > 0 ? `♥ ${state.heartbeatMs}ms` : 'N/A'}
      </text>

      <circle cx={cx} cy={pos.y} r={3.5} fill={color.border} opacity="0.8">
        <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
      </circle>
      {type === 'virtual' && (
        <circle cx={cx} cy={pos.y + pos.h} r={3.5} fill={color.border} opacity="0.8">
          <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" begin="0.3s" />
        </circle>
      )}
    </g>
  );
}

// ── Main TopologyMap ──────────────────────────────────────────────────────────
export function TopologyMap({
  edgeBoxes, edgeManagementState, dcsState, virtualState,
  algorithmStates, cameraStates, selectedCameraId, onCameraSelect,
}: TopologyMapProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  if (!edgeBoxes || !cameraStates || !algorithmStates) return null;

  // Smooth cubic-bezier path: control points at vertical midpoint
  const cb = (sx: number, sy: number, ex: number, ey: number) => {
    const my = (sy + ey) / 2;
    return `M${sx},${sy} C${sx},${my} ${ex},${my} ${ex},${ey}`;
  };

  return (
    <div style={{
      width: '100%', height: '100%',
      background: C.bg,
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Rajdhani', sans-serif",
    }}>
      {/* Grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(0,241,255,0.07) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,241,255,0.07) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
      }} />

      {/* Corner accents */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: 120, height: 120, borderTop: `2px solid ${C.border}`, borderLeft: `2px solid ${C.border}`, borderRadius: '0 0 8px 0', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 0, right: 0, width: 120, height: 120, borderTop: `2px solid ${C.border}`, borderRight: `2px solid ${C.border}`, borderRadius: '0 0 0 8px', pointerEvents: 'none' }} />

      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        width="100%" height="100%"
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block' }}
      >
        <defs>
          {/* Node gradients */}
          <linearGradient id="grad-edge" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#12304C" />
            <stop offset="100%" stopColor="#0A2038" />
          </linearGradient>
          <linearGradient id="grad-dcs" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2E1E08" />
            <stop offset="100%" stopColor="#1C1205" />
          </linearGradient>
          <linearGradient id="grad-virtual" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0D2A1C" />
            <stop offset="100%" stopColor="#081C12" />
          </linearGradient>

          {/* Arrow markers */}
          <marker id="arrow-cyan"   markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill={C.cyan} />
          </marker>
          <marker id="arrow-blue"   markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill={C.blue} />
          </marker>
          <marker id="arrow-purple" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill={C.purple} />
          </marker>
          <marker id="arrow-amber"  markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill={C.amber} />
          </marker>
          <marker id="arrow-teal"   markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill={C.teal} />
          </marker>

          {/* Glow filter */}
          <filter id="glow-line" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-node" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Layer labels ────────────────────────────────── */}
        {[
          { y: CAMERA_LAYER_Y,         label: '感知层',       sub: '19台工业相机',                      color: C.cyan   },
          { y: EDGE_BOX_LAYER_Y - 20,  label: '边缘硬件层',   sub: '6台边缘算力服务器 (内含6种算法模型)', color: C.blue   },
          { y: MANAGEMENT_LAYER_Y - 22,label: '管理与控制层', sub: '边缘管理后台 + DCS系统',              color: C.purple },
          { y: APP_LAYER_Y - 22,       label: '应用展示层',   sub: '虚拟产线平台',                       color: C.teal   },
        ].map((l, i) => (
          <g key={i}>
            <text x="50" y={l.y} textAnchor="start"
              fill={l.color} fontSize={11} fontWeight={700}
              fontFamily="'Rajdhani', sans-serif" letterSpacing={1.5}>
              {l.label}
            </text>
            <text x="50" y={l.y + 14} textAnchor="start"
              fill={l.color} fontSize={8}
              fontFamily="'Share Tech Mono', monospace" opacity={0.7}>
              {l.sub}
            </text>
          </g>
        ))}

        {/* ── Layer separator lines ───────────────────────── */}
        {[192, 390, 550].map((y, i) => (
          <line key={i} x1="0" y1={y} x2={SVG_W} y2={y}
            stroke={C.border} strokeWidth="1" strokeDasharray="6 4" opacity="0.8" />
        ))}

        {/* ════════════════════════════════════════════════ */}
        {/* CONNECTION LINES                               */}
        {/* ════════════════════════════════════════════════ */}

        {/* 1. Cameras → Edge Boxes */}
        {cameraStates.map((cam, i) => {
          const camPos = getCameraPosition(i);
          const edgeIdx = edgeBoxes.findIndex(b => b.id === cam.edgeBoxId);
          if (edgeIdx === -1) return null;
          const edgePos = getEdgeBoxPosition(edgeIdx);
          const pathD = cb(camPos.x, camPos.y + 14, edgePos.x + 60, edgePos.y);
          return (
            <g key={`cam-edge-${cam.id}`}>
              <path d={pathD}
                fill="none" stroke={C.cyan} strokeWidth="0.9" opacity="0.35"
                markerEnd="url(#arrow-cyan)" />
              {i % 3 === 0 && (
                <circle r="2.2" fill={C.cyan}>
                  <animateMotion dur="3s" repeatCount="indefinite" path={pathD} />
                  <animate attributeName="opacity" values="0;1;1;0" dur="3s" repeatCount="indefinite" />
                </circle>
              )}
            </g>
          );
        })}

        <text x="605" y="180" fill={C.cyan} fontSize="9"
          fontFamily="'Share Tech Mono', monospace" textAnchor="middle" opacity="0.9">
          ── 视频流接入 ──
        </text>

        {/* 2. Edge Boxes → Edge Management */}
        {edgeBoxes.map((box, i) => {
          const edgePos = getEdgeBoxPosition(i);
          const mgmtCX = EDGE_MGMT_POS.x + EDGE_MGMT_POS.w / 2;
          const pathD = cb(edgePos.x + 60, edgePos.y + 100, mgmtCX, EDGE_MGMT_POS.y);
          return (
            <g key={`edge-mgmt-${box.id}`}>
              <path d={pathD}
                fill="none" stroke={C.blue} strokeWidth="1.1" opacity="0.65"
                markerEnd="url(#arrow-blue)" filter="url(#glow-line)" />
              {i % 2 === 0 && (
                <circle r="2.5" fill={C.blue}>
                  <animateMotion dur="2.5s" repeatCount="indefinite" begin={`${i * 0.4}s`} path={pathD} />
                  <animate attributeName="opacity" values="0;1;1;0" dur="2.5s" repeatCount="indefinite" begin={`${i * 0.4}s`} />
                </circle>
              )}
            </g>
          );
        })}

        <text x="395" y="393" fill={C.blue} fontSize="9"
          fontFamily="'Share Tech Mono', monospace" textAnchor="middle" opacity="0.9">
          设备状态 / 设备心跳上报
        </text>

        {/* 3. Algorithm Models → Edge Management (dashed) */}
        {edgeBoxes.slice(0, 3).map((box, i) => {
          const edgePos = getEdgeBoxPosition(i);
          const mgmtCX = EDGE_MGMT_POS.x + EDGE_MGMT_POS.w / 2;
          const pathD = cb(edgePos.x + 60, edgePos.y + 90, mgmtCX - 18, EDGE_MGMT_POS.y);
          return (
            <path key={`algo-mgmt-${box.id}`} d={pathD}
              fill="none" stroke={C.purple} strokeWidth="1" opacity="0.6"
              strokeDasharray="5 3" markerEnd="url(#arrow-purple)" />
          );
        })}

        <text x="310" y="378" fill={C.purple} fontSize="9"
          fontFamily="'Share Tech Mono', monospace" textAnchor="middle" opacity="0.9">
          算法模型实时心跳上报
        </text>

        {/* 4. Algorithm Models → DCS */}
        {edgeBoxes.slice(3, 6).map((box, i) => {
          const edgePos = getEdgeBoxPosition(i + 3);
          const dcsCX = DCS_POS.x + DCS_POS.w / 2;
          const pathD = cb(edgePos.x + 60, edgePos.y + 90, dcsCX + 18, DCS_POS.y);
          return (
            <g key={`algo-dcs-${box.id}`}>
              <path d={pathD}
                fill="none" stroke={C.amber} strokeWidth="1.2" opacity="0.75"
                markerEnd="url(#arrow-amber)" filter="url(#glow-line)" />
              {i % 2 === 0 && (
                <circle r="2.5" fill={C.amber}>
                  <animateMotion dur="2s" repeatCount="indefinite" begin={`${i * 0.5}s`} path={pathD} />
                  <animate attributeName="opacity" values="0;1;1;0" dur="2s" repeatCount="indefinite" begin={`${i * 0.5}s`} />
                </circle>
              )}
            </g>
          );
        })}

        <text x="895" y="378" fill={C.amber} fontSize="9"
          fontFamily="'Share Tech Mono', monospace" textAnchor="middle" opacity="0.9">
          实时推理结果推送
        </text>

        {/* 5. DCS → Virtual Platform */}
        {(() => {
          const pathD = cb(
            DCS_POS.x + DCS_POS.w / 2, DCS_POS.y + DCS_POS.h,
            VIRTUAL_POS.x + VIRTUAL_POS.w / 2 + 52, VIRTUAL_POS.y
          );
          return (
            <g>
              <path d={pathD}
                fill="none" stroke={C.teal} strokeWidth="1.5" opacity="0.85"
                markerEnd="url(#arrow-teal)" filter="url(#glow-line)" />
              {[0, 1].map(i => (
                <circle key={`dcs-virt-${i}`} r="3" fill={C.teal}>
                  <animateMotion dur="2.2s" repeatCount="indefinite" begin={`${i * 1.1}s`} path={pathD} />
                  <animate attributeName="opacity" values="0;1;1;0" dur="2.2s" repeatCount="indefinite" begin={`${i * 1.1}s`} />
                </circle>
              ))}
            </g>
          );
        })()}

        <text x="900" y="548" fill={C.teal} fontSize="9"
          fontFamily="'Share Tech Mono', monospace" textAnchor="middle" opacity="0.9">
          同步算法推理结果
        </text>

        {/* 6. Edge Management → Virtual Platform */}
        {(() => {
          const pathD = cb(
            EDGE_MGMT_POS.x + EDGE_MGMT_POS.w / 2, EDGE_MGMT_POS.y + EDGE_MGMT_POS.h,
            VIRTUAL_POS.x + VIRTUAL_POS.w / 2 - 52, VIRTUAL_POS.y
          );
          return (
            <g>
              <path d={pathD}
                fill="none" stroke={C.teal} strokeWidth="1.5" opacity="0.85"
                markerEnd="url(#arrow-teal)" filter="url(#glow-line)" />
              {[0, 1].map(i => (
                <circle key={`mgmt-virt-${i}`} r="3" fill={C.teal}>
                  <animateMotion dur="2.5s" repeatCount="indefinite" begin={`${i * 1.25}s`} path={pathD} />
                  <animate attributeName="opacity" values="0;1;1;0" dur="2.5s" repeatCount="indefinite" begin={`${i * 1.25}s`} />
                </circle>
              ))}
            </g>
          );
        })()}

        <text x="320" y="548" fill={C.teal} fontSize="9"
          fontFamily="'Share Tech Mono', monospace" textAnchor="middle" opacity="0.9">
          同步设备状态 + 算法模型状态
        </text>

        {/* ════════════════════════════════════════════════ */}
        {/* CAMERA LAYER                                   */}
        {/* ════════════════════════════════════════════════ */}
        {cameraStates.map((cam, i) => {
          const pos = getCameraPosition(i);
          return (
            <CameraIcon
              key={cam.id}
              x={pos.x} y={pos.y}
              status={cam.status}
              id={cam.id}
              label={CAM_SHORT_LABELS[cam.id] || ''}
              name={cam.name}
              selected={selectedCameraId === cam.id}
              onClick={() => onCameraSelect(cam.id)}
            />
          );
        })}

        {/* ════════════════════════════════════════════════ */}
        {/* EDGE BOX LAYER                                 */}
        {/* ════════════════════════════════════════════════ */}
        {edgeBoxes.map((box, i) => (
          <EdgeBoxNode
            key={box.id}
            box={box}
            pos={getEdgeBoxPosition(i)}
            algorithmState={algorithmStates[box.algorithmModel]}
          />
        ))}

        {/* EDGE MANAGEMENT */}
        <SystemNode
          label="边缘管理后台"
          sublabel="Edge Management"
          pos={EDGE_MGMT_POS}
          state={edgeManagementState}
          color={{ border: C.blue, icon: C.blue }}
          type="edge"
        />

        {/* DCS */}
        <SystemNode
          label="DCS 工控系统"
          sublabel="DCS Control System"
          pos={DCS_POS}
          state={dcsState}
          color={{ border: C.amber, icon: C.amber }}
          type="dcs"
        />

        {/* VIRTUAL PLATFORM */}
        <SystemNode
          label="虚拟产线平台"
          sublabel="Virtual Line Platform"
          pos={VIRTUAL_POS}
          state={virtualState}
          color={{ border: C.teal, icon: C.teal }}
          type="virtual"
        />
      </svg>
    </div>
  );
}
