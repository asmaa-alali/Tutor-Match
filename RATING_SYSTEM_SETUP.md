# 🌟 Rating System Setup Guide

## Overview
The rating system allows students to rate tutors and provide feedback after tutoring sessions. This enhances the platform by providing transparency and helping students find the best tutors.

## Features
- ⭐ 5-star rating system
- 💬 Detailed feedback/review text
- 📚 Subject-specific ratings
- 👍 Recommendation indicator
- 📊 Automatic average rating calculation
- 🔒 One rating per student per tutor
- 📈 Rating statistics and distribution

---

## Database Setup

### Step 1: Create the Ratings Table

1. Log into your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Copy and paste the SQL from `database/create_ratings_table.sql`
4. Click **Run** to execute the SQL

This will:
- Create the `ratings` table
- Add `rating` and `reviews` columns to the `tutors` table
- Set up indexes for performance
- Create automatic triggers to update tutor ratings
- Configure Row Level Security (RLS) policies

### Step 2: Verify the Setup

Run this query in the SQL Editor to verify:

```sql
SELECT * FROM public.ratings LIMIT 5;
SELECT id, firstName, lastName, rating, reviews FROM public.tutors LIMIT 5;
```

---

## Backend API Endpoints

### 1. Submit a Rating
**POST** `/api/ratings`

**Request Body:**
```json
{
  "tutorId": "uuid-of-tutor",
  "studentId": "uuid-of-student",
  "rating": 5,
  "feedback": "Excellent tutor! Very patient and knowledgeable.",
  "subject": "CMPS 200",
  "recommend": true
}
```

**Response:**
```json
{
  "message": "Rating submitted successfully",
  "rating": {
    "id": "...",
    "tutor_id": "...",
    "student_id": "...",
    "rating": 5,
    "feedback": "...",
    "created_at": "2024-01-15T12:00:00Z"
  }
}
```

**Validations:**
- Rating must be 1-5
- Feedback must be at least 20 characters
- Student can only rate a tutor once

---

### 2. Get Tutor Ratings
**GET** `/api/ratings/:tutorId`

**Response:**
```json
{
  "ratings": [
    {
      "id": "...",
      "rating": 5,
      "feedback": "Great tutor!",
      "subject": "CMPS 200",
      "recommend": true,
      "createdAt": "2024-01-15T12:00:00Z",
      "studentName": "John Doe"
    }
  ]
}
```

---

### 3. Get Rating Statistics
**GET** `/api/ratings/:tutorId/stats`

**Response:**
```json
{
  "totalRatings": 25,
  "averageRating": 4.8,
  "recommendPercentage": 96.0,
  "ratingDistribution": {
    "5": 20,
    "4": 4,
    "3": 1,
    "2": 0,
    "1": 0
  }
}
```

---

## Frontend Implementation

### How It Works

1. **Find Tutor Page** (`findtutor.html`):
   - Each tutor card now displays a "Rate This Tutor" button
   - Button is styled to match the existing design

2. **Rating Modal**:
   - Opens when student clicks "Rate This Tutor"
   - Interactive 5-star selection
   - Feedback text area (minimum 20 characters)
   - Subject field (optional)
   - Recommendation radio buttons
   - Form validation before submission

3. **Submission Flow**:
   - Form data is validated
   - Student ID is retrieved from localStorage session
   - API call to `/api/ratings` endpoint
   - Success message displayed
   - Modal closes automatically

### Key Files Modified

- **`frontend/FindTutor/find-tutor.js`**
  - Added `openRatingModal()` function
  - Updated `renderTutorCard()` to include rate button
  - Added event handlers for rating submission

- **`backend/server.js`**
  - Added `/api/ratings` POST endpoint
  - Added `/api/ratings/:tutorId` GET endpoint
  - Added `/api/ratings/:tutorId/stats` GET endpoint

---

## Testing the Rating System

### 1. Test Basic Functionality

1. Start your backend server:
   ```bash
   cd backend
   node server.js
   ```

2. Open the find tutor page in your browser:
   ```
   http://localhost:3000/Student%20Page/findtutor.html
   ```

3. Click "Rate This Tutor" on any tutor card

4. Fill out the rating form:
   - Select star rating (1-5)
   - Write feedback (minimum 20 characters)
   - Optionally add subject
   - Choose whether you'd recommend

5. Submit the form

### 2. Test Validation

Try these scenarios to test validation:
- Submit without selecting stars → Error message
- Submit with < 20 characters feedback → Error message
- Submit without selecting recommendation → Error message
- Try rating the same tutor twice → Error: "Already rated"

### 3. Verify Database Updates

Check the database after submitting a rating:

```sql
-- View all ratings
SELECT * FROM public.ratings ORDER BY created_at DESC;

-- Check tutor's updated rating
SELECT id, firstName, lastName, rating, reviews 
FROM public.tutors 
WHERE id = 'your-tutor-id';
```

---

## Displaying Ratings (Optional Enhancement)

To display existing ratings on a tutor's profile page, you can:

1. Fetch ratings when viewing a tutor profile:
```javascript
async function loadTutorRatings(tutorId) {
  const response = await fetch(`/api/ratings/${tutorId}`);
  const data = await response.json();
  displayRatings(data.ratings);
}
```

2. Display rating statistics:
```javascript
async function loadRatingStats(tutorId) {
  const response = await fetch(`/api/ratings/${tutorId}/stats`);
  const stats = await response.json();
  displayStats(stats);
}
```

---

## Security Features

✅ **Row Level Security (RLS)**
- Students can only submit ratings when authenticated
- Students can only edit/delete their own ratings
- All ratings are viewable by everyone

✅ **Validation**
- Rating must be 1-5 stars
- Feedback must be meaningful (20+ characters)
- One rating per student per tutor (database constraint)

✅ **Data Integrity**
- Foreign key constraints to users
- Cascade delete if user is removed
- Automatic rating recalculation via triggers

---

## Troubleshooting

### Problem: "Failed to submit rating"
**Solution:** Check that:
- Backend server is running
- Supabase credentials are correct in `.env`
- Ratings table exists in database
- Student is logged in (session exists)

### Problem: "You have already rated this tutor"
**Solution:** This is expected behavior. Each student can only rate a tutor once. If you want to update a rating, you'll need to implement an UPDATE endpoint.

### Problem: Rating doesn't update on tutor card
**Solution:** The rating updates in the database but the frontend doesn't auto-refresh. Refresh the page to see the updated rating.

---

## Future Enhancements

Consider adding:
- ✏️ Edit/update existing ratings
- 🗑️ Delete ratings
- 📊 Rating analytics dashboard for admins
- 🔔 Email notifications when tutor receives a rating
- 🏆 Badge system for highly-rated tutors
- 📈 Trending tutors based on recent ratings
- 🎯 Filter tutors by minimum rating
- 💡 Helpful/unhelpful voting on reviews

---

## Support

For issues or questions:
- Check the browser console for error messages
- Check the backend terminal for server errors
- Verify Supabase table structure matches the SQL script
- Ensure environment variables are properly set

---

**Last Updated:** January 2025  
**Version:** 1.0
