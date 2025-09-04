# Articles API Documentation

## Overview
API endpoints สำหรับดึงข้อมูล articles จาก Supabase พร้อม filter ตามวันที่และ sources

## Base URL
```
http://localhost:3000/articles
```

## Endpoints

### 1. Get Filtered Articles
ดึงข้อมูล articles พร้อม filter ต่างๆ

**Endpoint:** `GET /articles/supabase/filtered`

**Query Parameters:**
- `startDate` (optional): วันที่เริ่มต้น (YYYY-MM-DD format)
- `endDate` (optional): วันที่สิ้นสุด (YYYY-MM-DD format)
- `sourceId` (optional): ID ของ source
- `sourceName` (optional): ชื่อของ source
- `limit` (optional): จำนวน records ที่ต้องการ (default: 50)
- `offset` (optional): จำนวน records ที่ต้องการข้าม (default: 0)

**Example Requests:**

```bash
# ดึง articles ทั้งหมด
curl "http://localhost:3000/articles/supabase/filtered"

# ดึง articles ตามช่วงวันที่
curl "http://localhost:3000/articles/supabase/filtered?startDate=2024-01-01&endDate=2024-01-31"

# ดึง articles จาก source เฉพาะ
curl "http://localhost:3000/articles/supabase/filtered?sourceName=CoinDesk"

# ดึง articles พร้อม pagination
curl "http://localhost:3000/articles/supabase/filtered?limit=10&offset=20"

# ดึง articles จาก CoinDesk ในช่วงวันที่เฉพาะ
curl "http://localhost:3000/articles/supabase/filtered?sourceName=CoinDesk&startDate=2024-01-01&endDate=2024-01-31&limit=5"
```

### 2. Get All Sources
ดึงข้อมูล sources ทั้งหมด

**Endpoint:** `GET /articles/supabase/sources`

**Example Request:**
```bash
curl "http://localhost:3000/articles/supabase/sources"
```

### 3. Get Articles Statistics
ดึงสถิติของ articles

**Endpoint:** `GET /articles/supabase/stats`

**Query Parameters:**
- `startDate` (optional): วันที่เริ่มต้น (YYYY-MM-DD format)
- `endDate` (optional): วันที่สิ้นสุด (YYYY-MM-DD format)

**Example Requests:**

```bash
# ดึงสถิติทั้งหมด
curl "http://localhost:3000/articles/supabase/stats"

# ดึงสถิติตามช่วงวันที่
curl "http://localhost:3000/articles/supabase/stats?startDate=2024-01-01&endDate=2024-01-31"
```

### 4. Get Article by ID
ดึงข้อมูล article เฉพาะตาม ID

**Endpoint:** `GET /articles/supabase/:id`

**Example Request:**
```bash
curl "http://localhost:3000/articles/supabase/123"
```

### 5. Get Articles by Source Name
ดึงข้อมูล articles จาก source เฉพาะ

**Endpoint:** `GET /articles/supabase/source/:sourceName`

**Query Parameters:**
- `limit` (optional): จำนวน records ที่ต้องการ (default: 50)
- `offset` (optional): จำนวน records ที่ต้องการข้าม (default: 0)

**Example Requests:**
```bash
# ดึง articles จาก CoinDesk
curl "http://localhost:3000/articles/supabase/source/CoinDesk"

# ดึง articles จาก CoinDesk พร้อม pagination
curl "http://localhost:3000/articles/supabase/source/CoinDesk?limit=10&offset=20"
```

### 6. Get Recent Articles
ดึงข้อมูล articles ล่าสุด

**Endpoint:** `GET /articles/supabase/recent`

**Query Parameters:**
- `limit` (optional): จำนวน records ที่ต้องการ (default: 10)

**Example Requests:**
```bash
# ดึง articles ล่าสุด 10 รายการ
curl "http://localhost:3000/articles/supabase/recent"

# ดึง articles ล่าสุด 5 รายการ
curl "http://localhost:3000/articles/supabase/recent?limit=5"
```

## Response Examples

### Filtered Articles Response
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "source_id": 1,
      "guid": "coindesk-article-123",
      "link": "https://www.coindesk.com/article/123",
      "title": "Bitcoin Price Surges to New High",
      "description": "Bitcoin reaches new all-time high...",
      "content_html": "<p>Bitcoin reaches new all-time high...</p>",
      "content_text": "Bitcoin reaches new all-time high...",
      "author": "John Doe",
      "categories": ["Bitcoin", "Price"],
      "pub_date": "2024-01-15T10:30:00Z",
      "feed_language": "en",
      "hash": "abc123...",
      "first_seen_at": "2024-01-15T10:35:00Z",
      "sources": {
        "id": 1,
        "name": "CoinDesk",
        "url": "https://www.coindesk.com",
        "weight": 1.0
      }
    }
  ],
  "count": 1,
  "filters": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "sourceName": "CoinDesk",
    "limit": 5,
    "offset": 0
  },
  "pagination": {
    "limit": 5,
    "offset": 0,
    "hasMore": false
  }
}
```

### Sources Response
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "CoinDesk",
      "url": "https://www.coindesk.com",
      "weight": 1.0
    },
    {
      "id": 2,
      "name": "CoinTelegraph",
      "url": "https://cointelegraph.com",
      "weight": 0.8
    }
  ],
  "count": 2
}
```

### Statistics Response
```json
{
  "success": true,
  "data": {
    "totalArticles": 150,
    "bySource": {
      "CoinDesk": 85,
      "CoinTelegraph": 65
    },
    "dateRange": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31"
    }
  }
}
```

## Error Responses

**Database Error:**
```json
{
  "statusCode": 500,
  "message": "Failed to fetch articles: connection error",
  "error": "Internal Server Error"
}
```

**Invalid Date Format:**
```json
{
  "statusCode": 400,
  "message": "Invalid date format. Use YYYY-MM-DD",
  "error": "Bad Request"
}
```

## Usage Examples

### JavaScript/Fetch
```javascript
// ดึง articles จาก CoinDesk ในเดือนมกราคม 2024
const response = await fetch(
  'http://localhost:3000/articles/supabase/filtered?sourceName=CoinDesk&startDate=2024-01-01&endDate=2024-01-31&limit=10'
);
const data = await response.json();
console.log(data);

// ดึง articles ล่าสุด
const recentResponse = await fetch(
  'http://localhost:3000/articles/supabase/recent?limit=5'
);
const recentData = await recentResponse.json();
console.log(recentData);
```

### Python/Requests
```python
import requests

# ดึงสถิติ articles
response = requests.get(
    'http://localhost:3000/articles/supabase/stats',
    params={
        'startDate': '2024-01-01',
        'endDate': '2024-01-31'
    }
)
data = response.json()
print(data)

# ดึง articles จาก source เฉพาะ
source_response = requests.get(
    'http://localhost:3000/articles/supabase/source/CoinDesk',
    params={'limit': 10}
)
source_data = source_response.json()
print(source_data)
```

### cURL
```bash
# ดึง articles ล่าสุด 5 รายการ
curl "http://localhost:3000/articles/supabase/recent?limit=5"

# ดึง articles จาก source ID 1
curl "http://localhost:3000/articles/supabase/filtered?sourceId=1"

# ดึง article เฉพาะตาม ID
curl "http://localhost:3000/articles/supabase/123"

# ดึง articles จาก CoinDesk
curl "http://localhost:3000/articles/supabase/source/CoinDesk?limit=10"
```

## Notes

1. **Date Format**: ใช้ format `YYYY-MM-DD` สำหรับ startDate และ endDate
2. **Pagination**: ใช้ limit และ offset สำหรับ pagination
3. **Sorting**: Articles จะถูกเรียงตาม pub_date จากใหม่ไปเก่า
4. **Filtering**: สามารถใช้ sourceId หรือ sourceName ได้ แต่ไม่ควรใช้พร้อมกัน
5. **Response**: ทุก response จะมี `success: true` และข้อมูลที่เกี่ยวข้อง
