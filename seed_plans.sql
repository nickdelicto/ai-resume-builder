-- Insert one-time plan
INSERT INTO "SubscriptionPlan" (
    "id", 
    "name", 
    "description", 
    "price", 
    "interval", 
    "maxResumes", 
    "isPopular", 
    "isActive", 
    "features", 
    "createdAt", 
    "updatedAt"
) VALUES (
    '01H9XY1Z5N5S7FJ9K8D6G2T3Q7', 
    'One-Time Download', 
    'Make a single resume and download it once', 
    6.99, 
    'one-time', 
    1, 
    false, 
    true, 
    ARRAY['Download as PDF', 'ATS-friendly templates', 'AI-powered tailoring', 'No recurring charges'], 
    NOW(), 
    NOW()
);

-- Insert weekly plan
INSERT INTO "SubscriptionPlan" (
    "id", 
    "name", 
    "description", 
    "price", 
    "interval", 
    "maxResumes", 
    "isPopular", 
    "isActive", 
    "features", 
    "createdAt", 
    "updatedAt"
) VALUES (
    '02H9XY2A6P7T8GK0L9E7H3U4R8', 
    'Resume Pro Weekly', 
    'Make unlimited resumes for different jobs', 
    4.99, 
    'weekly', 
    5, 
    true, 
    true, 
    ARRAY['Unlimited downloads', 'Store up to 5 resumes', 'All premium templates', 'AI-powered tailoring', 'Weekly billing'], 
    NOW(), 
    NOW()
);

-- Insert monthly plan
INSERT INTO "SubscriptionPlan" (
    "id", 
    "name", 
    "description", 
    "price", 
    "interval", 
    "maxResumes", 
    "isPopular", 
    "isActive", 
    "features", 
    "createdAt", 
    "updatedAt"
) VALUES (
    '03H9XY3B7Q8U9HL1M0F8I4V5S9', 
    'Resume Pro Monthly', 
    'Our best value plan for serious job seekers', 
    13.99, 
    'monthly', 
    10, 
    false, 
    true, 
    ARRAY['Unlimited downloads', 'Store up to 10 resumes', 'All premium templates', 'AI-powered tailoring', 'Priority support', 'Monthly billing (best value)'], 
    NOW(), 
    NOW()
); 