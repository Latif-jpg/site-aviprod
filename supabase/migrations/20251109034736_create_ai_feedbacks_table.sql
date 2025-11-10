-- Create AI feedbacks table for AI Evolution Dashboard
CREATE TABLE IF NOT EXISTS ai_feedbacks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_action_id UUID,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback_type TEXT CHECK (feedback_type IN ('helpful', 'accurate', 'fast', 'confusing', 'inaccurate', 'slow', 'other')),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE ai_feedbacks ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can insert their own feedback" ON ai_feedbacks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can read their own feedback
CREATE POLICY "Users can read their own feedback" ON ai_feedbacks
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can read all feedback
CREATE POLICY "Admins can read all feedback" ON ai_feedbacks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_feedbacks_user_id ON ai_feedbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedbacks_rating ON ai_feedbacks(rating);
CREATE INDEX IF NOT EXISTS idx_ai_feedbacks_feedback_type ON ai_feedbacks(feedback_type);
CREATE INDEX IF NOT EXISTS idx_ai_feedbacks_created_at ON ai_feedbacks(created_at);

-- Insert some sample feedback data
INSERT INTO ai_feedbacks (user_id, rating, feedback_type, comment) VALUES
  ((SELECT id FROM auth.users LIMIT 1), 5, 'helpful', 'Prédiction de stock très précise !'),
  ((SELECT id FROM auth.users LIMIT 1), 4, 'accurate', 'Diagnostic santé utile'),
  ((SELECT id FROM auth.users LIMIT 1), 5, 'fast', 'Réponse très rapide'),
  ((SELECT id FROM auth.users LIMIT 1), 3, 'confusing', 'Difficile à comprendre'),
  ((SELECT id FROM auth.users LIMIT 1), 4, 'helpful', 'Bonnes recommandations financières')
ON CONFLICT DO NOTHING; u