# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Anonymous WebSocket Chat** — A serverless, single-channel, anonymous chat room. Fully serverless AWS backend + static React frontend hosted on GitHub Pages.

## Repository Structure

```
ai_course_2/
├── webui/                    # React + Vite + TypeScript frontend
│   ├── index.html            # Entry HTML; loads Google Fonts (Funnel Sans, Inter)
│   ├── package.json          # React 18, TypeScript 5, Vite 5
│   ├── vite.config.ts        # base: '/ai_course_2/' for GitHub Pages
│   ├── tsconfig.json
│   ├── images/               # Illustration assets (imported as ES modules by Vite)
│   └── src/
│       ├── App.tsx           # Root: routes between JoinScreen and ChatScreen
│       ├── config.ts         # VITE_WS_ENDPOINT env var
│       ├── types/index.ts    # ChatMessage, SystemEvent, ConnectionStatus interfaces
│       ├── hooks/
│       │   └── useWebSocket.ts   # WebSocket lifecycle: connect (Promise), auto-reconnect
│       ├── components/
│       │   ├── JoinScreen.tsx    # Two-panel desktop / stacked mobile; callsign validation
│       │   ├── ChatScreen.tsx    # Header + connection banners + message list + input
│       │   ├── MessageList.tsx   # Scrollable list; auto-scrolls only when near bottom
│       │   ├── MessageItem.tsx   # System event / own (green right) / other (avatar left)
│       │   ├── MessageInput.tsx  # Pill input + send button; Enter to send
│       │   └── StatusIndicator.tsx  # Connection status badge with aria-live
│       └── styles/
│           └── global.css    # CSS custom properties (design tokens), reset
├── lambda/
│   ├── connect/connect.py         # $connect → DynamoDB PUT (connectionId + callsign)
│   ├── disconnect/disconnect.py   # $disconnect → DynamoDB DELETE
│   └── send_message/send_message.py  # sendMessage → DynamoDB SCAN + PostToConnection fan-out
├── template.yaml             # AWS SAM template — defines all AWS resources
└── documents/                # Architecture and spec docs
```

## Architecture

**Backend:** AWS API Gateway v2 (WebSocket) routes to 3 Python 3.12 Lambda functions. DynamoDB `ChatConnections` table stores only active connections (PK: `connectionId`). No message persistence — ephemeral delivery only.

**Frontend:** React SPA connects via WebSocket to API Gateway. `callsign` passed as query param on connect; server resolves it from DynamoDB on `sendMessage` to prevent spoofing. WebSocket endpoint configured via `VITE_WS_ENDPOINT` env var.

**Route selection:** `$request.body.action` — client sends `{"action": "sendMessage", "text": "..."}`.

**Broadcast:** `send_message` Lambda scans DynamoDB for all active `connectionId`s and calls `PostToConnection`. On `GoneException` (410), it deletes the stale connection.

## Frontend Implementation Notes

**Design source:** `webui/ui_design.pen` (Pencil design file — open with Pencil MCP tools, not a text editor).

**Design tokens (CSS custom properties in `global.css`):**
- `--color-primary: #72D350` — green (buttons, own message bubbles, header)
- `--color-primary-dark: #5CBF3A` — darker green (status dot, hover states)
- `--color-bg: #FAF7F2` — warm off-white background
- `--color-text-secondary: #4B5563`
- `--color-border: #E5E5E5`

**WebSocket hook (`useWebSocket.ts`) key behaviours:**
- `connect(callsign)` returns a `Promise<void>` — resolves on first `onopen`, rejects on initial failure. `App.tsx` awaits this before transitioning to the chat screen.
- Reconnect schedule on unexpected disconnect: 2 s → 4 s → 8 s → 16 s → 30 s, then `status = 'failed'`. Manual reconnect resets the counter.
- All mutable WebSocket state lives in refs (`wsRef`, `callsignRef`, etc.) so `useCallback` deps stay stable and closures in `onclose`/`setTimeout` always read fresh values.

**Callsign avatar colors:** deterministic hash of callsign string → one of 6 colors (green, indigo, amber, pink, cyan, violet).

**Responsive breakpoints:**
- `< 768px` — mobile: stacked join panels, compact messages, 40px send button
- `768–1024px` — tablet: reduced padding
- `> 1024px` — desktop: side-by-side join panels, full padding

## Frontend Commands

```bash
cd webui
npm install
npm run dev        # Dev server at http://localhost:5173
npm run build      # Output: webui/dist/
```

**Local dev environment variable** — create `webui/.env.local`:
```
VITE_WS_ENDPOINT=wss://{your-api-id}.execute-api.{region}.amazonaws.com/prod
```

## Backend (AWS SAM) Commands

```bash
# Verify prerequisites
aws sts get-caller-identity
sam --version

# Build and deploy
sam validate --template template.yaml
sam build
sam deploy --no-confirm-changeset   # Requires samconfig.toml from prior guided deploy

# First-time deploy (human must run interactively)
sam deploy --guided   # Stack name: anonymous-chat, region: us-west-2

# Get WebSocket endpoint
aws cloudformation describe-stacks \
  --stack-name anonymous-chat \
  --query "Stacks[0].Outputs[?OutputKey=='WebSocketUrl'].OutputValue" \
  --output text

# Logs
sam logs -n ConnectFunction --stack-name anonymous-chat --tail
sam logs -n SendMessageFunction --stack-name anonymous-chat --tail

# Check active connections
aws dynamodb scan --table-name ChatConnections

# Teardown
sam delete --stack-name anonymous-chat --no-prompts
```

## Key Design Constraints

- **DynamoDB `TABLE_NAME`** is injected automatically by SAM via environment variable — never hardcode the table name in Lambda code.
- **`callsign` is NOT sent in `sendMessage` payloads** — it is looked up from DynamoDB by `connectionId` to prevent spoofing.
- **SCAN is intentional** — acceptable for demo scale; not a bug.
- **No message history** — deliberate design choice; messages are ephemeral.
- **Vite `base` must be `/ai_course_2/`** — required for GitHub Pages routing to work correctly.

## AWS Infrastructure (SAM-managed)

| Resource | Name | Notes |
|----------|------|-------|
| WebSocket API | `AnonymousChatWebSocketApi` | Route selection: `$request.body.action` |
| DynamoDB table | `ChatConnections` | PAY_PER_REQUEST, PK: `connectionId` |
| Lambda functions | `chat-connect`, `chat-disconnect`, `chat-send-message` | Python 3.12, 128 MB, 10s timeout |

`send_message` Lambda additionally requires `execute-api:ManageConnections` IAM permission (included in SAM template).

## Human-Only Steps

These require interactive input or credentials and cannot be automated:
- `sam deploy --guided` (first deploy only)
- `aws configure` (credentials setup)
- GitHub Pages configuration (Settings → Pages in GitHub UI)
