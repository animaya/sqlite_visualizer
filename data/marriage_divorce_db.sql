-- Create marriage_divorce_rates table
CREATE TABLE regions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  population INTEGER NOT NULL
);

-- Create marriage_divorce_rates table
CREATE TABLE marriage_divorce_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  region_id INTEGER NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  marriage_count INTEGER NOT NULL,
  divorce_count INTEGER NOT NULL,
  marriage_rate REAL NOT NULL, -- per 1000 people
  divorce_rate REAL NOT NULL, -- per 1000 people
  FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE CASCADE
);

-- Create demographics table for additional analysis
CREATE TABLE demographics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  region_id INTEGER NOT NULL,
  year INTEGER NOT NULL,
  median_age REAL NOT NULL,
  avg_income REAL NOT NULL,
  education_index REAL NOT NULL, -- higher means more educated population
  urbanization_rate REAL NOT NULL, -- percentage of urban population
  FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE CASCADE
);

-- Insert sample data for regions
INSERT INTO regions (name, type, population) VALUES 
('New York', 'State', 19500000),
('California', 'State', 39950000),
('Texas', 'State', 29450000),
('Florida', 'State', 21780000),
('Illinois', 'State', 12580000),
('Pennsylvania', 'State', 12800000),
('Ohio', 'State', 11700000),
('Michigan', 'State', 9980000),
('Georgia', 'State', 10710000),
('North Carolina', 'State', 10490000);

-- Insert sample data for marriage and divorce rates (monthly data for 2023-2024)
-- For 2023
INSERT INTO marriage_divorce_rates (region_id, year, month, marriage_count, divorce_count, marriage_rate, divorce_rate) VALUES
-- New York
(1, 2023, 1, 7850, 3920, 4.8, 2.4),
(1, 2023, 2, 8100, 3810, 5.0, 2.3),
(1, 2023, 3, 8500, 3720, 5.2, 2.3),
(1, 2023, 4, 9200, 3850, 5.7, 2.4),
(1, 2023, 5, 10500, 3950, 6.5, 2.4),
(1, 2023, 6, 12400, 4100, 7.6, 2.5),
(1, 2023, 7, 11800, 4050, 7.3, 2.5),
(1, 2023, 8, 10900, 4200, 6.7, 2.6),
(1, 2023, 9, 10100, 4150, 6.2, 2.6),
(1, 2023, 10, 9500, 4300, 5.8, 2.6),
(1, 2023, 11, 8800, 4250, 5.4, 2.6),
(1, 2023, 12, 9300, 3850, 5.7, 2.4),

-- California
(2, 2023, 1, 15400, 7850, 4.6, 2.4),
(2, 2023, 2, 16200, 7650, 4.9, 2.3),
(2, 2023, 3, 17100, 7550, 5.1, 2.3),
(2, 2023, 4, 18300, 7900, 5.5, 2.4),
(2, 2023, 5, 20200, 8100, 6.1, 2.4),
(2, 2023, 6, 23800, 8400, 7.1, 2.5),
(2, 2023, 7, 22500, 8350, 6.8, 2.5),
(2, 2023, 8, 21200, 8600, 6.4, 2.6),
(2, 2023, 9, 19900, 8550, 6.0, 2.6),
(2, 2023, 10, 18800, 8750, 5.7, 2.6),
(2, 2023, 11, 17500, 8650, 5.3, 2.6),
(2, 2023, 12, 18200, 7950, 5.5, 2.4),

-- Texas
(3, 2023, 1, 12500, 6800, 5.1, 2.8),
(3, 2023, 2, 13200, 6600, 5.4, 2.7),
(3, 2023, 3, 13800, 6500, 5.6, 2.6),
(3, 2023, 4, 14500, 6900, 5.9, 2.8),
(3, 2023, 5, 16200, 7000, 6.6, 2.9),
(3, 2023, 6, 18500, 7200, 7.5, 2.9),
(3, 2023, 7, 17500, 7150, 7.1, 2.9),
(3, 2023, 8, 16800, 7300, 6.8, 3.0),
(3, 2023, 9, 15900, 7250, 6.5, 3.0),
(3, 2023, 10, 15200, 7400, 6.2, 3.0),
(3, 2023, 11, 14300, 7350, 5.8, 3.0),
(3, 2023, 12, 14800, 6900, 6.0, 2.8);

-- For 2024 (first 4 months with slight trends changes)
INSERT INTO marriage_divorce_rates (region_id, year, month, marriage_count, divorce_count, marriage_rate, divorce_rate) VALUES
-- New York
(1, 2024, 1, 7950, 3880, 4.9, 2.4),
(1, 2024, 2, 8200, 3760, 5.0, 2.3),
(1, 2024, 3, 8650, 3690, 5.3, 2.3),
(1, 2024, 4, 9350, 3800, 5.8, 2.3),

-- California
(2, 2024, 1, 15600, 7800, 4.7, 2.3),
(2, 2024, 2, 16500, 7600, 5.0, 2.3),
(2, 2024, 3, 17400, 7500, 5.2, 2.3),
(2, 2024, 4, 18700, 7850, 5.6, 2.4),

-- Texas
(3, 2024, 1, 12800, 6750, 5.2, 2.7),
(3, 2024, 2, 13400, 6550, 5.5, 2.7),
(3, 2024, 3, 14100, 6450, 5.7, 2.6),
(3, 2024, 4, 14800, 6850, 6.0, 2.8);

-- Insert sample data for demographics
INSERT INTO demographics (region_id, year, median_age, avg_income, education_index, urbanization_rate) VALUES
-- For 2023
(1, 2023, 39.2, 72500, 8.4, 87.5),
(2, 2023, 37.1, 78900, 8.2, 95.0),
(3, 2023, 35.4, 63200, 7.6, 84.5),
(4, 2023, 42.5, 57800, 7.2, 91.2),
(5, 2023, 38.7, 69300, 8.0, 88.7),
(6, 2023, 40.8, 65700, 7.8, 78.9),
(7, 2023, 39.5, 58900, 7.5, 77.8),
(8, 2023, 39.8, 59500, 7.4, 74.6),
(9, 2023, 37.2, 61200, 7.7, 82.3),
(10, 2023, 38.9, 58700, 7.5, 75.4),

-- For 2024
(1, 2024, 39.4, 74100, 8.5, 87.8),
(2, 2024, 37.3, 81200, 8.3, 95.2),
(3, 2024, 35.6, 65400, 7.7, 85.0);

-- Create useful views
CREATE VIEW monthly_rates_by_region AS
SELECT 
  r.name as region_name,
  r.type as region_type,
  mdr.year,
  mdr.month,
  mdr.marriage_rate,
  mdr.divorce_rate,
  (mdr.marriage_rate - mdr.divorce_rate) as net_marriage_rate
FROM 
  marriage_divorce_rates mdr
JOIN 
  regions r ON mdr.region_id = r.id
ORDER BY 
  r.name, mdr.year, mdr.month;

CREATE VIEW region_demographics_with_rates AS
SELECT 
  r.name as region_name,
  d.year,
  d.median_age,
  d.avg_income,
  d.education_index,
  d.urbanization_rate,
  AVG(mdr.marriage_rate) as avg_marriage_rate,
  AVG(mdr.divorce_rate) as avg_divorce_rate
FROM 
  demographics d
JOIN 
  regions r ON d.region_id = r.id
JOIN 
  marriage_divorce_rates mdr ON d.region_id = mdr.region_id AND d.year = mdr.year
GROUP BY 
  r.name, d.year;

CREATE VIEW yearly_totals AS
SELECT
  r.name as region_name,
  mdr.year,
  SUM(marriage_count) as total_marriages,
  SUM(divorce_count) as total_divorces,
  AVG(marriage_rate) as avg_marriage_rate,
  AVG(divorce_rate) as avg_divorce_rate,
  (AVG(marriage_rate) - AVG(divorce_rate)) as avg_net_marriage_rate
FROM
  marriage_divorce_rates mdr
JOIN
  regions r ON mdr.region_id = r.id
GROUP BY
  r.name, mdr.year
ORDER BY
  r.name, mdr.year;
