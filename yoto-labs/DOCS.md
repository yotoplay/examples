# Yoto Labs API Documentation

This document provides comprehensive API documentation for the Yoto Labs serverless API.

## Authentication

All API requests require a valid JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Async Processing Flow

1. **Create Job**: Submit your content to the `/content/job` endpoint
2. **Get Job ID**: Receive a job ID for tracking
3. **Poll Status**: Check job status using the `/content/job/{jobId}` endpoint
4. **Get Results**: Once completed, the content will be automatically upserted to the Yoto Content API and returned as the `job.result` property

## Async Endpoints

### Create Processing Job

**POST** `https://labs.api.yotoplay.com/content/job`

Creates a new asynchronous processing job for content with ElevenLabs tracks.

**Request Body:**

```json
{
  "title": "My Audio Content",
  "content": {
    "chapters": [
      {
        "key": "chapter1",
        "title": "Chapter 1",
        "tracks": [
          {
            "key": "track1",
            "title": "The Friendly Dragon",
            "trackUrl": "Once upon a time, in a magical forest, there lived a friendly dragon who loved to read books.",
            "type": "elevenlabs"
          },
          {
            "key": "track2",
            "title": "The Adventure Begins",
            "trackUrl": "The dragon decided to go on an adventure to find the most interesting book in the world.",
            "type": "elevenlabs"
          }
        ]
      }
    ]
  },
  "metadata": {
    "title": "My Story",
    "description": "A story about a friendly dragon",
    ...
  }
}
```

**Response:**

```json
{
  "job": {
    "jobId": "123e4567-e89b-12d3-a456-426614174000",
    "status": "queued",
    "progress": {
      "total": 2,
      "completed": 0,
      "failed": 0
    },
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### Update Existing Card Job

**POST** `https://labs.api.yotoplay.com/content/{cardId}/job`

Creates a new asynchronous processing job to update an existing card with ElevenLabs tracks.

**Request Body:**

```json
{
  "content": {
    "chapters": [
      {
        "key": "chapter1",
        "title": "Chapter 1",
        "tracks": [
          {
            "key": "track1",
            "title": "The Friendly Dragon",
            "trackUrl": "Once upon a time, in a magical forest, there lived a friendly dragon who loved to read books.",
            "type": "elevenlabs"
          }
        ]
      }
    ]
  },
  "metadata": {
    "title": "My Story",
    "description": "A story about a friendly dragon",
    ...
  }
}
```

**Response:**

```json
{
  "job": {
    "jobId": "123e4567-e89b-12d3-a456-426614174000",
    "status": "queued",
    "progress": {
      "total": 1,
      "completed": 0,
      "failed": 0
    },
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### Get Job Status

**GET** `https://labs.api.yotoplay.com/content/job/{jobId}`

Retrieves the current status of a processing job.

**Response:**

```json
{
  "job": {
    "jobId": "123e4567-e89b-12d3-a456-426614174000",
    "status": "processing",
    "progress": "1/2 (50%)",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:32:15Z"
  }
}
```

**Job Statuses:**

- `queued`: Job is waiting to be processed
- `processing`: Job is currently being processed
- `completed`: Job completed successfully
- `failed`: Job failed with errors

**Completed Job Response:**

```json
{
  "job": {
    "jobId": "123e4567-e89b-12d3-a456-426614174000",
    "status": "completed",
    "progress": "2/2 (100%)",
    "result": {
      "cardId": "generated-card-123",
      "title": "My Audio Content"
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:35:42Z"
  }
}
```

**Failed Job Response:**

```json
{
  "job": {
    "jobId": "123e4567-e89b-12d3-a456-426614174000",
    "status": "failed",
    "progress": "1/2 (50%)",
    "error": "Failed to process 1 tracks: ElevenLabs API rate limit exceeded",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:35:42Z"
  }
}
```

### Example Async Processing Workflow

```bash
# 1. Create a job
curl -X POST https://labs.api.yotoplay.com/content/job \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Audio Content",
    "content": {
      "chapters": [
        {
          "key": "chapter1",
          "title": "Chapter 1",
          "tracks": [
            {
              "key": "track1",
              "title": "The Friendly Dragon",
              "trackUrl": "Once upon a time, in a magical forest, there lived a friendly dragon who loved to read books.",
              "type": "elevenlabs"
            }
          ]
        }
      ]
    },
    "metadata": {
      "title": "My Story",
      "description": "A story about a friendly dragon",
      ...
    }
  }'

# Response: {"job": {"jobId": "123e4567-e89b-12d3-a456-426614174000", "status": "queued", ...}}

# 2. Check job status
curl -X GET https://labs.api.yotoplay.com/content/job/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer <your-jwt-token>"

# Response: {"job": {"jobId": "123e4567-e89b-12d3-a456-426614174000", "status": "processing", ...}}

# 3. Continue polling until status is "completed" or "failed"
# When completed, the content will be automatically upserted to the Yoto Content API

# 4. Update existing card (optional)
curl -X POST https://labs.api.yotoplay.com/content/existing-card-123/job \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "content": {
      "chapters": [
        {
          "key": "chapter1",
          "title": "Updated Chapter",
          "tracks": [
            {
              "key": "track1",
              "title": "New Audio Track",
              "trackUrl": "This is new content for the existing card.",
              "type": "elevenlabs"
            }
          ]
        }
      ]
    },
    "metadata": {
      "title": "Content Title"
      "description": "Updated content",
      ...
    }
  }'
```
