import React, { useCallback, useEffect, useRef, useState } from 'react';
import '../styles/industrial.css';
import { StatusBar } from './components/StatusBar';
import { TopologyMap } from './components/TopologyMap';
import type { TopoNodeState, EdgeBoxState, CameraNodeState } from './components/TopologyMap';
import { AlertPanel } from './components/AlertPanel';
import type { AlertItem, AlertLevel } from './components/AlertPanel';

// ─── Camera data (19 cameras with specific names) ──────────────────────────────

const CAMERA_LIST: Array<{ id: string; name: string; edgeBoxId: string }> = [
  { id: 'CAM01', name: 'CAM01_矩形振筛_堵塞检测',          edgeBoxId: 'EDGE01' },
  { id: 'CAM02', name: 'CAM02_水针_挂浆检测_01',           edgeBoxId: 'EDGE02' },
  { id: 'CAM03', name: 'CAM03_水针_挂浆检测_02',           edgeBoxId: 'EDGE03' },
  { id: 'CAM04', name: 'CAM04_扬克缸_剥离点检测',          edgeBoxId: 'EDGE04' },
  { id: 'CAM05', name: 'CAM05_进施胶机_褶皱检测_01',       edgeBoxId: 'EDGE05' },
  { id: 'CAM06', name: 'CAM06_进施胶机_褶皱检测_02',       edgeBoxId: 'EDGE06' },
  { id: 'CAM07', name: 'CAM07_出施胶机_褶皱检测_01',       edgeBoxId: 'EDGE01' },
  { id: 'CAM08', name: 'CAM08_出施胶机_褶皱检测_02',       edgeBoxId: 'EDGE02' },
  { id: 'CAM09', name: 'CAM09_完成段喂料机_3D料位检测',    edgeBoxId: 'EDGE03' },
  { id: 'CAM10', name: 'CAM10_贮柜进料_堵料检测_01',       edgeBoxId: 'EDGE04' },
  { id: 'CAM11', name: 'CAM11_贮柜进料_堵料检测_02',       edgeBoxId: 'EDGE05' },
  { id: 'CAM12', name: 'CAM12_贮柜进料_堵料检测_03',       edgeBoxId: 'EDGE06' },
  { id: 'CAM13', name: 'CAM13_贮柜_料位检测_01',           edgeBoxId: 'EDGE01' },
  { id: 'CAM14', name: 'CAM14_贮柜_料位检测_02',           edgeBoxId: 'EDGE02' },
  { id: 'CAM15', name: 'CAM15_贮柜_料位检测_03',           edgeBoxId: 'EDGE03' },
  { id: 'CAM16', name: 'CAM16_贮柜_料位检测_04',           edgeBoxId: 'EDGE04' },
  { id: 'CAM17', name: 'CAM17_贮柜出料_堵料检测_01',       edgeBoxId: 'EDGE05' },
  { id: 'CAM18', name: 'CAM18_贮柜出料_堵料检测_02',       edgeBoxId: 'EDGE06' },
  { id: 'CAM19', name: 'CAM19_分切机出口_连片白片检测',    edgeBoxId: 'EDGE01' },
];

const ALGORITHM_MODELS = ['Model-A', 'Model-B', 'Model-C', 'Model-D', 'Model-E', 'Model-F'];

function buildCameras(): CameraNodeState[] {
  return CAMERA_LIST.map(cam => ({
    id: cam.id,
    name: cam.name,
    zone: 'A' as const,
    zoneLabel: cam.name,
    status: 'online' as const,
    fps: 30,
    resolution: '1920×1080',
    edgeBoxId: cam.edgeBoxId,
  }));
}

function buildEdgeBoxes(): EdgeBoxState[] {
  return ALGORITHM_MODELS.map((model, i) => ({
    id: `EDGE${String(i + 1).padStart(2, '0')}`,
    name: `边缘算力服务器 ${String(i + 1).padStart(2, '0')}`,
    algorithmModel: model,
    status: 'normal' as const,
    heartbeatMs: 8 + i,
    packetLoss: 0,
    uptime: '99.98%',
  }));
}

function buildSystemStates(): {
  edgeManagement: TopoNodeState;
  dcs: TopoNodeState;
  virtual: TopoNodeState;
} {
  return {
    edgeManagement: { status: 'normal', heartbeatMs: 10, packetLoss: 0, uptime: '99.98%' },
    dcs:            { status: 'normal', heartbeatMs: 5,  packetLoss: 0, uptime: '100%'   },
    virtual:        { status: 'normal', heartbeatMs: 18, packetLoss: 0, uptime: '99.9%'  },
  };
}

function buildAlgorithmStates(): Record<string, TopoNodeState> {
  const states: Record<string, TopoNodeState> = {};
  ALGORITHM_MODELS.forEach((model, i) => {
    states[model] = {
      status: 'normal',
      heartbeatMs: 12 + i * 2,
      packetLoss: 0,
      uptime: '99.95%',
    };
  });
  return states;
}

let alertIdCounter = 100;
function makeAlertId() { return `alert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${++alertIdCounter}`; }

const INITIAL_ALERTS: AlertItem[] = [
  {
    id: 'init-alert-001', level: 'MEDIUM', time: '08:14:22',
    source: 'CAM07_出施胶机_褶皱检测_01',
    message: '图像帧率下降至 18fps，低于告警阈值 25fps', count: 1,
  },
  {
    id: 'init-alert-002', level: 'LOW', time: '08:11:05',
    source: 'Model-C 算法模型',
    message: '模型推理队列积压 >200帧，建议扩容算力', count: 3,
  },
  {
    id: 'init-alert-003', level: 'INFO', time: '08:09:47',
    source: '边缘管理后台',
    message: '节点 CAM14 重新上线，心跳恢复正常', count: 1,
  },
];

// ─── Alert message pools ────────────────────────────────────────────────────────

const EDGE_SERVER_ALERT_MESSAGES = [
  '边缘算力服务器 CPU 超载，使用率 > 95%',
  '边缘存储缓冲区接近满载',
  '边缘网卡丢包率上升至 2.3%',
  '边缘算力服务器温度异常，请检查散热',
];

const ALGORITHM_ALERT_MESSAGES = [
  'AI推理延迟超过 500ms',
  'GPU显存占用异常飙升',
  '算法引擎内存泄漏检测',
  '模型加载失败，正在重试',
];

const EDGE_MGMT_ALERT_MESSAGES = [
  '边缘管理后台 CPU 使用率过高',
  '数据库连接池耗尽',
  '心跳监控服务响应超时',
];

const DCS_ALERT_MESSAGES = [
  'DCS 控制总线心跳超时',
  'PLC通信中断，等待重连',
  'DCS 输出寄存器写入失败',
];

const VIRTUAL_ALERT_MESSAGES = [
  '虚拟产线渲染帧率下降',
  '3D场景同步延迟 > 200ms',
  '数字孪生数据流中断',
];

const CAM_ALERT_MESSAGES = [
  '相机镜头污染，画质下降',
  '视频流连接超时，正在重试',
  'RTSP推流中断，等待重连',
  '相机温度过高，请检查散热',
  '图像帧率异常，可能存在网络抖动',
];

function randBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const STATUS_COLOR: Record<'normal' | 'warning' | 'error' | 'lost', string> = {
  normal: '#00e676',
  warning: '#ffca28',
  error: '#ff1744',
  lost: '#ff6d00',
};

// ─── Main App ───────────────────────────────────────────────────────────────────

export default function App() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [edgeBoxes, setEdgeBoxes] = useState<EdgeBoxState[]>(buildEdgeBoxes());
  const [systemStates, setSystemStates] = useState(buildSystemStates());
  const [algorithmStates, setAlgorithmStates] = useState<Record<string, TopoNodeState>>(buildAlgorithmStates());
  const [cameras, setCameras] = useState<CameraNodeState[]>(buildCameras());
  const [selectedCameraId, setSelectedCameraId] = useState<string>('CAM01');
  const [alerts, setAlerts] = useState<AlertItem[]>(INITIAL_ALERTS);
  const [networkLoad, setNetworkLoad] = useState(57);

  const tickRef = useRef(0);

  // Clock
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 500);
    return () => clearInterval(t);
  }, []);

  // Heartbeat simulation (1s interval)
  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current += 1;
      const tick = tickRef.current;

      setNetworkLoad(prev => {
        const delta = (Math.random() - 0.48) * 4;
        return Math.max(45, Math.min(95, prev + delta));
      });

      // Edge server states
      setEdgeBoxes(prev => prev.map(box => {
        const r = Math.random();
        let status = box.status;
        if (status === 'normal') { if (r < 0.015) status = 'warning'; }
        else if (status === 'warning') { if (r < 0.65) status = 'normal'; else if (r < 0.75) status = 'error'; }
        else if (status === 'error') { if (r < 0.5) status = 'warning'; else if (r < 0.55) status = 'lost'; }
        else if (status === 'lost') { if (r < 0.7) status = 'error'; }

        const baseMs = parseInt(box.id.slice(-2));
        const jitter = status === 'normal' ? randBetween(-2, 4) : status === 'warning' ? randBetween(20, 80) : status === 'error' ? randBetween(100, 400) : 0;
        const heartbeatMs = status === 'lost' ? 0 : Math.max(1, baseMs + jitter);

        if (status !== 'normal' && Math.random() < 0.25) {
          const msg = EDGE_SERVER_ALERT_MESSAGES[randBetween(0, EDGE_SERVER_ALERT_MESSAGES.length - 1)];
          const level: AlertLevel = status === 'lost' ? 'CRITICAL' : status === 'error' ? 'HIGH' : 'MEDIUM';
          addAlert(level, box.name, msg);
        }
        return { ...box, status, heartbeatMs };
      }));

      // Algorithm states
      setAlgorithmStates(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(model => {
          const r = Math.random();
          let status = next[model].status;
          if (status === 'normal') { if (r < 0.018) status = 'warning'; }
          else if (status === 'warning') { if (r < 0.6) status = 'normal'; else if (r < 0.7) status = 'error'; }
          else if (status === 'error') { if (r < 0.5) status = 'warning'; else if (r < 0.55) status = 'lost'; }
          else if (status === 'lost') { if (r < 0.7) status = 'error'; }

          const baseMs = 12 + Object.keys(next).indexOf(model) * 2;
          const jitter = status === 'normal' ? randBetween(-3, 5) : status === 'warning' ? randBetween(25, 90) : status === 'error' ? randBetween(120, 500) : 0;
          const heartbeatMs = status === 'lost' ? 0 : Math.max(1, baseMs + jitter);

          if (status !== 'normal' && Math.random() < 0.28) {
            const msg = ALGORITHM_ALERT_MESSAGES[randBetween(0, ALGORITHM_ALERT_MESSAGES.length - 1)];
            const level: AlertLevel = status === 'lost' ? 'CRITICAL' : status === 'error' ? 'HIGH' : 'MEDIUM';
            addAlert(level, `${model} 算法模型`, msg);
          }
          next[model] = { ...next[model], status, heartbeatMs };
        });
        return next;
      });

      // System states
      setSystemStates(prev => {
        const next = { ...prev };

        // Edge Management
        const mgmtR = Math.random();
        let mgmtStatus = next.edgeManagement.status;
        if (mgmtStatus === 'normal') { if (mgmtR < 0.012) mgmtStatus = 'warning'; }
        else if (mgmtStatus === 'warning') { if (mgmtR < 0.7) mgmtStatus = 'normal'; else if (mgmtR < 0.75) mgmtStatus = 'error'; }
        else if (mgmtStatus === 'error') { if (mgmtR < 0.6) mgmtStatus = 'warning'; }
        const mgmtJitter = mgmtStatus === 'normal' ? randBetween(-2, 3) : mgmtStatus === 'warning' ? randBetween(15, 60) : randBetween(80, 300);
        const mgmtHeartbeat = mgmtStatus === 'lost' ? 0 : Math.max(1, 10 + mgmtJitter);
        if (mgmtStatus !== 'normal' && Math.random() < 0.2) {
          addAlert(mgmtStatus === 'error' ? 'HIGH' : 'MEDIUM', '边缘管理后台', EDGE_MGMT_ALERT_MESSAGES[randBetween(0, EDGE_MGMT_ALERT_MESSAGES.length - 1)]);
        }
        next.edgeManagement = { ...next.edgeManagement, status: mgmtStatus, heartbeatMs: mgmtHeartbeat };

        // DCS
        const dcsR = Math.random();
        let dcsStatus = next.dcs.status;
        if (dcsStatus === 'normal') { if (dcsR < 0.012) dcsStatus = 'warning'; }
        else if (dcsStatus === 'warning') { if (dcsR < 0.7) dcsStatus = 'normal'; else if (dcsR < 0.75) dcsStatus = 'error'; }
        else if (dcsStatus === 'error') { if (dcsR < 0.6) dcsStatus = 'warning'; }
        const dcsJitter = dcsStatus === 'normal' ? randBetween(-1, 3) : dcsStatus === 'warning' ? randBetween(15, 60) : randBetween(80, 300);
        const dcsHeartbeat = dcsStatus === 'lost' ? 0 : Math.max(1, 5 + dcsJitter);
        if (dcsStatus !== 'normal' && Math.random() < 0.2) {
          addAlert(dcsStatus === 'error' ? 'HIGH' : 'MEDIUM', 'DCS工控系统', DCS_ALERT_MESSAGES[randBetween(0, DCS_ALERT_MESSAGES.length - 1)]);
        }
        next.dcs = { ...next.dcs, status: dcsStatus, heartbeatMs: dcsHeartbeat };

        // Virtual Platform
        const virtR = Math.random();
        let virtStatus = next.virtual.status;
        if (virtStatus === 'normal') { if (virtR < 0.015) virtStatus = 'warning'; }
        else if (virtStatus === 'warning') { if (virtR < 0.68) virtStatus = 'normal'; else if (virtR < 0.73) virtStatus = 'error'; }
        else if (virtStatus === 'error') { if (virtR < 0.55) virtStatus = 'warning'; }
        const virtJitter = virtStatus === 'normal' ? randBetween(-4, 6) : virtStatus === 'warning' ? randBetween(30, 100) : randBetween(150, 600);
        const virtHeartbeat = virtStatus === 'lost' ? 0 : Math.max(1, 18 + virtJitter);
        if (virtStatus !== 'normal' && Math.random() < 0.22) {
          addAlert(virtStatus === 'error' ? 'HIGH' : 'MEDIUM', '虚拟产线平台', VIRTUAL_ALERT_MESSAGES[randBetween(0, VIRTUAL_ALERT_MESSAGES.length - 1)]);
        }
        next.virtual = { ...next.virtual, status: virtStatus, heartbeatMs: virtHeartbeat };

        return next;
      });

      // Camera states
      setCameras(prev => prev.map(cam => {
        const r = Math.random();
        let status = cam.status;
        if (status === 'online') { if (r < 0.012) status = 'warning'; else if (r < 0.004) status = 'offline'; }
        else if (status === 'warning') { if (r < 0.75) status = 'online'; else if (r < 0.8) status = 'offline'; }
        else if (status === 'offline') { if (r < 0.65) status = 'online'; }

        if (status !== 'online' && Math.random() < 0.12) {
          const msg = CAM_ALERT_MESSAGES[randBetween(0, CAM_ALERT_MESSAGES.length - 1)];
          addAlert(status === 'offline' ? 'HIGH' : 'MEDIUM', cam.id, msg);
        }
        return { ...cam, status };
      }));

      // Periodic INFO alert
      if (tick % 20 === 0) {
        addAlert('INFO', '系统管理', '心跳轮询周期完成，节点状态已刷新');
      }
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addAlert = useCallback((level: AlertLevel, source: string, message: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false });
    setAlerts(prev => {
      const existing = prev.find(a => a.source === source && a.message === message);
      if (existing) {
        return prev.map(a => a.id === existing.id ? { ...a, count: a.count + 1, time: timeStr } : a);
      }
      const newAlert: AlertItem = { id: makeAlertId(), level, time: timeStr, source, message, count: 1 };
      return [newAlert, ...prev].slice(0, 80);
    });
  }, []);

  const clearAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const onlineEdgeBoxes = edgeBoxes.filter(e => e.status === 'normal').length;
  const onlineAlgorithms = Object.values(algorithmStates).filter(a => a.status === 'normal').length;
  const onlineSystemNodes =
    (systemStates.edgeManagement.status === 'normal' ? 1 : 0) +
    (systemStates.dcs.status === 'normal' ? 1 : 0) +
    (systemStates.virtual.status === 'normal' ? 1 : 0);
  const onlineNodes = onlineEdgeBoxes + onlineSystemNodes;
  const totalNodes = 9;
  const activeCameras = cameras.filter(c => c.status === 'online').length;
  const alertCount = alerts.filter(a => a.level === 'CRITICAL' || a.level === 'HIGH').length;

  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      background: '#040c18',
      fontFamily: "'Rajdhani', sans-serif",
    }}>
      {/* Top Status Bar */}
      <StatusBar
        currentTime={currentTime}
        onlineNodes={onlineNodes}
        totalNodes={totalNodes}
        activeCameras={activeCameras}
        totalCameras={cameras.length}
        alertCount={alertCount}
        networkLoad={Math.round(networkLoad)}
      />

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden', minHeight: 0 }}>
        {/* Network Topology - Full Width */}
        <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
          {/* Panel title overlay (top left) */}
          <div style={{
            position: 'absolute', top: 10, left: 16, zIndex: 10,
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(4,12,24,0.75)', padding: '5px 12px',
            borderRadius: 4, border: '1px solid #1a3a5c',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00e676', animation: 'data-blink 2s infinite' }} />
            <span style={{ color: '#00d4ff', fontSize: 13, letterSpacing: 2, fontWeight: 700 }}>
              网络拓扑图
            </span>
            <span style={{ color: '#4a7fa5', fontSize: 9, fontFamily: "'Share Tech Mono', monospace" }}>
              INDUSTRIAL NETWORK TOPOLOGY MONITORING SYSTEM v2.4.1
            </span>
          </div>

          {/* Status legend overlay (top right) */}
          <div style={{
            position: 'absolute', top: 10, right: 16, zIndex: 10,
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            {/* Camera status */}
            <LegendCard
              icon="◎" iconColor="#00b4d8"
              label="工业相机"
              value={`${activeCameras}/${cameras.length} 在线`}
              valueColor={activeCameras === cameras.length ? '#00e676' : '#ffca28'}
            />
            {/* Edge server status */}
            <LegendCard
              icon="▣" iconColor="#2d7dd2"
              label="边缘算力服务器"
              value={`${onlineEdgeBoxes}/${edgeBoxes.length} 在线`}
              valueColor={onlineEdgeBoxes === edgeBoxes.length ? '#00e676' : '#ffca28'}
            />
            {/* Algorithm status */}
            <LegendCard
              icon="◈" iconColor="#a78bfa"
              label="算法模型"
              value={`${onlineAlgorithms}/${Object.keys(algorithmStates).length} 正常`}
              valueColor={onlineAlgorithms === Object.keys(algorithmStates).length ? '#00e676' : '#ffca28'}
            />
            {/* Edge management status */}
            <LegendCard
              icon="⊙" iconColor="#2d7dd2"
              label="边缘管理后台"
              value={systemStates.edgeManagement.status === 'normal' ? '正常' : '异常'}
              valueColor={STATUS_COLOR[systemStates.edgeManagement.status]}
              blink={systemStates.edgeManagement.status !== 'normal'}
              borderColor={systemStates.edgeManagement.status !== 'normal' ? STATUS_COLOR[systemStates.edgeManagement.status] + '55' : '#1a3a5c'}
            />
          </div>

          <TopologyMap
            edgeBoxes={edgeBoxes}
            edgeManagementState={systemStates.edgeManagement}
            dcsState={systemStates.dcs}
            virtualState={systemStates.virtual}
            algorithmStates={algorithmStates}
            cameraStates={cameras}
            selectedCameraId={selectedCameraId}
            onCameraSelect={setSelectedCameraId}
          />
        </div>
      </div>

      {/* Bottom: Alert Panel */}
      <AlertPanel alerts={alerts} onClear={clearAlert} />
    </div>
  );
}

// ─── Legend Card Component ───────────────────────────────────────────────────────

function LegendCard({
  icon, iconColor, label, value, valueColor, blink = false, borderColor = '#1a3a5c',
}: {
  icon: string; iconColor: string; label: string; value: string;
  valueColor: string; blink?: boolean; borderColor?: string;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7,
      padding: '3px 8px',
      background: 'rgba(4,12,24,0.8)',
      border: `1px solid ${borderColor}`,
      borderRadius: 3,
      minWidth: 200,
    }}>
      <span style={{ color: iconColor, fontSize: 10 }}>{icon}</span>
      <span style={{ color: '#7b9bc0', fontSize: 9, flex: 1, fontFamily: "'Rajdhani', sans-serif" }}>
        {label}
      </span>
      <span style={{
        color: valueColor, fontSize: 8.5,
        fontFamily: "'Share Tech Mono', monospace",
        animation: blink ? 'data-blink 1s infinite' : undefined,
      }}>
        {value}
      </span>
    </div>
  );
}
