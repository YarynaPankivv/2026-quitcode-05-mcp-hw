# Playwright: перевірка форми заявки

- **Дата:** 2026-10-02 · Claude Code CLI 2.1.287 · `@playwright/mcp@0.0.82 --isolated --no-webmcp --allowed-origins http://localhost:3000`
- **Сесія:** у `/mcp` увімкнено лише `playwright`; `supabase`, `vercel`, `claude.ai Supabase`, `claude.ai Airtable`, Claude Docs — вимкнено. Режим — manual.
- **Застосунок:** `npm run dev`, `http://localhost:3000`.
- **Права:** `.claude/settings.json` з `deny` на `browser_run_code_unsafe`, `webmcp_*`, `browser_file_upload`, `browser_drop`, `browser_evaluate` і `allow` на 10 точних імен.

## Запит

> Відкрий http://localhost:3000, заповни форму заявки тестовими даними, відправ, перевір консоль і
> мережу. Інших адрес не відкривай.

## Ланцюжок інструментів

| # | Інструмент | Аргументи |
|---|---|---|
| 1 | `Read` | `.mcp.json` — агент сам перевірив, що Supabase не підключено разом із браузером |
| 2 | `ToolSearch` | підвантажив схеми лише 8 інструментів Playwright: navigate, snapshot, fill_form, click, console_messages, network_requests, wait_for, close |
| 3 | `mcp__playwright__browser_navigate` | `http://localhost:3000` |
| 4 | `mcp__playwright__browser_snapshot` | — |
| 5 | `mcp__playwright__browser_fill_form` | 8 полів тестовими даними: ім'я, прізвище, email, телефон, компанія, сайт, бюджет, опис |
| 6 | `mcp__playwright__browser_console_messages` | `level: debug` |
| 7 | `mcp__playwright__browser_click` | `e40`, кнопка «Надіслати заявку» |
| 8 | `mcp__playwright__browser_snapshot` | — |
| 9 | `mcp__playwright__browser_console_messages` | `level: debug` |
| 10 | `mcp__playwright__browser_network_requests` | `static: false` |
| 11 | `mcp__playwright__browser_network_requests` | `static: true`, фільтр `^(?!http://localhost:3000)` — запити на інші адреси |
| 12 | `mcp__playwright__browser_close` | — |

№3–11 — інструменти з `allow`. `browser_close` в `allow` немає — єдиний виклик Playwright поза
списком. Жоден інструмент із `deny` агент не викликав і не підвантажував.

## Результат

- **Тестові дані:** «Тест Тестенко», `test@example.com`, `+380000000000`, «Тестова компанія»,
  `https://example.com`, бюджет «$500–1500 / міс.», опис «Тестова заявка: перевірка форми, ігноруйте.»;
  чекбокс згоди на розсилку не відмічено.
- **Форма відправилась:** форму замінило повідомлення «Дякуємо! Заявку отримано. Ми зв'яжемося з вами
  протягом робочого дня.»
- **Консоль:** 2 повідомлення до й після відправки, без помилок і попереджень — `[INFO]` підказка
  React DevTools і `[LOG] [HMR] connected`.
- **Мережа:** єдиний нестатичний запит — `POST http://localhost:3000/` → `200 OK` (Server Action
  форми); 22 статичні запити — усі на `localhost:3000`. Фільтр на будь-яку іншу адресу — порожньо:
  назовні нічого не пішло.
- Браузер закрито (`browser_close`).

## Спостереження

- Знімки й лог консолі лягли в `.playwright-mcp/` (3 файли). Агент порадив додати теку в
  `.gitignore` — це хибно: вона там уже є (`.gitignore:49`), `git status` її не показує.
