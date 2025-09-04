export class TradingSignalsDto {
  news_breakout: boolean;
  sentiment_divergence: boolean;
  event_momentum: boolean;
  risk_catalyst: boolean;
}

export class TradingStrategyResponseDto {
  task: string;
  signals: TradingSignalsDto;
  action: 'none' | 'watch' | 'long' | 'short' | 'hedge' | 'take_profit';
  time_horizon: 'intraday' | 'swing' | 'position';
  risk_level: number;
  priority_score: number;
  rationale: string;
  checklist: string[];
  stop_loss_suggestion?: string;
  take_profit_suggestion?: string;
  used_fields: string[];
}

export class TradingStrategyResultDto {
  article_id: number;
  analysis: TradingStrategyResponseDto;
  created_at: Date;
}