-- LeadDesk: таблиця лідів (поля з materials/leads.json)
create table public.leads (
  id          text primary key,
  full_name   text not null,
  company     text not null,
  email       text not null,
  source      text not null,
  status      text not null default 'new'
              check (status in ('new', 'contacted', 'qualified', 'won', 'lost')),
  budget      integer check (budget is null or budget >= 0),
  message     text not null,
  created_at  timestamptz not null default now()
);

create index leads_status_idx on public.leads (status);
create index leads_created_at_idx on public.leads (created_at desc);

-- RLS увімкнено, політик немає: через anon/publishable ключ таблиця недоступна.
alter table public.leads enable row level security;
