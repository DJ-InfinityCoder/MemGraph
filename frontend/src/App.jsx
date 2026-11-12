import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Network,
  BarChart3,
  Key,
  RefreshCw,
  Trash2,
  Send,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Eye,
  EyeOff,
  ExternalLink,
  Layers,
  Zap,
  Sparkles,
  Info,
  Terminal,
  Cpu,
  ArrowRight,
  Database,
  History
} from "lucide-react";
import { Button } from "./components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Badge } from "./components/ui/badge";
import { TabsList, TabsTrigger } from "./components/ui/tabs";
import { cn } from "./lib/utils";

const api = (path, body) =>
  fetch("/api" + path, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (r) => {
    const j = await r.json();
    if (!r.ok) throw new Error(j.detail || "Request failed");
    return j;
  });

/* -------------------------------------------------------------------------- */
/* Settings & Model Header                                                    */
/* -------------------------------------------------------------------------- */
function Settings({ cfg, setCfg }) {
  const [defs, setDefs] = useState({ providers: ["mock", "gemini", "openai", "anthropic"], defaults: {} });
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    api("/providers")
      .then(setDefs)
      .catch(() => {});
  }, []);

  const set = (k) => (e) => setCfg({ ...cfg, [k]: e.target.value });

  return (
    <Card className="border-zinc-800 bg-zinc-950/80 mb-6 backdrop-blur-md">
      <CardContent className="p-4 md:p-5">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Provider Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-zinc-300" /> Provider:
              </span>
              <select
                className="h-9 px-3 rounded-lg border border-zinc-800 bg-zinc-900 text-white text-xs md:text-sm font-medium focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer"
                value={cfg.provider}
                onChange={(e) =>
                  setCfg({
                    ...cfg,
                    provider: e.target.value,
                    model: defs.defaults[e.target.value] || "",
                  })
                }
              >
                {defs.providers.map((p) => (
                  <option key={p} value={p}>
                    {p.toUpperCase()} {p === "mock" ? "(Offline / Zero-Config)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Model Name */}
            <div className="flex items-center gap-2 flex-1 md:flex-initial">
              <Input
                placeholder={`Model (default: ${defs.defaults[cfg.provider] || "mock"})`}
                value={cfg.model || ""}
                onChange={set("model")}
                className="w-full md:w-48 text-xs font-mono"
              />
            </div>

            {/* API Key */}
            {cfg.provider !== "mock" && (
              <div className="relative flex items-center w-full md:w-64">
                <Input
                  type={showKey ? "text" : "password"}
                  placeholder="API key (or set in .env)"
                  value={cfg.api_key || ""}
                  onChange={set("api_key")}
                  className="pr-9 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2.5 text-zinc-400 hover:text-white transition-colors"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>

          {/* Current Engine Badge */}
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-mono text-zinc-400">
              Active: <span className="text-white font-semibold">{cfg.provider}</span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Chat & Memory Interface                                                    */
/* -------------------------------------------------------------------------- */
function Chat({ cfg, onUpdate }) {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [memory, setMemory] = useState("graph");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [msgs]);

  const send = async (overrideText) => {
    const promptToSend = overrideText || text;
    if (!promptToSend.trim() || loading) return;

    setText("");
    setErr("");
    setLoading(true);

    const userMsg = { role: "you", text: promptToSend, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMsgs((x) => [...x, userMsg]);

    try {
      const r = await api("/chat", { ...cfg, message: promptToSend, memory });
      setMsgs((x) => [
        ...x,
        {
          role: "ai",
          text: r.reply,
          retrieved: r.retrieved,
          facts: r.facts,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      onUpdate();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      await api("/reset", {});
      setMsgs([]);
      onUpdate();
    } catch (e) {
      setErr(e.message);
    }
  };

  const promptStarters = [
    { label: "Step 1: Declare fact", query: "I live in Pune." },
    { label: "Step 2: Update fact", query: "I moved to Delhi." },
    { label: "Step 3: Test query", query: "Where do I live?" },
    { label: "Step 4: New attribute", query: "My primary language is TypeScript." },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Main Chat Column */}
      <div className="lg:col-span-3 flex flex-col gap-4">
        <Card className="border-zinc-800 bg-zinc-950/70">
          {/* Chat Controls Bar */}
          <div className="flex flex-wrap items-center justify-between p-4 border-b border-zinc-800/80 gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">Memory Mode:</span>
              <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900/90 p-1">
                <button
                  onClick={() => setMemory("graph")}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5",
                    memory === "graph"
                      ? "bg-white text-black shadow-sm font-semibold"
                      : "text-zinc-400 hover:text-white"
                  )}
                >
                  <Network className="w-3.5 h-3.5" />
                  Graph (Consolidation)
                </button>
                <button
                  onClick={() => setMemory("flat")}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5",
                    memory === "flat"
                      ? "bg-white text-black shadow-sm font-semibold"
                      : "text-zinc-400 hover:text-white"
                  )}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Flat (Baseline)
                </button>
              </div>
            </div>

            <Button
              variant="destructive"
              size="sm"
              onClick={handleReset}
              className="text-xs text-zinc-400 hover:text-white"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Reset Memory
            </Button>
          </div>

          {/* Messages Stream */}
          <div className="p-4 md:p-6 min-h-[380px] max-h-[500px] overflow-y-auto space-y-4">
            {msgs.length === 0 ? (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-6 border border-dashed border-zinc-850 rounded-xl bg-zinc-900/20">
                <div className="w-12 h-12 rounded-full border border-zinc-800 bg-zinc-950 flex items-center justify-center mb-3 text-zinc-300">
                  <Database className="w-6 h-6" />
                </div>
                <h4 className="text-base font-semibold text-white mb-1">Knowledge Memory Ready</h4>
                <p className="text-xs text-zinc-400 max-w-sm mb-5 leading-relaxed">
                  Send statements to populate memory. Graph memory consolidates conflicting facts and supersedes stale history.
                </p>

                <div className="w-full max-w-md grid grid-cols-2 gap-2 text-left">
                  {promptStarters.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => send(p.query)}
                      className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-950/80 hover:bg-zinc-900 hover:border-zinc-700 transition-all text-left group"
                    >
                      <span className="text-[10px] font-mono text-zinc-500 block uppercase mb-1">
                        {p.label}
                      </span>
                      <span className="text-xs text-zinc-200 group-hover:text-white font-medium flex items-center justify-between">
                        "{p.query}"
                        <ArrowRight className="w-3 h-3 text-zinc-500 group-hover:text-white transition-colors" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              msgs.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex flex-col space-y-1.5",
                    m.role === "you" ? "items-end" : "items-start"
                  )}
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500 px-1">
                    <span>{m.role === "you" ? "USER" : "AGENT"}</span>
                    <span>•</span>
                    <span>{m.timestamp}</span>
                  </div>

                  <div
                    className={cn(
                      "rounded-xl px-4 py-2.5 text-sm max-w-[85%] md:max-w-[75%]",
                      m.role === "you"
                        ? "bg-white text-black font-normal selection:bg-zinc-300"
                        : "bg-zinc-900 border border-zinc-800 text-zinc-100 selection:bg-zinc-700"
                    )}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>

                    {/* Retrieved facts drawer if present */}
                    {m.retrieved && m.retrieved.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-zinc-800 text-xs">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1.5 flex items-center gap-1">
                          <History className="w-3 h-3" /> Retrieved Context ({memory}):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {m.retrieved.map((fact, fi) => (
                            <Badge
                              key={fi}
                              variant={memory === "graph" ? "active" : "secondary"}
                              className="text-[11px] font-mono bg-zinc-950 border-zinc-800 text-zinc-300"
                            >
                              {fact}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Error Message */}
          {err && (
            <div className="mx-4 mb-2 p-3 rounded-lg border border-red-900/50 bg-red-950/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{err}</span>
            </div>
          )}

          {/* Input Box */}
          <div className="p-4 border-t border-zinc-800 flex items-center gap-2 bg-zinc-950/50">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder='Type a fact or query (e.g. "I moved to Delhi.", "Where do I live?")...'
              className="flex-1 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 h-10"
              disabled={loading}
            />
            <Button
              onClick={() => send()}
              disabled={loading || !text.trim()}
              className="h-10 px-4 bg-white text-black hover:bg-zinc-200"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4 mr-1.5" />
                  Send
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>

      {/* Side Quick Guide Column */}
      <div className="lg:col-span-1 space-y-4">
        <Card className="border-zinc-800 bg-zinc-950/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Info className="w-4 h-4 text-zinc-300" />
              Experiment Protocol
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-zinc-400 leading-relaxed">
            <div>
              <span className="font-semibold text-white block mb-0.5">1. Stale Fact Test</span>
              Tell the agent <code className="text-white bg-zinc-900 px-1 py-0.5 rounded">I live in Pune.</code>, then update with <code className="text-white bg-zinc-900 px-1 py-0.5 rounded">I moved to Delhi.</code>
            </div>
            <div>
              <span className="font-semibold text-white block mb-0.5">2. Query</span>
              Ask <code className="text-white bg-zinc-900 px-1 py-0.5 rounded">Where do I live?</code>
            </div>
            <div>
              <span className="font-semibold text-white block mb-0.5">3. Compare Engines</span>
              In <b>Flat</b> mode, both Pune & Delhi leak into the context window. In <b>Graph</b> mode, Pune is superseded and only Delhi is retrieved.
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-950/60 p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Knowledge Graph Edges</span>
            <span className="font-mono text-white">Live Sync</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Live Knowledge Graph Visualizer                                            */
/* -------------------------------------------------------------------------- */
function Graph({ tick }) {
  const [g, setG] = useState({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(false);

  const fetchGraph = () => {
    setLoading(true);
    api("/graph")
      .then(setG)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchGraph();
  }, [tick]);

  const n = g.nodes.length;
  const pos = {};

  // Center user, arrange entities in an orbit
  g.nodes.forEach((nd, i) => {
    if (nd.id === "user") {
      pos[nd.id] = [320, 180];
    } else {
      const angle = (2 * Math.PI * (i - 1)) / Math.max(n - 1, 1);
      pos[nd.id] = [
        320 + 170 * Math.cos(angle),
        180 + 110 * Math.sin(angle),
      ];
    }
  });

  const activeEdges = g.edges.filter((e) => e.active);
  const supersededEdges = g.edges.filter((e) => !e.active);

  return (
    <Card className="border-zinc-800 bg-zinc-950/80">
      <CardHeader className="border-b border-zinc-800/80 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Network className="w-5 h-5 text-white" />
              Consolidated Knowledge Graph
            </CardTitle>
            <CardDescription className="text-zinc-400 mt-1">
              Visualizes real-time entity resolution, relation edges, and superseded historical facts.
            </CardDescription>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-mono">
              <Badge variant="outline" className="border-zinc-850 bg-zinc-900 text-white">
                {g.nodes.length} Nodes
              </Badge>
              <Badge variant="outline" className="border-zinc-850 bg-zinc-900 text-white">
                {activeEdges.length} Active
              </Badge>
              <Badge variant="outline" className="border-zinc-850 bg-zinc-900 text-zinc-400">
                {supersededEdges.length} Superseded
              </Badge>
            </div>
            <Button variant="outline" size="sm" onClick={fetchGraph} disabled={loading}>
              <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {g.nodes.length === 0 ? (
          <div className="h-80 flex flex-col items-center justify-center text-center border border-dashed border-zinc-800 rounded-xl">
            <Network className="w-10 h-10 text-zinc-600 mb-3" />
            <p className="text-sm font-medium text-zinc-300">No entities in memory yet</p>
            <p className="text-xs text-zinc-500 mt-1">
              Go to the Chat tab and type statements like "I live in Pune." to construct the graph.
            </p>
          </div>
        ) : (
          <div className="w-full relative rounded-xl border border-zinc-850 bg-black/80 overflow-hidden">
            {/* Background Grid Pattern */}
            <div
              className="absolute inset-0 pointer-events-none opacity-20"
              style={{
                backgroundImage: "radial-gradient(#52525b 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            />

            <svg viewBox="0 0 640 360" className="w-full h-[400px]">
              <defs>
                <marker
                  id="arrow-active"
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#ffffff" />
                </marker>
                <marker
                  id="arrow-stale"
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#52525b" />
                </marker>
              </defs>

              {/* Render Edges */}
              {g.edges.map((e, i) => {
                if (!pos[e.source] || !pos[e.target]) return null;
                const [x1, y1] = pos[e.source];
                const [x2, y2] = pos[e.target];
                const midX = (x1 + x2) / 2;
                const midY = (y1 + y2) / 2;

                return (
                  <g key={i}>
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={e.active ? "#ffffff" : "#52525b"}
                      strokeWidth={e.active ? "1.8" : "1"}
                      strokeDasharray={e.active ? "" : "4 4"}
                      markerEnd={e.active ? "url(#arrow-active)" : "url(#arrow-stale)"}
                    />
                    {/* Edge Label Badge */}
                    <g transform={`translate(${midX}, ${midY})`}>
                      <rect
                        x="-30"
                        y="-10"
                        width="60"
                        height="18"
                        rx="4"
                        fill="#09090b"
                        stroke={e.active ? "#27272a" : "#18181b"}
                        strokeWidth="1"
                      />
                      <text
                        textAnchor="middle"
                        y="3"
                        fontSize="9"
                        fontFamily="monospace"
                        fill={e.active ? "#ffffff" : "#71717a"}
                        fontWeight={e.active ? "600" : "400"}
                      >
                        {e.label}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Render Nodes */}
              {g.nodes.map((nd) => {
                if (!pos[nd.id]) return null;
                const [cx, cy] = pos[nd.id];
                const isUser = nd.id === "user";

                return (
                  <g key={nd.id} transform={`translate(${cx}, ${cy})`}>
                    {/* Outer glow for user node */}
                    {isUser && (
                      <circle
                        r="16"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="1"
                        strokeDasharray="2 2"
                        opacity="0.4"
                      />
                    )}
                    <circle
                      r={isUser ? "10" : "8"}
                      fill={isUser ? "#ffffff" : "#18181b"}
                      stroke="#ffffff"
                      strokeWidth={isUser ? "2" : "1.5"}
                    />
                    <text
                      x="0"
                      y={isUser ? "24" : "20"}
                      textAnchor="middle"
                      fontSize="11"
                      fontFamily="system-ui, sans-serif"
                      fontWeight={isUser ? "700" : "500"}
                      fill="#ffffff"
                    >
                      {nd.id}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Canvas Legend */}
            <div className="p-3 border-t border-zinc-800 bg-zinc-950/90 flex flex-wrap items-center justify-between text-xs text-zinc-400 gap-4">
              <div className="flex items-center gap-5">
                <span className="flex items-center gap-2">
                  <span className="w-5 h-0.5 bg-white inline-block"></span>
                  <span className="text-white font-medium">Active consolidated relation</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-5 h-0.5 border-t border-dashed border-zinc-500 inline-block"></span>
                  <span className="text-zinc-400">Superseded (historical audit trail)</span>
                </span>
              </div>
              <span className="font-mono text-[11px] text-zinc-500">
                Consolidation algorithm: Recency-weighted triple matching
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Benchmark & Evaluation Suite                                               */
/* -------------------------------------------------------------------------- */
function Evaluate({ cfg }) {
  const [res, setRes] = useState(null);
  const [users, setUsers] = useState(30);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const run = async () => {
    setBusy(true);
    setErr("");
    try {
      const data = await api("/eval", { ...cfg, users });
      setRes(data);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-zinc-800 bg-zinc-950/80">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-white" />
                Benchmark Suite: Long-Horizon Persona Evaluation
              </CardTitle>
              <CardDescription className="text-zinc-400 mt-1">
                Simulates user sessions over time where facts evolve. Evaluates current fact accuracy vs stale fact leakage.
              </CardDescription>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-zinc-400">Users:</span>
                <Input
                  type="number"
                  min="5"
                  max="100"
                  value={users}
                  onChange={(e) => setUsers(Math.max(1, +e.target.value))}
                  className="w-20 text-center font-mono h-9"
                  disabled={busy}
                />
              </div>
              <Button
                onClick={run}
                disabled={busy}
                className="bg-white text-black hover:bg-zinc-200 font-semibold"
              >
                {busy ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Running Simulation…
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Run Benchmark
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        {err && (
          <div className="mx-6 mb-4 p-3 rounded-lg border border-red-900/50 bg-red-950/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{err}</span>
          </div>
        )}

        <CardContent>
          {res ? (
            <div className="space-y-6">
              {/* Metric Hero Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Accuracy */}
                <Card className="border-zinc-800 bg-zinc-900/40 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono uppercase text-zinc-400">Accuracy (↑)</span>
                    <ShieldCheck className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-2xl font-bold text-white font-mono">
                        {(res.graph.accuracy * 100).toFixed(1)}%
                      </span>
                      <span className="text-xs text-zinc-400 block mt-0.5">Graph Memory</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-mono text-zinc-500">
                        {(res.flat.accuracy * 100).toFixed(1)}%
                      </span>
                      <span className="text-xs text-zinc-500 block mt-0.5">Flat Baseline</span>
                    </div>
                  </div>
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div
                      className="bg-white h-full rounded-full transition-all duration-500"
                      style={{ width: `${res.graph.accuracy * 100}%` }}
                    />
                  </div>
                </Card>

                {/* Stale Rate */}
                <Card className="border-zinc-800 bg-zinc-900/40 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono uppercase text-zinc-400">Stale Leakage (↓)</span>
                    <AlertCircle className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-2xl font-bold text-white font-mono">
                        {(res.graph.stale_rate * 100).toFixed(1)}%
                      </span>
                      <span className="text-xs text-zinc-400 block mt-0.5">Graph Memory</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-mono text-zinc-500">
                        {(res.flat.stale_rate * 100).toFixed(1)}%
                      </span>
                      <span className="text-xs text-zinc-500 block mt-0.5">Flat Baseline</span>
                    </div>
                  </div>
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div
                      className="bg-zinc-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${res.flat.stale_rate * 100}%` }}
                    />
                  </div>
                </Card>

                {/* Context Overhead */}
                <Card className="border-zinc-800 bg-zinc-900/40 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono uppercase text-zinc-400">Avg Context Size</span>
                    <Layers className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-2xl font-bold text-white font-mono">
                        {res.graph.avg_context_words}
                      </span>
                      <span className="text-xs text-zinc-400 block mt-0.5">Words (Graph)</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-mono text-zinc-500">
                        {res.flat.avg_context_words}
                      </span>
                      <span className="text-xs text-zinc-500 block mt-0.5">Words (Flat)</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-3 font-mono">
                    Efficiency gain: {((1 - res.graph.avg_context_words / res.flat.avg_context_words) * 100).toFixed(0)}% fewer tokens
                  </div>
                </Card>
              </div>

              {/* Data Table */}
              <div className="rounded-xl border border-zinc-800 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-900/80 text-xs font-mono uppercase text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Memory Architecture</th>
                      <th className="py-3 px-4 font-semibold">Accuracy (Current Fact)</th>
                      <th className="py-3 px-4 font-semibold">Stale Rate (Leaked)</th>
                      <th className="py-3 px-4 font-semibold">Avg Context Words</th>
                      <th className="py-3 px-4 font-semibold">Consolidation Engine</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80 font-mono text-xs">
                    <tr className="bg-zinc-950/60 hover:bg-zinc-900/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-white flex items-center gap-2">
                        <Network className="w-4 h-4 text-white" />
                        Graph Memory
                      </td>
                      <td className="py-3 px-4 text-white font-bold">
                        {(res.graph.accuracy * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-zinc-400">
                        {(res.graph.stale_rate * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-zinc-300">
                        {res.graph.avg_context_words}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="default" className="text-[10px]">
                          Active (Enabled)
                        </Badge>
                      </td>
                    </tr>
                    <tr className="bg-zinc-950/30 hover:bg-zinc-900/40 transition-colors text-zinc-400">
                      <td className="py-3 px-4 font-medium flex items-center gap-2">
                        <Layers className="w-4 h-4 text-zinc-500" />
                        Flat Memory (Baseline)
                      </td>
                      <td className="py-3 px-4">
                        {(res.flat.accuracy * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-zinc-300">
                        {(res.flat.stale_rate * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-4">
                        {res.flat.avg_context_words}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-[10px] text-zinc-500 border-zinc-800">
                          None (Recency only)
                        </Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Research Footnote */}
              <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/20 text-xs text-zinc-400 leading-relaxed">
                <span className="font-semibold text-white block mb-1">Empirical Summary:</span>
                Knowledge-graph memory with entity resolution and relation supersession eliminates outdated facts from prompt contexts, guaranteeing that subsequent contradictory assertions (e.g. city relocations, job changes, preference shifts) consistently overwrite previous entries rather than polluting retrieval results.
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center border border-dashed border-zinc-800 rounded-xl">
              <BarChart3 className="w-10 h-10 text-zinc-600 mb-3" />
              <p className="text-sm font-medium text-zinc-300">No benchmark run in this session</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                Click "Run Benchmark" above to run the synthetic multi-session persona evaluation across {users} simulated users.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Root Application Component                                                 */
/* -------------------------------------------------------------------------- */
export default function App() {
  const [tab, setTab] = useState("chat");
  const [tick, setTick] = useState(0);
  const [cfg, setCfg] = useState({ provider: "mock" });

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black font-sans pb-16">
      {/* Top Navbar */}
      <header className="border-b border-zinc-800/80 bg-black/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-black font-mono font-black text-sm shadow-sm">
              MG
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base md:text-lg tracking-tight text-white font-mono">
                  MemGraph
                </span>
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-zinc-800 text-zinc-400 font-mono">
                  v0.2.0
                </Badge>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                Graph vs Flat Agentic Memory for Long-Term Personalization
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://github.com/DJ-InfinityCoder/MemGraph"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors border border-zinc-800 rounded-lg px-3 py-1.5 bg-zinc-950"
            >
              <span>GitHub</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 md:px-6 pt-6">
        {/* Model Configuration Bar */}
        <Settings cfg={cfg} setCfg={setCfg} />

        {/* Navigation Tabs */}
        <div className="mb-6">
          <TabsList className="bg-zinc-950 border border-zinc-850 p-1">
            <TabsTrigger
              active={tab === "chat"}
              onClick={() => setTab("chat")}
              className="flex items-center gap-2"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Chat & Memory
            </TabsTrigger>
            <TabsTrigger
              active={tab === "graph"}
              onClick={() => setTab("graph")}
              className="flex items-center gap-2"
            >
              <Network className="w-3.5 h-3.5" />
              Live Knowledge Graph
            </TabsTrigger>
            <TabsTrigger
              active={tab === "evaluate"}
              onClick={() => setTab("evaluate")}
              className="flex items-center gap-2"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Benchmark Suite
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Views */}
        {tab === "chat" && <Chat cfg={cfg} onUpdate={() => setTick((t) => t + 1)} />}
        {tab === "graph" && <Graph tick={tick} />}
        {tab === "evaluate" && <Evaluate cfg={cfg} />}
      </main>
    </div>
  );
}
