-- =========================================================
-- Curoa.AI — MySQL schema
-- Mirrors backend/app/models.py exactly. If you change one,
-- change the other.
--
-- Usage:
--   mysql -u root -p -e "CREATE DATABASE curoa_db CHARACTER SET utf8mb4;"
--   mysql -u root -p curoa_db < database/schema.sql
-- =========================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------
-- users
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              CHAR(36)      NOT NULL PRIMARY KEY,
    full_name       VARCHAR(120)  NOT NULL,
    email           VARCHAR(190)  NOT NULL,
    hashed_password VARCHAR(255)  NOT NULL,   -- bcrypt hash only, never plaintext
    is_active       TINYINT(1)    NOT NULL DEFAULT 1,
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------
-- conversations  (one user -> many conversations)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
    id          CHAR(36)      NOT NULL PRIMARY KEY,
    user_id     CHAR(36)      NOT NULL,
    title       VARCHAR(255)  NOT NULL DEFAULT 'New conversation',
    created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_conversations_user_id (user_id),
    CONSTRAINT fk_conversations_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------
-- messages  (one conversation -> many messages)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
    id              CHAR(36)                          NOT NULL PRIMARY KEY,
    conversation_id CHAR(36)                          NOT NULL,
    role            ENUM('user','assistant','system') NOT NULL,
    content         TEXT                              NOT NULL,
    created_at      DATETIME                          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_messages_conversation_id (conversation_id),
    CONSTRAINT fk_messages_conversation
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------
-- hospitals  (directory used by the hospitals sidebar/page)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS hospitals (
    id          INT UNSIGNED   NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(200)   NOT NULL,
    type        VARCHAR(100)   NULL,             -- e.g. 'Urgent Care', 'Pediatric Hospital'
    address     VARCHAR(300)   NOT NULL,
    phone       VARCHAR(40)    NULL,
    latitude    DECIMAL(9,6)   NULL,
    longitude   DECIMAL(9,6)   NULL,
    is_open     TINYINT(1)     NULL,             -- NULL = unknown
    hours_note  VARCHAR(120)   NULL,              -- e.g. 'Open 24 hours'
    emergency   TINYINT(1)     NOT NULL DEFAULT 0,
    rating      DECIMAL(2,1)   NULL,
    created_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_hospitals_name (name),
    KEY idx_hospitals_location (latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
