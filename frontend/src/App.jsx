import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Network,
  BarChart3,
  RefreshCw,
  Trash2,
  Send,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Layers,
  Zap,
  Info,
  Terminal,
  Cpu,
  ArrowRight,
  Database,
  History,
  CheckCircle2
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
/* Chat & Memory Interface                                                    */
/* -------------------------------------------------------------------------- */
function Chat({ onUpdate }) {
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

    const userMsg = {
      role: "you",
      text: promptToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMsgs((x) => [...x, userMsg]);

    try {
      const r = await api("/chat", { message: promptToSend, memory });
      setMsgs((x) => [
        ...x,
        {
          role: "ai",
          text: r.reply,
          retrieved: r.retrieved,
          facts: r.facts,
          model: r.model || "not configured",
          extraction: r.extraction?.mode, generation: r.generation, memory,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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
    { label: "Step 4: Retract fact", query: "I no longer live in Delhi." },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Main Chat Column */}
      <div className="lg:col-span-3 flex flex-col gap-4">
        <Card className="border-zinc-800 bg-zinc-950/70">
          {/* Chat Controls Bar */}
          <div className="flex flex-wrap items-center justify-between p-4 border-b border-zinc-800/80 gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">Memory Engine:</span>
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
                  Lexical (Baseline)
                </button>
                <button onClick={() => setMemory("latest")} className={cn("px-3 py-1 text-xs rounded-md", memory === "latest" ? "bg-white text-black" : "text-zinc-400")}>
                  Latest Value
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
                <h4 className="text-base font-semibold text-white mb-1">Personal Memory Ready</h4>
                <p className="text-xs text-zinc-400 max-w-sm mb-5 leading-relaxed">
                  State a fact, correct it, or retract it. Offline preview works without an API key.
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
                    <span>{m.role === "you" ? "USER" : "ASSISTANT"}</span>
                    <span>â€¢</span>
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
                    {m.role === "ai" && <p className="text-[10px] text-zinc-500 mt-2">Extraction: {m.extraction} · Response: {m.generation} · Model: {m.model}</p>}

                    {/* Retrieved facts drawer if present */}
                    {m.retrieved && m.retrieved.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-zinc-800 text-xs">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1.5 flex items-center gap-1">
                          <History className="w-3 h-3" /> Retrieved Context ({m.memory}):
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
              placeholder='Try stating "I live in Pune", then "I moved to Delhi", then ask "Where do I live?"...'
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

      {/* Side Quick Protocol Column */}
      <div className="lg:col-span-1 space-y-4">
        <Card className="border-zinc-800 bg-zinc-950/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Info className="w-4 h-4 text-zinc-300" />
              Long-Horizon Personalization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-zinc-400 leading-relaxed">
            <div>
              <span className="font-semibold text-white block mb-0.5">Consolidation Engine</span>
              When the extractor identifies new assertions about an entity (e.g. city or company), the graph engine detects functional supersession and flags conflicting older edges as inactive.
            </div>
            <div>
              <span className="font-semibold text-white block mb-0.5">Handling Stale Facts</span>
              Flat lexical memory retrieves both past and present facts if lexical similarity is high. Graph memory retrieves active facts. A latest-value baseline tests whether graph history helps.
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-950/60 p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Memory storage</span>
            <span className="font-mono text-white">This browser session</span>
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

  const [err, setErr] = useState("");
  const forgetFact = async (edge) => {
    setLoading(true);
    setErr("");
    try {
      await api("/facts/forget", { relation: edge.label, value: edge.target });
      setG(await api("/graph"));
    } catch (error) { setErr(error.message); }
    finally { setLoading(false); }
  };
  const fetchGraph = () => {
    setLoading(true);
    api("/graph")
      .then(setG)
      .catch((error) => setErr(error.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchGraph();
  }, [tick]);

  const n = g.nodes.length;
  const pos = {};

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
              Inspect remembered facts, relation edges, and inactive historical facts.
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
        {err && <p role="alert" className="text-red-400 mb-3">{err}</p>}
        <p className="text-xs text-zinc-400 mb-3">Correct a fact in Chat, for example “I live in Delhi.” Forget removes source messages containing that fact. For city, employer, and favorites, it also clears the relation’s history so an old value cannot return. Other facts in those messages are removed.</p>
        <div className="space-y-2 mb-5">
          {g.edges.map((edge, index) => <div key={index} className="flex items-center justify-between text-sm border border-zinc-800 rounded p-2">
            <span>{edge.label.replaceAll("_", " ")}: {edge.target} <span className="text-zinc-500">({edge.active ? "current" : "inactive"})</span></span>
            <Button variant="outline" size="sm" disabled={loading} onClick={() => forgetFact(edge)}>Forget</Button>
          </div>)}
        </div>
        {g.edges.length === 0 ? (
          <div className="h-80 flex flex-col items-center justify-center text-center border border-dashed border-zinc-800 rounded-xl">
            <Network className="w-10 h-10 text-zinc-600 mb-3" />
            <p className="text-sm font-medium text-zinc-300">No entities in memory yet</p>
            <p className="text-xs text-zinc-500 mt-1">
              Go to the Chat tab and type statements like "I live in Pune." to construct the graph.
            </p>
          </div>
        ) : (
          <div className="w-full relative rounded-xl border border-zinc-850 bg-black/80 overflow-hidden">
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

              {/* Edges */}
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

              {/* Nodes */}
              {g.nodes.map((nd) => {
                if (!pos[nd.id]) return null;
                const [cx, cy] = pos[nd.id];
                const isUser = nd.id === "user";

                return (
                  <g key={nd.id} transform={`translate(${cx}, ${cy})`}>
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
                Personal facts from this browser session
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
function Evaluate() {
  const [res, setRes] = useState(null);
  const [users, setUsers] = useState(30);
  const [extraction, setExtraction] = useState("rules");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const names = { flat: "Lexical retrieval", latest: "Latest-value dictionary", graph: "Graph memory",
    graph_no_supersession: "Graph: no supersession", graph_no_recency: "Graph: no recency",
    graph_no_relation_matching: "Graph: no relation matching" };
  const run = async () => {
    setBusy(true); setErr(""); setRes(null);
    try { setRes(await api("/eval", { users, extraction })); }
    catch (error) { setErr(error.message); }
    finally { setBusy(false); }
  };
  return <Card className="border-zinc-800 bg-zinc-950/80">
    <CardHeader>
      <CardTitle>Personal-memory retrieval benchmark</CardTitle>
      <CardDescription>Templated synthetic conversations. These scores measure retrieved facts, not assistant answer quality.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm">Simulated users <Input aria-label="Simulated users" type="number" min="1" max="100" value={users} disabled={busy} onChange={e => setUsers(Math.min(100, Math.max(1, Number(e.target.value) || 1)))} className="w-24 inline-block ml-2" /></label>
        <label className="text-sm">Extraction <select aria-label="Extraction mode" value={extraction} disabled={busy} onChange={e => setExtraction(e.target.value)} className="bg-zinc-900 border border-zinc-700 p-2 rounded ml-2"><option value="rules">Rules (offline)</option><option value="llm">Gemini (requires configuration)</option></select></label>
        <Button disabled={busy} onClick={run}>{busy ? "Running…" : "Run benchmark"}</Button>
      </div>
      {err && <p role="alert" className="text-red-400">{err}</p>}
      {res && <>
        <p className="text-xs text-zinc-400">Extraction: {res.config.extraction} · Model: {res.config.model || "none (offline)"} · Fallbacks: {res.config.fallback_count} · Seed: {res.config.seed} · Context budget: {res.config.max_context_words} words</p>
        <div className="overflow-x-auto"><table className="w-full text-sm text-left">
          <thead><tr className="border-b border-zinc-700"><th className="p-3">Method</th><th className="p-3">Current-fact retrieval accuracy</th><th className="p-3">Stale context rate</th><th className="p-3">Avg. context words</th></tr></thead>
          <tbody>{Object.entries(names).filter(([key]) => res[key]).map(([key, label]) => <tr key={key} className="border-b border-zinc-800"><td className="p-3">{label}</td><td className="p-3">{(res[key].current_fact_retrieval_accuracy * 100).toFixed(1)}%</td><td className="p-3">{(res[key].stale_rate * 100).toFixed(1)}%</td><td className="p-3">{res[key].avg_context_words}</td></tr>)}</tbody>
        </table></div>
        <p className="text-sm text-zinc-400">The latest-value dictionary shares extraction and ranking with graph memory. Equal scores mean this benchmark provides no evidence that retaining graph history improves retrieval.</p>
        <details className="text-sm"><summary className="cursor-pointer">Language challenge diagnostics</summary>
          <p className="text-xs text-zinc-400 my-2">Hand-authored checks cover retractions, attribution, historical facts, uncertainty, and an unsupported paraphrase. These are diagnostics, not held-out research evidence.</p>
          {Object.entries(res.challenge_suite?.methods || {}).map(([key, result]) => <div key={key} className="my-2 text-sm"><span>{names[key]}: {result.passed}/{result.total} passed</span><ul className="text-xs text-zinc-400 ml-4">{result.cases.filter(item => !item.passed).map(item => <li key={item.name}>{item.name}: expected {item.expected || "no retrieved facts"}; retrieved {item.context || "nothing"}</li>)}</ul></div>)}
        </details>
        <details className="text-sm"><summary className="cursor-pointer">Inspect failure examples</summary><pre className="mt-3 text-xs whitespace-pre-wrap break-words">{JSON.stringify(res.failures, null, 2)}</pre></details>
      </>}
    </CardContent>
  </Card>;
}

export default function App() {
  const [tab, setTab] = useState("chat");
  const [tick, setTick] = useState(0);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black font-sans pb-16">
      {/* Top Navbar */}
      <header className="border-b border-zinc-800/80 bg-black/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="font-bold text-base md:text-lg tracking-tight text-white font-mono">
            MemGraph
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
        {tab === "chat" && <Chat onUpdate={() => setTick((t) => t + 1)} />}
        {tab === "graph" && <Graph tick={tick} />}
        {tab === "evaluate" && <Evaluate />}
      </main>
    </div>
  );
}
