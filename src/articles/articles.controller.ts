import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { RssIngestService } from './rss-ingest.service';
import { ArticlesQueryService } from './articles-query.service';

@Controller('articles')
export class ArticlesController {
  constructor(
    private readonly rssIngest: RssIngestService,
    private readonly articlesQueryService: ArticlesQueryService,
  ) {}

  // Ingest CoinDesk RSS → Supabase
  @Post('ingest/coindesk')
  async ingestCoindesk() {
    return await this.rssIngest.ingestCoinDesk();
  }

  // Get articles with filters from Supabase
  @Get('supabase/filtered')
  async getFilteredArticles(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('sourceId') sourceId?: string,
    @Query('sourceName') sourceName?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return await this.articlesQueryService.getFilteredArticles({
      startDate,
      endDate,
      sourceId: sourceId ? parseInt(sourceId) : undefined,
      sourceName,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    });
  }

  // Get all sources from Supabase
  @Get('supabase/sources')
  async getAllSources() {
    return await this.articlesQueryService.getAllSources();
  }

  // Get articles statistics
  @Get('supabase/stats')
  async getArticlesStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return await this.articlesQueryService.getArticlesStats(startDate, endDate);
  }

  // Get article by ID from Supabase
  @Get('supabase/:id')
  async getArticleById(@Param('id') id: string) {
    return await this.articlesQueryService.getArticleById(+id);
  }

  // Get articles by source name
  @Get('supabase/source/:sourceName')
  async getArticlesBySource(
    @Param('sourceName') sourceName: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return await this.articlesQueryService.getArticlesBySource(
      sourceName,
      limit ? parseInt(limit) : 50,
      offset ? parseInt(offset) : 0,
    );
  }

  // Get recent articles
  @Get('supabase/recent')
  async getRecentArticles(@Query('limit') limit?: string) {
    return await this.articlesQueryService.getRecentArticles(
      limit ? parseInt(limit) : 10,
    );
  }
}
