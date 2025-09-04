import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ArticlesModule } from './articles/articles.module';
import { AianalysisModule } from './AIanalysis/aianalysis.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), ArticlesModule, AianalysisModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
