import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';

@Injectable()
export class AianalysisService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getArticlesData() {
    const client = this.supabaseService.getClient();
    
    const { data, error } = await client
      .from('articles')
      .select('id, title, description, content_text, published_at')
      .order('published_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch articles: ${error.message}`);
    }

    return data;
  }

  async getArticleById(articleId: number) {
    const client = this.supabaseService.getClient();

    // Get article data with sources
    const { data: articleData, error: articleError } = await client
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
      .eq('id', articleId)
      .single();

    if (articleError) {
      throw new Error(`Failed to fetch article: ${articleError.message}`);
    }

    // Get sentiment analysis data
    const { data: sentimentData, error: sentimentError } = await client
      .from('article_polarity')
      .select('*')
      .eq('article_id', articleId)
      .single();

    // Get event classification data
    const { data: eventData, error: eventError } = await client
      .from('article_events')
      .select('*')
      .eq('article_id', articleId)
      .single();

    // Get trading strategy data
    const { data: strategyData, error: strategyError } = await client
      .from('article_strategy_signals')
      .select('*')
      .eq('article_id', articleId)
      .single();

    // Combine all data (only include analysis data if it exists)
    const result = {
      ...articleData,
      analysis: {
        sentiment: sentimentError ? null : sentimentData,
        events: eventError ? null : eventData,
        strategy: strategyError ? null : strategyData,
      },
    };

    return result;
  }

  async saveSentimentAnalysis(articleId: number, analysis: any) {
    const client = this.supabaseService.getClient();
    
    const { data, error } = await client
      .from('article_polarity')
      .upsert({
        article_id: articleId,
        sentiment_score: analysis.sentiment_score,
        sentiment_label: analysis.sentiment_label,
        confidence: analysis.confidence,
        key_reasons: analysis.key_reasons,
        keywords: analysis.keywords,
        used_fields: analysis.used_fields,
        model_version: 'gemini-2.0-flash',
        updated_at: new Date().toISOString(),
      })
      .select();

    if (error) {
      throw new Error(`Failed to save sentiment analysis: ${error.message}`);
    }

    return data;
  }

  async saveEventClassification(articleId: number, analysis: any) {
    const client = this.supabaseService.getClient();
    
    const { data, error } = await client
      .from('article_events')
      .upsert({
        article_id: articleId,
        events: analysis.events,
        event_summary: analysis.event_summary,
        severity: analysis.severity,
        primary_event_type: analysis.primary_event,
        used_fields: analysis.used_fields,
        model_version: 'gemini-2.0-flash',
        updated_at: new Date().toISOString(),
      })
      .select();

    if (error) {
      throw new Error(`Failed to save event classification: ${error.message}`);
    }

    return data;
  }

  async saveTradingStrategy(articleId: number, analysis: any) {
    const client = this.supabaseService.getClient();
    
    const { data, error } = await client
      .from('article_strategy_signals')
      .upsert({
        article_id: articleId,
        signals: analysis.signals,
        action: analysis.action,
        time_horizon: analysis.time_horizon,
        risk_level: analysis.risk_level,
        rationale: analysis.rationale,
        checklist: analysis.checklist,
        priority_score: analysis.priority_score,
        used_fields: analysis.used_fields,
        model_version: 'gemini-2.0-flash',
        updated_at: new Date().toISOString(),
      })
      .select();

    if (error) {
      throw new Error(`Failed to save trading strategy: ${error.message}`);
    }

    return data;
  }
}