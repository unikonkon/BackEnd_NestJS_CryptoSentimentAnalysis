export class EventDto {
  label: string;
  confidence: number;
}

export class EventClassificationResponseDto {
  task: string;
  events: EventDto[];
  primary_event: string;
  event_summary: string;
  severity: number;
  market_impact_timeframe: 'short_term' | 'medium_term' | 'long_term';
  used_fields: string[];
}

export class EventClassificationResultDto {
  article_id: number;
  analysis: EventClassificationResponseDto;
  created_at: Date;
}