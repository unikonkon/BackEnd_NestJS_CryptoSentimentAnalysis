import { Injectable } from '@nestjs/common';

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
  }>;
}

@Injectable()
export class GeminiService {
  private readonly endpoint: string;

  constructor() {

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }
    this.endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  }

  private async callGemini(prompt: string): Promise<any> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API Error: ${response.status} ${response.statusText}`);
      }

      const data: GeminiResponse = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

      try {
        return JSON.parse(text);
      } catch {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('Gemini returned non-JSON response');
        }
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      throw new Error(`Failed to analyze with Gemini: ${error.message}`);
    }
  }

  private truncateText(text?: string, maxLength = 8000): string {
    return (text || '').slice(0, maxLength);
  }

  async analyzeSentiment(title: string, description: string, contentText: string) {
    const prompt = `คุณเป็นผู้เชี่ยวชาญด้านการวิเคราะห์ความรู้สึกของข่าวการเงินคริปโต กรุณาตอบเป็น JSON เท่านั้น

เป้าหมาย: วิเคราะห์ความเป็นบวก/ลบของข่าว เพื่อใช้ในการตัดสินใจเทรดดิ้ง

ข้อมูลนำเข้า:
- หัวข้อ: "${this.truncateText(title, 500)}"
- คำอธิบาย: "${this.truncateText(description, 1000)}"
- เนื้อหา: "${this.truncateText(contentText, 6500)}"

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
}`;

    return this.callGemini(prompt);
  }

  async classifyEvents(title: string, description: string, contentText: string) {
    const prompt = `คุณเป็นผู้เชี่ยวชาญการจำแนกเหตุการณ์ในตลาดคริปโต กรุณาตอบเป็น JSON เท่านั้น

เป้าหมาย: จำแนกประเภทเหตุการณ์เพื่อวางกลยุทธ์การเทรด

ข้อมูลนำเข้า:
- หัวข้อ: "${this.truncateText(title, 500)}"
- คำอธิบาย: "${this.truncateText(description, 1000)}"
- เนื้อหา: "${this.truncateText(contentText, 6500)}"

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
}`;

    return this.callGemini(prompt);
  }

  async generateTradingSignals(title: string, description: string, contentText: string) {
    const prompt = `คุณเป็นที่ปรึกษากลยุทธ์การเทรดคริปโต กรุณาตอบเป็น JSON เท่านั้น

เป้าหมาย: แปลงข่าวเป็นสัญญาณการเทรดที่เป็นระบบ

ข้อมูลนำเข้า:
- หัวข้อ: "${this.truncateText(title, 500)}"
- คำอธิบาย: "${this.truncateText(description, 1000)}" 
- เนื้อหา: "${this.truncateText(contentText, 6500)}"

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
}`;

    return this.callGemini(prompt);
  }
}