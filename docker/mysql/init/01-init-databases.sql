-- Initialize Blue Dimension database and tables
-- This script runs automatically on MySQL container startup

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS jessejay CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE jessejay;

-- Create guestbook table
CREATE TABLE IF NOT EXISTS guestbook (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  message LONGTEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  INDEX (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create links table
CREATE TABLE IF NOT EXISTS links (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL,
  description LONGTEXT,
  category VARCHAR(100),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (category),
  INDEX (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create news table
CREATE TABLE IF NOT EXISTS news (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content LONGTEXT NOT NULL,
  author VARCHAR(100),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  published BOOLEAN DEFAULT 1,
  INDEX (created_at),
  FULLTEXT INDEX (title, content)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create images table
CREATE TABLE IF NOT EXISTS imageTable (
  id INT AUTO_INCREMENT PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  description LONGTEXT,
  file_path VARCHAR(500) NOT NULL,
  file_size INT,
  mime_type VARCHAR(50),
  width INT,
  height INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create sounds table
CREATE TABLE IF NOT EXISTS soundTable (
  id INT AUTO_INCREMENT PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  description LONGTEXT,
  file_path VARCHAR(500) NOT NULL,
  file_size INT,
  mime_type VARCHAR(50),
  duration INT COMMENT 'Duration in seconds',
  artist VARCHAR(100),
  album VARCHAR(100),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (created_at),
  INDEX (artist)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create application user for Docker
CREATE USER IF NOT EXISTS 'app'@'%' IDENTIFIED BY 'docker_dev_password';
GRANT ALL PRIVILEGES ON jessejay.* TO 'app'@'%';
FLUSH PRIVILEGES;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
