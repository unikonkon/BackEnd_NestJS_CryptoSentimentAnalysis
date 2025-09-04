# CoinDesk RSS → Supabase Ingest
สรุป
- เส้น API สำหรับดึง RSS จาก CoinDesk และบันทึกลง Supabase ตามสคีมาแบบยืดหยุ่น เหมาะกับงาน NLP/Sentiment
- Endpoint: POST `/articles/ingest/coindesk`
- เก็บฟิลด์มาตรฐาน RSS (guid, link, title, description, content:encoded, pubDate, author, category, language) และฟิลด์ใช้งานจริง (content_text, hash, first_seen_at, source_id)
- แนบ SQL สร้างตารางหลัก และแยกตารางสำหรับ sentiment/assets/price snapshots เพื่อ re-run/ปรับโมเดลง่าย

English overview
This module adds an API endpoint to fetch CoinDesk RSS and store articles into Supabase with a flexible schema suitable for NLP/sentiment pipelines.

Endpoint
- POST `/articles/ingest/coindesk`
- Behavior: Fetches `https://www.coindesk.com/arc/outboundfeeds/rss/`, parses RSS 2.0 (incl. content:encoded), maps to `articles` table, upserts `sources (CoinDesk)`, skips items with existing `guid`.
- Response example:
  ```json
  {
    "sourceId": 1,
    "upsertedSources": 1,
    "inserted": 25,
    "skippedExisting": 5,
    "errors": []
  }
  ```

Environment
- เอาค่ามาจากใน Web supabase.com ที่ Project API
- `SUPABASE_URL` = your project URL
- `SUPABASE_SERVICE_ROLE_KEY` (recommended) or `SUPABASE_ANON_KEY` (if RLS allows inserts)

Add to `.env` (do not commit real secrets):
```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Install deps
```
npm install @supabase/supabase-js fast-xml-parser
```

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

Mapping: RSS → Schema
- `<guid>` → `articles.guid`
- `<link>` → `articles.link`
- `<title>` → `articles.title`
- `<description>` → `articles.description`
- `<content:encoded>` → `articles.content_html` (fallback to description when absent)
- `<pubDate>` → `articles.pub_date` (UTC)
- `<author>` or `<dc:creator>` → `articles.author`
- `<category>` (multi) → `articles.categories[]`
- channel `<language>` → `articles.feed_language`

Derived fields on ingest
- `content_text`: HTML → plain text (basic cleaner)
- `hash`: SHA-256 over key fields (title/link/content_text)
- `first_seen_at`: UTC now
- `source_id`: from `sources` upsert (CoinDesk)

Planned/next tables (kept separate for re-runs)
- `article_assets`: entities/assets with relevance and stance
- `article_sentiment`: overall sentiment/subjectivity/emotions/topics
- `price_snapshots`: t0/t+15m/t+1h/t+24h for event study

Security (RLS)
- For server-side ingest, use `SERVICE_ROLE` key. If you must use anon, relax RLS for inserts into `sources` and `articles` or create a Postgres function with `security definer`.

Manual test
```
curl -X POST http://localhost:3000/articles/ingest/coindesk
```

Notes
- Parser: `fast-xml-parser` keeps `content:encoded` and `dc:creator` fields. Namespaces are not stripped.
- Media attachments (`media:content`/`media:thumbnail`) are parsed but not yet stored. Extend schema later if needed.
- Duplicate handling: skip if `guid` already exists.
