# API Documentation

## `sync-push`

Accepts a batch of signed events from a device.

**URL**: `/functions/v1/sync-push`
**Method**: `POST`

### Request Body

```json
{
  "device_id": "550e8400-e29b-41d4-a716-446655440001",
  "events": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "student_id": "550e8400-e29b-41d4-a716-446655440002",
      "device_id": "550e8400-e29b-41d4-a716-446655440001",
      "seq": 0,
      "prev_hash": null,
      "kind": "quiz.attempt",
      "payload": {
        "quiz_id": "550e8400-e29b-41d4-a716-446655440003",
        "answers": {
          "q1": "A"
        }
      },
      "client_ts": "2024-01-01T00:00:00Z",
      "content_version": "v1",
      "signature": "..."
    }
  ]
}
```

### Response

```json
{
  "results": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "status": "accepted",
      "reason": null
    }
  ]
}
```

---

## `sync-pull`

Returns what a device needs based on its cursor.

**URL**: `/functions/v1/sync-pull`
**Method**: `POST`

### Request Body

```json
{
  "device_id": "550e8400-e29b-41d4-a716-446655440001",
  "cursor": 0
}
```

### Response (Student)

```json
{
  "contentVersions": [...],
  "roster": [],
  "catalog": [],
  "confirmed_balance": 150
}
```

---

## `issue-cards`

Teacher-authenticated function to generate QR tokens and link codes for a class.

**URL**: `/functions/v1/issue-cards`
**Method**: `POST`
**Headers**: `Authorization: Bearer <Teacher Token>`

### Request Body

```json
{
  "class_id": "550e8400-e29b-41d4-a716-446655440004"
}
```

### Response

```json
{
  "cards": [
    {
      "student_id": "550e8400-e29b-41d4-a716-446655440002",
      "first_name": "Rahul",
      "qr_token": "...",
      "link_code": "A3BC5"
    }
  ]
}
```
