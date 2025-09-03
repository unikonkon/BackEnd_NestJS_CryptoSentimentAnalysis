import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { createHash } from 'crypto';

// fast-xml-parser is used at runtime; ensure it's installed in the project
import { XMLParser } from 'fast-xml-parser';

type IngestResult = {
  sourceId: number | null;
  upsertedSources: number;
  inserted: number;
  skippedExisting: number;
  errors: { guid?: string; error: string }[];
};

@Injectable()
export class RssIngestService {
  private readonly logger = new Logger(RssIngestService.name);

  constructor(private readonly supabase: SupabaseService) { }

  private stripHtmlToText(html: string): string {
    if (!html) return '';
    // Remove script/style
    const noScripts = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
    // Replace <br> and block tags with newlines
    const withNewlines = noScripts
      .replace(/<\/(p|div|h\d|li|blockquote|section|article|header|footer)>/gi, '\n')
      .replace(/<br\s*\/?>(\n)?/gi, '\n');
    // Strip remaining tags and decode entities (basic)
    const noTags = withNewlines.replace(/<[^>]+>/g, '');
    const entitiesDecoded = noTags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
    // Collapse multiple spaces/newlines
    return entitiesDecoded.replace(/[\t ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  }

  private hashContent(parts: (string | undefined)[]): string {
    const h = createHash('sha256');
    h.update((parts.filter(Boolean).join('\n') || '').slice(0, 1_000_000));
    return h.digest('hex');
  }

  async ingestCoinDesk(): Promise<IngestResult> {
    const client = this.supabase.getClient();
    const result: IngestResult = { sourceId: null, upsertedSources: 0, inserted: 0, skippedExisting: 0, errors: [] };
    
    console.log('client', client);
    // 1) Ensure source exists (upsert)
    const source = { name: 'CoinDesk', url: 'https://www.coindesk.com', weight: 1.0 };
    const { data: upsertSourceData, error: upsertSourceError } = await client
      .from('sources')
      .upsert(source, { onConflict: 'url' })
      .select('id')
      .single();

    if (upsertSourceError) {
      // If the error is a row-level security violation, log a more helpful message
      if (upsertSourceError.code === '42501' && upsertSourceError.message?.includes('row-level security')) {
        this.logger.error(
          `RLS error upserting source: ${upsertSourceError.message}. ` +
          `Check your row-level security policies for the "sources" table.`
        );
      }
      throw upsertSourceError;
    }

    result.upsertedSources = 1;
    const sourceId = upsertSourceData?.id as number;
    result.sourceId = sourceId;

    // 2) Fetch RSS
    const rssUrl = 'https://www.coindesk.com/arc/outboundfeeds/rss/';
    const resp = await fetch(rssUrl, { method: 'GET' });
    if (!resp.ok) throw new Error(`Failed to fetch RSS ${resp.status}`);
    const xml = await resp.text();

    // 3) Parse XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      preserveOrder: false,
      removeNSPrefix: false,
    });
    const feed = parser.parse(xml);
    const channel = feed?.rss?.channel || feed?.channel;
    const items = channel?.item || [];
    const feedLanguage: string | undefined = channel?.language;

    // Normalize to array
    const asArray = (v: any) => (Array.isArray(v) ? v : v ? [v] : []);

    // 4) Insert per item
    for (const item of asArray(items)) {
      try {
        const guid: string | undefined = item?.guid?.['#text'] ?? item?.guid ?? undefined;
        const link: string | undefined = item?.link;
        const title: string | undefined = item?.title;
        const description: string | undefined = item?.description;
        const contentHtml: string | undefined = item?.['content:encoded'] ?? item?.['content'] ?? undefined;
        const pubDateRaw: string | undefined = item?.pubDate;
        const author: string | undefined = item?.author ?? item?.['dc:creator'] ?? undefined;
        const categories: string[] = asArray(item?.category).map((c: any) => (typeof c === 'string' ? c : c?.['#text'] ?? ''));
        const mediaContent = item?.['media:content'] ?? item?.['media:thumbnail'] ?? undefined;
        // mediaContent may be object or array with url attribute; we don't persist in schema directly but could in future

        const pub_date = pubDateRaw ? new Date(pubDateRaw) : undefined;
        const content_html = contentHtml ?? description ?? '';
        const content_text = this.stripHtmlToText(content_html);
        const hash = this.hashContent([guid, link, title, content_text]);
        const nowIso = new Date().toISOString();

        // Check if exists by guid
        if (guid) {
          const { data: existing, error: existingErr } = await client
            .from('articles')
            .select('id')
            .eq('guid', guid)
            .limit(1)
            .maybeSingle();
          if (existingErr) throw existingErr;
          if (existing) {
            result.skippedExisting += 1;
            continue;
          }
        }

        const insertPayload = {
          source_id: sourceId,
          guid: guid ?? null,
          link: link ?? null,
          title: title ?? null,
          description: description ?? null,
          content_html,
          content_text,
          author: author ?? null,
          categories: categories?.length ? categories : null,
          pub_date: pub_date ? pub_date.toISOString() : null,
          feed_language: feedLanguage ?? null,
          hash,
          first_seen_at: nowIso,
        };

        const { error: insertErr } = await client.from('articles').insert(insertPayload);
        if (insertErr) throw insertErr;
        result.inserted += 1;
      } catch (e: any) {
        this.logger.warn(`Failed to insert item: ${e?.message || e}`);
        result.errors.push({ guid: item?.guid, error: String(e?.message || e) });
      }
    }

    return result;
  }
}
