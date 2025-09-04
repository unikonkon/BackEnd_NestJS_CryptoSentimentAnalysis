export class SentimentAnalysisResponseDto {
  task: string;
  sentiment_score: number;
  sentiment_label: 'negative' | 'neutral' | 'positive';
  confidence: number;
  key_reasons: string[];
  keywords: {
    positive: string[];
    negative: string[];
  };
  used_fields: string[];
}

export class SentimentAnalysisResultDto {
  article_id: number;
  analysis: SentimentAnalysisResponseDto;
  created_at: Date;
}