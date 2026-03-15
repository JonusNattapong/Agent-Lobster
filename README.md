# Agent-Lobster: OpenClaw Multi-Agent Setup

## OpenClaw Agent Control (เว็บจัดการ Agent / Sub-agent)

มีหน้าเว็บแดชบอร์ดสำหรับจัดการ topology ของ agent, เส้นทาง `sessions_spawn`,
sub-agent policy, gateway settings และ export config JSON ได้ในโฟลเดอร์ `web/`

### วิธีเปิดเว็บ

Step 1: ติดตั้ง dependency ที่จำเป็น

เหตุผล:
ตัวเว็บตัวนี้ใช้ Node.js เสิร์ฟหน้า dashboard และเรียก API ฝั่ง backend เพื่ออ่าน/เขียน
config ของ OpenClaw ในเครื่องเดียวกัน

```bash
npm run dev
```

ตัวอย่างสิ่งที่ควรเห็น:

```txt
OpenClaw Agent Control running at http://localhost:4173
```

Step 2: เปิดเว็บใน browser

เหตุผล:
หน้า dashboard จะอ่าน config ปัจจุบันจาก `~/.openclaw/openclaw.json` แล้วแสดงเป็นฟอร์มให้แก้ได้

จากนั้นเปิด `http://localhost:4173`

Step 3: กด `Refresh จาก OpenClaw`

เหตุผล:
เพื่อโหลด config ล่าสุดจากเครื่องก่อนแก้ ป้องกันเขียนทับค่าที่เพิ่งเปลี่ยนจาก CLI หรือจากเครื่องอื่น

ตัวอย่างสิ่งที่ควรเห็นบนหน้าเว็บ:

- `OpenClaw version` เช่น `2026.2.3-1`
- `Config path` เช่น `~/.openclaw/openclaw.json`
- รายชื่อ agent ที่มีอยู่จริงใน config

Step 4: ปรับค่าในหน้าเว็บ

ตัวอย่าง:

- แก้ `main` ให้มี `Spawn targets` เป็น `researcher, writer`
- ตั้ง `Sub-agent model` เป็น `openai/gpt-5-mini`
- ตั้ง `Archive after minutes` เป็น `60`
- เปิด `Agent-to-agent communication`
- ตั้ง `Agent-to-agent allow` เป็น `*`

Step 5: กด `Sync เข้า OpenClaw`

เหตุผล:
ระบบจะเขียนค่าลง config จริงของ OpenClaw และสร้าง backup ให้ก่อนทุกครั้ง

ตัวอย่างสิ่งที่เกิดขึ้น:

- อัปเดต `~/.openclaw/openclaw.json`
- สร้าง `~/.openclaw/openclaw.json.bak.web`
- อัปเดต `~/.openclaw/openclaw-control-plane.json`

Step 6: กด `Validate Config`

เหตุผล:
เพื่อเช็กว่าคีย์ใน config เข้ากับ OpenClaw รุ่นที่ติดตั้งอยู่จริง

ตัวอย่าง:

```bash
openclaw doctor
```

ถ้า config ผ่าน ปุ่มนี้จะแสดงผลแบบ success
ถ้าไม่ผ่าน จะเห็นข้อความ error บนแถบสถานะของเว็บ

Step 7: ถ้าจำเป็นให้กด `Restart Gateway`

เหตุผล:
ค่าบางอย่าง เช่น gateway หรือ policy ของ tools จะมีผลชัดหลัง restart

ตัวอย่าง:

```bash
openclaw gateway restart
```

Step 8: ทดสอบใช้งานจริง

ตัวอย่าง 1:
ทดสอบ agent เดี่ยว

```bash
openclaw agent --agent main --message "hello" --local
```

ตัวอย่าง 2:
ทดสอบ spawn route

```bash
openclaw agent --agent main --message "Spawn researcher to summarize this topic" --local
```

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

อธิบาย:
ต้องมี `openclaw` CLI ก่อน เพราะ dashboard ตัวนี้ใช้ config และ runtime ของ OpenClaw ที่ติดตั้งอยู่ในเครื่องจริง

```bash
# ติดตั้ง via npm
npm install -g openclaw

# หรือ via pnpm
pnpm add -g openclaw

# ตรวจสอบการติดตั้ง
openclaw --version
```

ตัวอย่างผลลัพธ์:

```txt
2026.2.3-1
```

### ขั้นตอนที่ 2: Setup ครั้งแรก

อธิบาย:
ถ้ายังไม่เคย onboard มาก่อน ให้รัน wizard เพื่อสร้าง config และตั้ง provider/model พื้นฐาน

```bash
# Run setup wizard
openclaw onboard

# หรือ config เอง
openclaw config set models.providers.kilocode.api "openai-completions"
```

ตัวอย่างสิ่งที่ควรเกิดขึ้น:

- มีโฟลเดอร์ `~/.openclaw/`
- มีไฟล์ `~/.openclaw/openclaw.json`

### ขั้นตอนที่ 3: สร้าง Agent แรก

อธิบาย:
agent คือ persona หรือ worker แต่ละตัว เช่น `main`, `researcher`, `writer`, `coder`

```bash
# สร้าง agent ใหม่
openclaw agents add researcher --non-interactive --workspace "~/.openclaw/agents/researcher"

# สร้างอีกตัวสำหรับ writer
openclaw agents add writer --non-interactive --workspace "~/.openclaw/agents/writer"

# ดูรายชื่อ agents
openclaw agents list
```

ตัวอย่างผลลัพธ์ที่คาดหวัง:

```txt
main
researcher
writer
```

### ขั้นตอนที่ 4: เปิด Cross-Agent Communication

อธิบาย:
ถ้าอยากให้ agent คุยกันเองหรือดู session ข้ามกันได้ ต้องเปิด policy ที่เกี่ยวข้องก่อน

หมายเหตุ:
บางเวอร์ชันของ OpenClaw ใช้ `agents.defaults.sandbox.sessionToolsVisibility`
แทน `tools.sessions.visibility`

```bash
# เปิด session tools visibility (รุ่นใหม่)
openclaw config set agents.defaults.sandbox.sessionToolsVisibility all

# เปิด agent-to-agent
openclaw config set tools.agentToAgent.enabled true

# Restart gateway
openclaw gateway restart
```

ตัวอย่างผลลัพธ์ที่ควรเช็กต่อ:

```bash
openclaw config get agents.defaults.sandbox.sessionToolsVisibility
openclaw config get tools.agentToAgent.enabled
```

### ขั้นตอนที่ 5: ทดสอบ

อธิบาย:
เริ่มจากยิง agent เดี่ยวก่อน จากนั้นค่อยทดสอบงานที่เกี่ยวข้องกับ multi-agent หรือ sub-agent

```bash
# Test agent แรก
openclaw agent --agent researcher --message "What is quantum computing?" --local

# Test sub-agent / routing
openclaw agent --agent main --message "Spawn researcher to explain quantum computing briefly" --local
```

ตัวอย่างการตีความผลลัพธ์:

- ถ้า agent ตอบกลับตามปกติ แปลว่า model/config หลักทำงาน
- ถ้า main สามารถเรียก worker อื่นได้ แปลว่า routing/sub-agent policy ใช้งานได้
- ถ้าติดเรื่อง policy ให้เช็ก `allowAgents`, `tools.agentToAgent`, และ `sessionToolsVisibility`

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

## 🧪 Example Scenarios

ด้านล่างคือ use case แบบ end-to-end ที่ทำตามได้จริง
แต่ละ scenario จะมี:

- เป้าหมาย
- config ตัวอย่าง
- วิธีตั้งใน dashboard
- วิธีทดสอบผ่าน CLI
- ผลลัพธ์ที่คาดหวัง

### Scenario 1: `main -> researcher -> writer`

เป้าหมาย:
ให้ `main` เป็น coordinator รับโจทย์จากผู้ใช้ จากนั้นใช้ `researcher`
ช่วยหาข้อมูล แล้วส่งต่อให้ `writer` เรียบเรียงคำตอบสุดท้าย

เหมาะกับ:

- research + summarize
- blog draft
- report draft

Config ตัวอย่าง:

```json
{
  "agents": {
    "defaults": {
      "workspace": "~/.openclaw/workspace",
      "subagents": {
        "maxConcurrent": 4,
        "archiveAfterMinutes": 60,
        "model": "openai/gpt-5-mini",
        "thinking": "low"
      },
      "sandbox": {
        "sessionToolsVisibility": "all"
      }
    },
    "list": [
      {
        "id": "main",
        "name": "Main Agent",
        "workspace": "~/.openclaw/workspace",
        "model": "openai/gpt-5",
        "subagents": {
          "allowAgents": ["researcher", "writer"]
        }
      },
      {
        "id": "researcher",
        "name": "Research Agent",
        "workspace": "~/.openclaw/agents/researcher",
        "model": "openai/gpt-5-mini"
      },
      {
        "id": "writer",
        "name": "Writer Agent",
        "workspace": "~/.openclaw/agents/writer",
        "model": "openai/gpt-5-mini"
      }
    ]
  },
  "tools": {
    "profile": "coding",
    "agentToAgent": {
      "enabled": true,
      "allow": ["*"]
    }
  }
}
```

วิธีตั้งใน dashboard:

1. เพิ่ม agent `main`, `researcher`, `writer`
2. ตั้ง `main -> Spawn targets` เป็น `researcher, writer`
3. ตั้ง `Sub-agent model` เป็น `openai/gpt-5-mini`
4. ตั้ง `Session tools visibility` เป็น `all`
5. เปิด `Agent-to-agent communication`
6. ตั้ง `Agent-to-agent allow` เป็น `*`
7. กด `Sync เข้า OpenClaw`

วิธีทดสอบ:

```bash
openclaw agent --agent main --message "Research recent AI coding assistants and write a short summary in Thai" --local
```

ผลลัพธ์ที่คาดหวัง:

- `main` วิเคราะห์งานและแตกงานย่อย
- `researcher` รับงานเก็บข้อมูลหรือสรุปประเด็น
- `writer` รับงานเรียบเรียง output สุดท้าย
- ใน dashboard จะเห็น `Spawn graph` จาก `main` ไป `researcher` และ `writer`
- ถ้ามี sub-agent run เกิดขึ้นจริง จะเริ่มเห็นใน `Active runs`

### Scenario 2: `main -> coder`

เป้าหมาย:
ให้ `main` คุมบทสนทนา แต่ใช้ `coder` สำหรับ implementation หรือแก้โค้ดโดยเฉพาะ

เหมาะกับ:

- งาน coding task
- งาน refactor
- งานสร้าง script หรือ template

Config ตัวอย่าง:

```json
{
  "agents": {
    "defaults": {
      "subagents": {
        "maxConcurrent": 2,
        "archiveAfterMinutes": 30,
        "model": "openai/gpt-5-mini",
        "thinking": "medium"
      },
      "sandbox": {
        "sessionToolsVisibility": "spawned"
      }
    },
    "list": [
      {
        "id": "main",
        "subagents": {
          "allowAgents": ["coder"]
        }
      },
      {
        "id": "coder",
        "workspace": "~/.openclaw/agents/coder",
        "model": "openai/gpt-5-mini"
      }
    ]
  }
}
```

วิธีตั้งใน dashboard:

1. เพิ่ม `main` และ `coder`
2. ตั้ง `main -> Spawn targets` เป็น `coder`
3. ตั้ง `Session tools visibility` เป็น `spawned`
4. ตั้ง `Max concurrent` เป็น `2`
5. กด `Sync เข้า OpenClaw`

วิธีทดสอบ:

```bash
openclaw agent --agent main --message "Spawn coder to create a Python script that sums values in a CSV file" --local
```

ผลลัพธ์ที่คาดหวัง:

- งาน coding จะถูกผลักไปยัง `coder`
- runtime panel จะเห็น `coder` เป็น target ที่ `main` อนุญาต
- ถ้ามีการ spawn จริง จะเห็น run ใน `Active runs`

### Scenario 3: `main -> researcher`, แล้วให้ `main` สรุปเอง

เป้าหมาย:
ใช้ sub-agent แค่ค้นข้อมูล ส่วน final synthesis ยังอยู่ที่ `main`

เหมาะกับ:

- งานถามตอบ
- briefing
- executive summary

Config ตัวอย่าง:

```json
{
  "agents": {
    "defaults": {
      "subagents": {
        "maxConcurrent": 1,
        "archiveAfterMinutes": 20,
        "model": "openai/gpt-5-mini",
        "thinking": "low"
      }
    },
    "list": [
      {
        "id": "main",
        "model": "openai/gpt-5",
        "subagents": {
          "allowAgents": ["researcher"]
        }
      },
      {
        "id": "researcher",
        "model": "openai/gpt-5-mini"
      }
    ]
  }
}
```

วิธีทดสอบ:

```bash
openclaw agent --agent main --message "Research the latest browser automation tools, then summarize the tradeoffs for a CTO audience" --local
```

ผลลัพธ์ที่คาดหวัง:

- `researcher` ทำหน้าที่เก็บข้อมูล
- `main` เป็นคนสรุปและเรียบเรียงคำตอบสุดท้าย
- output จะมีน้ำเสียงและโครงสร้างที่ถูกคุมโดย `main` มากกว่า scenario 1

### Scenario 4: Parallel `main -> researcher, writer, coder`

เป้าหมาย:
แตกงานหลายก้อนพร้อมกัน แล้วให้ `main` รวมผลกลับมา

เหมาะกับ:

- preparation ก่อนประชุม
- research + draft + prototype
- งานหลายส่วนที่ทำพร้อมกันได้

Config ตัวอย่าง:

```json
{
  "agents": {
    "defaults": {
      "subagents": {
        "maxConcurrent": 3,
        "archiveAfterMinutes": 60,
        "model": "openai/gpt-5-mini",
        "thinking": "low"
      }
    },
    "list": [
      {
        "id": "main",
        "subagents": {
          "allowAgents": ["researcher", "writer", "coder"]
        }
      },
      { "id": "researcher" },
      { "id": "writer" },
      { "id": "coder" }
    ]
  }
}
```

วิธีทดสอบ:

```bash
openclaw agent --agent main --message "Prepare a launch brief: research market signals, draft announcement copy, and sketch an implementation checklist" --local
```

ผลลัพธ์ที่คาดหวัง:

- `main` กระจายงานหลายก้อน
- `researcher`, `writer`, `coder` รับคนละส่วน
- dashboard จะเห็น spawn routes จาก `main` ไปหลาย target
- ถ้ามี registry ของ sub-agent runs จะเห็นหลายรายการใน `Active runs`

### วิธีอ่านผลลัพธ์ว่า scenario ทำงานจริงหรือยัง

เช็กจาก 4 จุดนี้:

1. `JSON Preview` ต้องมี target routing ตามที่ตั้งไว้
2. หลัง sync แล้วใน `~/.openclaw/openclaw.json` ต้องเห็น `subagents.allowAgents`
3. panel `Agents from OpenClaw` ต้องสะท้อน target list เดียวกัน
4. ถ้ามีการ spawn จริงและ OpenClaw เขียน registry จะเห็นข้อมูลใน `Active runs`

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
