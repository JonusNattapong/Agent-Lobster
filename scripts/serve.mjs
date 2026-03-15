import { createServer } from "node:http";
import { execFile } from "node:child_process";
import JSON5 from "/usr/lib/node_modules/openclaw/node_modules/json5/lib/index.js";
import {
  copyFileSync,
  createReadStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync
} from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { homedir } from "node:os";

const webRoot = resolve(process.cwd(), "web");
const port = Number(process.env.PORT || 4173);
const stateDir = resolveStateDir();
const configPath = resolveConfigPath(stateDir);
const controlPlanePath = resolve(join(stateDir, "openclaw-control-plane.json"));
const subagentRegistryPath = resolve(join(stateDir, "subagents", "runs.json"));
const packageVersion = readOpenClawVersion();

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8"
};

createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

  if (url.pathname === "/api/status" && request.method === "GET") {
    return sendJson(response, 200, await buildStatusPayload());
  }

  if (url.pathname === "/api/runtime" && request.method === "GET") {
    return sendJson(response, 200, buildRuntimePayload());
  }

  if (url.pathname === "/api/sync" && request.method === "POST") {
    try {
      const payload = await readJsonBody(request);
      return sendJson(response, 200, syncToOpenClaw(payload));
    } catch (error) {
      return sendJson(response, 400, { ok: false, error: error.message });
    }
  }

  if (url.pathname === "/api/restart-gateway" && request.method === "POST") {
    try {
      const result = await runOpenClaw(["gateway", "restart"]);
      return sendJson(response, result.code === 0 ? 200 : 500, {
        ok: result.code === 0,
        command: "openclaw gateway restart",
        stdout: result.stdout.trim(),
        stderr: result.stderr.trim()
      });
    } catch (error) {
      return sendJson(response, 500, { ok: false, error: error.message });
    }
  }

  if (url.pathname === "/api/validate" && request.method === "POST") {
    try {
      const result = await runOpenClaw(["doctor"]);
      return sendJson(response, result.code === 0 ? 200 : 500, {
        ok: result.code === 0,
        command: "openclaw doctor",
        stdout: result.stdout.trim(),
        stderr: result.stderr.trim()
      });
    } catch (error) {
      return sendJson(response, 500, { ok: false, error: error.message });
    }
  }

  return serveStatic(url.pathname, response);
}).listen(port, () => {
  console.log(`OpenClaw Agent Control running at http://localhost:${port}`);
});

function serveStatic(pathname, response) {
  const urlPath = pathname === "/" ? "/index.html" : pathname;
  const safePath = normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = resolve(join(webRoot, safePath));

  if (!filePath.startsWith(webRoot) || !existsSync(filePath) || statSync(filePath).isDirectory()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream"
  });
  createReadStream(filePath).pipe(response);
}

async function buildStatusPayload() {
  const actualConfig = readJsonFile(configPath, {});
  const controlPlane = readJsonFile(controlPlanePath, {});

  return {
    ok: true,
    paths: {
      openClawStateDir: stateDir,
      openClawConfigPath: configPath,
      controlPlanePath
    },
    openclaw: {
      installed: existsSync("/usr/bin/openclaw") || existsSync("/usr/local/bin/openclaw"),
      version: packageVersion
    },
    config: projectControlPlane(actualConfig, controlPlane)
  };
}

function buildRuntimePayload() {
  const actualConfig = readJsonFile(configPath, {});
  const controlPlane = readJsonFile(controlPlanePath, {});
  const projected = projectControlPlane(actualConfig, controlPlane);
  const runtimeAgents = readRuntimeAgents(projected);

  return {
    ok: true,
    runtime: {
      refreshedAt: new Date().toISOString(),
      agents: runtimeAgents,
      sessions: readSessions(runtimeAgents),
      logs: readLogs(runtimeAgents),
      subagentRuns: readSubagentRuns()
    }
  };
}

function syncToOpenClaw(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid payload");
  }

  mkdirSync(stateDir, { recursive: true });

  const currentConfig = readJsonFile(configPath, {});
  const nextConfig = mergeConfigs(currentConfig, toOpenClawConfig(payload));

  if (existsSync(configPath)) {
    copyFileSync(configPath, `${configPath}.bak.web`);
  }

  writeFileSync(configPath, `${JSON.stringify(nextConfig, null, 2)}\n`, "utf8");
  writeFileSync(controlPlanePath, `${JSON.stringify(toControlPlaneSidecar(payload), null, 2)}\n`, "utf8");
  ensureAgentWorkspaces(payload);

  return {
    ok: true,
    message: "Synced to OpenClaw config",
    paths: {
      openClawStateDir: stateDir,
      openClawConfigPath: configPath,
      controlPlanePath
    },
    config: projectControlPlane(nextConfig, toControlPlaneSidecar(payload))
  };
}

function ensureAgentWorkspaces(payload) {
  (payload.agents?.list || []).forEach((agent) => {
    if (!agent.workspace) {
      return;
    }
    mkdirSync(resolveUserPath(agent.workspace), { recursive: true });
  });
}

function projectControlPlane(actualConfig, controlPlane) {
  const routingEdges = controlPlane.routing?.edges || [];
  const routeMap = new Map();
  routingEdges.forEach((edge) => {
    if (!edge?.from || !edge?.to) {
      return;
    }
    if (!routeMap.has(edge.from)) {
      routeMap.set(edge.from, []);
    }
    routeMap.get(edge.from).push(edge.to);
  });

  const agents = (actualConfig.agents?.list || []).map((agent) => ({
    id: agent.id,
    name: agent.name || agent.id,
    role: controlPlane.roles?.[agent.id] || inferRole(agent.id),
    workspace: agent.workspace || actualConfig.agents?.defaults?.workspace || "",
    model:
      typeof agent.model === "string"
        ? agent.model
        : actualConfig.agents?.defaults?.model?.primary || "",
    spawnTargets: normalizeStringList(agent.subagents?.allowAgents || routeMap.get(agent.id) || [])
  }));

  return {
    topology: controlPlane.topology || detectTopology(agents),
    meta: actualConfig.meta || { lastTouchedVersion: "unknown" },
    gateway: {
      mode: actualConfig.gateway?.mode || "local",
      port: actualConfig.gateway?.port || 18789,
      bind: actualConfig.gateway?.bind || "loopback",
      ...(actualConfig.gateway?.auth ? { auth: actualConfig.gateway.auth } : {}),
      ...(actualConfig.gateway?.tailscale ? { tailscale: actualConfig.gateway.tailscale } : {})
    },
    tools: {
      profile: actualConfig.tools?.profile || "coding",
      agentToAgent: {
        enabled: Boolean(actualConfig.tools?.agentToAgent?.enabled),
        allow: normalizeStringList(actualConfig.tools?.agentToAgent?.allow || [])
      }
    },
    agents: {
      defaults: {
        ...(actualConfig.agents?.defaults || {}),
        subagents: {
          ...(actualConfig.agents?.defaults?.subagents || {}),
          ...(controlPlane.subagents || {})
        },
        sandbox: {
          ...(actualConfig.agents?.defaults?.sandbox || {}),
          sessionToolsVisibility:
            actualConfig.agents?.defaults?.sandbox?.sessionToolsVisibility ||
            controlPlane.sandbox?.sessionToolsVisibility ||
            "spawned"
        }
      },
      list: agents
    }
  };
}

function toOpenClawConfig(payload) {
  const defaults = sanitizeAgentDefaults(payload.agents?.defaults || {});

  return {
    meta: payload.meta,
    agents: {
      ...(payload.agents ? { defaults } : {}),
      list: (payload.agents?.list || []).map((agent) => {
        const nextAgent = { id: agent.id };
        if (agent.name) {
          nextAgent.name = agent.name;
        }
        if (agent.workspace) {
          nextAgent.workspace = agent.workspace;
        }
        if (agent.model) {
          nextAgent.model = agent.model;
        }
        const allowAgents = normalizeStringList(agent.spawnTargets || []);
        if (allowAgents.length) {
          nextAgent.subagents = { allowAgents };
        }
        return nextAgent;
      })
    },
    tools: sanitizeTools(payload.tools || {}),
    gateway: payload.gateway || {}
  };
}

function toControlPlaneSidecar(payload) {
  const roles = {};
  (payload.agents?.list || []).forEach((agent) => {
    if (agent.id) {
      roles[agent.id] = agent.role || "General";
    }
  });

  return {
    topology: payload.topology || "hub-and-spoke",
    routing: {
      edges: (payload.agents?.list || []).flatMap((agent) =>
        normalizeStringList(agent.spawnTargets || []).map((target) => ({
          from: agent.id,
          to: target
        }))
      )
    },
    subagents: sanitizeSubagentDefaults(payload.agents?.defaults?.subagents || {}),
    sandbox: {
      sessionToolsVisibility:
        payload.agents?.defaults?.sandbox?.sessionToolsVisibility || "spawned"
    },
    roles
  };
}

function mergeConfigs(currentConfig, nextConfig) {
  return {
    ...currentConfig,
    meta: nextConfig.meta || currentConfig.meta,
    agents: {
      ...(currentConfig.agents || {}),
      ...(nextConfig.agents || {})
    },
    tools: {
      ...(currentConfig.tools || {}),
      ...(nextConfig.tools || {})
    },
    gateway: {
      ...(currentConfig.gateway || {}),
      ...(nextConfig.gateway || {})
    }
  };
}

function sanitizeAgentDefaults(defaults) {
  const nextDefaults = { ...defaults };
  nextDefaults.subagents = sanitizeSubagentDefaults(defaults.subagents || {});
  nextDefaults.sandbox = sanitizeSandboxDefaults(defaults.sandbox || {});
  return nextDefaults;
}

function sanitizeSubagentDefaults(subagents) {
  const next = {};
  if (typeof subagents.maxConcurrent === "number" && subagents.maxConcurrent > 0) {
    next.maxConcurrent = Math.floor(subagents.maxConcurrent);
  }
  if (typeof subagents.archiveAfterMinutes === "number" && subagents.archiveAfterMinutes > 0) {
    next.archiveAfterMinutes = Math.floor(subagents.archiveAfterMinutes);
  }
  if (typeof subagents.model === "string" && subagents.model.trim()) {
    next.model = subagents.model.trim();
  }
  if (typeof subagents.thinking === "string" && subagents.thinking.trim()) {
    next.thinking = subagents.thinking.trim();
  }
  return next;
}

function sanitizeSandboxDefaults(sandbox) {
  const next = { ...sandbox };
  if (sandbox.sessionToolsVisibility === "all" || sandbox.sessionToolsVisibility === "spawned") {
    next.sessionToolsVisibility = sandbox.sessionToolsVisibility;
  } else {
    delete next.sessionToolsVisibility;
  }
  return next;
}

function sanitizeTools(tools) {
  const nextTools = {};
  if (tools.profile) {
    nextTools.profile = tools.profile;
  }
  if (tools.agentToAgent) {
    nextTools.agentToAgent = {
      enabled: Boolean(tools.agentToAgent.enabled),
      ...(normalizeStringList(tools.agentToAgent.allow || []).length
        ? { allow: normalizeStringList(tools.agentToAgent.allow || []) }
        : {})
    };
  }
  return nextTools;
}

function detectTopology(agents) {
  const edgeCount = agents.reduce((sum, agent) => sum + normalizeStringList(agent.spawnTargets).length, 0);
  if (!edgeCount) {
    return "swarm";
  }

  const targeted = new Set(agents.flatMap((agent) => normalizeStringList(agent.spawnTargets)));
  const roots = agents.filter((agent) => !targeted.has(agent.id)).length;
  return roots === 1 ? "hub-and-spoke" : "pipeline";
}

function readRuntimeAgents(projected) {
  const configured = projected.agents?.list || [];
  const agentRoot = resolve(join(stateDir, "agents"));
  const seen = new Set();
  const agents = [];

  configured.forEach((agent) => {
    seen.add(agent.id);
    const agentDir = resolve(join(agentRoot, agent.id));
    agents.push({
      ...agent,
      configured: true,
      existsOnDisk: existsSync(agentDir),
      sessionsPath: resolve(join(agentDir, "sessions")),
      sessionToolsVisibility:
        projected.agents?.defaults?.sandbox?.sessionToolsVisibility || "spawned"
    });
  });

  if (existsSync(agentRoot)) {
    readdirSync(agentRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .forEach((entry) => {
        if (seen.has(entry.name)) {
          return;
        }

        const agentDir = resolve(join(agentRoot, entry.name));
        agents.push({
          id: entry.name,
          name: entry.name,
          role: inferRole(entry.name),
          workspace: "",
          model: "",
          spawnTargets: [],
          configured: false,
          existsOnDisk: true,
          sessionsPath: resolve(join(agentDir, "sessions")),
          sessionToolsVisibility:
            projected.agents?.defaults?.sandbox?.sessionToolsVisibility || "spawned"
        });
      });
  }

  return agents;
}

function readSessions(runtimeAgents) {
  const sessions = [];
  runtimeAgents.forEach((agent) => {
    if (!existsSync(agent.sessionsPath)) {
      return;
    }
    walkFiles(agent.sessionsPath, (filePath) => {
      const stats = statSync(filePath);
      sessions.push({
        agentId: agent.id,
        file: filePath.split("/").pop(),
        path: filePath,
        bytes: stats.size,
        updatedAt: stats.mtime.toISOString()
      });
    });
  });
  return sessions.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)).slice(0, 50);
}

function readLogs(runtimeAgents) {
  const candidates = [];
  runtimeAgents.forEach((agent) => {
    const agentRoot = resolve(join(stateDir, "agents", agent.id));
    if (!existsSync(agentRoot)) {
      return;
    }
    walkFiles(agentRoot, (filePath) => {
      if (isLogFile(filePath)) {
        candidates.push(filePath);
      }
    });
  });

  const uniqueFiles = [...new Set(candidates)];
  return uniqueFiles
    .map((filePath) => {
      const stats = statSync(filePath);
      return {
        file: filePath.split("/").pop(),
        path: filePath,
        updatedAt: stats.mtime.toISOString(),
        bytes: stats.size,
        tail: readTail(filePath, 40)
      };
    })
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, 10);
}

function readSubagentRuns() {
  const registry = readJsonFile(subagentRegistryPath, {});
  const runs = registry?.runs;
  if (!runs || typeof runs !== "object") {
    return [];
  }

  return Object.values(runs)
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => ({
      runId: entry.runId || "",
      label: entry.label || "",
      task: entry.task || "",
      outcome: entry.outcome || "running",
      cleanup: entry.cleanup || "keep",
      targetAgentId: extractAgentId(entry.childSessionKey || ""),
      requesterSessionKey: entry.requesterSessionKey || "",
      childSessionKey: entry.childSessionKey || "",
      startedAt: toIso(entry.startedAt),
      endedAt: toIso(entry.endedAt),
      archiveAt: toIso(entry.archiveAtMs)
    }))
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))
    .slice(0, 20);
}

function walkFiles(root, onFile) {
  readdirSync(root, { withFileTypes: true }).forEach((entry) => {
    const fullPath = resolve(join(root, entry.name));
    if (entry.isDirectory()) {
      walkFiles(fullPath, onFile);
      return;
    }
    onFile(fullPath);
  });
}

function isLogFile(filePath) {
  const name = filePath.toLowerCase();
  return (
    name.endsWith(".log") ||
    name.endsWith(".jsonl") ||
    name.endsWith(".ndjson") ||
    name.includes("/logs/")
  );
}

function readTail(filePath, lineCount) {
  try {
    return readFileSync(filePath, "utf8").split("\n").slice(-lineCount).join("\n").trim();
  } catch {
    return "";
  }
}

function readJsonFile(pathname, fallback) {
  try {
    if (!existsSync(pathname)) {
      return fallback;
    }
    return JSON5.parse(readFileSync(pathname, "utf8"));
  } catch {
    return fallback;
  }
}

function readOpenClawVersion() {
  try {
    const pkg = JSON.parse(readFileSync("/usr/lib/node_modules/openclaw/package.json", "utf8"));
    return pkg.version || null;
  } catch {
    return null;
  }
}

function resolveStateDir() {
  const override = process.env.OPENCLAW_STATE_DIR?.trim() || process.env.CLAWDBOT_STATE_DIR?.trim();
  return override ? resolveUserPath(override) : resolve(join(homedir(), ".openclaw"));
}

function resolveConfigPath(activeStateDir) {
  const override = process.env.OPENCLAW_CONFIG_PATH?.trim() || process.env.CLAWDBOT_CONFIG_PATH?.trim();
  return override ? resolveUserPath(override) : resolve(join(activeStateDir, "openclaw.json"));
}

function resolveUserPath(value) {
  return value.startsWith("~") ? resolve(value.replace(/^~(?=$|[\\/])/, homedir())) : resolve(value);
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload));
}

function readJsonBody(request) {
  return new Promise((resolvePromise, rejectPromise) => {
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 2_000_000) {
        rejectPromise(new Error("Payload too large"));
      }
    });
    request.on("end", () => {
      try {
        resolvePromise(raw ? JSON.parse(raw) : {});
      } catch {
        rejectPromise(new Error("Body must be valid JSON"));
      }
    });
    request.on("error", rejectPromise);
  });
}

function runOpenClaw(args) {
  return new Promise((resolvePromise, rejectPromise) => {
    const command = `timeout 15s openclaw ${args.map(shellEscape).join(" ")}`;
    execFile("bash", ["-lc", command], (error, stdout, stderr) => {
      if (error && error.code === "ENOENT") {
        rejectPromise(new Error("openclaw command not found"));
        return;
      }
      resolvePromise({
        code: error?.code ?? 0,
        stdout,
        stderr
      });
    });
  });
}

function shellEscape(value) {
  return `'${String(value).replaceAll("'", `'\\''`)}'`;
}

function normalizeStringList(values) {
  const unique = [];
  (Array.isArray(values) ? values : []).forEach((value) => {
    const next = String(value).trim();
    if (!next || unique.includes(next)) {
      return;
    }
    unique.push(next);
  });
  return unique;
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

function extractAgentId(sessionKey) {
  const match = String(sessionKey).match(/^agent:([^:]+):subagent:/);
  return match?.[1] || "";
}

function toIso(value) {
  return typeof value === "number" && Number.isFinite(value) ? new Date(value).toISOString() : null;
}
