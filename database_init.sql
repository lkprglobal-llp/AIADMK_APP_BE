-- Database initialization script for AIADMK Election Management System
-- Run this script to ensure all tables and relationships are properly set up

-- Create parties table if not exists
CREATE TABLE IF NOT EXISTS parties (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(50),
    color VARCHAR(7) DEFAULT '#6B7280',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_party_name (name)
);

-- Create elections table if not exists
CREATE TABLE IF NOT EXISTS elections (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    year INT NOT NULL,
    type ENUM('general', 'assembly', 'local', 'by-election') DEFAULT 'general',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_election_year_type (name, year, type)
);

-- Create booths table if not exists
CREATE TABLE IF NOT EXISTS booths (
    id VARCHAR(36) PRIMARY KEY,
    election_id VARCHAR(36) NOT NULL,
    booth_name VARCHAR(255),
    booth_number_start INT,
    booth_number_end INT,
    location VARCHAR(255),
    male_voters INT DEFAULT 0,
    female_voters INT DEFAULT 0,
    transgender_voters INT DEFAULT 0,
    total_voters INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE,
    INDEX idx_election_id (election_id),
    INDEX idx_location (location),
    INDEX idx_booth_number (booth_number_start)
);

-- Create booth_results table if not exists
CREATE TABLE IF NOT EXISTS booth_results (
    id VARCHAR(36) PRIMARY KEY,
    booth_id VARCHAR(36) NOT NULL,
    party_id VARCHAR(36) NOT NULL,
    votes INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (booth_id) REFERENCES booths(id) ON DELETE CASCADE,
    FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE CASCADE,
    UNIQUE KEY unique_booth_party (booth_id, party_id),
    INDEX idx_booth_id (booth_id),
    INDEX idx_party_id (party_id),
    INDEX idx_votes (votes)
);

-- Create view for booth summary with vote percentages
CREATE OR REPLACE VIEW v_booth_summary AS
SELECT 
    b.id,
    b.election_id,
    b.booth_name,
    b.booth_number_start,
    b.booth_number_end,
    b.location,
    b.male_voters,
    b.female_voters,
    b.transgender_voters,
    b.total_voters,
    COALESCE(SUM(br.votes), 0) as total_votes_cast,
    ROUND((COALESCE(SUM(br.votes), 0) * 100.0 / NULLIF(b.total_voters, 0)), 2) as turnout_percentage,
    COUNT(DISTINCT br.party_id) as parties_contested,
    (
        SELECT p.name 
        FROM parties p 
        JOIN booth_results br2 ON p.id = br2.party_id 
        WHERE br2.booth_id = b.id 
        ORDER BY br2.votes DESC 
        LIMIT 1
    ) as leading_party,
    (
        SELECT MAX(br2.votes) 
        FROM booth_results br2 
        WHERE br2.booth_id = b.id
    ) as highest_votes,
    b.created_at,
    b.updated_at
FROM booths b
LEFT JOIN booth_results br ON b.id = br.booth_id
GROUP BY b.id, b.election_id, b.booth_name, b.booth_number_start, b.booth_number_end, 
         b.location, b.male_voters, b.female_voters, b.transgender_voters, 
         b.total_voters, b.created_at, b.updated_at;

-- Create view for detailed booth results
CREATE OR REPLACE VIEW v_booth_results_detailed AS
SELECT 
    br.id,
    br.booth_id,
    br.party_id,
    br.votes,
    b.election_id,
    b.booth_name,
    b.booth_number_start,
    b.booth_number_end,
    b.location,
    b.total_voters,
    p.name as party_name,
    p.short_name as party_short_name,
    p.color as party_color,
    e.name as election_name,
    e.year as election_year,
    e.type as election_type,
    ROUND((br.votes * 100.0 / NULLIF(b.total_voters, 0)), 2) as polling_percentage,
    ROUND((br.votes * 100.0 / NULLIF(
        (SELECT SUM(br2.votes) FROM booth_results br2 WHERE br2.booth_id = br.booth_id), 0
    )), 2) as vote_share_percentage,
    CASE WHEN br.votes = (
        SELECT MAX(br3.votes) FROM booth_results br3 WHERE br3.booth_id = br.booth_id
    ) THEN 1 ELSE 0 END as is_winner,
    br.created_at,
    br.updated_at
FROM booth_results br
JOIN booths b ON br.booth_id = b.id
JOIN parties p ON br.party_id = p.id
JOIN elections e ON b.election_id = e.id;

-- Insert sample data if tables are empty
INSERT IGNORE INTO parties (id, name, short_name, color) VALUES
(UUID(), 'All India Anna Dravida Munnetra Kazhagam', 'AIADMK', '#00FF00'),
(UUID(), 'Dravida Munnetra Kazhagam', 'DMK', '#FF0000'),
(UUID(), 'Bharatiya Janata Party', 'BJP', '#FF9933'),
(UUID(), 'Indian National Congress', 'INC', '#19AAED'),
(UUID(), 'Communist Party of India (Marxist)', 'CPI(M)', '#CC0000'),
(UUID(), 'Pattali Makkal Katchi', 'PMK', '#FFFF00'),
(UUID(), 'Viduthalai Chiruthaigal Katchi', 'VCK', '#0000FF'),
(UUID(), 'Marumalarchi Dravida Munnetra Kazhagam', 'MDMK', '#800080'),
(UUID(), 'Tamil Maanila Congress', 'TMC', '#008000'),
(UUID(), 'Independent', 'IND', '#808080');

-- Insert sample election if none exists
INSERT IGNORE INTO elections (id, name, year, type) VALUES
(UUID(), 'Tamil Nadu Assembly Election', 2021, 'assembly'),
(UUID(), 'Tamil Nadu Assembly Election', 2016, 'assembly'),
(UUID(), 'Lok Sabha Election', 2019, 'general');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_booth_results_votes_desc ON booth_results(votes DESC);
CREATE INDEX IF NOT EXISTS idx_booths_election_location ON booths(election_id, location);
CREATE INDEX IF NOT EXISTS idx_parties_name ON parties(name);
CREATE INDEX IF NOT EXISTS idx_elections_year_desc ON elections(year DESC);

-- Update total_voters calculation trigger
DELIMITER //
CREATE TRIGGER IF NOT EXISTS update_booth_total_voters 
BEFORE INSERT ON booths
FOR EACH ROW
BEGIN
    IF NEW.total_voters = 0 OR NEW.total_voters IS NULL THEN
        SET NEW.total_voters = COALESCE(NEW.male_voters, 0) + COALESCE(NEW.female_voters, 0) + COALESCE(NEW.transgender_voters, 0);
    END IF;
END//

CREATE TRIGGER IF NOT EXISTS update_booth_total_voters_update
BEFORE UPDATE ON booths
FOR EACH ROW
BEGIN
    IF NEW.total_voters = 0 OR NEW.total_voters IS NULL THEN
        SET NEW.total_voters = COALESCE(NEW.male_voters, 0) + COALESCE(NEW.female_voters, 0) + COALESCE(NEW.transgender_voters, 0);
    END IF;
END//
DELIMITER ;

-- Create a function to calculate vote percentage
DELIMITER //
CREATE FUNCTION IF NOT EXISTS calculate_vote_percentage(votes INT, total_voters INT)
RETURNS DECIMAL(5,2)
READS SQL DATA
DETERMINISTIC
BEGIN
    IF total_voters = 0 OR total_voters IS NULL THEN
        RETURN 0.00;
    END IF;
    RETURN ROUND((votes * 100.0 / total_voters), 2);
END//
DELIMITER ;

-- Create a function to get winning party for a booth
DELIMITER //
CREATE FUNCTION IF NOT EXISTS get_booth_winner(booth_id_param VARCHAR(36))
RETURNS VARCHAR(255)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE winner_name VARCHAR(255);
    
    SELECT p.name INTO winner_name
    FROM parties p
    JOIN booth_results br ON p.id = br.party_id
    WHERE br.booth_id = booth_id_param
    ORDER BY br.votes DESC
    LIMIT 1;
    
    RETURN COALESCE(winner_name, 'No Results');
END//
DELIMITER ;

-- Show completion message
SELECT 'Database initialization completed successfully!' as status;