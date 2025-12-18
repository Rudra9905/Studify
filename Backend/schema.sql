-- PostgreSQL schema for the Smart Classroom platform
-- Run this file against a clean database before deploying to Render PostgreSQL.

CREATE TABLE IF NOT EXISTS users (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) NOT NULL,
    password        VARCHAR(255) NOT NULL,
    phone_number    VARCHAR(32),
    date_of_birth   DATE,
    profile_image_url TEXT,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('TEACHER', 'STUDENT')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS classrooms (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    code            VARCHAR(16) NOT NULL,
    teacher_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_classrooms_code UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS classroom_members (
    id              BIGSERIAL PRIMARY KEY,
    classroom_id    BIGINT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_in_class   VARCHAR(20) NOT NULL DEFAULT 'STUDENT' CHECK (role_in_class IN ('TEACHER', 'STUDENT')),
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_classroom_member UNIQUE (classroom_id, user_id)
);

CREATE TABLE IF NOT EXISTS announcements (
    id              BIGSERIAL PRIMARY KEY,
    classroom_id    BIGINT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    author_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    content         TEXT NOT NULL,
    attachment_url  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assignments (
    id              BIGSERIAL PRIMARY KEY,
    classroom_id    BIGINT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    due_date        TIMESTAMPTZ,
    max_marks       INT,
    attachment_url  TEXT,
    closed          BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by      BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS assignment_submissions (
    id              BIGSERIAL PRIMARY KEY,
    assignment_id   BIGINT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_url     TEXT,
    submitted_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    marks           INT,
    feedback        TEXT,
    CONSTRAINT uq_assignment_submission UNIQUE (assignment_id, student_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id              BIGSERIAL PRIMARY KEY,
    classroom_id    BIGINT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    sender_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS meetings (
    id              BIGSERIAL PRIMARY KEY,
    meeting_id      VARCHAR(64) NOT NULL,
    meeting_code    VARCHAR(12) NOT NULL,
    classroom_id    BIGINT REFERENCES classrooms(id) ON DELETE SET NULL,
    host_user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(255),
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at        TIMESTAMPTZ,
    CONSTRAINT uq_meetings_meeting_id UNIQUE (meeting_id),
    CONSTRAINT uq_meetings_meeting_code UNIQUE (meeting_code)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action          VARCHAR(100) NOT NULL,
    resource_type   VARCHAR(100) NOT NULL,
    resource_id     VARCHAR(100) NOT NULL,
    reason          TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Helpful indexes for high-traffic queries
CREATE INDEX IF NOT EXISTS idx_classrooms_teacher_id ON classrooms(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classroom_members_classroom ON classroom_members(classroom_id);
CREATE INDEX IF NOT EXISTS idx_classroom_members_user ON classroom_members(user_id);
CREATE INDEX IF NOT EXISTS idx_announcements_classroom ON announcements(classroom_id);
CREATE INDEX IF NOT EXISTS idx_announcements_author ON announcements(author_id);
CREATE INDEX IF NOT EXISTS idx_assignments_classroom ON assignments(classroom_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student ON assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_classroom_created_at ON chat_messages(classroom_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_code_active ON meetings(meeting_code, active);
CREATE INDEX IF NOT EXISTS idx_meetings_host ON meetings(host_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
