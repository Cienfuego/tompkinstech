create table if not exists sites (
  id serial primary key,
  name text not null,
  url text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists checks (
  id bigserial primary key,
  site_id integer not null references sites(id) on delete cascade,
  checked_at timestamptz not null default now(),
  status text not null,              -- 'up' | 'degraded' | 'down'
  http_status integer,
  response_ms integer,
  ssl_days_remaining integer,
  error text
);
create index if not exists checks_site_id_checked_at_idx on checks (site_id, checked_at desc);

create table if not exists photos (
  id serial primary key,
  filename text not null,
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

insert into sites (name, url) values
  ('healthgardenadvocacy.com', 'https://healthgardenadvocacy.com'),
  ('dig-itgames.com', 'https://dig-itgames.com'),
  ('games.dig-itgames.com', 'https://games.dig-itgames.com')
on conflict (url) do nothing;
