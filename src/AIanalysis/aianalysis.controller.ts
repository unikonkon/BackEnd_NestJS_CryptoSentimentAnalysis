import { Controller, Get, Post, Param, ParseIntPipe, HttpException, HttpStatus } from '@nestjs/common';
import { AianalysisService } from './aianalysis.service';
import { GeminiService } from './gemini.service';
import { 
  SentimentAnalysisResultDto, 
  EventClassificationResultDto, 
  TradingStrategyResultDto 
} from './dto';

@Controller('ai-analysis')
export class AianalysisController {
  constructor(
    private readonly aianalysisService: AianalysisService,
    private readonly geminiService: GeminiService,
  ) {}

  @Post('sentiment/:articleId')
  async analyzeSentiment(@Param('articleId', ParseIntPipe) articleId: number): Promise<SentimentAnalysisResultDto> {
    try {
      const article = await this.aianalysisService.getArticleById(articleId);
      
      if (!article) {
        throw new HttpException('Article not found', HttpStatus.NOT_FOUND);
      }

      const analysis = await this.geminiService.analyzeSentiment(
        article.title,
        article.description,
        article.content_text,
      );

      await this.aianalysisService.saveSentimentAnalysis(articleId, analysis);

      return {
        article_id: articleId,
        analysis,
        created_at: new Date(),
      };
    } catch (error) {
      throw new HttpException(
        `Failed to analyze sentiment: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('events/:articleId')
  async classifyEvents(@Param('articleId', ParseIntPipe) articleId: number): Promise<EventClassificationResultDto> {
    try {
      const article = await this.aianalysisService.getArticleById(articleId);
      
      if (!article) {
        throw new HttpException('Article not found', HttpStatus.NOT_FOUND);
      }

      const analysis = await this.geminiService.classifyEvents(
        article.title,
        article.description,
        article.content_text,
      );

      await this.aianalysisService.saveEventClassification(articleId, analysis);

      return {
        article_id: articleId,
        analysis,
        created_at: new Date(),
      };
    } catch (error) {
      throw new HttpException(
        `Failed to classify events: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('trading-signals/:articleId')
  async generateTradingSignals(@Param('articleId', ParseIntPipe) articleId: number): Promise<TradingStrategyResultDto> {
    try {
      const article = await this.aianalysisService.getArticleById(articleId);
      
      if (!article) {
        throw new HttpException('Article not found', HttpStatus.NOT_FOUND);
      }

      const analysis = await this.geminiService.generateTradingSignals(
        article.title,
        article.description,
        article.content_text,
      );

      await this.aianalysisService.saveTradingStrategy(articleId, analysis);

      return {
        article_id: articleId,
        analysis,
        created_at: new Date(),
      };
    } catch (error) {
      throw new HttpException(
        `Failed to generate trading signals: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('articles')
  async getArticles() {
    try {
      return await this.aianalysisService.getArticlesData();
    } catch (error) {
      throw new HttpException(
        `Failed to fetch articles: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('articles/:articleId')
  async getArticle(@Param('articleId', ParseIntPipe) articleId: number) {
    try {
      const article = await this.aianalysisService.getArticleById(articleId);
      
      if (!article) {
        throw new HttpException('Article not found', HttpStatus.NOT_FOUND);
      }

      return article;
    } catch (error) {
      throw new HttpException(
        `Failed to fetch article: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}