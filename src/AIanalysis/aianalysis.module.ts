import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AianalysisController } from './aianalysis.controller';
import { AianalysisService } from './aianalysis.service';
import { GeminiService } from './gemini.service';
import { SupabaseService } from '../common/supabase/supabase.service';

@Module({
  imports: [ConfigModule],
  controllers: [AianalysisController],
  providers: [AianalysisService, GeminiService, SupabaseService],
  exports: [AianalysisService, GeminiService],
})
export class AianalysisModule {}