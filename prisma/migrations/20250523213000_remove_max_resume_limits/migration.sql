-- Remove maxSavedResumes from User table
ALTER TABLE "User" DROP COLUMN "maxSavedResumes";
 
-- Remove maxResumes from SubscriptionPlan table
ALTER TABLE "SubscriptionPlan" DROP COLUMN "maxResumes"; 