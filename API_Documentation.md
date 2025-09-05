# API Documentation - Crypto Sentiment Analysis Backend

## AI Analysis APIs

### 1. POST `/ai-analysis/sentiment/:articleId`

**คำอธิบาย:** วิเคราะห์ sentiment ของบทความโดยใช้ Gemini AI

**Parameters:**

- `articleId` (number) - ID ของบทความที่ต้องการวิเคราะห์

**Response:**

```json
{
  "article_id": number,
  "analysis": {
    "sentiment_score": number,
    "sentiment_label": string,
    "confidence": number,
    "key_reasons": array,
    "keywords": array,
    "used_fields": array
  },
  "created_at": date
}
```

### 2. POST `/ai-analysis/events/:articleId`

**คำอธิบาย:** จำแนกประเภทของเหตุการณ์ในบทความ

**Parameters:**

- `articleId` (number) - ID ของบทความที่ต้องการจำแนก

**Response:**

```json
{
  "article_id": number,
  "analysis": {
    "events": array,
    "event_summary": string,
    "severity": string,
    "primary_event": string,
    "used_fields": array
  },
  "created_at": date
}
```

### 3. POST `/ai-analysis/trading-signals/:articleId`

**คำอธิบาย:** สร้างสัญญาณการเทรดจากบทความ

**Parameters:**

- `articleId` (number) - ID ของบทความที่ต้องการสร้างสัญญาณ

**Response:**

```json
{
  "article_id": number,
  "analysis": {
    "signals": array,
    "action": string,
    "time_horizon": string,
    "risk_level": string,
    "rationale": string,
    "checklist": array,
    "priority_score": number,
    "used_fields": array
  },
  "created_at": date
}
```

### 5. GET `/ai-analysis/articles/:articleId`

**คำอธิบาย:** ดึงข้อมูลบทความตาม ID

**Parameters:**

- `articleId` (number) - ID ของบทความ

**Response:**

```json
{
  "id": number,
  "title": string,
  "description": string,
  "content_text": string,
  "published_at": date,
  "sources": {
    "id": number,
    "name": string,
    "url": string,
    "weight": number
  }
}
```

## Articles Management APIs

### 1. POST `/articles/ingest/coindesk`

**คำอธิบาย:** นำเข้าข้อมูลบทความจาก CoinDesk RSS

**Parameters:** ไม่มี

**Response:** ผลการนำเข้าข้อมูล

### 2. GET `/articles/supabase/filtered`

**คำอธิบาย:** ดึงบทความที่ผ่านการกรองตามเงื่อนไข

**Query Parameters:**

- `startDate` (string, optional) - วันที่เริ่มต้น
- `endDate` (string, optional) - วันที่สิ้นสุด
- `sourceId` (string, optional) - ID ของแหล่งข้อมูล
- `sourceName` (string, optional) - ชื่อแหล่งข้อมูล
- `limit` (string, optional) - จำนวนบทความสูงสุด (default: 50)
- `offset` (string, optional) - จุดเริ่มต้น (default: 0)

**Response:**

```json
{
  "success": boolean,
  "data": [
 {
            "id": number,
            "source_id": number,
            "guid": text,
            "link": text,
            "title": text,
            "description": text,
            "content_html": text,
            "content_text": text,
            "author": text,
            "categories": Array,
            "pub_date": text,
            "feed_language": text,
            "hash": text,
            "first_seen_at": text,
            "sources": {
                "id": number,
                "url": text,
                "name": text,
                "weight": number
            }
        },{},{}...
  ],
  "count": number,
  "filters": {
    "startDate": string,
    "endDate": string,
    "sourceId": number,
    "sourceName": string,
    "limit": number,
    "offset": number
  },
  "pagination": {
    "limit": number,
    "offset": number,
    "hasMore": boolean
  }
}
```

### 3. GET `/articles/supabase/sources`

**คำอธิบาย:** ดึงรายการแหล่งข้อมูลทั้งหมด

**Parameters:** ไม่มี

**Response:**

```json
{
  "success": boolean,
  "data": [
    {
      "id": number,
      "name": string,
      "url": string,
      "weight": number
    }
  ],
  "count": number
}
```

### 4. GET `/articles/supabase/stats`

**คำอธิบาย:** ดึงสถิติของบทความ

**Query Parameters:**

- `startDate` (string, optional) - วันที่เริ่มต้น
- `endDate` (string, optional) - วันที่สิ้นสุด

**Response:**

```json
{
  "success": boolean,
  "data": {
    "totalArticles": number,
    "bySource": {
      "sourceName": number
    },
    "dateRange": {
      "startDate": string,
      "endDate": string
    }
  }
}
```

### 5. GET `/articles/supabase/:id`

**คำอธิบาย:** ดึงบทความตาม ID

**Parameters:**

- `id` (string) - ID ของบทความ

**Response:**

```json
{
  "success": boolean,
  "data": {
    "id": number,
    "title": string,
    "description": string,
    "content_text": string,
    "pub_date": date,
    "sources": {
      "id": number,
      "name": string,
      "url": string,
      "weight": number
    }
  }
}
```

### 6. GET `/articles/supabase/source/:sourceName`

**คำอธิบาย:** ดึงบทความตามชื่อแหล่งข้อมูล

**Parameters:**

- `sourceName` (string) - ชื่อแหล่งข้อมูล

**Query Parameters:**

- `limit` (string, optional) - จำนวนบทความสูงสุด (default: 50)
- `offset` (string, optional) - จุดเริ่มต้น (default: 0)

**Response:**

```json
{
  "success": boolean,
  "data": array,
  "count": number,
  "filters": {
    "sourceName": string,
    "limit": number,
    "offset": number
  },
  "pagination": {
    "limit": number,
    "offset": number,
    "hasMore": boolean
  }
}
```

### 7. GET `/articles/supabase/recent`

**คำอธิบาย:** ดึงบทความล่าสุด

**Query Parameters:**

- `limit` (string, optional) - จำนวนบทความ (default: 10)

**Response:**

```json
{
  "success": boolean,
  "data": array,
  "count": number,
  "filters": {
    "limit": number,
    "offset": number
  },
  "pagination": {
    "limit": number,
    "offset": number,
    "hasMore": boolean
  }
}
```

## Error Responses

ทุก API จะส่งกลับ error ในรูปแบบ:

```json
{
  "statusCode": number,
  "message": string,
  "error": string
}
```

Common HTTP Status Codes:

- `200` - Success
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error
