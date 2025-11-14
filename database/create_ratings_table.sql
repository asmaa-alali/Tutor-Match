-- Create ratings table for Tutor Match
-- Run this SQL in your Supabase SQL Editor

-- Create the ratings table
CREATE TABLE IF NOT EXISTS public.ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT NOT NULL CHECK (char_length(feedback) >= 20),
    subject VARCHAR(255),
    recommend BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure a student can only rate a tutor once
    UNIQUE(tutor_id, student_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ratings_tutor_id ON public.ratings(tutor_id);
CREATE INDEX IF NOT EXISTS idx_ratings_student_id ON public.ratings(student_id);
CREATE INDEX IF NOT EXISTS idx_ratings_created_at ON public.ratings(created_at DESC);

-- Add rating and reviews columns to tutors table if they don't exist
ALTER TABLE public.tutors 
ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS reviews INTEGER DEFAULT 0;

-- Create a function to update tutor rating automatically
CREATE OR REPLACE FUNCTION update_tutor_rating()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalculate average rating for the tutor
    UPDATE public.tutors
    SET 
        rating = (
            SELECT ROUND(AVG(rating)::numeric, 2)
            FROM public.ratings
            WHERE tutor_id = COALESCE(NEW.tutor_id, OLD.tutor_id)
        ),
        reviews = (
            SELECT COUNT(*)
            FROM public.ratings
            WHERE tutor_id = COALESCE(NEW.tutor_id, OLD.tutor_id)
        )
    WHERE id = COALESCE(NEW.tutor_id, OLD.tutor_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update tutor rating on insert/update/delete
DROP TRIGGER IF EXISTS trigger_update_tutor_rating ON public.ratings;
CREATE TRIGGER trigger_update_tutor_rating
    AFTER INSERT OR UPDATE OR DELETE ON public.ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_tutor_rating();

-- Enable Row Level Security (RLS)
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Students can insert their own ratings
CREATE POLICY "Students can insert ratings" ON public.ratings
    FOR INSERT
    WITH CHECK (auth.uid() = student_id);

-- Anyone can view ratings
CREATE POLICY "Anyone can view ratings" ON public.ratings
    FOR SELECT
    USING (true);

-- Students can update their own ratings
CREATE POLICY "Students can update own ratings" ON public.ratings
    FOR UPDATE
    USING (auth.uid() = student_id);

-- Students can delete their own ratings
CREATE POLICY "Students can delete own ratings" ON public.ratings
    FOR DELETE
    USING (auth.uid() = student_id);

-- Grant necessary permissions
GRANT SELECT, INSERT ON public.ratings TO authenticated;
GRANT SELECT, INSERT ON public.ratings TO anon;

-- Comment on table
COMMENT ON TABLE public.ratings IS 'Stores student ratings and reviews for tutors';

-- Sample query to verify setup
-- SELECT * FROM public.ratings LIMIT 10;
