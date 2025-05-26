-- Update One-Time plan
UPDATE "SubscriptionPlan"
SET 
  name = 'One-Time Download',
  description = 'Make a single resume and download it once',
  features = ARRAY['One professional resume download', 'ATS-optimized format', 'All professional templates', 'One time payment- No renewal!'],
  "isPopular" = false
WHERE interval = 'one-time';

-- Update Weekly plan
UPDATE "SubscriptionPlan"
SET 
  name = 'Short-Term Job Hunt',
  description = 'Ideal for short-term job search',
  features = ARRAY['Unlimited resume downloads', 'Create multiple versions', 'All premium templates', 'Best for short-term job search'],
  "isPopular" = true
WHERE interval = 'weekly';

-- Update Monthly plan
UPDATE "SubscriptionPlan"
SET 
  name = 'Long-Term Job Hunt',
  description = 'Ideal for long-term job seekers',
  features = ARRAY['Unlimited resume downloads', 'Tailor for multiple jobs', 'All premium templates', 'Best for long-term job search'],
  "isPopular" = false
WHERE interval = 'monthly'; 