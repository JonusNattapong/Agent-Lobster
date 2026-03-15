const storageKey = "openclaw-control-plane";

const defaultState = {
  topology: "hub-and-spoke",
  meta: {
    lastTouchedVersion: "2026.2.3-1"
  },
  gateway: {
    port: 18789,
    mode: "local",
    bind: "loopback"
  },
  tools: {
    profile: "coding",
    agentToAgent: {
      enabled: true,
      allow: ["*"]
    }
  },
  agents: {
    defaults: {
      model: {
        primary: "openai/gpt-5-mini",
        fallbacks: []
      },
      workspace: "~/.openclaw/workspace",
      subagents: {
        maxConcurrent: 8,
        archiveAfterMinutes: 60,
        model: "openai/gpt-5-mini",
        thinking: "low"
      },
      sandbox: {
        sessionToolsVisibility: "spawned"
      }
    },
    list: [
      {
        id: "main",
        name: "Main Agent",
        role: "Coordinator",
        workspace: "~/.openclaw/workspace",
        model: "openai/gpt-5",
        spawnTargets: ["researcher", "writer", "coder"]
      },
      {
        id: "researcher",
        name: "Research Agent",
        role: "Discovery",
        workspace: "~/.openclaw/agents/researcher",
        model: "openai/gpt-5-mini",
        spawnTargets: []
      },
      {
        id: "writer",
        name: "Writer Agent",
        role: "Narrative",
        workspace: "~/.openclaw/agents/writer",
        model: "openai/gpt-5-mini",
        spawnTargets: []
      },
      {
        id: "coder",
        name: "Code Agent",
        role: "Implementation",
        workspace: "~/.openclaw/agents/coder",
        model: "openai/gpt-5-mini",
        spawnTargets: []
      }
    ]
  }
};

const topologyLabelMap = {
  "hub-and-spoke": "Hub-and-Spoke",
  pipeline: "Pipeline",
  swarm: "Swarm"
};

const state = loadState();
const runtime = {
  busy: false,
  paths: null,
  version: null,
  live: {
    refreshedAt: null,
    agents: [],
    sessions: [],
    logs: [],
    subagentRuns: []
  }
};

const elements = {
  topologyCanvas: document.querySelector("#topologyCanvas"),
  topologySelect: document.querySelector("#topologySelect"),
  topologyLabel: document.querySelector("#topologyLabel"),
  gatewayModeLabel: document.querySelector("#gatewayModeLabel"),
  agentCount: document.querySelector("#agentCount"),
  subAgentCount: document.querySelector("#subAgentCount"),
  workspaceLabel: document.querySelector("#workspaceLabel"),
  visibilityLabel: document.querySelector("#visibilityLabel"),
  a2aLabel: document.querySelector("#a2aLabel"),
  portLabel: document.querySelector("#portLabel"),
  agentList: document.querySelector("#agentList"),
  addAgentBtn: document.querySelector("#addAgentBtn"),
  gatewayMode: document.querySelector("#gatewayMode"),
  gatewayBind: document.querySelector("#gatewayBind"),
  gatewayPort: document.querySelector("#gatewayPort"),
  sessionVisibility: document.querySelector("#sessionVisibility"),
  agentToAgent: document.querySelector("#agentToAgent"),
  agentToAgentAllow: document.querySelector("#agentToAgentAllow"),
  maxConcurrent: document.querySelector("#maxConcurrent"),
  archiveAfterMinutes: document.querySelector("#archiveAfterMinutes"),
  subagentModel: document.querySelector("#subagentModel"),
  subagentThinking: document.querySelector("#subagentThinking"),
  jsonPreview: document.querySelector("#jsonPreview"),
  downloadBtn: document.querySelector("#downloadBtn"),
  resetDemoBtn: document.querySelector("#resetDemoBtn"),
  configUpload: document.querySelector("#configUpload"),
  agentCardTemplate: document.querySelector("#agentCardTemplate"),
  syncBtn: document.querySelector("#syncBtn"),
  refreshBtn: document.querySelector("#refreshBtn"),
  restartBtn: document.querySelector("#restartBtn"),
  validateBtn: document.querySelector("#validateBtn"),
  statusBanner: document.querySelector("#statusBanner"),
  openclawVersion: document.querySelector("#openclawVersion"),
  configPath: document.querySelector("#configPath"),
  runtimeRefreshedAt: document.querySelector("#runtimeRefreshedAt"),
  runtimeAgents: document.querySelector("#runtimeAgents"),
  runtimeSessions: document.querySelector("#runtimeSessions"),
  runtimeSubagents: document.querySelector("#runtimeSubagents"),
  runtimeLogs: document.querySelector("#runtimeLogs")
};

bindEvents();
render();
refreshFromOpenClaw();
refreshRuntime();
window.setInterval(refreshRuntime, 15000);

function bindEvents() {
  window.addEventListener("resize", renderTopology);

  bindSimpleInput(elements.topologySelect, (value) => {
    state.topology = value;
  });
  bindSimpleInput(elements.gatewayMode, (value) => {
    state.gateway.mode = value;
  });
  bindSimpleInput(elements.gatewayBind, (value) => {
    state.gateway.bind = value;
  });
  bindSimpleInput(elements.gatewayPort, (value) => {
    state.gateway.port = Number(value) || defaultState.gateway.port;
  });
  bindSimpleInput(elements.sessionVisibility, (value) => {
    state.agents.defaults.sandbox.sessionToolsVisibility = value;
  });
  bindSimpleInput(elements.agentToAgentAllow, (value) => {
    state.tools.agentToAgent.allow = parseList(value);
  });
  bindSimpleInput(elements.maxConcurrent, (value) => {
    state.agents.defaults.subagents.maxConcurrent = Number(value) || 0;
  });
  bindSimpleInput(elements.archiveAfterMinutes, (value) => {
    state.agents.defaults.subagents.archiveAfterMinutes = Number(value) || 0;
  });
  bindSimpleInput(elements.subagentModel, (value) => {
    state.agents.defaults.subagents.model = value.trim();
  });
  bindSimpleInput(elements.subagentThinking, (value) => {
    state.agents.defaults.subagents.thinking = value.trim();
  });

  elements.agentToAgent.addEventListener("change", (event) => {
    state.tools.agentToAgent.enabled = event.target.checked;
    persistAndRender();
  });
  elements.addAgentBtn.addEventListener("click", () => {
    state.agents.list.push(createAgent());
    persistAndRender();
  });
  elements.downloadBtn.addEventListener("click", () => downloadJson(buildExportPayload()));
  elements.resetDemoBtn.addEventListener("click", () => {
    replaceState(structuredClone(defaultState));
    setStatus("โหลดตัวอย่างใหม่แล้ว", "info");
  });
  elements.configUpload.addEventListener("change", importConfigFile);
  elements.syncBtn.addEventListener("click", syncToOpenClaw);
  elements.refreshBtn.addEventListener("click", refreshFromOpenClaw);
  elements.restartBtn.addEventListener("click", restartGateway);
  elements.validateBtn.addEventListener("click", validateOpenClaw);
}

function bindSimpleInput(element, onValue) {
  element.addEventListener("input", (event) => {
    onValue(event.target.value);
    persistAndRender();
  });
  element.addEventListener("change", (event) => {
    onValue(event.target.value);
    persistAndRender();
  });
}

function render() {
  const exportPayload = buildExportPayload();

  elements.topologyLabel.textContent = topologyLabelMap[state.topology];
  elements.agentCount.textContent = String(state.agents.list.length);
  elements.subAgentCount.textContent = String(countRoutes(state.agents.list));
  elements.gatewayModeLabel.textContent = state.gateway.mode;
  elements.workspaceLabel.textContent = state.agents.defaults.workspace;
  elements.visibilityLabel.textContent = state.agents.defaults.sandbox.sessionToolsVisibility || "spawned";
  elements.a2aLabel.textContent = state.tools.agentToAgent.enabled ? "enabled" : "disabled";
  elements.portLabel.textContent = String(state.gateway.port);

  elements.topologySelect.value = state.topology;
  elements.gatewayMode.value = state.gateway.mode;
  elements.gatewayBind.value = state.gateway.bind;
  elements.gatewayPort.value = String(state.gateway.port);
  elements.sessionVisibility.value = state.agents.defaults.sandbox.sessionToolsVisibility || "spawned";
  elements.agentToAgent.checked = state.tools.agentToAgent.enabled;
  elements.agentToAgentAllow.value = (state.tools.agentToAgent.allow || []).join(", ");
  elements.maxConcurrent.value = String(state.agents.defaults.subagents.maxConcurrent || 0);
  elements.archiveAfterMinutes.value = String(state.agents.defaults.subagents.archiveAfterMinutes || 0);
  elements.subagentModel.value = state.agents.defaults.subagents.model || "";
  elements.subagentThinking.value = state.agents.defaults.subagents.thinking || "";
  elements.jsonPreview.textContent = JSON.stringify(exportPayload, null, 2);
  elements.openclawVersion.textContent = runtime.version || "unknown";
  elements.configPath.textContent = runtime.paths?.openClawConfigPath || "~/.openclaw/openclaw.json";
  elements.runtimeRefreshedAt.textContent = runtime.live.refreshedAt
    ? `ล่าสุด ${new Date(runtime.live.refreshedAt).toLocaleString("th-TH")}`
    : "ยังไม่ refresh";

  [elements.syncBtn, elements.refreshBtn, elements.restartBtn, elements.validateBtn].forEach((button) => {
    button.disabled = runtime.busy;
  });

  renderAgentList();
  renderTopology();
  renderRuntimePanels();
}

function renderAgentList() {
  elements.agentList.innerHTML = "";

  state.agents.list.forEach((agent, index) => {
    const node = elements.agentCardTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector("h3").textContent = agent.name || `Agent ${index + 1}`;
    node.querySelector(".agent-card__tag").textContent = agent.spawnTargets.length
      ? `Allow ${agent.spawnTargets.length} target${agent.spawnTargets.length > 1 ? "s" : ""}`
      : "Default: self only";

    const deleteButton = node.querySelector('[data-action="delete"]');
    deleteButton.disabled = state.agents.list.length === 1;
    deleteButton.addEventListener("click", () => {
      const removedId = agent.id;
      state.agents.list = state.agents.list
        .filter((current) => current !== agent)
        .map((current) => ({
          ...current,
          spawnTargets: current.spawnTargets.filter((target) => target !== removedId)
        }));
      persistAndRender();
    });

    node.querySelectorAll("[data-field]").forEach((field) => {
      const key = field.dataset.field;
      field.value = key === "spawnTargets" ? agent.spawnTargets.join(", ") : agent[key] ?? "";
      field.addEventListener("input", (event) => {
        if (key === "id") {
          normalizeAgentId(index, event.target.value);
        } else if (key === "spawnTargets") {
          agent.spawnTargets = parseList(event.target.value);
        } else {
          agent[key] = event.target.value;
        }
        persistAndRender();
      });
    });

    elements.agentList.append(node);
  });
}

function renderTopology() {
  const agents = state.agents.list;
  const rect = elements.topologyCanvas.getBoundingClientRect();
  const width = rect.width || 960;
  const height = rect.height || 380;
  const positions = computePositions(agents, width, height);
  const edges = buildEdges(agents);

  elements.topologyCanvas.innerHTML = "";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
  marker.setAttribute("id", "arrow");
  marker.setAttribute("viewBox", "0 0 10 10");
  marker.setAttribute("refX", "8");
  marker.setAttribute("refY", "5");
  marker.setAttribute("markerWidth", "6");
  marker.setAttribute("markerHeight", "6");
  marker.setAttribute("orient", "auto-start-reverse");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
  path.setAttribute("fill", "#c8553d");
  marker.append(path);
  defs.append(marker);
  svg.append(defs);

  edges.forEach((edge) => {
    const from = positions[edge.from];
    const to = positions[edge.to];
    if (!from || !to) {
      return;
    }
    const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const d = `M ${from.x} ${from.y} C ${from.x} ${(from.y + to.y) / 2}, ${to.x} ${(from.y + to.y) / 2}, ${to.x} ${to.y}`;
    line.setAttribute("d", d);
    line.setAttribute("stroke", "#c8553d");
    line.setAttribute("stroke-width", "2");
    line.setAttribute("fill", "none");
    line.setAttribute("stroke-linecap", "round");
    line.setAttribute("marker-end", "url(#arrow)");
    svg.append(line);
  });

  elements.topologyCanvas.append(svg);

  agents.forEach((agent) => {
    const position = positions[agent.id];
    if (!position) {
      return;
    }
    const node = document.createElement("article");
    node.className = "topology-node";
    node.style.left = `${position.x - 90}px`;
    node.style.top = `${position.y - 46}px`;
    node.innerHTML = `
      <span>${agent.spawnTargets.length ? "Spawner" : "Leaf"}</span>
      <strong>${escapeHtml(agent.name || agent.id)}</strong>
      <span>${escapeHtml(agent.role || "General")}</span>
    `;
    elements.topologyCanvas.append(node);
  });
}

function computePositions(agents, width, height) {
  const positions = {};

  if (state.topology === "pipeline") {
    const spacing = Math.max((width - 240) / Math.max(1, agents.length - 1), 160);
    agents.forEach((agent, index) => {
      positions[agent.id] = { x: 120 + spacing * index, y: height / 2 };
    });
    return positions;
  }

  if (state.topology === "swarm") {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.3;
    agents.forEach((agent, index) => {
      const angle = (index / Math.max(1, agents.length)) * Math.PI * 2 - Math.PI / 2;
      positions[agent.id] = index === 0
        ? { x: centerX, y: centerY }
        : { x: centerX + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius };
    });
    return positions;
  }

  const roots = findRootAgents(agents);
  const children = agents.filter((agent) => !roots.includes(agent));
  roots.forEach((agent, index) => {
    positions[agent.id] = { x: (width / (roots.length + 1)) * (index + 1), y: 90 };
  });
  children.forEach((agent, index) => {
    positions[agent.id] = { x: (width / (children.length + 1 || 1)) * (index + 1), y: height - 90 };
  });
  return positions;
}

function buildEdges(agents) {
  if (state.topology === "pipeline") {
    return agents.slice(0, -1).map((agent, index) => ({ from: agent.id, to: agents[index + 1].id }));
  }
  if (state.topology === "swarm") {
    const hubId = agents[0]?.id;
    return agents.slice(1).map((agent) => ({ from: hubId, to: agent.id }));
  }
  return agents.flatMap((agent) => agent.spawnTargets.map((target) => ({ from: agent.id, to: target })));
}

function findRootAgents(agents) {
  const targeted = new Set(agents.flatMap((agent) => agent.spawnTargets));
  const roots = agents.filter((agent) => !targeted.has(agent.id));
  return roots.length ? roots : agents.slice(0, 1);
}

function buildExportPayload() {
  return {
    meta: state.meta,
    topology: state.topology,
    gateway: state.gateway,
    tools: state.tools,
    agents: {
      defaults: state.agents.defaults,
      list: state.agents.list.map((agent) => ({
        ...agent,
        spawnTargets: [...agent.spawnTargets]
      }))
    }
  };
}

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) {
    return structuredClone(defaultState);
  }
  try {
    return normalizeState(JSON.parse(saved));
  } catch {
    return structuredClone(defaultState);
  }
}

function normalizeState(input) {
  const normalized = mergeState(structuredClone(defaultState), input || {});
  normalized.tools.agentToAgent.allow = parseList(normalized.tools.agentToAgent.allow || []);
  normalized.agents.defaults.subagents = mergeState(
    structuredClone(defaultState.agents.defaults.subagents),
    input?.agents?.defaults?.subagents || {}
  );
  normalized.agents.defaults.sandbox = mergeState(
    structuredClone(defaultState.agents.defaults.sandbox),
    input?.agents?.defaults?.sandbox || {}
  );
  normalized.agents.list = normalizeAgents(normalized.agents.list);
  return normalized;
}

function normalizeAgents(list) {
  if (!Array.isArray(list) || !list.length) {
    return structuredClone(defaultState.agents.list);
  }
  return list.map((agent, index) => ({
    id: agent.id || `agent-${index + 1}`,
    name: agent.name || agent.id || `Agent ${index + 1}`,
    role: agent.role || inferRole(agent.id),
    workspace: agent.workspace || `~/.openclaw/agents/${agent.id || `agent-${index + 1}`}`,
    model: agent.model || defaultState.agents.defaults.model.primary,
    spawnTargets: parseList(agent.spawnTargets || agent.subagents?.allowAgents || [])
  }));
}

function mergeState(base, incoming) {
  if (Array.isArray(incoming)) {
    return incoming;
  }
  if (incoming && typeof incoming === "object") {
    Object.entries(incoming).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        base[key] = value;
      } else if (value && typeof value === "object") {
        base[key] = mergeState(base[key] ?? {}, value);
      } else {
        base[key] = value;
      }
    });
  }
  return base;
}

function createAgent() {
  const count = state.agents.list.length + 1;
  return {
    id: `agent-${count}`,
    name: `Agent ${count}`,
    role: "General",
    workspace: `~/.openclaw/agents/agent-${count}`,
    model: state.agents.defaults.model.primary,
    spawnTargets: []
  };
}

function normalizeAgentId(index, rawId) {
  const nextId = rawId.trim() || `agent-${index + 1}`;
  const previousId = state.agents.list[index].id;
  state.agents.list[index].id = nextId;
  if (nextId === previousId) {
    return;
  }
  state.agents.list.forEach((agent) => {
    agent.spawnTargets = agent.spawnTargets.map((target) => (target === previousId ? nextId : target));
  });
}

async function importConfigFile(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }
  replaceState(JSON.parse(await file.text()));
  setStatus(`นำเข้า ${file.name} แล้ว`, "info");
  event.target.value = "";
}

async function refreshFromOpenClaw() {
  setBusy(true);
  setStatus("กำลังโหลด config จาก OpenClaw...", "info");
  try {
    const response = await fetch("/api/status");
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Unable to load OpenClaw status");
    }
    runtime.paths = payload.paths;
    runtime.version = payload.openclaw?.version || null;
    replaceState(payload.config);
    setStatus("โหลด config จาก OpenClaw แล้ว", "success");
    await refreshRuntime();
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    setBusy(false);
    render();
  }
}

async function syncToOpenClaw() {
  setBusy(true);
  setStatus("กำลัง sync เข้า OpenClaw...", "info");
  try {
    const response = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildExportPayload())
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Sync failed");
    }
    runtime.paths = payload.paths;
    replaceState(payload.config);
    setStatus("Sync เข้า OpenClaw สำเร็จ", "success");
    await refreshRuntime();
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    setBusy(false);
    render();
  }
}

async function restartGateway() {
  setBusy(true);
  setStatus("กำลัง restart gateway...", "info");
  try {
    const response = await fetch("/api/restart-gateway", { method: "POST" });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.stderr || payload.error || "Restart failed");
    }
    setStatus(payload.stdout || "Restart gateway สำเร็จ", "success");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    setBusy(false);
    render();
  }
}

async function validateOpenClaw() {
  setBusy(true);
  setStatus("กำลังตรวจ config OpenClaw...", "info");
  try {
    const response = await fetch("/api/validate", { method: "POST" });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.stderr || payload.error || "Validation failed");
    }
    setStatus(payload.stdout || "OpenClaw config ผ่านการตรวจสอบ", "success");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    setBusy(false);
    render();
  }
}

async function refreshRuntime() {
  try {
    const response = await fetch("/api/runtime");
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Runtime refresh failed");
    }
    runtime.live = payload.runtime;
    render();
  } catch {
    elements.runtimeRefreshedAt.textContent = "refresh runtime ไม่สำเร็จ";
  }
}

function renderRuntimePanels() {
  renderRuntimeAgents();
  renderRuntimeSessions();
  renderRuntimeSubagents();
  renderRuntimeLogs();
}

function renderRuntimeAgents() {
  elements.runtimeAgents.innerHTML = "";
  const agents = runtime.live.agents || [];
  if (!agents.length) {
    elements.runtimeAgents.innerHTML = '<p class="runtime-empty">ยังไม่พบ agent runtime บนเครื่อง</p>';
    return;
  }
  agents.forEach((agent) => {
    const article = document.createElement("article");
    article.className = "runtime-card";
    article.innerHTML = `
      <strong>${escapeHtml(agent.name || agent.id)}</strong>
      <span>ID: ${escapeHtml(agent.id)}</span>
      <span>Spawn targets: ${escapeHtml((agent.spawnTargets || []).join(", ") || "(self only)")}</span>
      <span>Session tools visibility: ${escapeHtml(agent.sessionToolsVisibility || "spawned")}</span>
      <span class="runtime-pill">${agent.configured ? "Configured" : "Disk only"} / ${agent.existsOnDisk ? "On disk" : "Missing"}</span>
    `;
    elements.runtimeAgents.append(article);
  });
}

function renderRuntimeSessions() {
  elements.runtimeSessions.innerHTML = "";
  const sessions = runtime.live.sessions || [];
  if (!sessions.length) {
    elements.runtimeSessions.innerHTML = '<p class="runtime-empty">ยังไม่มี session file ที่อ่านได้</p>';
    return;
  }
  sessions.forEach((session) => {
    const article = document.createElement("article");
    article.className = "runtime-item";
    article.innerHTML = `
      <strong>${escapeHtml(session.file)}</strong>
      <span>Agent: ${escapeHtml(session.agentId)}</span>
      <span>Updated: ${formatDate(session.updatedAt)}</span>
      <span>Size: ${session.bytes} bytes</span>
      <span>${escapeHtml(session.path)}</span>
    `;
    elements.runtimeSessions.append(article);
  });
}

function renderRuntimeSubagents() {
  elements.runtimeSubagents.innerHTML = "";
  const runs = runtime.live.subagentRuns || [];
  if (!runs.length) {
    elements.runtimeSubagents.innerHTML = '<p class="runtime-empty">ยังไม่พบ active/completed sub-agent runs ใน registry</p>';
    return;
  }
  runs.forEach((run) => {
    const article = document.createElement("article");
    article.className = "runtime-item";
    article.innerHTML = `
      <strong>${escapeHtml(run.label || run.runId)}</strong>
      <span>Target agent: ${escapeHtml(run.targetAgentId || "-")}</span>
      <span>Outcome: ${escapeHtml(run.outcome || "running")}</span>
      <span>Started: ${formatDate(run.startedAt)}</span>
      <span>Archive: ${formatDate(run.archiveAt)}</span>
      <span>${escapeHtml(run.task || "-")}</span>
    `;
    elements.runtimeSubagents.append(article);
  });
}

function renderRuntimeLogs() {
  elements.runtimeLogs.innerHTML = "";
  const logs = runtime.live.logs || [];
  if (!logs.length) {
    elements.runtimeLogs.innerHTML = '<p class="runtime-empty">ยังไม่พบไฟล์ log ที่อ่านได้</p>';
    return;
  }
  logs.forEach((log) => {
    const article = document.createElement("article");
    article.className = "runtime-item";
    article.innerHTML = `
      <strong>${escapeHtml(log.file)}</strong>
      <span>Updated: ${formatDate(log.updatedAt)}</span>
      <span>Size: ${log.bytes} bytes</span>
      <span>${escapeHtml(log.path)}</span>
      <pre>${escapeHtml(log.tail || "(empty)")}</pre>
    `;
    elements.runtimeLogs.append(article);
  });
}

function replaceState(nextState) {
  Object.keys(state).forEach((key) => delete state[key]);
  Object.assign(state, normalizeState(nextState));
  persistAndRender();
}

function parseList(value) {
  return [...new Set((Array.isArray(value) ? value : String(value).split(",")).map((item) => String(item).trim()).filter(Boolean))];
}

function countRoutes(agents) {
  return agents.reduce((sum, agent) => sum + agent.spawnTargets.length, 0);
}

function inferRole(id = "") {
  const value = String(id).toLowerCase();
  if (value.includes("research")) {
    return "Discovery";
  }
  if (value.includes("write")) {
    return "Narrative";
  }
  if (value.includes("code")) {
    return "Implementation";
  }
  return "General";
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString("th-TH") : "-";
}

function downloadJson(payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "openclaw-control-plane.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

function setBusy(nextBusy) {
  runtime.busy = nextBusy;
  render();
}

function setStatus(message, tone) {
  elements.statusBanner.textContent = message;
  elements.statusBanner.dataset.tone = tone;
}

function persistAndRender() {
  localStorage.setItem(storageKey, JSON.stringify(state));
  render();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
