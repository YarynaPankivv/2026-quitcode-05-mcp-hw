# Перевірка (Task A, Task B, бонус E)

- **Інструмент і версія, модель:** Claude Code (desktop) · claude-opus-5-5
- **ОС і термінал, Node:** Windows 10 Pro 19045 · Git Bash · Node 24.15.0

## Task A — сервер в Inspector

- Команди, якими зроблено чотири файли в `docs/mcp/` — як у walkthrough, крок 4, без змін (Git Bash,
  з кореня репозиторію, Inspector 2.8.0):

  ```bash
  npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs \
    --method tools/list > docs/mcp/tools-list.json                                   # exit=0
  npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs \
    --method tools/call --tool-name leaddesk_set_lead_status \
    --tool-arg leadId=lead_0002 --tool-arg status=contacted --tool-arg "reason=перевірка в Inspector" > docs/mcp/set-status.json   # exit=0
  npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs \
    --method tools/call --tool-name leaddesk_set_lead_status \
    --tool-arg leadId=nope --tool-arg status=won --tool-arg reason=ok > docs/mcp/bad-input.json   # exit=5
  npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs \
    --method resources/read --uri leaddesk://reference/statuses > docs/mcp/resource-read.json    # exit=0
  ```

- `tools-list.json`: рівно два інструменти — `leaddesk_find_leads` з `{"readOnlyHint":true}` і
  `leaddesk_set_lead_status` з `{"readOnlyHint":false,"destructiveHint":false,"idempotentHint":false}`.
  У кожного з п'яти параметрів є `description`; у `leaddesk_set_lead_status` опис починається з
  «ЗМІНЮЄ ДАНІ» і вимагає підтвердження людини перед викликом.
- `bad-input.json`: зламано два аргументи — `leadId=nope` (не відповідає `^lead_\d{4}$`) і `reason=ok`
  (коротше 3 символів). Результат `"isError": true` з текстом
  `Input validation error: … leadId: Invalid string: must match pattern /^lead_\d{4}$/, reason: Too small: expected string to have >=3 characters`.
  Inspector завершився з кодом **5**, у stderr —
  `{"error":{"code":"tool_is_error","message":"Tool 'leaddesk_set_lead_status' returned isError:true."}}`.
- `set-status.json`: `lead_0002` (Rynok Books) `new → contacted`; запис аудиту
  `{ "action": "lead.status_changed", "leadId": "lead_0002", "at": "2026-10-02T13:15:01.752Z", "from": "new", "to": "contacted", "reason": "перевірка в Inspector" }`.
- `resource-read.json`: `leaddesk://reference/statuses`, `mimeType: "text/markdown"`.
- Самоперевірка: `grep -c '"isError": true' docs/mcp/bad-input.json` → 1; у `set-status.json` є
  `"action"`, `"leadId"`, `"at"`; `console.log` у `src/` → 0; `cmp` фікстури з `materials/leads.json` — без різниці.
- Що було найважче в описах інструментів і параметрів: <…>

## Task B — що зробили агенти з серверами

- **Supabase:** <які інструменти викликав агент для міграції й сиду; що ви схвалили вручну; чи щось відхилили>
- **Vercel:** <як задеплоїли (git-інтеграція); яким інструментом отримали лог; що в ньому>
- **Figma:** <`whoami`: план і сіт; скільки викликів витратили з квоти; з якого фрейму токени>
- **Playwright:** <ланцюжок інструментів; чи відправилась форма; що в консолі й мережі>
- Що агент зробив сам, без прохання (наприклад, викликав інструмент, який ви не очікували): <… / нічого>

## Task E (бонус)

- Варіант: <E1 HTTP-сервер / E2 отруєний опис / E3 Cursor>
- <команди, виводи, спостереження — див. walkthrough, Task E>
