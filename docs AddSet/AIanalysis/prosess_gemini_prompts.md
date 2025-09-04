# ระบบวิเคราะห์ข่าวคริปโตด้วย Gemini AI (3 Tasks)

**วัตถุประสงค์:** สร้างระบบวิเคราะห์ข่าวแบบครบวงจร เพื่อช่วยตัดสินใจเทรดดิ้งคริปโตจากข้อมูลข่าวสาร  
**แหล่งข้อมูล:** `articles.title`, `articles.description`, `articles.content_text`  
**โมเดล:** `gemini-2.0-flash:generateContent` (Google Generative Language API)  
**รูปแบบผลลัพธ์:** JSON เท่านั้น เพื่อความสะดวกในการประมวลผลต่อ

---

## โครงสร้างฐานข้อมูล (Database Schema)

สร้างตารางสำหรับเก็บผลการวิเคราะห์ทั้ง 3 มิติ:

```sql
-- 1) ตารางวิเคราะห์ความรู้สึก (Sentiment Analysis)
CREATE TABLE IF NOT EXISTS article_polarity (
    article_id BIGINT PRIMARY KEY REFERENCES articles(id) ON DELETE CASCADE,
    sentiment_score REAL NOT NULL CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
    sentiment_label TEXT NOT NULL CHECK (sentiment_label IN ('negative','neutral','positive')),
    confidence REAL CHECK (confidence >= 0 AND confidence <= 1),
    key_reasons TEXT[] NOT NULL,
    keywords JSONB NOT NULL DEFAULT '{"positive":[], "negative":[]}',
    used_fields TEXT[] NOT NULL,
    model_version TEXT DEFAULT 'gemini-2.0-flash',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_polarity_label ON article_polarity(sentiment_label);
CREATE INDEX IF NOT EXISTS idx_polarity_score ON article_polarity(sentiment_score);

-- 2) ตารางจำแนกประเภทเหตุการณ์ (Event Classification)
CREATE TABLE IF NOT EXISTS article_events (
    article_id BIGINT PRIMARY KEY REFERENCES articles(id) ON DELETE CASCADE,
    events JSONB NOT NULL DEFAULT '[]',
    event_summary TEXT NOT NULL,
    severity REAL NOT NULL CHECK (severity >= -1 AND severity <= 1),
    primary_event_type TEXT, -- เหตุการณ์หลักที่มี confidence สูงสุด
    used_fields TEXT[] NOT NULL,
    model_version TEXT DEFAULT 'gemini-2.0-flash',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_gin ON article_events USING GIN (events);
CREATE INDEX IF NOT EXISTS idx_events_type ON article_events(primary_event_type);
CREATE INDEX IF NOT EXISTS idx_events_severity ON article_events(severity);

-- 3) ตารางสัญญาณเทรดดิ้ง (Trading Strategy Signals)
CREATE TABLE IF NOT EXISTS article_strategy_signals (
    article_id BIGINT PRIMARY KEY REFERENCES articles(id) ON DELETE CASCADE,
    signals JSONB NOT NULL DEFAULT '{}',
    action TEXT NOT NULL CHECK (action IN ('none','watch','long','short','hedge','take_profit')),
    time_horizon TEXT NOT NULL CHECK (time_horizon IN ('intraday','swing','position')),
    risk_level INTEGER NOT NULL CHECK (risk_level BETWEEN 1 AND 5),
    rationale TEXT NOT NULL,
    checklist TEXT[] NOT NULL,
    priority_score REAL DEFAULT 0, -- คะแนนความสำคัญรวม (0-1)
    used_fields TEXT[] NOT NULL,
    model_version TEXT DEFAULT 'gemini-2.0-flash',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_strategy_signals_gin ON article_strategy_signals USING GIN (signals);
CREATE INDEX IF NOT EXISTS idx_strategy_action ON article_strategy_signals(action);
CREATE INDEX IF NOT EXISTS idx_strategy_priority ON article_strategy_signals(priority_score DESC);
```

---

## การเรียกใช้ Gemini API

```typescript
interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>
    }
  }>
}

class GeminiAnalyzer {
  private readonly apiKey: string;
  private readonly endpoint: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  }

  async callGemini(prompt: string): Promise<any> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1, // ความเข้มงวดในการตอบ
          maxOutputTokens: 2048
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API Error: ${response.status} ${response.statusText}`);
    }

    const data: GeminiResponse = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    
    // พยายาม parse JSON โดยตรง หรือหา JSON block ในข้อความ
    try {
      return JSON.parse(text);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Gemini returned non-JSON response');
      }
      return JSON.parse(jsonMatch[0]);
    }
  }

  // จำกัดความยาวข้อความเพื่อประหยัด token
  private truncateText(text?: string, maxLength = 8000): string {
    return (text || '').slice(0, maxLength);
  }
}
```

---

## Task 1: การวิเคราะห์ความรู้สึก (Sentiment Analysis)

**เป้าหมาย:** ประเมินความเป็นบวก/ลบของข่าว เพื่อใช้ในการสร้าง sentiment aggregation  
**การใช้งาน:** สร้าง sentiment index รายชั่วโมง/วัน เปรียบเทียบกับค่าเฉลี่ย เพื่อหาจังหวะ contrarian หรือ trend following

### JSON Schema สำหรับ Sentiment
```json
{
  "task": "sentiment_analysis",
  "sentiment_score": 0.0,
  "sentiment_label": "negative|neutral|positive", 
  "confidence": 0.0,
  "key_reasons": ["เหตุผลที่ 1", "เหตุผลที่ 2"],
  "keywords": {
    "positive": ["คำสำคัญบวก"],
    "negative": ["คำสำคัญลบ"]
  },
  "used_fields": ["title", "description"]
}
```

### Prompt Template สำหรับ Sentiment Analysis
```text
คุณเป็นผู้เชี่ยวชาญด้านการวิเคราะห์ความรู้สึกของข่าวการเงินคริปโต กรุณาตอบเป็น JSON เท่านั้น

เป้าหมาย: วิเคราะห์ความเป็นบวก/ลบของข่าว เพื่อใช้ในการตัดสินใจเทรดดิ้ง

ข้อมูลนำเข้า:
- หัวข้อ: "{{title}}"
- คำอธิบาย: "{{description}}"
- เนื้อหา: "{{content_text}}"

หลักเกณฑ์การประเมิน:
1) เน้นหัวข้อและคำอธิบายเป็นหลัก ใช้เนื้อหาเพื่อยืนยันเท่านั้น
2) คะแนน sentiment_score อยู่ในช่วง -1 ถึง +1:
   - ข่าวลบแรง: แบน, แฮก, ฟ้องร้อง, ปราบปราม → คะแนน < -0.5
   - ข่าวบวกแรง: พาร์ทเนอร์ชิป, ลงทุน, รับรอง, ETF → คะแนน > +0.5
3) sentiment_label:
   - "negative" ถ้าคะแนน ≤ -0.1
   - "positive" ถ้าคะแนน ≥ +0.1  
   - "neutral" ถ้าอยู่ระหว่าง -0.1 ถึง +0.1
4) ระบุเหตุผล 2-4 ข้อ และคำสำคัญที่ส่งผลต่อความรู้สึก
5) confidence คือระดับความมั่นใจ 0-1

ตอบเฉพาะ JSON ตามรูปแบบนี้:
{
  "task": "sentiment_analysis",
  "sentiment_score": <ตัวเลข -1 ถึง 1>,
  "sentiment_label": "<negative|neutral|positive>",
  "confidence": <0 ถึง 1>,
  "key_reasons": ["<เหตุผล>", "..."],
  "keywords": {
    "positive": ["<คำสำคัญ>", "..."],
    "negative": ["<คำสำคัญ>", "..."]
  },
  "used_fields": ["<ฟิลด์ที่ใช้>", "..."]
}
```

---

## Task 2: การจำแนกประเภทเหตุการณ์ (Event Classification)

**เป้าหมาย:** จำแนกประเภทข่าวเพื่อใช้ event-driven trading strategies  
**ประเภทเหตุการณ์หลัก:**
- `regulation`: กฎหมาย, SEC, การอนุมัติ ETF
- `partnership_adoption`: ความร่วมมือ, การยอมรับใช้งาน
- `funding_investment`: การระดมทุน, การลงทุน, M&A
- `security_incident`: การแฮก, exploit, ปัญหาความปลอดภัย
- `technology_update`: การอัปเกรด, hard fork, mainnet launch

### JSON Schema สำหรับ Event Classification
```json
{
  "task": "event_classification",
  "events": [
    {"label": "regulation", "confidence": 0.9},
    {"label": "partnership_adoption", "confidence": 0.7}
  ],
  "primary_event": "regulation",
  "event_summary": "สรุปเหตุการณ์สั้นๆ",
  "severity": 0.0,
  "market_impact_timeframe": "short_term|medium_term|long_term",
  "used_fields": ["title", "description"]
}
```

### Prompt Template สำหรับ Event Classification
```text
คุณเป็นผู้เชี่ยวชาญการจำแนกเหตุการณ์ในตลาดคริปโต กรุณาตอบเป็น JSON เท่านั้น

เป้าหมาย: จำแนกประเภทเหตุการณ์เพื่อวางกลยุทธ์การเทรด

ข้อมูลนำเข้า:
- หัวข้อ: "{{title}}"
- คำอธิบาย: "{{description}}"
- เนื้อหา: "{{content_text}}"

ประเภทเหตุการณ์ที่สามารถเลือกได้ (สามารถเลือกหลายประเภท):
- regulation (กฎหมาย, SEC, ETF approval)
- partnership_adoption (ความร่วมมือ, การยอมรับ)
- funding_investment (การลงทุน, ระดมทุน)
- security_incident (แฮก, exploit, ปัญหาความปลอดภัย)
- technology_update (อัปเกรด, fork, launch)

คำแนะนำ:
1) เน้นที่หัวข้อและคำอธิบาย ใช้เนื้อหาเพื่อยืนยัน
2) ให้ confidence score 0-1 สำหรับแต่ละประเภท
3) เลือก primary_event จากประเภทที่มี confidence สูงสุด
4) severity คือผลกระทบต่อตลาด (-1 = ลบมาก, +1 = บวกมาก)
5) สรุปเหตุการณ์ด้วยภาษาไทยสั้นๆ

ตอบเฉพาะ JSON ตามรูปแบบนี้:
{
  "task": "event_classification", 
  "events": [{"label": "<ประเภท>", "confidence": <0-1>}],
  "primary_event": "<ประเภทหลัก>",
  "event_summary": "<สรุป>",
  "severity": <-1 ถึง 1>,
  "market_impact_timeframe": "<short_term|medium_term|long_term>",
  "used_fields": ["<ฟิลด์ที่ใช้>", "..."]
}
```

---

## Task 3: สัญญาณกลยุทธ์การเทรด (Trading Strategy Signals)

**เป้าหมาย:** แปลงข่าวเป็นสัญญาณการเทรดที่เป็นระบบ  
**สัญญาณที่ประเมิน:**
- `news_breakout`: ข่าวใหญ่ที่คาดว่าจะสร้าง price movement
- `sentiment_divergence`: sentiment ผิดปกติจากปกติ (mean reversion opportunity)
- `event_momentum`: เหตุการณ์ที่มีแนวโน้มขยายตัวต่อ (trend following)
- `risk_catalyst`: เหตุการณ์เสี่ยงที่ต้อง hedge

### JSON Schema สำหรับ Trading Signals
```json
{
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
  "rationale": "เหตุผลการแนะนำ",
  "checklist": ["ตรวจสอบ volume", "ดู funding rate"],
  "stop_loss_suggestion": "ใต้ support ระดับ X",
  "take_profit_suggestion": "ที่ resistance ระดับ Y",
  "used_fields": ["title", "description"]
}
```

### Prompt Template สำหรับ Trading Strategy
```text
คุณเป็นที่ปรึกษากลยุทธ์การเทรดคริปโต กรุณาตอบเป็น JSON เท่านั้น

เป้าหมาย: แปลงข่าวเป็นสัญญาณการเทรดที่เป็นระบบ

ข้อมูลนำเข้า:
- หัวข้อ: "{{title}}"
- คำอธิบาย: "{{description}}" 
- เนื้อหา: "{{content_text}}"

สัญญาณที่ต้องประเมิน:
- news_breakout: ข่าวใหญ่ที่น่าจะกระตุ้นราคา
- sentiment_divergence: ความรู้สึกผิดปกติ (โอกาส mean reversion)
- event_momentum: เหตุการณ์ที่มีแนวโน้มขยายตัว
- risk_catalyst: เหตุการณ์เสี่ยงที่ต้อง hedge

คำแนะนำ:
1) วิเคราะห์จากเนื้อหาข่าวเท่านั้น (ไม่มีข้อมูลราคา)
2) แนะนำ action: none, watch, long, short, hedge, take_profit
3) time_horizon: intraday (วันเดียว), swing (สัปดาห์), position (เดือน)
4) risk_level: 1-5 (1=เสี่ยงน้อย, 5=เสี่ยงสูง)
5) priority_score: 0-1 (ความสำคัญรวม)
6) เหตุผลและ checklist เป็นภาษาไทย
7) ใส่คำแนะนำ stop loss/take profit หากเหมาะสม

ตอบเฉพาะ JSON ตามรูปแบบนี้:
{
  "task": "trading_strategy",
  "signals": {
    "news_breakout": <true|false>,
    "sentiment_divergence": <true|false>, 
    "event_momentum": <true|false>,
    "risk_catalyst": <true|false>
  },
  "action": "<none|watch|long|short|hedge|take_profit>",
  "time_horizon": "<intraday|swing|position>",
  "risk_level": <1-5>,
  "priority_score": <0-1>,
  "rationale": "<เหตุผล>",
  "checklist": ["<รายการตรวจสอบ>", "..."],
  "stop_loss_suggestion": "<คำแนะนำ stop loss>",
  "take_profit_suggestion": "<คำแนะนำ take profit>",
  "used_fields": ["<ฟิลด์ที่ใช้>", "..."]
}
```

---

## การนำไปใช้งาน (Implementation Flow)

### ขั้นตอนการประมวลผล
```typescript
class NewsAnalysisOrchestrator {
  constructor(private gemini: GeminiAnalyzer) {}

  async analyzeArticle(article: Article) {
    const results = await Promise.allSettled([
      this.analyzeSentiment(article),
      this.classifyEvents(article), 
      this.generateTradingSignals(article)
    ]);

    // บันทึกผลลัพธ์ลงฐานข้อมูล
    await this.saveResults(article.id, results);
    
    return {
      sentiment: results[0].status === 'fulfilled' ? results[0].value : null,
      events: results[1].status === 'fulfilled' ? results[1].value : null,
      signals: results[2].status === 'fulfilled' ? results[2].value : null
    };
  }

  private async analyzeSentiment(article: Article) {
    const prompt = this.buildSentimentPrompt(article);
    const result = await this.gemini.callGemini(prompt);
    
    // Validation
    if (!this.isValidSentimentResult(result)) {
      throw new Error('Invalid sentiment analysis result');
    }
    
    return result;
  }

  // ... similar methods for events and trading signals
}
```

### การสร้างดัชนีรวม (Aggregated Indices)
```sql
-- Sentiment Index รายชั่วโมง
WITH hourly_sentiment AS (
  SELECT 
    DATE_TRUNC('hour', a.published_at) as hour_bucket,
    AVG(ap.sentiment_score) as avg_sentiment,
    COUNT(*) as article_count,
    STDDEV(ap.sentiment_score) as sentiment_volatility
  FROM articles a
  JOIN article_polarity ap ON a.id = ap.article_id  
  WHERE a.published_at >= NOW() - INTERVAL '7 days'
  GROUP BY hour_bucket
  ORDER BY hour_bucket
)
SELECT 
  hour_bucket,
  avg_sentiment,
  article_count,
  -- Z-score สำหรับหา extreme sentiment
  (avg_sentiment - AVG(avg_sentiment) OVER (ORDER BY hour_bucket ROWS BETWEEN 23 PRECEDING AND CURRENT ROW)) 
  / NULLIF(STDDEV(avg_sentiment) OVER (ORDER BY hour_bucket ROWS BETWEEN 23 PRECEDING AND CURRENT ROW), 0) 
  as sentiment_zscore
FROM hourly_sentiment;
```

---

## การ Monitor และปรับปรุง

### Key Performance Indicators
1. **Accuracy Metrics**: เปรียบเทียบ sentiment vs ราคาจริง
2. **Signal Quality**: win rate ของ trading signals
3. **Processing Speed**: เวลาในการวิเคราะห์ต่อบทความ
4. **API Costs**: ค่าใช้จ่าย Gemini API per analysis

### การปรับปรุงต่อเนื่อง
```sql
-- ติดตาม performance ของ model
CREATE VIEW model_performance AS
SELECT 
  model_version,
  COUNT(*) as total_analyses,
  AVG(confidence) as avg_confidence,
  DATE_TRUNC('day', created_at) as analysis_date
FROM (
  SELECT model_version, confidence, created_at FROM article_polarity
  UNION ALL
  SELECT model_version, 1.0 as confidence, created_at FROM article_events  
  UNION ALL
  SELECT model_version, priority_score as confidence, created_at FROM article_strategy_signals
) combined
GROUP BY model_version, analysis_date
ORDER BY analysis_date DESC;
```

---

## สรุป

ระบบนี้ให้การวิเคราะห์ข่าวคริปโตแบบ 360 องศา:
1. **Sentiment Analysis** → สร้าง market sentiment indicators
2. **Event Classification** → จับ event-driven opportunities  
3. **Trading Signals** → แปลงเป็นสัญญาณที่ใช้งานได้จริง

ผลลัพธ์จะถูกเก็บในฐานข้อมูลแบบ structured เพื่อใช้ในการสร้าง dashboard, backtesting, และ automated trading systems ต่อไป