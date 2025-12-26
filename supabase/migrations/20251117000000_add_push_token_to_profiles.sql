-- Add push_token column to profiles table for push notifications
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token TEXT;