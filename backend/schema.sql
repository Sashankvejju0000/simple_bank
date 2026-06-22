-- Bank Management System Database Schema

CREATE DATABASE IF NOT EXISTS bankdb;
USE bankdb;

-- 1. Create customer table
CREATE TABLE IF NOT EXISTS customer (
    Custid VARCHAR(10) PRIMARY KEY,
    Name VARCHAR(50) NOT NULL,
    Mobile_No VARCHAR(15) NOT NULL,
    Address VARCHAR(100) NOT NULL,
    Email VARCHAR(50) NULL
);

-- 2. Create account table
CREATE TABLE IF NOT EXISTS account (
    Account_No VARCHAR(10) PRIMARY KEY,
    Acc_Type VARCHAR(20) NOT NULL,
    Balance DECIMAL(10, 2) DEFAULT NULL,
    Custid VARCHAR(10) NOT NULL,
    FOREIGN KEY (Custid) REFERENCES customer(Custid) ON DELETE CASCADE
);

-- 3. Create users table for authentication and authorization
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('Admin', 'Customer') NOT NULL DEFAULT 'Customer',
    cust_id VARCHAR(20) UNIQUE NULL,
    FOREIGN KEY (cust_id) REFERENCES customer(Custid) ON DELETE CASCADE
);

-- 4. Create account_audit table for tracking balance changes
CREATE TABLE IF NOT EXISTS account_audit (
    Audit_Id INT AUTO_INCREMENT PRIMARY KEY,
    Account_No VARCHAR(20) NOT NULL,
    Old_Balance DECIMAL(15, 2) NOT NULL,
    New_Balance DECIMAL(15, 2) NOT NULL,
    Changed_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Trigger to automatically log balance updates on account table
DROP TRIGGER IF EXISTS before_account_update;

DELIMITER $$

CREATE TRIGGER before_account_update
BEFORE UPDATE ON account
FOR EACH ROW
BEGIN
    IF OLD.Balance <> NEW.Balance THEN
        INSERT INTO account_audit (Account_No, Old_Balance, New_Balance)
        VALUES (OLD.Account_No, OLD.Balance, NEW.Balance);
    END IF;
END$$

DELIMITER ;

-- 6. Insert initial seed data
-- Password hash for 'AdminPassword123' (bcrypt hash, generated for testing)
-- Hash: $2a$10$tM2e2f69y5Yd238uSCSxSeI27YQoUj5GvFk1X0v3k9yE0uT9.f.kC
INSERT INTO users (email, password, role, cust_id) 
VALUES ('admin@bank.com', '$2a$10$tM2e2f69y5Yd238uSCSxSeI27YQoUj5GvFk1X0v3k9yE0uT9.f.kC', 'Admin', NULL)
ON DUPLICATE KEY UPDATE email=email;

-- Seed data for customer and user can be registered via APIs, or we can add them here:
-- Customer 1:
INSERT INTO customer (Custid, Name, Mobile_No, Address, Email) 
VALUES ('CUST101', 'John Doe', '1234567890', '123 Elm St, NY', 'john@gmail.com')
ON DUPLICATE KEY UPDATE Custid=Custid;

-- Account for Customer 1:
INSERT INTO account (Account_No, Acc_Type, Balance, Custid) 
VALUES ('ACC1001', 'Savings', 5000.00, 'CUST101')
ON DUPLICATE KEY UPDATE Account_No=Account_No;

-- Credentials for Customer 1: 'customer123'
-- Hash: $2a$10$3zE2Ppe4k/s2lG47mH.wVOn7wP6X0R9a25QJmK1z0.bQv.a/2r7yO
INSERT INTO users (email, password, role, cust_id) 
VALUES ('john@gmail.com', '$2a$10$3zE2Ppe4k/s2lG47mH.wVOn7wP6X0R9a25QJmK1z0.bQv.a/2r7yO', 'Customer', 'CUST101')
ON DUPLICATE KEY UPDATE email=email;
