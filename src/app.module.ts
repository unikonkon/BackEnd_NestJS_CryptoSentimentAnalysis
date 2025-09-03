import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ArticlesModule } from './articles/articles.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), ArticlesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
