import { Module } from '@nestjs/common';
import { ArticlesController } from './articles.controller';
import { SupabaseService } from '../common/supabase/supabase.service';
import { RssIngestService } from './rss-ingest.service';
import { ArticlesQueryService } from './articles-query.service';

@Module({
  controllers: [ArticlesController],
  providers: [SupabaseService, RssIngestService, ArticlesQueryService],
})
export class ArticlesModule {}
