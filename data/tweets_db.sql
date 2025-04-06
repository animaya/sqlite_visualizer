-- Create users table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  verified BOOLEAN DEFAULT 0,
  followers_count INTEGER NOT NULL,
  following_count INTEGER NOT NULL,
  account_created DATE NOT NULL
);

-- Create topics table
CREATE TABLE topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  trending_score INTEGER DEFAULT 0
);

-- Create tweets table
CREATE TABLE tweets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  posted_at TIMESTAMP NOT NULL,
  likes_count INTEGER DEFAULT 0,
  retweets_count INTEGER DEFAULT 0,
  replies_count INTEGER DEFAULT 0,
  impressions_count INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create tweet_topics junction table (many-to-many)
CREATE TABLE tweet_topics (
  tweet_id INTEGER NOT NULL,
  topic_id INTEGER NOT NULL,
  relevance_score REAL DEFAULT 1.0, -- 0.0 to 1.0 indicating how relevant the tweet is to the topic
  PRIMARY KEY (tweet_id, topic_id),
  FOREIGN KEY (tweet_id) REFERENCES tweets(id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
);

-- Create hashtags table
CREATE TABLE hashtags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

-- Create tweet_hashtags junction table (many-to-many)
CREATE TABLE tweet_hashtags (
  tweet_id INTEGER NOT NULL,
  hashtag_id INTEGER NOT NULL,
  PRIMARY KEY (tweet_id, hashtag_id),
  FOREIGN KEY (tweet_id) REFERENCES tweets(id) ON DELETE CASCADE,
  FOREIGN KEY (hashtag_id) REFERENCES hashtags(id) ON DELETE CASCADE
);

-- Insert sample data for users
INSERT INTO users (username, display_name, verified, followers_count, following_count, account_created) VALUES
('tech_enthusiast', 'Tech Enthusiast', 0, 5420, 843, '2018-06-12'),
('news_reporter', 'Daily News Reporter', 1, 45300, 2105, '2015-03-24'),
('climate_activist', 'Climate Change Activist', 1, 28750, 1534, '2019-01-15'),
('political_analyst', 'Political Analysis', 1, 67800, 2340, '2016-08-03'),
('entertainment_daily', 'Entertainment Daily', 1, 124500, 3210, '2014-11-28'),
('sports_update', 'Sports Update Central', 1, 89600, 1450, '2017-04-17'),
('science_lover', 'Science Enthusiast', 0, 12400, 980, '2020-02-08'),
('finance_guru', 'Finance & Markets', 1, 34700, 1870, '2016-05-22'),
('health_expert', 'Health & Wellness', 1, 29300, 1320, '2018-09-10'),
('gaming_news', 'Gaming News Network', 0, 78900, 2450, '2017-12-05');

-- Insert sample data for topics
INSERT INTO topics (name, category, trending_score) VALUES
('Artificial Intelligence', 'Technology', 92),
('Climate Change', 'Environment', 85),
('Renewable Energy', 'Environment', 78),
('Presidential Election', 'Politics', 95),
('Stock Market', 'Finance', 82),
('Cryptocurrency', 'Finance', 88),
('Pandemic Recovery', 'Health', 76),
('Mental Health', 'Health', 79),
('Streaming Services', 'Entertainment', 84),
('Gaming Industry', 'Entertainment', 83),
('Space Exploration', 'Science', 77),
('Sports Championships', 'Sports', 90);

-- Insert sample data for hashtags
INSERT INTO hashtags (name) VALUES
('#AI'),
('#MachineLearning'),
('#ClimateAction'),
('#ElectionNews'),
('#StockMarket'),
('#Crypto'),
('#Bitcoin'),
('#MentalHealthMatters'),
('#Netflix'),
('#Gaming'),
('#SpaceX'),
('#NBA'),
('#SustainableEnergy'),
('#HealthTips'),
('#Politics');

-- Insert sample data for tweets (covering 3 months: October, November, December 2023)
-- October 2023 tweets
INSERT INTO tweets (user_id, content, posted_at, likes_count, retweets_count, replies_count, impressions_count) VALUES
(1, 'GPT-4 capabilities are truly mindblowing. The way it handles complex coding tasks is revolutionary! #AI #MachineLearning', '2023-10-01 09:23:45', 342, 78, 45, 12400),
(2, 'Breaking: New climate policy announced at the UN Summit. Countries pledge to reduce emissions by 30% by 2030. #ClimateAction', '2023-10-02 14:15:32', 863, 312, 157, 45300),
(3, 'Today marks the 5th Global Climate Strike. Millions of people around the world are demanding action! #ClimateAction', '2023-10-03 10:42:18', 1245, 567, 234, 67800),
(4, 'Analysis: Presidential candidates facing off on economic policies. Tax plans show significant divergence. #ElectionNews #Politics', '2023-10-04 16:37:52', 735, 198, 263, 34200),
(5, 'New streaming service launches today with exclusive content. Is the market becoming too saturated? #Netflix', '2023-10-05 11:28:37', 421, 87, 142, 28900),
(6, 'Championship finals set for this weekend. Who''s your pick to win it all? #NBA', '2023-10-06 18:05:23', 892, 214, 376, 56700),
(7, 'Recent advances in quantum computing could revolutionize how we approach big data problems. #AI', '2023-10-07 13:49:12', 364, 95, 47, 14300),
(8, 'Market update: Tech stocks rally after recent selloff. NASDAQ up 2.3% today. #StockMarket', '2023-10-08 15:52:41', 283, 64, 29, 19500),
(9, 'New study shows promising results for anxiety management techniques. Mental health awareness continues to grow! #MentalHealthMatters', '2023-10-09 12:14:33', 748, 326, 87, 31200),
(10, 'Latest gaming console sales break records. Industry growth continues despite economic challenges. #Gaming', '2023-10-10 17:38:27', 568, 143, 97, 42800),
(1, 'AI ethics continue to be a major concern as models become more powerful. Regulation is needed. #AI', '2023-10-15 10:27:36', 512, 147, 94, 26700),
(2, 'Record-breaking temperatures recorded in 3 continents this month. Climate crisis worsening. #ClimateAction', '2023-10-18 13:42:57', 1632, 876, 324, 92300),
(3, 'New solar technology promises 40% increase in efficiency at lower cost. Game changer! #SustainableEnergy', '2023-10-20 09:15:22', 925, 421, 136, 47500),
(4, 'Pre-election polls show tight race in key swing states. Turnout will be decisive. #ElectionNews', '2023-10-22 16:48:13', 573, 232, 187, 39600),
(5, 'Streaming viewership surpasses cable for the first time in history. Major shift in entertainment consumption. #Netflix', '2023-10-25 14:37:26', 834, 398, 126, 67200);

-- November 2023 tweets
INSERT INTO tweets (user_id, content, posted_at, likes_count, retweets_count, replies_count, impressions_count) VALUES
(6, 'Mid-season rankings are in! Surprising upsets have changed the league standings. #NBA', '2023-11-01 11:23:47', 731, 245, 198, 53400),
(7, 'NASA announces new mission to study exoplanets. Could find evidence of habitable worlds! #SpaceX', '2023-11-03 15:42:18', 1423, 682, 213, 78900),
(8, 'Cryptocurrency market sees major correction. Bitcoin down 15% this week. #Crypto #Bitcoin', '2023-11-05 09:17:32', 415, 132, 97, 29400),
(9, 'New research links diet to mental health improvements. Nutritional psychiatry gaining traction. #MentalHealthMatters #HealthTips', '2023-11-07 13:51:26', 876, 426, 154, 46300),
(10, 'Major game developer acquires indie studio. Concerns about creative independence. #Gaming', '2023-11-09 16:34:51', 637, 214, 187, 51200),
(1, 'Testing the latest AR development kit. The future of immersive computing is getting closer! #AI', '2023-11-11 10:05:37', 427, 118, 63, 22800),
(2, 'Flooding in coastal regions worsening due to rising sea levels. Adaptation plans insufficient. #ClimateAction', '2023-11-13 14:23:48', 1053, 587, 214, 69400),
(3, 'Wind farm project breaks ground, will power 50,000 homes with clean energy. #SustainableEnergy', '2023-11-15 11:32:14', 864, 395, 127, 42700),
(4, 'Election debate highlights: Candidates clash on healthcare and immigration policies. #ElectionNews #Politics', '2023-11-17 19:45:32', 912, 376, 243, 65800),
(5, 'Streaming wars intensify as services compete for exclusive content rights. #Netflix', '2023-11-19 12:28:53', 593, 214, 156, 48200),
(6, 'Player trades shake up team dynamics heading into the final stretch of the season. #NBA', '2023-11-21 17:39:14', 843, 267, 234, 59700),
(7, 'New astronomical discovery challenges our understanding of black holes. #SpaceX', '2023-11-23 13:47:29', 986, 475, 142, 51300),
(8, 'Fed signals potential interest rate changes. Markets respond positively. #StockMarket', '2023-11-25 15:36:42', 358, 95, 73, 25600),
(9, 'Winter wellness: Staying healthy during the cold season. Tips for maintaining physical and mental health. #HealthTips', '2023-11-27 09:28:17', 754, 387, 112, 39800),
(10, 'End of year game releases competing for holiday shopping attention. #Gaming', '2023-11-29 16:23:45', 782, 253, 197, 63400);

-- December 2023 tweets
INSERT INTO tweets (user_id, content, posted_at, likes_count, retweets_count, replies_count, impressions_count) VALUES
(1, 'End of year review: AI advancements that shaped 2023. Remarkable progress in generative models! #AI #MachineLearning', '2023-12-01 10:17:32', 895, 423, 157, 68900),
(2, 'Climate year in review: Record temperatures, extreme weather, but also progress in renewable adoption. #ClimateAction', '2023-12-03 13:45:26', 1324, 764, 245, 87600),
(3, 'Renewable energy surpassed coal globally for the first time in 2023. A milestone worth celebrating! #SustainableEnergy', '2023-12-05 11:23:47', 1572, 832, 276, 93400),
(4, 'Election campaign intensifies as candidates reveal detailed policy proposals. #ElectionNews #Politics', '2023-12-07 16:39:28', 832, 347, 295, 72500),
(5, 'Year in entertainment: Streaming platforms and their impact on traditional media in 2023. #Netflix', '2023-12-09 14:52:13', 764, 312, 184, 65200),
(6, 'Sports highlights of 2023: The moments that defined this year in athletics. #NBA', '2023-12-11 18:27:36', 1095, 537, 312, 83400),
(7, 'Science breakthroughs of 2023: From quantum computing to space exploration. #SpaceX', '2023-12-13 12:34:48', 1237, 643, 189, 72600),
(8, 'Financial year in review: Markets, cryptocurrencies, and economic trends of 2023. #StockMarket #Crypto', '2023-12-15 15:47:23', 683, 289, 173, 54300),
(9, 'Mental health awareness grew significantly in 2023. Progress and challenges ahead. #MentalHealthMatters', '2023-12-17 10:36:42', 924, 576, 164, 61900),
(10, 'Gaming industry in 2023: Innovation, controversies, and market expansion. #Gaming', '2023-12-19 17:23:14', 875, 392, 247, 76400),
(1, 'Predictions for AI in 2024: Multimodal models and practical applications will lead the way. #AI', '2023-12-21 11:45:27', 736, 357, 138, 58700),
(2, 'Climate goals for 2024: What needs to happen to keep global warming targets within reach. #ClimateAction', '2023-12-23 14:32:18', 1142, 672, 245, 76800),
(3, 'Clean energy outlook for 2024: Investment trends and technological innovations to watch. #SustainableEnergy', '2023-12-25 09:27:36', 843, 421, 132, 46500),
(4, 'Political forecast for 2024: Key races and policy battles that will shape the election year. #Politics', '2023-12-27 16:52:14', 937, 421, 276, 64300),
(5, 'Entertainment trends to watch in 2024: Content creation and consumption patterns evolving. #Netflix', '2023-12-29 13:28:47', 648, 287, 156, 52100),
(6, 'Sports predictions for 2024: Teams, players, and events that will make headlines. #NBA', '2023-12-31 18:45:32', 1253, 674, 327, 89700);

-- Connect tweets to topics
INSERT INTO tweet_topics (tweet_id, topic_id, relevance_score) VALUES
-- AI and Technology tweets
(1, 1, 0.95), -- GPT-4 tweet highly relevant to AI
(7, 1, 0.85), -- Quantum computing tweet related to AI
(11, 1, 0.90), -- AI ethics tweet
(16, 1, 0.75), -- AR development kit
(31, 1, 0.95), -- Year in AI review
(41, 1, 0.90), -- AI predictions for 2024

-- Climate Change tweets
(2, 2, 0.90), -- UN Summit tweet relevant to Climate Change
(3, 2, 0.95), -- Global Climate Strike
(12, 2, 0.95), -- Record temperatures
(17, 2, 0.90), -- Coastal flooding
(32, 2, 0.95), -- Climate year in review
(42, 2, 0.90), -- Climate goals for 2024

-- Renewable Energy tweets
(13, 3, 0.95), -- Solar technology tweet
(18, 3, 0.95), -- Wind farm project
(33, 3, 0.90), -- Renewable vs coal
(43, 3, 0.90), -- Clean energy outlook

-- Politics/Election tweets
(4, 4, 0.90), -- Economic policies tweet
(14, 4, 0.95), -- Pre-election polls
(19, 4, 0.95), -- Election debate
(34, 4, 0.95), -- Policy proposals
(44, 4, 0.95), -- Political forecast

-- Financial tweets
(8, 5, 0.95), -- Tech stocks tweet
(23, 5, 0.90), -- Fed interest rate
(38, 5, 0.95), -- Financial year review
(38, 6, 0.85), -- Financial review also relevant to crypto

-- Cryptocurrency tweets
(23, 6, 0.90), -- Bitcoin correction
-- Financial year review includes crypto (already linked above)

-- Health tweets
(9, 8, 0.95), -- Mental health techniques
(24, 8, 0.90), -- Diet and mental health
(29, 7, 0.85), -- Winter wellness
(39, 8, 0.95), -- Mental health awareness

-- Entertainment tweets
(5, 9, 0.90), -- Streaming service launch
(15, 9, 0.95), -- Streaming vs cable
(20, 9, 0.90), -- Streaming wars
(35, 9, 0.95), -- Year in entertainment
(45, 9, 0.90), -- Entertainment trends

-- Gaming tweets
(10, 10, 0.95), -- Console sales
(15, 10, 0.80), -- Also relevant to gaming industry
(25, 10, 0.95), -- Developer acquisition
(30, 10, 0.90), -- Holiday game releases
(40, 10, 0.95), -- Gaming industry review

-- Sports tweets
(6, 12, 0.95), -- Championship finals
(21, 12, 0.95), -- Mid-season rankings
(26, 12, 0.90), -- Player trades
(36, 12, 0.95), -- Sports highlights
(46, 12, 0.95); -- Sports predictions

-- Connect tweets to hashtags
INSERT INTO tweet_hashtags (tweet_id, hashtag_id) VALUES
-- October tweets
(1, 1), -- #AI
(1, 2), -- #MachineLearning
(2, 3), -- #ClimateAction
(3, 3), -- #ClimateAction
(4, 4), -- #ElectionNews
(4, 15), -- #Politics
(5, 9), -- #Netflix
(6, 12), -- #NBA
(7, 1), -- #AI
(8, 5), -- #StockMarket
(9, 8), -- #MentalHealthMatters
(10, 10), -- #Gaming
(11, 1), -- #AI
(12, 3), -- #ClimateAction
(13, 13), -- #SustainableEnergy
(14, 4), -- #ElectionNews
(15, 9), -- #Netflix

-- November tweets
(16, 12), -- #NBA
(17, 11), -- #SpaceX
(18, 6), -- #Crypto
(18, 7), -- #Bitcoin
(19, 8), -- #MentalHealthMatters
(19, 14), -- #HealthTips
(20, 10), -- #Gaming
(21, 1), -- #AI
(22, 3), -- #ClimateAction
(23, 13), -- #SustainableEnergy
(24, 4), -- #ElectionNews
(24, 15), -- #Politics
(25, 9), -- #Netflix
(26, 12), -- #NBA
(27, 11), -- #SpaceX
(28, 5), -- #StockMarket
(29, 14), -- #HealthTips
(30, 10), -- #Gaming

-- December tweets
(31, 1), -- #AI
(31, 2), -- #MachineLearning
(32, 3), -- #ClimateAction
(33, 13), -- #SustainableEnergy
(34, 4), -- #ElectionNews
(34, 15), -- #Politics
(35, 9), -- #Netflix
(36, 12), -- #NBA
(37, 11), -- #SpaceX
(38, 5), -- #StockMarket
(38, 6), -- #Crypto
(39, 8), -- #MentalHealthMatters
(40, 10), -- #Gaming
(41, 1), -- #AI
(42, 3), -- #ClimateAction
(43, 13), -- #SustainableEnergy
(44, 15), -- #Politics
(45, 9), -- #Netflix
(46, 12); -- #NBA

-- Create useful views for analysis

-- View to analyze topic popularity over time
CREATE VIEW topic_popularity_by_month AS
SELECT 
    t.name as topic_name,
    t.category as topic_category,
    strftime('%Y-%m', tw.posted_at) as month,
    COUNT(DISTINCT tt.tweet_id) as tweet_count,
    SUM(tw.likes_count) as total_likes,
    SUM(tw.retweets_count) as total_retweets,
    ROUND(AVG(tt.relevance_score), 2) as avg_relevance
FROM 
    topics t
JOIN 
    tweet_topics tt ON t.id = tt.topic_id
JOIN 
    tweets tw ON tt.tweet_id = tw.id
GROUP BY 
    t.name, t.category, strftime('%Y-%m', tw.posted_at)
ORDER BY 
    strftime('%Y-%m', tw.posted_at), SUM(tw.likes_count + tw.retweets_count) DESC;

-- View to analyze hashtag usage frequency
CREATE VIEW hashtag_usage AS
SELECT 
    h.name as hashtag,
    COUNT(th.tweet_id) as usage_count,
    SUM(tw.likes_count) as total_likes,
    SUM(tw.retweets_count) as total_retweets,
    ROUND(SUM(tw.likes_count + tw.retweets_count) / COUNT(th.tweet_id), 2) as engagement_per_tweet
FROM 
    hashtags h
JOIN 
    tweet_hashtags th ON h.id = th.hashtag_id
JOIN 
    tweets tw ON th.tweet_id = tw.id
GROUP BY 
    h.name
ORDER BY 
    usage_count DESC;

-- View to analyze user performance
CREATE VIEW user_performance AS
SELECT 
    u.username,
    u.display_name,
    COUNT(t.id) as tweet_count,
    SUM(t.likes_count) as total_likes,
    SUM(t.retweets_count) as total_retweets,
    SUM(t.replies_count) as total_replies,
    SUM(t.impressions_count) as total_impressions,
    ROUND(SUM(t.likes_count + t.retweets_count) / COUNT(t.id), 2) as engagement_per_tweet,
    ROUND(SUM(t.impressions_count) / COUNT(t.id), 2) as impressions_per_tweet
FROM 
    users u
JOIN 
    tweets t ON u.id = t.user_id
GROUP BY 
    u.username, u.display_name
ORDER BY 
    total_likes + total_retweets DESC;

-- View to analyze engagement by hour of day
CREATE VIEW engagement_by_hour AS
SELECT 
    CAST(strftime('%H', t.posted_at) AS INTEGER) as hour_of_day,
    COUNT(t.id) as tweet_count,
    ROUND(AVG(t.likes_count), 2) as avg_likes,
    ROUND(AVG(t.retweets_count), 2) as avg_retweets,
    ROUND(AVG(t.replies_count), 2) as avg_replies,
    ROUND(AVG(t.impressions_count), 2) as avg_impressions
FROM 
    tweets t
GROUP BY 
    hour_of_day
ORDER BY 
    hour_of_day;

-- View to analyze topics by engagement
CREATE VIEW topic_engagement AS
SELECT 
    tp.name as topic_name,
    tp.category as topic_category,
    COUNT(DISTINCT tt.tweet_id) as tweet_count,
    SUM(t.likes_count) as total_likes,
    SUM(t.retweets_count) as total_retweets,
    SUM(t.replies_count) as total_replies,
    SUM(t.impressions_count) as total_impressions,
    ROUND(SUM(t.likes_count) / COUNT(DISTINCT tt.tweet_id), 2) as likes_per_tweet,
    ROUND(SUM(t.retweets_count) / COUNT(DISTINCT tt.tweet_id), 2) as retweets_per_tweet,
    ROUND(SUM(t.impressions_count) / COUNT(DISTINCT tt.tweet_id), 2) as impressions_per_tweet
FROM 
    topics tp
JOIN 
    tweet_topics tt ON tp.id = tt.topic_id
JOIN 
    tweets t ON tt.tweet_id = t.id
GROUP BY 
    tp.name, tp.category
ORDER BY 
    total_likes + total_retweets DESC;
