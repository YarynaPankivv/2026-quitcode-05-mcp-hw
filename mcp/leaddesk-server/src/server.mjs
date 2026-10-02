// LeadDesk as an MCP server: two business verbs instead of SQL on the whole database.
//
//   node src/server.mjs                                  fixture next to the module (fixtures/leads.json)
//   LEADDESK_FIXTURE=/path/to/leads.json node src/server.mjs
//
// The fixture is read once; status changes and the audit log live in process memory only.
// The file is never written, so every restart starts from the same 20 leads.
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { z } from "zod";

const FIXTURE = process.env.LEADDESK_FIXTURE ?? fileURLToPath(new URL("../fixtures/leads.json", import.meta.url));

// Same vocabulary as LEAD_STATUSES in lib/types.ts and leadId() in lib/db.ts.
const LEAD_STATUSES = ["new", "contacted", "qualified", "won", "lost"];
const LEAD_ID = /^lead_\d{4}$/;

const leads = JSON.parse(await readFile(FIXTURE, "utf8"));
const audit = [];
console.error(`leaddesk: loaded ${leads.length} leads`);

// Only what the two verbs need: no name, email or message text.
const publicLead = ({ id, company, status, source, budget, createdAt }) => ({ id, company, status, source, budget, createdAt });

const fail = (text) => ({ isError: true, content: [{ type: "text", text }] });

const STATUSES_MD = `# Статуси лідів LeadDesk

Лід завжди має рівно один із п'яти статусів. Змінювати статус — лише інструментом
\`leaddesk_set_lead_status\`, з причиною і після підтвердження людини.

| Статус | Що означає для команди |
|---|---|
| \`new\` | Заявка щойно надійшла з форми чи каналу реклами. З клієнтом ще ніхто не говорив. |
| \`contacted\` | Менеджер вийшов на зв'язок: відбувся дзвінок або клієнт відповів на лист. Сам надісланий лист без відповіді — ще \`new\`. |
| \`qualified\` | Після розмови підтверджено три речі: реальна задача, бюджет у нашому діапазоні й людина, яка ухвалює рішення. Тоді готуємо кошторис. |
| \`won\` | Клієнт підписав договір або сплатив аванс. У \`won\` переводить лише акаунт-менеджер, який веде угоду, — не агент із власної ініціативи. |
| \`lost\` | Клієнт відмовився, не відповідає 14 днів після трьох спроб зв'язку, або задача не наша. У причині пишемо, чому саме. |

Звичайний шлях: \`new\` → \`contacted\` → \`qualified\` → \`won\`. У \`lost\` лід може піти з будь-якого
статусу. Повернути лід із \`lost\` у роботу можна, якщо клієнт сам вийшов на зв'язок, — тоді \`contacted\`.
`;

export const factory = () => {
  const server = new McpServer({ name: "leaddesk", version: "0.1.0" });

  server.registerTool(
    "leaddesk_find_leads",
    {
      title: "Знайти ліди",
      description:
        "Повертає ліди LeadDesk за статусом, найновіші першими: id, компанія, статус, джерело, бюджет і дата заявки. Застосовуй, щоб показати, хто в роботі, або знайти id ліда перед зміною статусу. Тільки читає.",
      inputSchema: {
        status: z
          .enum([...LEAD_STATUSES, "any"])
          .describe("Який статус шукати: new, contacted, qualified, won або lost; any — ліди з усіма статусами"),
        limit: z.number().int().min(1).max(50).default(10).describe("Скільки лідів повернути, від 1 до 50; за замовчуванням 10"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ status, limit }) => {
      const found = leads
        .filter((l) => status === "any" || l.status === status)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit)
        .map(publicLead);
      const lines = found.map((l) => `- ${l.id} · ${l.company} · ${l.status} · ${l.source} · ${l.budget} · ${l.createdAt.slice(0, 10)}`);
      const text = found.length
        ? `Знайдено ${found.length} (статус: ${status}):\n${lines.join("\n")}`
        : `Лідів зі статусом ${status} немає.`;
      return { content: [{ type: "text", text }], structuredContent: { leads: found } };
    },
  );

  server.registerTool(
    "leaddesk_set_lead_status",
    {
      title: "Змінити статус ліда",
      description:
        "ЗМІНЮЄ ДАНІ: переводить лід LeadDesk у новий статус і пише запис в аудит. Перед викликом обов'язково отримай підтвердження людини: назви id ліда, поточний і новий статус та причину. Значення статусів — у ресурсі leaddesk://reference/statuses. id ліда знаходь через leaddesk_find_leads.",
      inputSchema: {
        leadId: z.string().regex(LEAD_ID).describe("Ідентифікатор ліда у форматі lead_0000, напр. lead_0002"),
        status: z.enum(LEAD_STATUSES).describe("Новий статус: new, contacted, qualified, won або lost"),
        reason: z.string().min(3).max(500).describe("Чому змінюємо статус, 3–500 символів: напр. «дзвінок відбувся, клієнт чекає кошторис»"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async ({ leadId, status, reason }) => {
      const lead = leads.find((l) => l.id === leadId);
      if (!lead) {
        return fail(`Лід ${leadId} не знайдено. Знайди правильний id через leaddesk_find_leads (status: "any").`);
      }
      if (lead.status === status) {
        return fail(`Лід ${leadId} уже має статус ${status}; нічого не змінено.`);
      }
      const from = lead.status;
      lead.status = status;
      const entry = { action: "lead.status_changed", leadId, at: new Date().toISOString(), from, to: status, reason };
      audit.push(entry);
      console.error(`leaddesk: ${leadId} ${from} -> ${status}`);
      return {
        content: [{ type: "text", text: `Статус ${leadId} змінено: ${from} → ${status}. Запис аудиту: ${entry.action} о ${entry.at}.` }],
        structuredContent: { lead: publicLead(lead), audit: entry },
      };
    },
  );

  server.registerResource(
    "leaddesk-statuses",
    "leaddesk://reference/statuses",
    {
      title: "Статуси лідів",
      description: "П'ять статусів ліда й що кожен означає для команди: коли contacted, що потрібно для qualified, хто переводить у won",
      mimeType: "text/markdown",
    },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "text/markdown", text: STATUSES_MD }] }),
  );

  return server;
};

// stdio only when run directly; src/http.mjs imports the same factory.
if (import.meta.url === pathToFileURL(process.argv[1]).href) await serveStdio(factory);
