CREATE DATABASE disaster_relief;

USE disaster_relief;

CREATE TABLE help_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_role ENUM('Victim', 'Volunteer') NOT NULL,
    request_type ENUM('Food', 'Shelter', 'Medical') NOT NULL,
    disaster_type ENUM('Earthquake', 'Flood', 'Cyclone', 'Fire', 'Other') NOT NULL,
    location VARCHAR(255) NOT NULL,
    lat DECIMAL(10, 6),
    lng DECIMAL(10, 6),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE disaster_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    disasterType ENUM('Earthquake', 'Flood', 'Cyclone', 'Fire', 'Other') NOT NULL,
    location VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    lat DECIMAL(10, 6),
    lng DECIMAL(10, 6),
    reportedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    user_role ENUM('Victim', 'Volunteer') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);