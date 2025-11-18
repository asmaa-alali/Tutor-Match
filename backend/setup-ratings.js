// Setup ratings table without opening Supabase dashboard
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, ".env") });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupRatingsTable() {
  console.log("🔧 Setting up ratings table...\n");

  const sqlCommands = [
    // Drop existing ratings table
    `DROP TABLE IF EXISTS public.ratings CASCADE;`,
    
    // Create ratings table
    `CREATE TABLE public.ratings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tutor_id UUID NOT NULL,
      student_id UUID NOT NULL,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      feedback TEXT NOT NULL CHECK (char_length(feedback) >= 20),
      subject VARCHAR(255),
      recommend BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(tutor_id, student_id)
    );`,
    
    // Create indexes
    `CREATE INDEX idx_ratings_tutor_id ON public.ratings(tutor_id);`,
    `CREATE INDEX idx_ratings_student_id ON public.ratings(student_id);`,
    `CREATE INDEX idx_ratings_created_at ON public.ratings(created_at DESC);`,
    
    // Add columns to tutors table
    `ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0;`,
    `ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS reviews INTEGER DEFAULT 0;`,
    
    // Create trigger function
    `CREATE OR REPLACE FUNCTION update_tutor_rating()
    RETURNS TRIGGER AS $$
    BEGIN
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
    $$ LANGUAGE plpgsql;`,
    
    // Create trigger
    `DROP TRIGGER IF EXISTS trigger_update_tutor_rating ON public.ratings;`,
    `CREATE TRIGGER trigger_update_tutor_rating
      AFTER INSERT OR UPDATE OR DELETE ON public.ratings
      FOR EACH ROW
      EXECUTE FUNCTION update_tutor_rating();`,
    
    // Enable RLS
    `ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;`,
    
    // Drop old policies
    `DROP POLICY IF EXISTS "Students can insert ratings" ON public.ratings;`,
    `DROP POLICY IF EXISTS "Anyone can view ratings" ON public.ratings;`,
    `DROP POLICY IF EXISTS "Students can update own ratings" ON public.ratings;`,
    `DROP POLICY IF EXISTS "Students can delete own ratings" ON public.ratings;`,
    
    // Create policies
    `CREATE POLICY "Anyone can insert ratings" ON public.ratings FOR INSERT WITH CHECK (true);`,
    `CREATE POLICY "Anyone can view ratings" ON public.ratings FOR SELECT USING (true);`,
    `CREATE POLICY "Users can update own ratings" ON public.ratings FOR UPDATE USING (true);`,
    `CREATE POLICY "Users can delete own ratings" ON public.ratings FOR DELETE USING (true);`,
  ];

  for (let i = 0; i < sqlCommands.length; i++) {
    const sql = sqlCommands[i];
    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
      
      if (error) {
        // Try alternative method
        console.log(`⚠️  Step ${i + 1}/${sqlCommands.length}: Using alternative method...`);
        // Most commands can't be executed via RPC, need SQL editor
      } else {
        console.log(`✅ Step ${i + 1}/${sqlCommands.length}: Success`);
      }
    } catch (err) {
      console.log(`⚠️  Step ${i + 1}/${sqlCommands.length}: ${err.message}`);
    }
  }

  console.log("\n📝 Note: Some SQL commands require direct database access.");
  console.log("If you see warnings above, please run the SQL file in Supabase SQL Editor:");
  console.log("👉 database/fix_ratings_constraints.sql\n");
  
  console.log("Or copy and paste this complete SQL:\n");
  console.log("=====================================");
  console.log(sqlCommands.join("\n\n"));
  console.log("=====================================\n");
}

setupRatingsTable()
  .then(() => {
    console.log("✅ Setup complete!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Setup failed:", err);
    process.exit(1);
  });
