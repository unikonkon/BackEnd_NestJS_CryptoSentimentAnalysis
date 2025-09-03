Schema (Postgres/Supabase)
- นำคำสั่ง SQL ไปสร้างใน Table ใน เมนู SQL Editor
```sql
-- Sources
create table if not exists sources (
  id bigserial primary key,
  name text not null,
  url text not null unique,
  weight real default 1.0
);

-- Raw articles from RSS
create table if not exists articles (
  id bigserial primary key,
  source_id bigint references sources(id),
  guid text unique,
  link text not null,
  title text,
  description text,
  content_html text,
  content_text text,
  author text,
  categories text[],
  pub_date timestamptz,
  feed_language text,
  hash text,
  first_seen_at timestamptz default now()
);

create index if not exists articles_tsv_idx on articles using gin (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content_text,'')));

-- Targeted sentiment per asset
create table if not exists article_assets (
  article_id bigint references articles(id) on delete cascade,
  asset_symbol text,
  relevance_score real,
  stance text check (stance in ('pos','neu','neg')),
  mentions int,
  primary key (article_id, asset_symbol)
);

-- Article-level sentiment summary
create table if not exists article_sentiment (
  article_id bigint primary key references articles(id) on delete cascade,
  sentiment_score real,
  sentiment_label text,
  subjectivity real,
  emotions jsonb,
  uncertainty_score real,
  hype_score real,
  topics text[]
);

-- Price snapshots around event time
create table if not exists price_snapshots (
  article_id bigint references articles(id) on delete cascade,
  asset_symbol text,
  ts timestamptz,
  price_usd numeric,
  volume_24h_usd numeric,
  primary key (article_id, asset_symbol, ts)
);
```