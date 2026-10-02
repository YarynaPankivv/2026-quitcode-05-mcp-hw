# LeadDesk MCP server

Stdio MCP-сервер із двома бізнес-дієсловами замість SQL на всю базу:

| Ім'я | Що робить | Анотації |
|---|---|---|
| `leaddesk_find_leads` | ліди за статусом (`any` — усі), найновіші першими; лише `id`, `company`, `status`, `source`, `budget`, `createdAt` | `readOnlyHint: true` |
| `leaddesk_set_lead_status` | змінює статус ліда й пише запис аудиту `{ action, leadId, at, from, to, reason }` | `readOnlyHint: false` |
| `leaddesk://reference/statuses` | ресурс `text/markdown`: що кожен статус означає для команди | — |

Дані — `fixtures/leads.json` (копія `materials/leads.json`, 20 лідів). Сервер читає файл один раз і
тримає зміни в пам'яті процесу; у файл не пише ніколи, тож після перезапуску стан знову чистий.

## Запуск

```bash
cd mcp/leaddesk-server
npm ci
node src/server.mjs        # stdio; журнал — лише в stderr
```

HTTP-режим (Task E1) — та сама фабрика, лише `127.0.0.1:3333/mcp`, з перевіркою `Host` і `Origin`:

```bash
node src/http.mjs
```

Змінна оточення (необов'язкова): `LEADDESK_FIXTURE` — шлях до іншого файлу з лідами. Без неї —
`fixtures/leads.json` поруч із модулем, незалежно від поточної теки.

## Перевірка Inspector'ом

З кореня репозиторію, Git Bash:

```bash
npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs --method tools/list
npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs \
  --method tools/call --tool-name leaddesk_find_leads --tool-arg status=new --tool-arg limit=3
npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs \
  --method resources/read --uri leaddesk://reference/statuses
```

Збережені виводи — у `docs/mcp/*.json`.

## Підключення до Claude Code

Скоуп `local` (за замовчуванням) — лише ви й лише цей проєкт:

```bash
claude mcp add leaddesk -- node "$(pwd)/mcp/leaddesk-server/src/server.mjs"
```

`leaddesk_set_lead_status` змінює дані — схвалюйте кожен виклик вручну.
