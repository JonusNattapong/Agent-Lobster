# Agent-Lobster: OpenClaw Multi-Agent Setup

## OpenClaw Agent Control (เว็บจัดการ Agent / Sub-agent)

มีหน้าเว็บแดชบอร์ดสำหรับจัดการ topology ของ agent, เส้นทาง `sessions_spawn`,
sub-agent policy, gateway settings และ export config JSON ได้ในโฟลเดอร์ `web/`

### วิธีเปิดเว็บ

```bash
npm run dev
```

จากนั้นเปิด `http://localhost:4173`

### ความสามารถหลัก

- เพิ่ม/ลบ/แก้ไข agent และกำหนด `allowAgents` สำหรับ sub-agent routing ได้จากหน้าเดียว
- เลือก topology แบบ Hub-and-Spoke, Pipeline, หรือ Swarm
- ปรับ gateway mode, bind, port, `agents.defaults.sandbox.sessionToolsVisibility` และ `tools.agentToAgent`
- ปรับ `agents.defaults.subagents` เช่น `maxConcurrent`, `archiveAfterMinutes`, `model`, `thinking`
- Import JSON config เดิม แล้ว export กลับเป็น control-plane config ได้
- ดู graph topology และ JSON preview แบบสด
- Sync เข้า `~/.openclaw/openclaw.json` ได้ตรงจากหน้าเว็บ
- สั่ง refresh, validate และ restart gateway ได้จากหน้าเว็บ

### Sync เข้า OpenClaw จริง

เมื่อกด `Sync เข้า OpenClaw` เว็บจะทำสิ่งนี้:

- เขียนค่าหลักของ OpenClaw ลง `~/.openclaw/openclaw.json`
- สำรองไฟล์เดิมไว้เป็น `~/.openclaw/openclaw.json.bak.web`
- เก็บ metadata ของ topology / role / session visibility ไว้ที่ `~/.openclaw/openclaw-control-plane.json`
- สร้างโฟลเดอร์ workspace ของ agent ที่ยังไม่มีให้อัตโนมัติ

เหตุผลที่แยก metadata ไปไว้ sidecar file เพราะข้อมูลอย่าง topology เป็นของหน้า dashboard นี้
แต่ routing ของ sub-agent จริงจะ sync ลง `agents.list[].subagents.allowAgents` โดยตรง

> หมายเหตุ: routing ของ sub-agent จะถูก map เข้า `agents.list[].subagents.allowAgents`
> policy จะ map เข้า `agents.defaults.subagents`
> และ session tools visibility จะ map เข้า `agents.defaults.sandbox.sessionToolsVisibility`

## ความต้องการ (Requirements)

| รายการ | รุ่นที่แนะนำ |
|--------|--------------|
| Node.js | 22.12.0+ |
| OpenClaw | 2026.3.7+ |
| RAM | 8GB+ |
| API Key | KiloCode / OpenAI / Anthropic |

## 🚀 Quick Start (5 นาที)

### ขั้นตอนที่ 1: ติดตั้ง OpenClaw

```bash
# ติดตั้ง via npm
npm install -g openclaw

# หรือ via pnpm
pnpm add -g openclaw

# ตรวจสอบการติดตั้ง
openclaw --version
```

### ขั้นตอนที่ 2: Setup ครั้งแรก

```bash
# Run setup wizard
openclaw onboard

# หรือ config เอง
openclaw config set models.providers.kilocode.api "openai-completions"
```

### ขั้นตอนที่ 3: สร้าง Agent แรก

```bash
# สร้าง agent ใหม่
openclaw agents add researcher --non-interactive --workspace "~/.openclaw/agents/researcher"

# สร้างอีกตัวสำหรับ writer
openclaw agents add writer --non-interactive --workspace "~/.openclaw/agents/writer"

# ดูรายชื่อ agents
openclaw agents list
```

### ขั้นตอนที่ 4: เปิด Cross-Agent Communication

```bash
# เปิด session visibility
openclaw config set tools.sessions.visibility all

# เปิด agent-to-agent
openclaw config set tools.agentToAgent.enabled true

# Restart gateway
openclaw gateway restart
```

### ขั้นตอนที่ 5: ทดสอบ

```bash
# Test agent แรก
openclaw agent --agent researcher --message "What is quantum computing?" --local

# Test cross-agent
openclaw agent --agent main --message "Ask researcher: What is quantum computing?" --local
```

---

## 🏗️ สถาปัตยกรรม Multi-Agent

### Pattern 1: Hub-and-Spoke (แนะนำ)

```
                    ┌─────────────┐
                    │    MAIN     │
                    │ (Coordinator)│
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
   ┌──────────┐     ┌──────────┐     ┌──────────┐
   │Researcher│     │  Writer  │     │  Coder   │
   └──────────┘     └──────────┘     └──────────┘
```

**Config:**
```json
{
  "agents": {
    "list": [
      { "id": "main", "name": "Coordinator" },
      { "id": "researcher", "name": "Researcher" },
      { "id": "writer", "name": "Writer" },
      { "id": "coder", "name": "Coder" }
    ]
  }
}
```

### Pattern 2: Pipeline (ลำดับขั้น)

```
Input → Researcher → Writer → Editor → Output
```

### Pattern 3: Swarm (ขนาน)

```
        ┌─ Researcher ─┐
Input ──┼─ Writer    ─┼─ Output (รวมผล)
        └─ Coder     ─┘
```

---

## ⚙️ Config แบบเต็ม

```json
{
  "meta": {
    "lastTouchedVersion": "2026.3.7"
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "kilocode/minimax/minimax-m2.5:free",
        "fallbacks": []
      },
      "models": {
        "kilocode/minimax/minimax-m2.5:free": {}
      },
      "workspace": "~/.openclaw/workspace",
      "heartbeat": {
        "every": "30m",
        "suppressToolErrorWarnings": false
      },
      "imageMaxDimensionPx": 1200
    },
    "list": [
      {
        "id": "main",
        "name": "Main Agent",
        "workspace": "~/.openclaw/workspace"
      },
      {
        "id": "researcher",
        "name": "Research Agent",
        "workspace": "~/.openclaw/agents/researcher",
        "model": "kilocode/minimax/minimax-m2.5:free"
      },
      {
        "id": "writer",
        "name": "Writer Agent",
        "workspace": "~/.openclaw/agents/writer",
        "model": "kilocode/minimax/minimax-m2.5:free"
      }
    ]
  },
  "tools": {
    "sessions": {
      "visibility": "all"
    },
    "agentToAgent": {
      "enabled": true
    },
    "profile": "coding"
  },
  "gateway": {
    "port": 18789,
    "mode": "local",
    "bind": "loopback",
    "auth": {
      "mode": "token",
      "token": "your-secure-token-here"
    }
  },
  "session": {
    "dmScope": "main"
  }
}
```

---

## 🔧 Commands ที่ใช้บ่อย

### Agent Management
```bash
# สร้าง agent
openclaw agents add <name> [--workspace <path>]

# ลบ agent
openclaw agents delete <name>

# ดูรายชื่อ
openclaw agents list

# Bind ไป channel
openclaw agents bind <agent> --bind telegram

# ดู bindings
openclaw agents bindings
```

### Session Management
```bash
# ดู sessions ทั้งหมด
openclaw sessions

# ดู sessions ของ agent เฉพาะ
openclaw sessions --agent researcher

# ดู sessions ทุก agent
openclaw sessions --all-agents

# ดู session ใกล้ชิด (2 ชม. ล่าสุด)
openclaw sessions --active 120
```

### Gateway
```bash
# เริ่ม gateway
openclaw gateway start

# Restart
openclaw gateway restart

# ดู status
openclaw gateway status
```

### Config
```bash
# ดู config
openclaw config get <path>

# ตั้งค่า
openclaw config set <path> <value>

# ลบค่า
openclaw config unset <path>

# ตรวจสอบ config
openclaw config validate

# ดู config file path
openclaw config file
```

### Testing
```bash
# Test agent (local/embedded)
openclaw agent --agent <name> --message "hello" --local

# Test ผ่าน gateway
openclaw agent --agent <name> --message "hello"

# พร้อม deliver กลับไป channel
openclaw agent --agent <name> --message "hello" --deliver

# Output JSON
openclaw agent --agent <name> --message "hello" --json
```

---

## 💡 Tips & Tricks

### 1. Memory Isolation
แต่ละ agent ควรมี workspace แยกกัน เพื่อป้องกัน memory leak:

```json
{
  "id": "researcher",
  "workspace": "~/.openclaw/agents/researcher"
}
```

### 2. Model Selection
- **Coding**: `kilocode/kilo/auto` หรือ `claude-sonnet`
- **Writing**: `kilocode/minimax/minimax-m2.5:free` หรือ `gpt-4o`
- **Research**: ใช้ reasoning model

### 3. Sub-Agents (Spawn)

Spawn คือการสร้าง sub-agent ชั่วคราวทำงานแล้วจบ:

```bash
# เช็ค config subagents
openclaw config get agents.defaults.subagents

# ตั้ง max concurrent
openclaw config set agents.defaults.subagents.maxConcurrent 8
openclaw gateway restart
```

**Config ที่ต้องมี:**
```json
{
  "agents": {
    "defaults": {
      "subagents": {
        "maxConcurrent": 8
      }
    }
  },
  "tools": {
    "profile": "coding"
  }
}
```

**การใช้งานใน Agent:**
```python
# Spawn sub-agent (ไม่ต้องระบุ agentId)
sessions_spawn(
    task="What is 2+2? Answer briefly",
    timeoutSeconds=120
)
```

**หมายเหตุ:**
- Sub-agent จะ spawn ใน session ของ main agent เอง
- ใช้ `timeoutSeconds` ให้เพียงพอ (60-120วินาที)
- ถ้าได้ NO_REPLY แปลว่า timeout สั้นเกินไป

### 4. Cost Optimization
```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "cheap-model",
        "fallbacks": ["expensive-model"]
      }
    }
  }
}
```

### 4. Session Management
```bash
# ลบ session เก่า
openclaw sessions --agent researcher
# แล้วลบ manual ที่ ~/.openclaw/agents/researcher/sessions/

# หรือใช้ cleanup
openclaw sessions cleanup
```

### 5. Heartbeat Configuration
```json
{
  "heartbeat": {
    "every": "30m",    // ทุก 30 นาที
    "suppressToolErrorWarnings": false
  }
}
```

### 6. Channel Binding
```bash
# Bind Telegram bot ไปยัง agent เฉพาะ
openclaw agents bind researcher --bind telegram:researcher_bot

# Bind WhatsApp
openclaw agents bind writer --bind whatsapp
```

### 7. Debugging
```bash
# Verbose mode
openclaw agent --agent researcher --message "test" --verbose on

# ดู logs
openclaw logs --agent researcher

# Doctor check
openclaw doctor
```

---

## 🔐 Security Best Practices

### 1. อย่าเปิด DM สาธารณะ
```json
{
  "channels": {
    "telegram": {
      "dmPolicy": "pairing"
    }
  }
}
```

### 2. ใช้ Token Auth
```json
{
  "gateway": {
    "auth": {
      "mode": "token",
      "token": "use-secure-random-token"
    }
  }
}
```

### 3. จำกัด Session Visibility
```json
{
  "tools": {
    "sessions": {
      "visibility": "self"  // หรือ "all" ถ้าต้องการ cross-agent
    }
  }
}
```

### 4. Sandbox Mode (สำหรับ Group)
```json
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "non-main"
      }
    }
  }
}
```

---

## 🐛 Troubleshooting

### Error: "Session not found"
```bash
# ดู sessions ทั้งหมด
openclaw sessions --all-agents --json
```

### Error: "visibility restricted"
```bash
# เช็ค config
openclaw config get tools.sessions.visibility

# ถ้ายังไม่ได้ เปิดใหม่
openclaw config set tools.sessions.visibility all
openclaw gateway restart
```

### Error: "No model configured"
```bash
# เช็ค models
openclaw models list

# เพิ่ม model
openclaw config set agents.defaults.model.primary "kilocode/minimax/minimax-m2.5:free"
```

### Gateway ไม่ตอบ
```bash
# Restart
openclaw gateway restart

# ดู status
openclaw health

# ดู logs
openclaw logs
```

---

## 📁 โครงสร้างไฟล์

```
~/.openclaw/
├── openclaw.json              # Main config
├── credentials/               # API keys, tokens
├── sessions/                  # Global sessions
├── agents/
│   ├── main/                  # Main agent
│   │   ├── sessions/
│   │   └── agent/
│   ├── researcher/            # Researcher agent
│   │   ├── sessions/
│   │   └── agent/
│   └── writer/                # Writer agent
│       ├── sessions/
│       └── agent/
└── workspace/                 # Shared workspace (optional)
```

---

## 🔗 Resources

- เอกสาร: https://docs.openclaw.ai
- Discord: https://discord.gg/openclaw
- GitHub: https://github.com/openclaw/openclaw
- ClawdHub (Skills): https://clawdhub.com

---

## 🤖 วิธีให้ Agent คุยกันเอง (Auto Communication)

มี 4 วิธีหลัก:

### วิธีที่ 1: sessions_send (ส่งข้อความไปหา)

ส่งข้อความไปยัง session อื่นแบบ persistent:

```
MAIN ──send──→ RESEARCHER ──send──→ WRITER ──send──→ MAIN
```

**ใน Agent:**
```python
# ส่งข้อความไปหา researcher
sessions_send(
    sessionKey="agent:researcher:main",
    message="ค้นหาข้อมูลเกี่ยวกับ AI",
    timeoutSeconds=120
)
```

**ผ่าน CLI:**
```bash
openclaw agent --agent main --message "Send to researcher: What is quantum computing?" --local
```

### วิธีที่ 2: sessions_spawn (สร้าง Sub-Agent ชั่วคราว)

สร้าง sub-agent ทำงานเสร็จแล้วจบ:

```python
sessions_spawn(
    agentId="researcher",
    message="Research: Latest AI news",
    timeoutSeconds=300
)
```

**Config เพิ่มเติม:**
```json
{
  "tools": {
    "subagents": {
      "enabled": true,
      "allow": ["researcher", "writer"]
    }
  }
}
```

### วิธีที่ 3: Multi-Agent Routing (Auto Route)

Route ข้อความไปยัง agent ที่เหมาะสมอัตโนมัติตาม channel/sender:

```json
{
  "agents": {
    "list": [
      { "id": "main" },
      { "id": "researcher" },
      { "id": "writer" }
    ],
    "bindings": [
      {
        "agentId": "researcher",
        "match": {
          "channel": "telegram",
          "accountId": "research_bot"
        }
      },
      {
        "agentId": "writer", 
        "match": {
          "channel": "telegram",
          "accountId": "writer_bot"
        }
      }
    ]
  }
}
```

**Bind via CLI:**
```bash
openclaw agents bind researcher --bind telegram:research_bot
openclaw agents bind writer --bind telegram:writer_bot
```

### วิธีที่ 4: Hub-and-Spoke (Coordinator Pattern)

```
                    ┌─────────────┐
     User ────────► │    MAIN     │ ◄─── รับผลลัพธ์
                    │(Coordinator)│
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
   ┌──────────┐      ┌──────────┐      ┌──────────┐
   │Researcher│      │  Writer  │      │  Coder   │
   │ (ค้นหา)  │      │ (เขียน)   │      │ (เขียนโค้ด)│
   └────┬─────┘      └────┬─────┘      └────┬─────┘
        │                 │                  │
        └─────────────────┴──────────────────┘
                    │
                    ▼ (ส่งผลลัพธ์กลับ)
              ┌──────────┐
              │    MAIN  │
              └──────────┘
```

**Example Prompt สำหรับ Main:**
```
You are a coordinator. When user asks:
- For research → use sessions_send to ask researcher agent
- For writing → use sessions_send to ask writer agent  
- For coding → use sessions_send to ask coder agent

Use sessions_spawn for background tasks.
Use sessions_list to see available agents.
```

---

## 📡 Session Tools Reference

| Tool | คำอธิบาย | ตัวอย่าง |
|------|----------|----------|
| `sessions_list` | ดู sessions ทั้งหมด | ดูว่ามีใคร online |
| `sessions_send` | ส่งข้อความไป session | ส่งงานให้ agent อื่น |
| `sessions_history` | ดูประวัติ session | ดูว่า agent อื่นทำอะไร |
| `session_status` | ดูสถานะ session | ดู token usage |
| `sessions_spawn` | สร้าง sub-agent | สร้าง task ชั่วคราว |

---

## ⚙️ Config สำหรับ Multi-Agent

```json
{
  "tools": {
    "sessions": {
      "visibility": "all"
    },
    "agentToAgent": {
      "enabled": true
    },
    "subagents": {
      "enabled": true,
      "allow": ["researcher", "writer", "coder"]
    }
  },
  "agents": {
    "bindings": [
      {
        "agentId": "researcher",
        "match": { "channel": "telegram" }
      }
    ]
  }
}
```

---

## 🎯 Workflow Examples

### Example 1: Research → Write Pipeline

**Main Agent Prompt:**
```
When user asks to research and write about a topic:
1. Use sessions_spawn to create researcher agent
2. Wait for research results
3. Use sessions_spawn to create writer agent with research context
4. Return final output to user
```

**ทดสอบ:**
```bash
openclaw agent --agent main --message "Research and write about quantum computing" --local
```

### Example 2: Parallel Tasks

**Main Agent:**
```
User wants: summarize 3 articles

Use sessions_spawn 3 times in parallel:
- Spawn agent1: summarize article A
- Spawn agent2: summarize article B  
- Spawn agent3: summarize article C

Combine all summaries and present to user.
```

### Example 3: Sequential Handoff

**Researcher Agent:**
```
After completing research, send results to writer:
sessions_send(
    sessionKey="agent:writer:main",
    message="Here is the research: [results]"
)
```

---

## 🐛 Troubleshooting Cross-Agent

### Error: "visibility restricted"
```bash
openclaw config set tools.sessions.visibility all
openclaw gateway restart
```

### Error: "agentToAgent not enabled"
```bash
openclaw config set tools.agentToAgent.enabled true
openclaw gateway restart
```

### Error: "Session not found"
```bash
# ดู session key ที่ถูกต้อง
openclaw sessions --all-agents --json
```

### Sub-agent ไม่มี tools
```bash
openclaw config set tools.subagents.enabled true
openclaw config set tools.subagents.allow '["researcher", "writer"]'
```

---

## 📋 Cheat Sheet

```bash
# Setup
openclaw onboard
openclaw doctor

# Agents
openclaw agents list
openclaw agents add <name>
openclaw agents delete <name>

# Test
openclaw agent --agent <name> --message "hi" --local

# Cross-agent
openclaw sessions --all-agents
openclaw agent --agent main --message "Ask writer: write about AI" --local

# Config
openclaw config get agents.defaults.model.primary
openclaw config set tools.agentToAgent.enabled true
openclaw gateway restart
```
