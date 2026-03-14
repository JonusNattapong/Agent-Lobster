# Agent-Lobster: OpenClaw Multi-Agent Setup

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
    "profile": "messaging"
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

### 3. Cost Optimization
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
