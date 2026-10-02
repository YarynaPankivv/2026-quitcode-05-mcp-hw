# Підключення MCP-серверів LeadDesk (Task B)

- **Акаунти** (особисті чи одноразові, без клієнтських організацій і команд): Supabase — особиста
  організація з одним навчальним проєктом `hrfjgssbriiwoqywxoiy` · Vercel — особистий акаунт,
  команда Hobby · Figma — не використовували
- **Третій сервер:** Playwright — чому саме він: не потрібен ні акаунт, ні квота викликів (у Figma на
  Starter — 20 на місяць на все), а перевірка форми проти локального `npm run dev` перевіряє те, що
  ми справді деплоїмо.
- **Vercel CLI на цій машині:** не встановлено (`vercel: command not found`), тож шлях
  `use_vercel_cli` → `Bash` → локальний `vercel` під CLI-токеном закритий.

## Сервери

| Сервер | Який доступ | Навіщо нам | Що станеться при компрометації | Чим саме звужено |
|---|---|---|---|---|
| `supabase` | 9 інструментів одного проєкту: читання схеми й міграцій, `apply_migration`, `execute_sql` (читання й запис усіх таблиць під роллю `postgres` — власник `public.leads`, RLS її не обмежує), URL/publishable-ключі, TS-типи, пошук у документації | міграція схеми `leads` і сид 20 рядків для Task C | OAuth-токен видано на **всю організацію** (Database, Edge Functions, Projects, Storage — read+write; Secrets, Organizations — read). Вкрадений токен поза нашим URL дає запис у всі проєкти організації, читання секретів; у межах нашого URL — довільний SQL у проєкті: вивантажити чи стерти ліди | URL: `project_ref=hrfjgssbriiwoqywxoiy` (з інструментів зникає `project_id`, інших проєктів не видно) + `features=database,development,docs` (немає account, functions — канал назовні, branching — платне, storage). `read_only` свідомо не ставили — потрібен `apply_migration`. Claude Code: в `allow` лише `search_docs`, `list_tables`, `list_migrations`; `execute_sql` і `apply_migration` — щоразу ручний апрув |
| `vercel` | 244 інструменти; OAuth-скоуп один (`openid`), токен — це наш користувач Vercel цілком: проєкти, деплої, логи, домени, білінг | знайти останній деплой і прочитати лог білду | вкрадений токен = наш акаунт Vercel: деплой у production, покупки з картки, домени, листування toolbar від нашого імені, посилання в обхід Deployment Protection | на сервері звузити нічим. Claude Code: `deny` точними іменами на 11 інструментів, що змінюють стан (`buy_pro`, `buy_credits`, `buy_addon`, `buy_domain`, `deploy_to_vercel`, `get_access_to_vercel_url`, `import-claude-design-from-url`, 4 toolbar-інструменти); `allow` — лише `list_deployments`, `get_deployment`, `get_deployment_build_logs`. Vercel CLI не встановлено. Деплой — через git-інтеграцію в дашборді, GitHub App лише на один репозиторій |
| `playwright` | локальний браузер Chromium під керуванням агента: навігація, кліки, введення, знімки, консоль, мережа; ядро вмикається завжди, зокрема `browser_run_code_unsafe` (JS у процесі сервера на нашій машині) | перевірити форму заявки на `localhost:3000`: відправка, консоль, мережа | агент чи шкідлива сторінка: виконати код на машині повз правила `Bash` (`run_code_unsafe`), прочитати будь-який файл проєкту, зокрема `.env.local` (`file_upload`/`drop`), винести дані на чужу адресу (`navigate` + форма/URL), прочитати `Cookie` (`network_request`) | `@0.0.82` (без `@latest`); `--isolated` — профіль лише в пам'яті, без логінів; `--no-webmcp` — сторінка не додає інструментів; `--allowed-origins http://localhost:3000` — зручність, не межа безпеки. Claude Code: `deny` на `browser_run_code_unsafe`, `webmcp_*`, `browser_file_upload`, `browser_drop`, `browser_evaluate`; `allow` — 10 точних імен для перевірки форми; `browser_network_request` — ні там, ні там (щоразу питає). Ніколи разом із Supabase |

## Supabase: схема й сид

- Міграція `supabase/migrations/0001_leaddesk.sql` створює таблиці: `leads` (9 колонок, `check` на 5
  статусів, індекси за `status` і `created_at`, RLS увімкнено без політик)
- Сид `supabase/seed/leads.sql`: 20 рядків, `lead_0001`–`lead_0020`, ті самі, що в
  `materials/leads.json` (звірено поле за полем — 0 розбіжностей; `count(*)` у базі — 20)
- Скільки інструментів Supabase видно в `/mcp` із вашим URL: 9
- Якими викликами створено схему й дані і що ви схвалювали вручну: `apply_migration` `0001_leaddesk`
  і `execute_sql` з insert на 20 рядків — обидва схвалено вручну після перегляду SQL; перевірка —
  `execute_sql` `select count(*)` і `select current_user, …` (теж з апрувом).

## Сесії: що вмикаємо разом

У кожній сесії — щонайбільше один сервер із правом запису; браузерний сервер — ніколи разом із Supabase.

| Крок | Увімкнено в `/mcp` | Сервер із правом запису в цій сесії |
|---|---|---|
| Вхід (OAuth) | `supabase`, `vercel`, `playwright` підняті лише для `/mcp` → Authenticate; агенту нічого не писали, жодного інструмента не викликано; після входу — `/exit`. Далі в робочих сесіях — по одному серверу | — (жодного виклику) |
| Міграція й сид | `supabase` | `supabase` |
| Лог білду | `vercel` | —, записуючі інструменти під deny |
| Перевірка форми в браузері | `playwright` | `playwright` (браузер); Supabase вимкнено |
| Знімки «до» / «після» | `playwright` | — (нічого не викликали) |

Окрім серверів із `.mcp.json`, у `/mcp` є конектори claude.ai (`claude.ai Supabase`, `claude.ai
Airtable`, `claude.ai Claude Docs`). У сесії з Playwright агент бачив від `claude.ai Supabase`
інструменти `authenticate` / `complete_authentication` — неавторизований він даних не дає, але це
другий шлях до Supabase поруч із браузером. Тому в сесіях Task B ці конектори вимикаємо в `/mcp` і
не проходимо їхню автентифікацію.

`.mcp.json` лежить у репозиторії: `claude -p` у цій теці підніме **всі** його сервери без питань, зокрема
Supabase разом із браузерним.

## До і після звуження: третій сервер

- Як отримали перелік: нова сесія, у `/mcp` лише `playwright`, запит «Перелічи всі інструменти сервера
  playwright, які тобі зараз доступні. Нічого не викликай.» (для «після» — додатково «лише назви, по
  одній на рядок»)
- `docs/mcp/evidence/mcp-before.txt`: 25 інструментів
- `docs/mcp/evidence/mcp-after.txt`: 21 інструмент (агент вивів імена з префіксом `mcp__playwright__`;
  префікс прибрано, щоб формат збігався з «до» і diff показував лише зміни); зникли: `browser_run_code_unsafe`,
  `browser_file_upload`, `browser_drop`, `browser_evaluate` (`webmcp_*` не було й у «до» — їх вимикає
  `--no-webmcp`; deny на них — другий рубіж)
