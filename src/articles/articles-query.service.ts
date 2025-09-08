import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';

export interface ArticlesFilter {
  startDate?: string;
  endDate?: string;
  sourceId?: number;
  sourceName?: string;
  limit: number;
  offset: number;
}

export interface ArticlesResponse {
  success: boolean;
  data: any[];
  count: number;
  filters?: ArticlesFilter;
  pagination?: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface SourcesResponse {
  success: boolean;
  data: any[];
  count: number;
}

export interface StatsResponse {
  success: boolean;
  data: {
    totalArticles: number;
    bySource: Record<string, number>;
    dateRange: {
      startDate: string;
      endDate: string;
    };
  };
}

@Injectable()
export class ArticlesQueryService {
  private readonly logger = new Logger(ArticlesQueryService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Get filtered articles from Supabase
   */
  async getFilteredArticles(filters: ArticlesFilter): Promise<ArticlesResponse> {
    const client = this.supabase.getClient();
    
    let query = client
      .from('articles')
      .select(`
        *,
        sources (
          id,
          name,
          url,
          weight
        )
      `)
      .order('pub_date', { ascending: false })
      .range(filters.offset, filters.offset + filters.limit - 1);

    // Apply date filters
    if (filters.startDate) {
      query = query.gte('pub_date', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('pub_date', filters.endDate);
    }

    // Apply source filter
    if (filters.sourceId) {
      query = query.eq('source_id', filters.sourceId);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error(`Failed to fetch articles: ${error.message}`);
      throw new Error(`Failed to fetch articles: ${error.message}`);
    }

    return {
      success: true,
      data: data || [],
      count: data?.length || 0,
      filters,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        hasMore: data?.length === filters.limit,
      },
    };
  }

  /**
   * Get all sources from Supabase
   */
  async getAllSources(): Promise<SourcesResponse> {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('sources')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      this.logger.error(`Failed to fetch sources: ${error.message}`);
      throw new Error(`Failed to fetch sources: ${error.message}`);
    }

    return {
      success: true,
      data: data || [],
      count: data?.length || 0,
    };
  }

  /**
   * Get articles statistics
   */
  async getArticlesStats(startDate?: string, endDate?: string): Promise<StatsResponse> {
    const client = this.supabase.getClient();
    
    let query = client
      .from('articles')
      .select('id, source_id, pub_date, sources(name)');

    // Apply date filters
    if (startDate) {
      query = query.gte('pub_date', startDate);
    }
    if (endDate) {
      query = query.lte('pub_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error(`Failed to fetch articles stats: ${error.message}`);
      throw new Error(`Failed to fetch articles stats: ${error.message}`);
    }

    // Calculate statistics
    const stats = {
      totalArticles: data?.length || 0,
      bySource: {} as Record<string, number>,
      dateRange: {
        startDate: startDate || 'all',
        endDate: endDate || 'all',
      },
    };

    // Group by source
    data?.forEach((article: any) => {
      const sourceName = Array.isArray(article.sources) 
        ? article.sources[0]?.name || 'Unknown'
        : article.sources?.name || 'Unknown';
      stats.bySource[sourceName] = (stats.bySource[sourceName] || 0) + 1;
    });

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Get article by ID with source information
   */
  async getArticleById(id: number): Promise<any> {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('articles')
      .select(`
        *,
        sources (
          id,
          name,
          url,
          weight
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      this.logger.error(`Failed to fetch getArticleById ${id}: ${error.message}`);
      throw new Error(`Failed to fetch getArticleById: ${error.message}`);
    }

    return {
      success: true,
      data,
    };
  }

  /**
   * Get articles by source name
   */
  async getArticlesBySource(sourceName: string, limit: number = 50, offset: number = 0): Promise<ArticlesResponse> {
    const client = this.supabase.getClient();
    
    const { data, error } = await client
      .from('articles')
      .select(`
        *,
        sources (
          id,
          name,
          url,
          weight
        )
      `)
      .eq('sources.name', sourceName)
      .order('pub_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      this.logger.error(`Failed to fetch articles by source ${sourceName}: ${error.message}`);
      throw new Error(`Failed to fetch articles by source: ${error.message}`);
    }

    return {
      success: true,
      data: data || [],
      count: data?.length || 0,
      filters: { sourceName, limit, offset },
      pagination: {
        limit,
        offset,
        hasMore: data?.length === limit,
      },
    };
  }

  /**
   * Get recent articles (latest articles)
   */
  async getRecentArticles(limit: number = 10): Promise<ArticlesResponse> {
    const client = this.supabase.getClient();
    
    const { data, error } = await client
      .from('articles')
      .select(`
        *,
        sources (
          id,
          name,
          url,
          weight
        )
      `)
      .order('pub_date', { ascending: false })
      .limit(limit);

    if (error) {
      this.logger.error(`Failed to fetch getRecentArticles: ${error.message}`);
      throw new Error(`Failed to fetch getRecentArticles: ${error.message}`);
    }

    return {
      success: true,
      data: data || [],
      count: data?.length || 0,
      filters: { limit, offset: 0 },
      pagination: {
        limit,
        offset: 0,
        hasMore: false,
      },
    };
  }
}
