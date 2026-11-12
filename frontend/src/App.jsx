import { useState, useEffect } from "react";

const api = (path, body) =>
  fetch("/api" + path, { method: body ? "POST" : "GET", headers: { "Content-Type": "application/json" }, body: body && JSON.stringify(body) })
    .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.detail || "Request failed"); return j; });

const S = {
  page: { fontFamily: "system-ui, sans-serif", maxWidth: 980, margin: "0 auto", padding: 20, color: "#1a1a2e" },
  card: { border: "1px solid #dde", borderRadius: 10, padding: 14, marginBottom: 14, background: "#fff" },
  btn: { padding: "8px 14px", borderRadius: 8, border: "none", background: "#4f46e5", color: "#fff", cursor: "pointer" },
  input: { padding: 8, borderRadius: 8, border: "1px solid #ccd", marginRight: 8 },
};

function Settings({ cfg, setCfg }) {
  const [defs, setDefs] = useState({ providers: ["mock"], defaults: {} });
  useEffect(() => { api("/providers").then(setDefs).catch(() => {}); }, []);
  const set = (k) => (e) => setCfg({ ...cfg, [k]: e.target.value });
  return (
    <div style={S.card}>
      <select style={S.input} value={cfg.provider} onChange={(e) => setCfg({ ...cfg, provider: e.target.value, model: defs.defaults[e.target.value] })}>
        {defs.providers.map((p) => <option key={p}>{p}</option>)}
      </select>
      <input style={S.input} placeholder="model (optional)" value={cfg.model || ""} onChange={set("model")} />
      <input style={{ ...S.input, width: 260 }} type="password" placeholder="API key (or set in .env)" value={cfg.api_key || ""} onChange={set("api_key")} />
    </div>
  );
}

function Chat({ cfg, onUpdate }) {
  const [msgs, setMsgs] = useState([]); const [text, setText] = useState(""); const [memory, setMemory] = useState("graph"); const [err, setErr] = useState("");
  const send = async () => {
    if (!text.trim()) return; const m = text; setText(""); setErr("");
    setMsgs((x) => [...x, { role: "you", text: m }]);
    try {
      const r = await api("/chat", { ...cfg, message: m, memory });
      setMsgs((x) => [...x, { role: "ai", text: r.reply, retrieved: r.retrieved }]); onUpdate();
    } catch (e) { setErr(e.message); }
  };
  return (
    <div style={S.card}>
      <label>Memory: <select style={S.input} value={memory} onChange={(e) => setMemory(e.target.value)}><option value="graph">graph</option><option value="flat">flat (baseline)</option></select></label>
      <button style={{ ...S.btn, background: "#999" }} onClick={() => api("/reset", {}).then(() => { setMsgs([]); onUpdate(); })}>Reset memory</button>
      <div style={{ minHeight: 200, margin: "12px 0" }}>
        {msgs.map((m, i) => (
          <p key={i}><b>{m.role}:</b> {m.text}
            {m.retrieved?.length > 0 && <small style={{ display: "block", color: "#667" }}>memory used: {m.retrieved.join(" | ")}</small>}</p>
        ))}
      </div>
      {err && <p style={{ color: "crimson" }}>{err}</p>}
      <input style={{ ...S.input, width: "70%" }} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder='Try: "I live in Pune." then "I moved to Delhi." then "Where do I live?"' />
      <button style={S.btn} onClick={send}>Send</button>
    </div>
  );
}

function Graph({ tick }) {
  const [g, setG] = useState({ nodes: [], edges: [] });
  useEffect(() => { api("/graph").then(setG).catch(() => {}); }, [tick]);
  const n = g.nodes.length, pos = {};
  g.nodes.forEach((nd, i) => { pos[nd.id] = nd.id === "user" ? [300, 160] : [300 + 130 * Math.cos((2 * Math.PI * i) / Math.max(n - 1, 1)), 160 + 120 * Math.sin((2 * Math.PI * i) / Math.max(n - 1, 1))]; });
  return (
    <div style={S.card}>
      <svg viewBox="0 0 600 320" style={{ width: "100%" }}>
        {g.edges.map((e, i) => pos[e.source] && pos[e.target] && (
          <g key={i} opacity={e.active ? 1 : 0.35}>
            <line x1={pos[e.source][0]} y1={pos[e.source][1]} x2={pos[e.target][0]} y2={pos[e.target][1]} stroke={e.active ? "#4f46e5" : "#aaa"} strokeDasharray={e.active ? "" : "4"} />
            <text x={(pos[e.source][0] + pos[e.target][0]) / 2} y={(pos[e.source][1] + pos[e.target][1]) / 2} fontSize="9" fill="#555">{e.label}</text>
          </g>))}
        {g.nodes.map((nd) => (<g key={nd.id}><circle cx={pos[nd.id][0]} cy={pos[nd.id][1]} r="6" fill="#4f46e5" /><text x={pos[nd.id][0] + 8} y={pos[nd.id][1] + 3} fontSize="11">{nd.id}</text></g>))}
      </svg>
      <small>Dashed grey edges = superseded (stale) facts kept for history.</small>
    </div>
  );
}

function Evaluate({ cfg }) {
  const [res, setRes] = useState(null); const [users, setUsers] = useState(30); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const run = async () => { setBusy(true); setErr(""); try { setRes(await api("/eval", { ...cfg, users })); } catch (e) { setErr(e.message); } setBusy(false); };
  return (
    <div style={S.card}>
      <input style={S.input} type="number" value={users} onChange={(e) => setUsers(+e.target.value)} /> simulated users
      <button style={{ ...S.btn, marginLeft: 8 }} onClick={run} disabled={busy}>{busy ? "Running…" : "Run benchmark"}</button>
      {err && <p style={{ color: "crimson" }}>{err}</p>}
      {res && (
        <table style={{ marginTop: 14, borderCollapse: "collapse" }}>
          <thead><tr><th>Memory</th><th>Accuracy ↑</th><th>Stale rate ↓</th><th>Avg context words</th></tr></thead>
          <tbody>{["flat", "graph"].map((m) => (
            <tr key={m}><td style={{ padding: 6 }}>{m}</td><td>{(res[m].accuracy * 100).toFixed(1)}%</td><td>{(res[m].stale_rate * 100).toFixed(1)}%</td><td>{res[m].avg_context_words}</td></tr>))}</tbody>
        </table>)}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("chat"); const [tick, setTick] = useState(0); const [cfg, setCfg] = useState({ provider: "mock" });
  return (
    <div style={S.page}>
      <h1>MemGraph <small style={{ fontSize: 14, color: "#667" }}>graph vs flat agentic memory</small></h1>
      <Settings cfg={cfg} setCfg={setCfg} />
      {["chat", "graph", "evaluate"].map((t) => <button key={t} style={{ ...S.btn, marginRight: 8, marginBottom: 12, opacity: tab === t ? 1 : 0.6 }} onClick={() => setTab(t)}>{t}</button>)}
      {tab === "chat" && <Chat cfg={cfg} onUpdate={() => setTick(tick + 1)} />}
      {tab === "graph" && <Graph tick={tick} />}
      {tab === "evaluate" && <Evaluate cfg={cfg} />}
    </div>
  );
}
