-- create.sql
-- Schema for XLSX World MVP

-- USERS
CREATE TABLE Users (
    email VARCHAR(255) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    pfp_hash TEXT,
    create_date DATE NOT NULL DEFAULT CURRENT_DATE,
    password_hash TEXT NOT NULL
);

-- SPREADSHEETS
CREATE TABLE Spreadsheets (
    sheet_id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    sheet_name VARCHAR(255) NOT NULL,
    file_size INT,
    sheet_pages INT,
    upload_date DATE NOT NULL,
    FOREIGN KEY (email) REFERENCES Users(email)
);

-- FEATURES
CREATE TABLE Features (
    feature_id SERIAL PRIMARY KEY,
    feature_name VARCHAR(100) UNIQUE NOT NULL
);

-- FEATURE RUNS
CREATE TABLE FeatureRuns (
    feat_run_id SERIAL PRIMARY KEY,
    sheet_id INT NOT NULL,
    feature_id INT NOT NULL,
    output_weight INT,
    run_status VARCHAR(50),
    run_start_date TIMESTAMP,
    run_end_date TIMESTAMP,
    FOREIGN KEY (sheet_id) REFERENCES Spreadsheets(sheet_id),
    FOREIGN KEY (feature_id) REFERENCES Features(feature_id)
);

-- FEATURE RUN DETAILS
CREATE TABLE FeatureRunDetails (
    detail_id SERIAL PRIMARY KEY,
    feat_run_id INT NOT NULL,
    attr_name VARCHAR(100) NOT NULL,
    attr_value TEXT,
    FOREIGN KEY (feat_run_id) REFERENCES FeatureRuns(feat_run_id)
);

