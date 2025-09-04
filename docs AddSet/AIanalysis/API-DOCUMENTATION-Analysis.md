# AI Analysis API Documentation

## Overview

API สำหรับวิเคราะห์ข่าวคริปโตด้วย Gemini AI แบ่งเป็น 3 มิติการวิเคราะห์:
1. **Sentiment Analysis** - วิเคราะห์ความรู้สึก
2. **Event Classification** - จำแนกประเภทเหตุการณ์
3. **Trading Strategy Signals** - สัญญาณการเทรด

## Base URL

```
http://localhost:3000/ai-analysis
```

## Prerequisites

### Environment Variables
ต้องตั้งค่า environment variable ในไฟล์ `.env`:
```bash
GEMINI_API_KEY=your_gemini_api_key_here
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Database Tables
ต้องมีตารางต่อไปนี้ในฐานข้อมูล Supabase:
- `articles` - เก็บข้อมูลข่าว
- `article_polarity` - เก็บผลการวิเคราะห์ความรู้สึก
- `article_events` - เก็บผลการจำแนกเหตุการณ์
- `article_strategy_signals` - เก็บสัญญาณการเทรด

---

## API Endpoints

### 1. Sentiment Analysis

วิเคราะห์ความรู้สึกของข่าว (บวก/ลบ/เป็นกลาง)

**Endpoint:** `POST /ai-analysis/sentiment/:articleId`

**Parameters:**
- `articleId` (number) - ID ของบทความที่ต้องการวิเคราะห์

**Response Example:**
```json
{
  "article_id": 123,
  "analysis": {
    "task": "sentiment_analysis",
    "sentiment_score": 0.7,
    "sentiment_label": "positive",
    "confidence": 0.85,
    "key_reasons": [
      "มีข่าวพาร์ทเนอร์ชิปใหม่",
      "การยอมรับจากสถาบันการเงิน"
    ],
    "keywords": {
      "positive": ["partnership", "adoption", "investment"],
      "negative": []
    },
    "used_fields": ["title", "description", "content_text"]
  },
  "created_at": "2025-09-04T10:30:00.000Z"
}
```

**Curl Example:**
```bash
curl -X POST http://localhost:3000/ai-analysis/sentiment/123
```

---

### 2. Event Classification

จำแนกประเภทเหตุการณ์จากข่าว

**Endpoint:** `POST /ai-analysis/events/:articleId`

**Parameters:**
- `articleId` (number) - ID ของบทความที่ต้องการจำแนก

**Response Example:**
```json
{
  "article_id": 123,
  "analysis": {
    "task": "event_classification",
    "events": [
      {
        "label": "partnership_adoption",
        "confidence": 0.9
      },
      {
        "label": "funding_investment", 
        "confidence": 0.7
      }
    ],
    "primary_event": "partnership_adoption",
    "event_summary": "บริษัทใหญ่ประกาศความร่วมมือกับแพลตฟอร์มคริปโต",
    "severity": 0.6,
    "market_impact_timeframe": "medium_term",
    "used_fields": ["title", "description"]
  },
  "created_at": "2025-09-04T10:30:00.000Z"
}
```

**Event Types:**
- `regulation` - กฎหมาย, SEC, ETF approval
- `partnership_adoption` - ความร่วมมือ, การยอมรับ
- `funding_investment` - การลงทุน, ระดมทุน
- `security_incident` - การแฮก, exploit, ปัญหาความปลอดภัย
- `technology_update` - อัปเกรด, fork, launch

**Curl Example:**
```bash
curl -X POST http://localhost:3000/ai-analysis/events/123
```

---

### 3. Trading Strategy Signals

สร้างสัญญาณการเทรดจากการวิเคราะห์ข่าว

**Endpoint:** `POST /ai-analysis/trading-signals/:articleId`

**Parameters:**
- `articleId` (number) - ID ของบทความที่ต้องการสร้างสัญญาณ

**Response Example:**
```json
{
  "article_id": 123,
  "analysis": {
    "task": "trading_strategy",
    "signals": {
      "news_breakout": true,
      "sentiment_divergence": false,
      "event_momentum": true,
      "risk_catalyst": false
    },
    "action": "long",
    "time_horizon": "swing",
    "risk_level": 3,
    "priority_score": 0.75,
    "rationale": "ข่าวพาร์ทเนอร์ชิปใหม่มีแนวโน้มผลักดันราคาในระยะกลาง",
    "checklist": [
      "ตรวจสอบ volume การเทรด",
      "ดู funding rate",
      "เฝ้าติดตามข่าวต่อเนื่อง"
    ],
    "stop_loss_suggestion": "ใต้ support ระดับ $45,000",
    "take_profit_suggestion": "ที่ resistance ระดับ $52,000",
    "used_fields": ["title", "description", "content_text"]
  },
  "created_at": "2025-09-04T10:30:00.000Z"
}
```

**Signal Types:**
- `news_breakout` - ข่าวใหญ่ที่น่าจะกระตุ้นราคา
- `sentiment_divergence` - ความรู้สึกผิดปกติ (โอกาส mean reversion)
- `event_momentum` - เหตุการณ์ที่มีแนวโน้มขยายตัว
- `risk_catalyst` - เหตุการณ์เสี่ยงที่ต้อง hedge

**Action Types:**
- `none` - ไม่มีการแนะนำ
- `watch` - เฝ้าติดตาม
- `long` - ซื้อ
- `short` - ขาย
- `hedge` - ป้องกันความเสี่ยง
- `take_profit` - ขายทำกำไร

**Time Horizon:**
- `intraday` - วันเดียว
- `swing` - สัปดาห์
- `position` - เดือน

**Risk Level:** 1-5 (1=เสี่ยงน้อย, 5=เสี่ยงสูง)

**Curl Example:**
```bash
curl -X POST http://localhost:3000/ai-analysis/trading-signals/123
```

---

## Helper Endpoints

### Get All Articles

ดึงข้อมูล articles ทั้งหมด

**Endpoint:** `GET /ai-analysis/articles`

**Response Example:**
```json
[
  {
    "id": 123,
    "title": "Bitcoin hits new highs amid institutional adoption",
    "description": "Major financial institutions announce crypto integration plans",
    "content_text": "Full article content here...",
    "published_at": "2025-09-04T08:00:00.000Z"
  }
]
```

**Curl Example:**
```bash
curl -X GET http://localhost:3000/ai-analysis/articles
```

---

### Get Specific Article

ดึงข้อมูล article เฉพาะ

**Endpoint:** `GET /ai-analysis/articles/:articleId`

**Parameters:**
- `articleId` (number) - ID ของบทความ

**Response Example:**
```json
{
  "id": 123,
  "title": "Bitcoin hits new highs amid institutional adoption",
  "description": "Major financial institutions announce crypto integration plans", 
  "content_text": "Full article content here...",
  "published_at": "2025-09-04T08:00:00.000Z"
}
```

**Curl Example:**
```bash
curl -X GET http://localhost:3000/ai-analysis/articles/123
```

---

## Error Handling

### Common Error Responses

**404 Not Found:**
```json
{
  "statusCode": 404,
  "message": "Article not found"
}
```

**500 Internal Server Error:**
```json
{
  "statusCode": 500,
  "message": "Failed to analyze sentiment: Gemini API Error: 403 Forbidden"
}
```

### Error Scenarios
1. **Article not found** - เมื่อ articleId ไม่มีในฐานข้อมูล
2. **Missing GEMINI_API_KEY** - เมื่อไม่ได้ตั้งค่า API key
3. **Gemini API errors** - เมื่อมีปัญหาจาก Gemini API
4. **Database connection errors** - เมื่อเชื่อมต่อ Supabase ไม่ได้
5. **Invalid JSON response** - เมื่อ Gemini ตอบกลับรูปแบบไม่ถูกต้อง

---

## Usage Flow

### Recommended Workflow

1. **ดึงรายการ articles**
   ```bash
   GET /ai-analysis/articles
   ```

2. **เลือก article ที่ต้องการวิเคราะห์**
   ```bash
   GET /ai-analysis/articles/123
   ```

3. **วิเคราะห์ทั้ง 3 มิติ**
   ```bash
   POST /ai-analysis/sentiment/123
   POST /ai-analysis/events/123
   POST /ai-analysis/trading-signals/123
   ```

### Batch Processing Example

สำหรับการประมวลผลหลาย articles:

```bash
# Get article IDs
article_ids=(123 124 125)

# Process each article
for id in "${article_ids[@]}"; do
  echo "Processing article $id"
  
  # Sentiment analysis
  curl -X POST http://localhost:3000/ai-analysis/sentiment/$id
  
  # Event classification  
  curl -X POST http://localhost:3000/ai-analysis/events/$id
  
  # Trading signals
  curl -X POST http://localhost:3000/ai-analysis/trading-signals/$id
  
  echo "Completed article $id"
done
```

---

## Performance Considerations

### Rate Limiting
- Gemini API มี rate limit ตาม plan ที่ใช้
- แนะนำให้ใส่ delay ระหว่างการเรียก API

### Token Usage
- แต่ละการเรียก API จะใช้ token ตามความยาวของข้อความ
- ระบบจะตัดข้อความที่ยาวเกินไป:
  - Title: สูงสุด 500 ตัวอักษร
  - Description: สูงสุด 1,000 ตัวอักษร  
  - Content: สูงสุด 6,500 ตัวอักษร

### Database Performance
- ผลการวิเคราะห์จะถูกบันทึกลงฐานข้อมูลทันที
- การเรียก API ซ้ำจะ update ข้อมูลเดิม (upsert)

---

## Data Storage

### Database Schema Reference

ข้อมูลจะถูกบันทึกในตารางต่อไปนี้:

**article_polarity** (Sentiment Analysis)
```sql
article_id, sentiment_score, sentiment_label, confidence, 
key_reasons, keywords, used_fields, model_version, created_at, updated_at
```

**article_events** (Event Classification)
```sql
article_id, events, event_summary, severity, primary_event_type,
used_fields, model_version, created_at, updated_at
```

**article_strategy_signals** (Trading Signals)
```sql
article_id, signals, action, time_horizon, risk_level, rationale,
checklist, priority_score, used_fields, model_version, created_at, updated_at
```