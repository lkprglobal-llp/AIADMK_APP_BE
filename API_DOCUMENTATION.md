# AIADMK Election Management System - API Documentation

## Overview
This document provides comprehensive information about all API endpoints for party votes and polling percentage data.

## Base URL
```
http://localhost:5253/api
```

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## Analytics Endpoints

### 1. Party Comparison
**GET** `/analytics/party-comparison`

Get comparative data between parties for a specific election.

**Query Parameters:**
- `election_id` (optional): Filter by specific election
- `party_ids` (optional): Comma-separated party IDs to compare

**Response:**
```json
[
  {
    "party_id": "uuid",
    "party_name": "AIADMK",
    "short_name": "AIADMK",
    "color": "#00FF00",
    "total_votes": 150000,
    "booths_contested": 234,
    "vote_percentage": 35.5
  }
]
```

### 2. Party Trend Analysis
**GET** `/analytics/party-trend/:partyId`

Get historical performance trend for a specific party.

**Response:**
```json
[
  {
    "year": 2021,
    "election_name": "Tamil Nadu Assembly Election",
    "total_votes": 150000,
    "booths_contested": 234,
    "vote_percentage": 35.5
  }
]
```

### 3. Booth Winners
**GET** `/analytics/booth-winners`

Get winning party information for each booth.

**Query Parameters:**
- `election_id` (optional): Filter by specific election

**Response:**
```json
[
  {
    "booth_id": "uuid",
    "booth_name": "Government School, Chennai",
    "location": "Chennai North",
    "winning_party": "AIADMK",
    "short_name": "AIADMK",
    "color": "#00FF00",
    "winning_votes": 1250,
    "total_voters": 2000,
    "vote_percentage": 62.5
  }
]
```

### 4. Election Summary
**GET** `/analytics/election-summary/:electionId`

Get comprehensive summary for a specific election.

**Response:**
```json
{
  "election_name": "Tamil Nadu Assembly Election",
  "year": 2021,
  "total_booths": 234,
  "total_voters": 500000,
  "total_votes_cast": 425000,
  "overall_turnout": 85.0,
  "parties_contested": 10
}
```

### 5. Yearly Statistics
**GET** `/analytics/yearly-stats`

Get year-wise election statistics.

**Response:**
```json
[
  {
    "year": 2021,
    "elections_held": 1,
    "total_booths": 234,
    "total_voters": 500000,
    "total_votes_cast": 425000,
    "avg_turnout": 85.0
  }
]
```

### 6. Party Vote Summary
**GET** `/analytics/party-vote-summary`

Get detailed vote summary for all parties.

**Query Parameters:**
- `election_id` (optional): Filter by specific election

**Response:**
```json
[
  {
    "party_id": "uuid",
    "party_name": "AIADMK",
    "short_name": "AIADMK",
    "color": "#00FF00",
    "total_votes": 150000,
    "booths_won": 120,
    "booths_contested": 234,
    "vote_share_percentage": 35.5,
    "booth_win_percentage": 51.3
  }
]
```

### 7. Location Summary
**GET** `/analytics/location-summary`

Get location-wise voting statistics.

**Query Parameters:**
- `election_id` (optional): Filter by specific election

**Response:**
```json
[
  {
    "location": "Chennai North",
    "total_booths": 45,
    "total_voters": 90000,
    "total_votes_cast": 76500,
    "turnout_percentage": 85.0,
    "leading_party": "AIADMK"
  }
]
```

### 8. Chart Data
**GET** `/analytics/chart-data/:electionId`

Get formatted data for charts and visualizations.

**Response:**
```json
{
  "partyData": [
    {
      "party_name": "AIADMK",
      "short_name": "AIADMK",
      "color": "#00FF00",
      "votes": 150000,
      "percentage": 35.5
    }
  ],
  "locationData": [
    {
      "location": "Chennai North",
      "booth_count": 45,
      "total_voters": 90000,
      "votes_cast": 76500,
      "turnout": 85.0
    }
  ],
  "summary": {
    "totalParties": 10,
    "totalLocations": 15,
    "totalVotes": 425000
  }
}
```

---

## Polling Data Endpoints

### 1. Booth Results with Percentages
**GET** `/polling/booth-results/:boothId`

Get detailed results for a specific booth with all percentages calculated.

**Response:**
```json
[
  {
    "id": "uuid",
    "booth_id": "uuid",
    "party_id": "uuid",
    "votes": 1250,
    "party_name": "AIADMK",
    "short_name": "AIADMK",
    "color": "#00FF00",
    "booth_name": "Government School, Chennai",
    "total_voters": 2000,
    "vote_percentage": 62.5,
    "vote_share_percentage": 45.2
  }
]
```

### 2. Election Overview
**GET** `/polling/election-overview/:electionId`

Get comprehensive election overview with party results.

**Response:**
```json
{
  "overview": {
    "election_id": "uuid",
    "election_name": "Tamil Nadu Assembly Election",
    "year": 2021,
    "total_booths": 234,
    "total_registered_voters": 500000,
    "total_votes_cast": 425000,
    "overall_turnout_percentage": 85.0,
    "parties_contested": 10
  },
  "partyResults": [
    {
      "party_id": "uuid",
      "party_name": "AIADMK",
      "short_name": "AIADMK",
      "color": "#00FF00",
      "total_votes": 150000,
      "booths_contested": 234,
      "booths_won": 120,
      "vote_share_percentage": 35.5,
      "booth_win_percentage": 51.3
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 3. Live Results
**GET** `/polling/live-results`

Get real-time results for all booths with party-wise breakdown.

**Query Parameters:**
- `election_id` (optional): Filter by specific election

**Response:**
```json
[
  {
    "booth_id": "uuid",
    "booth_name": "Government School, Chennai",
    "location": "Chennai North",
    "total_voters": 2000,
    "party_results": [
      {
        "party_id": "uuid",
        "party_name": "AIADMK",
        "short_name": "AIADMK",
        "color": "#00FF00",
        "votes": 1250,
        "percentage": 62.5
      }
    ],
    "total_votes_cast": 1800,
    "turnout_percentage": 90.0
  }
]
```

---

## Booth Results Endpoints

### 1. Get Booth Results
**GET** `/booth-results/:boothId`

Get all party results for a specific booth with percentages.

**Response:**
```json
[
  {
    "id": "uuid",
    "booth_id": "uuid",
    "party_id": "uuid",
    "votes": 1250,
    "party_name": "AIADMK",
    "short_name": "AIADMK",
    "color": "#00FF00",
    "booth_name": "Government School, Chennai",
    "total_voters": 2000,
    "polling_percentage": 62.5,
    "vote_share_percentage": 45.2,
    "is_winner": 1
  }
]
```

### 2. Create/Update Booth Result
**POST** `/booth-results`

Create or update a booth result.

**Request Body:**
```json
{
  "booth_id": "uuid",
  "party_id": "uuid",
  "votes": 1250
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "booth_id": "uuid",
    "party_id": "uuid",
    "votes": 1250,
    "party_name": "AIADMK",
    "polling_percentage": 62.5,
    "vote_share_percentage": 45.2
  }
}
```

### 3. Update Booth Result
**PUT** `/booth-results/:boothId/:partyId`

Update votes for a specific booth-party combination.

**Request Body:**
```json
{
  "votes": 1300
}
```

### 4. Delete Booth Result
**DELETE** `/booth-results/:boothId/:partyId`

Delete a specific booth result.

---

## Enhanced Booth Endpoints

### Get Booth Details with Results
**GET** `/booths/:id`

Get booth details with all results and summary statistics.

**Response:**
```json
{
  "id": "uuid",
  "election_id": "uuid",
  "booth_name": "Government School, Chennai",
  "booth_number_start": 1,
  "booth_number_end": 5,
  "location": "Chennai North",
  "male_voters": 1000,
  "female_voters": 950,
  "transgender_voters": 50,
  "total_voters": 2000,
  "results": [
    {
      "id": "uuid",
      "party_id": "uuid",
      "votes": 1250,
      "party_name": "AIADMK",
      "short_name": "AIADMK",
      "color": "#00FF00",
      "polling_percentage": 62.5,
      "vote_share_percentage": 45.2,
      "is_winner": 1
    }
  ],
  "summary": {
    "total_votes_cast": 1800,
    "turnout_percentage": 90.0,
    "parties_contested": 8
  }
}
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message description",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `404`: Not Found
- `500`: Internal Server Error

---

## Data Validation

### Required Fields
- **booth_results**: `booth_id`, `party_id`, `votes`
- **booths**: `election_id`, `booth_name`, `location`
- **parties**: `name`
- **elections**: `name`, `year`

### Data Types
- **votes**: Non-negative integer
- **percentages**: Decimal with 2 decimal places
- **IDs**: UUID format
- **dates**: ISO 8601 format

---

## Performance Notes

1. All percentage calculations are done at the database level for accuracy
2. Indexes are created on frequently queried columns
3. Views are used for complex aggregations
4. Results are cached where appropriate
5. Pagination is available for large datasets

---

## Usage Examples

### Frontend Integration

```javascript
// Get party vote summary
const response = await fetch('/api/analytics/party-vote-summary?election_id=uuid');
const partyData = await response.json();

// Display vote percentages
partyData.forEach(party => {
  console.log(`${party.party_name}: ${party.vote_share_percentage}%`);
});

// Get live results for charts
const liveResults = await fetch('/api/polling/live-results?election_id=uuid');
const chartData = await liveResults.json();

// Process for chart display
const chartLabels = chartData.map(booth => booth.booth_name);
const chartValues = chartData.map(booth => booth.turnout_percentage);
```

This comprehensive API provides all the data your frontend needs to display party votes and polling percentages correctly.