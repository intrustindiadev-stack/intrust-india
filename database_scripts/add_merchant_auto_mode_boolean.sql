-- Add auto_mode boolean column to decouple auto mode feature from subscription status
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS auto_mode BOOLEAN DEFAULT false;
