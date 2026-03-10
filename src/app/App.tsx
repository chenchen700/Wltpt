import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import "../styles/industrial.css";
import { StatusBar } from "./components/StatusBar";
import { TopologyMap } from "./components/TopologyMap";
import type {
  TopoNodeState,
  EdgeBoxState,
  CameraNodeState,
} from "./components/TopologyMap";
import { AlertPanel } from "./components/AlertPanel";
import type {
  AlertItem,
  AlertLevel,
} from "./components/AlertPanel";

// ─── Initial data ──────────────────────────────────────────────────────────────

const ALGORITHM_MODELS = [
  "Model-A",
  "Model-B",
  "Model-C",
  "Model-D",
  "Model-E",
  "Model-F",
];

// 9 camera zones with specific detection purposes
const CAMERA_ZONES = [
  {
    id: "Z1",
    label: "矩形振筛堵塞检测",
    count: 1,
    startIdx: 1,
  },
  { id: "Z2", label: "水针挂浆检测", count: 2, startIdx: 2 },
  {
    id: "Z3",
    label: "扬克缸剥离点检测",
    count: 1,
    startIdx: 4,
  },
  {
    id: "Z4",
    label: "进出施胶机褶皱检测",
    count: 4,
    startIdx: 5,
  },
  {
    id: "Z5",
    label: "完成段喂料机料位检测(3D)",
    count: 1,
    startIdx: 9,
  },
  {
    id: "Z6",
    label: "贮柜进料堵料检测",
    count: 3,
    startIdx: 10,
  },
  { id: "Z7", label: "贮柜料位检测", count: 4, startIdx: 13 },
  {
    id: "Z8",
    label: "贮柜出料堵料检测",
    count: 2,
    startIdx: 17,
  },
  {
    id: "Z9",
    label: "分切机出口连片白片检测",
    count: 1,
    startIdx: 19,
  },
];

function buildCameras(): CameraNodeState[] {
  const list: CameraNodeState[] = [];
  for (const zone of CAMERA_ZONES) {
    for (let i = 0; i < zone.count; i++) {
      const num = zone.startIdx + i;
      // Distribute cameras across 6 edge boxes
      const edgeBoxId = `EDGE${String(((num - 1) % 6) + 1).padStart(2, "0")}`;
      list.push({
        id: `CAM${String(num).padStart(2, "0")}`,
        name:
          zone.count > 1
            ? `${zone.label} #${i + 1}`
            : zone.label,
        zone: zone.id as any,
        zoneLabel: zone.label,
        status: "online",
        fps: 30,
        resolution: "1920×1080",
        edgeBoxId,
      });
    }
  }
  return list;
}

function buildEdgeBoxes(): EdgeBoxState[] {
  return ALGORITHM_MODELS.map((model, i) => ({
    id: `EDGE${String(i + 1).padStart(2, "0")}`,
    name: `边缘盒子 ${String(i + 1).padStart(2, "0")}`,
    algorithmModel: model,
    status: "normal",
    heartbeatMs: 8 + i,
    packetLoss: 0,
    uptime: "99.98%",
  }));
}

function buildSystemStates(): {
  edgeManagement: TopoNodeState;
  dcs: TopoNodeState;
  virtual: TopoNodeState;
} {
  return {
    edgeManagement: {
      status: "normal",
      heartbeatMs: 10,
      packetLoss: 0,
      uptime: "99.98%",
    },
    dcs: {
      status: "normal",
      heartbeatMs: 5,
      packetLoss: 0,
      uptime: "100%",
    },
    virtual: {
      status: "normal",
      heartbeatMs: 18,
      packetLoss: 0,
      uptime: "99.9%",
    },
  };
}

function buildAlgorithmStates(): Record<string, TopoNodeState> {
  const states: Record<string, TopoNodeState> = {};
  ALGORITHM_MODELS.forEach((model, i) => {
    states[model] = {
      status: "normal",
      heartbeatMs: 12 + i * 2,
      packetLoss: 0,
      uptime: "99.95%",
    };
  });
  return states;
}

let alertIdCounter = 0;
function makeAlertId() {
  return `alert-${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${++alertIdCounter}`;
}

const INITIAL_ALERTS: AlertItem[] = [
  {
    id: "initial-alert-1",
    level: "MEDIUM",
    time: "08:14:22",
    source: "CAM07 / 仓储B区",
    message: "图像帧率下降至 18fps,低于告警阈值 25fps",
    count: 1,
  },
  {
    id: "initial-alert-2",
    level: "LOW",
    time: "08:11:05",
    source: "Model-C 算法模型",
    message: "模型推理队列积压 >200帧，建议扩容算力",
    count: 3,
  },
  {
    id: "initial-alert-3",
    level: "INFO",
    time: "08:09:47",
    source: "边缘管理后台",
    message: "节点 CAM14 重新上线，心跳恢复正常",
    count: 1,
  },
];

// ─── Simulation helpers ─────────────────────────────────────────────────────────

const EDGE_BOX_ALERT_MESSAGES = [
  "边缘盒子 CPU 超载，使用率 > 95%",
  "边缘存储缓冲区接近满载",
  "边缘网卡丢包率上升至 2.3%",
  "边缘盒子温度异常，请检查散热",
];

const ALGORITHM_ALERT_MESSAGES = [
  "AI推理延迟超过 500ms",
  "GPU显存占用异常飙升",
  "算法引擎内存泄漏检测",
  "模型加载失败，正在重试",
];

const EDGE_MGMT_ALERT_MESSAGES = [
  "边缘管理后台 CPU 使用率过高",
  "数据库连接池耗尽",
  "心跳监控服务响应超时",
];

const DCS_ALERT_MESSAGES = [
  "DCS 控制总线心跳超时",
  "PLC通信中断，等待重连",
  "DCS 输出寄存器写入失败",
];

const VIRTUAL_ALERT_MESSAGES = [
  "虚拟产线渲染帧率下降",
  "3D场景同步延迟 > 200ms",
  "数字孪生数据流中断",
];

const CAM_ALERT_MESSAGES = [
  "相机镜头污染，画质下降",
  "视频流连接超时，正在重试",
  "RTSP推流中断，等待重连",
  "相机温度过高，请检查散热",
  "图像帧率异常，可能存在网络抖动",
];

function randBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─── Main App ───────────────────────────────────────────────────────────────────

export default function App() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [edgeBoxes, setEdgeBoxes] =
    useState<EdgeBoxState[]>(buildEdgeBoxes());
  const [systemStates, setSystemStates] = useState(
    buildSystemStates(),
  );
  const [algorithmStates, setAlgorithmStates] = useState<
    Record<string, TopoNodeState>
  >(buildAlgorithmStates());
  const [cameras, setCameras] =
    useState<CameraNodeState[]>(buildCameras());
  const [selectedCameraId, setSelectedCameraId] =
    useState<string>("CAM01");
  const [alerts, setAlerts] =
    useState<AlertItem[]>(INITIAL_ALERTS);
  const [networkLoad, setNetworkLoad] = useState(62);

  const tickRef = useRef(0);

  // Clock
  useEffect(() => {
    const t = setInterval(
      () => setCurrentTime(new Date()),
      500,
    );
    return () => clearInterval(t);
  }, []);

  // Heartbeat simulation (1s interval)
  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current += 1;
      const tick = tickRef.current;

      // Update network load (gentle drift)
      setNetworkLoad((prev) => {
        const delta = (Math.random() - 0.48) * 4;
        return Math.max(45, Math.min(95, prev + delta));
      });

      // Update edge box states
      setEdgeBoxes((prev) => {
        return prev.map((box) => {
          const r = Math.random();
          let status = box.status;
          if (status === "normal") {
            if (r < 0.015) status = "warning";
          } else if (status === "warning") {
            if (r < 0.65) status = "normal";
            else if (r < 0.75) status = "error";
          } else if (status === "error") {
            if (r < 0.5) status = "warning";
            else if (r < 0.55) status = "lost";
          } else if (status === "lost") {
            if (r < 0.7) status = "error";
          }

          const baseMs = parseInt(box.id.slice(-2));
          const jitter =
            status === "normal"
              ? randBetween(-2, 4)
              : status === "warning"
                ? randBetween(20, 80)
                : status === "error"
                  ? randBetween(100, 400)
                  : 0;
          const heartbeatMs =
            status === "lost"
              ? 0
              : Math.max(1, baseMs + jitter);

          if (status !== "normal" && Math.random() < 0.25) {
            const msg =
              EDGE_BOX_ALERT_MESSAGES[
                randBetween(
                  0,
                  EDGE_BOX_ALERT_MESSAGES.length - 1,
                )
              ];
            const level: AlertLevel =
              status === "lost"
                ? "CRITICAL"
                : status === "error"
                  ? "HIGH"
                  : "MEDIUM";
            addAlert(level, box.name, msg);
          }

          return { ...box, status, heartbeatMs };
        });
      });

      // Update algorithm states
      setAlgorithmStates((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((model) => {
          const r = Math.random();
          let status = next[model].status;
          if (status === "normal") {
            if (r < 0.018) status = "warning";
          } else if (status === "warning") {
            if (r < 0.6) status = "normal";
            else if (r < 0.7) status = "error";
          } else if (status === "error") {
            if (r < 0.5) status = "warning";
            else if (r < 0.55) status = "lost";
          } else if (status === "lost") {
            if (r < 0.7) status = "error";
          }

          const baseMs =
            12 + Object.keys(next).indexOf(model) * 2;
          const jitter =
            status === "normal"
              ? randBetween(-3, 5)
              : status === "warning"
                ? randBetween(25, 90)
                : status === "error"
                  ? randBetween(120, 500)
                  : 0;
          const heartbeatMs =
            status === "lost"
              ? 0
              : Math.max(1, baseMs + jitter);

          if (status !== "normal" && Math.random() < 0.28) {
            const msg =
              ALGORITHM_ALERT_MESSAGES[
                randBetween(
                  0,
                  ALGORITHM_ALERT_MESSAGES.length - 1,
                )
              ];
            const level: AlertLevel =
              status === "lost"
                ? "CRITICAL"
                : status === "error"
                  ? "HIGH"
                  : "MEDIUM";
            addAlert(level, `${model} 算法模型`, msg);
          }

          next[model] = { ...next[model], status, heartbeatMs };
        });
        return next;
      });

      // Update system states
      setSystemStates((prev) => {
        const next = { ...prev };

        // Edge Management
        const mgmtR = Math.random();
        let mgmtStatus = next.edgeManagement.status;
        if (mgmtStatus === "normal") {
          if (mgmtR < 0.012) mgmtStatus = "warning";
        } else if (mgmtStatus === "warning") {
          if (mgmtR < 0.7) mgmtStatus = "normal";
          else if (mgmtR < 0.75) mgmtStatus = "error";
        } else if (mgmtStatus === "error") {
          if (mgmtR < 0.6) mgmtStatus = "warning";
        }

        const mgmtJitter =
          mgmtStatus === "normal"
            ? randBetween(-2, 3)
            : mgmtStatus === "warning"
              ? randBetween(15, 60)
              : randBetween(80, 300);
        const mgmtHeartbeat =
          mgmtStatus === "lost"
            ? 0
            : Math.max(1, 10 + mgmtJitter);

        if (mgmtStatus !== "normal" && Math.random() < 0.2) {
          const msg =
            EDGE_MGMT_ALERT_MESSAGES[
              randBetween(
                0,
                EDGE_MGMT_ALERT_MESSAGES.length - 1,
              )
            ];
          const level: AlertLevel =
            mgmtStatus === "error" ? "HIGH" : "MEDIUM";
          addAlert(level, "边缘管理后台", msg);
        }

        next.edgeManagement = {
          ...next.edgeManagement,
          status: mgmtStatus,
          heartbeatMs: mgmtHeartbeat,
        };

        // DCS
        const dcsR = Math.random();
        let dcsStatus = next.dcs.status;
        if (dcsStatus === "normal") {
          if (dcsR < 0.012) dcsStatus = "warning";
        } else if (dcsStatus === "warning") {
          if (dcsR < 0.7) dcsStatus = "normal";
          else if (dcsR < 0.75) dcsStatus = "error";
        } else if (dcsStatus === "error") {
          if (dcsR < 0.6) dcsStatus = "warning";
        }

        const dcsJitter =
          dcsStatus === "normal"
            ? randBetween(-1, 3)
            : dcsStatus === "warning"
              ? randBetween(15, 60)
              : randBetween(80, 300);
        const dcsHeartbeat =
          dcsStatus === "lost" ? 0 : Math.max(1, 5 + dcsJitter);

        if (dcsStatus !== "normal" && Math.random() < 0.2) {
          const msg =
            DCS_ALERT_MESSAGES[
              randBetween(0, DCS_ALERT_MESSAGES.length - 1)
            ];
          const level: AlertLevel =
            dcsStatus === "error" ? "HIGH" : "MEDIUM";
          addAlert(level, "DCS工控系统", msg);
        }

        next.dcs = {
          ...next.dcs,
          status: dcsStatus,
          heartbeatMs: dcsHeartbeat,
        };

        // Virtual Platform
        const virtR = Math.random();
        let virtStatus = next.virtual.status;
        if (virtStatus === "normal") {
          if (virtR < 0.015) virtStatus = "warning";
        } else if (virtStatus === "warning") {
          if (virtR < 0.68) virtStatus = "normal";
          else if (virtR < 0.73) virtStatus = "error";
        } else if (virtStatus === "error") {
          if (virtR < 0.55) virtStatus = "warning";
        }

        const virtJitter =
          virtStatus === "normal"
            ? randBetween(-4, 6)
            : virtStatus === "warning"
              ? randBetween(30, 100)
              : randBetween(150, 600);
        const virtHeartbeat =
          virtStatus === "lost"
            ? 0
            : Math.max(1, 18 + virtJitter);

        if (virtStatus !== "normal" && Math.random() < 0.22) {
          const msg =
            VIRTUAL_ALERT_MESSAGES[
              randBetween(0, VIRTUAL_ALERT_MESSAGES.length - 1)
            ];
          const level: AlertLevel =
            virtStatus === "error" ? "HIGH" : "MEDIUM";
          addAlert(level, "虚拟产线平台", msg);
        }

        next.virtual = {
          ...next.virtual,
          status: virtStatus,
          heartbeatMs: virtHeartbeat,
        };

        return next;
      });

      // Camera state simulation
      setCameras((prev) => {
        return prev.map((cam) => {
          const r = Math.random();
          let status = cam.status;
          if (status === "online") {
            if (r < 0.012) status = "warning";
            else if (r < 0.004) status = "offline";
          } else if (status === "warning") {
            if (r < 0.75) status = "online";
            else if (r < 0.8) status = "offline";
          } else if (status === "offline") {
            if (r < 0.65) status = "online";
          }

          if (status !== "online" && Math.random() < 0.12) {
            const msg =
              CAM_ALERT_MESSAGES[
                randBetween(0, CAM_ALERT_MESSAGES.length - 1)
              ];
            const level: AlertLevel =
              status === "offline" ? "HIGH" : "MEDIUM";
            addAlert(level, `${cam.id} / ${cam.zone}区`, msg);
          }

          return { ...cam, status };
        });
      });

      // Occasional INFO alerts
      if (tick % 20 === 0) {
        addAlert(
          "INFO",
          "系统管理",
          "心跳轮询周期完成，节点状态已刷新",
        );
      }
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addAlert = useCallback(
    (level: AlertLevel, source: string, message: string) => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString("zh-CN", {
        hour12: false,
      });
      setAlerts((prev) => {
        const existing = prev.find(
          (a) => a.source === source && a.message === message,
        );
        if (existing) {
          return prev.map((a) =>
            a.id === existing.id
              ? { ...a, count: a.count + 1, time: timeStr }
              : a,
          );
        }
        const newAlert: AlertItem = {
          id: makeAlertId(),
          level,
          time: timeStr,
          source,
          message,
          count: 1,
        };
        return [newAlert, ...prev].slice(0, 80);
      });
    },
    [],
  );

  const clearAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const onlineEdgeBoxes = edgeBoxes.filter(
    (e) => e.status === "normal",
  ).length;
  const onlineAlgorithms = Object.values(
    algorithmStates,
  ).filter((a) => a.status === "normal").length;
  const onlineSystemNodes =
    (systemStates.edgeManagement.status === "normal" ? 1 : 0) +
    (systemStates.dcs.status === "normal" ? 1 : 0) +
    (systemStates.virtual.status === "normal" ? 1 : 0);
  const onlineNodes = onlineEdgeBoxes + onlineSystemNodes;
  const totalNodes = 9; // 6 edge boxes + 3 system nodes
  const activeCameras = cameras.filter(
    (c) => c.status === "online",
  ).length;
  const alertCount = alerts.filter(
    (a) => a.level === "CRITICAL" || a.level === "HIGH",
  ).length;

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "#040c18",
        fontFamily: "'Rajdhani', sans-serif",
      }}
    >
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
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "row",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        {/* Network Topology - Full Width */}
        <div
          style={{ flex: 1, minWidth: 0, position: "relative" }}
        >
          {/* Panel title overlay */}
          <div
            style={{
              position: "absolute",
              top: 10,
              left: 16,
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(4,12,24,0.75)",
              padding: "5px 12px",
              borderRadius: 4,
              border: "1px solid #1a3a5c",
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#00e676",
                animation: "data-blink 2s infinite",
              }}
            />
            <span
              style={{
                color: "#00d4ff",
                fontSize: 11,
                letterSpacing: 2,
                fontWeight: 700,
              }}
            >
              全链路网络拓扑可视化
            </span>
            <span
              style={{
                color: "#4a7fa5",
                fontSize: 9,
                fontFamily: "'Share Tech Mono', monospace",
              }}
            >
              FULL-LINK NETWORK TOPOLOGY
            </span>
          </div>

          {/* Status cards overlay (top right) */}
          <div
            style={{
              position: "absolute",
              top: 10,
              right: 16,
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "3px 8px",
                background: "rgba(4,12,24,0.8)",
                border: `1px solid #1a3a5c`,
                borderRadius: 3,
                minWidth: 180,
              }}
            >
              <span style={{ color: "#2d7dd2", fontSize: 10 }}>
                ▣
              </span>
              <span
                style={{
                  color: "#7b9bc0",
                  fontSize: 9,
                  flex: 1,
                  fontFamily: "'Rajdhani', sans-serif",
                }}
              >
                边缘盒子
              </span>
              <span
                style={{
                  color: "#00e676",
                  fontSize: 8.5,
                  fontFamily: "'Share Tech Mono', monospace",
                }}
              >
                {onlineEdgeBoxes}/{edgeBoxes.length} 在线
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "3px 8px",
                background: "rgba(4,12,24,0.8)",
                border: `1px solid #1a3a5c`,
                borderRadius: 3,
                minWidth: 180,
              }}
            >
              <span style={{ color: "#a78bfa", fontSize: 10 }}>
                ◈
              </span>
              <span
                style={{
                  color: "#7b9bc0",
                  fontSize: 9,
                  flex: 1,
                  fontFamily: "'Rajdhani', sans-serif",
                }}
              >
                算法模型
              </span>
              <span
                style={{
                  color: "#00e676",
                  fontSize: 8.5,
                  fontFamily: "'Share Tech Mono', monospace",
                }}
              >
                {onlineAlgorithms}/
                {Object.keys(algorithmStates).length} 正常
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "3px 8px",
                background: "rgba(4,12,24,0.8)",
                border: `1px solid ${systemStates.edgeManagement.status !== "normal" ? STATUS_COLOR[systemStates.edgeManagement.status] + "55" : "#1a3a5c"}`,
                borderRadius: 3,
                minWidth: 180,
              }}
            >
              <span style={{ color: "#2d7dd2", fontSize: 10 }}>
                ⊙
              </span>
              <span
                style={{
                  color: "#7b9bc0",
                  fontSize: 9,
                  flex: 1,
                  fontFamily: "'Rajdhani', sans-serif",
                }}
              >
                边缘管理后台
              </span>
              <span
                style={{
                  color:
                    STATUS_COLOR[
                      systemStates.edgeManagement.status
                    ],
                  fontSize: 8.5,
                  fontFamily: "'Share Tech Mono', monospace",
                  animation:
                    systemStates.edgeManagement.status !==
                    "normal"
                      ? "data-blink 1s infinite"
                      : undefined,
                }}
              >
                {systemStates.edgeManagement.status === "normal"
                  ? "正常"
                  : "异常"}
              </span>
            </div>
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

const STATUS_COLOR: Record<
  "normal" | "warning" | "error" | "lost",
  string
> = {
  normal: "#00e676",
  warning: "#ffca28",
  error: "#ff1744",
  lost: "#ff6d00",
};