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
```