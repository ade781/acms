-- Skema Database Sistem Monitoring ARFF (logbuk)
-- Tabel Resmi Terintegrasi Sesuai Panduan Operasional & Kode Aktif

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'dept_head', 'chief', 'chief_assistant', 'supervisor', 'senior_firefighter', 'junior_firefighter', 'operator') NOT NULL DEFAULT 'junior_firefighter',
  `must_change_password` TINYINT(1) NOT NULL DEFAULT 1,
  `token_version` INT NOT NULL DEFAULT 1,
  `signature_url` VARCHAR(255) NULL DEFAULT NULL,

  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `personnel` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `nip` VARCHAR(50) NULL DEFAULT NULL,
  `full_name` VARCHAR(100) NOT NULL,
  `rank_position` VARCHAR(100) NOT NULL,
  `tmt_date` DATE NULL,
  `birth_date` DATE NULL,
  `birth_place` VARCHAR(100) NULL,
  `employment_status` ENUM('organik', 'outsourcing') NOT NULL DEFAULT 'organik',
  `team_group` ENUM('Alpha', 'Bravo', 'Charlie', 'Delta', 'Non-Shift') NULL DEFAULT NULL,
  `formal_education` VARCHAR(100) NULL,
  `recognized_education` VARCHAR(50) NULL,
  `cert_level` ENUM('Basic', 'Junior', 'Senior') NOT NULL DEFAULT 'Basic',
  `cert_number` VARCHAR(100) NULL,
  `cert_expiry_date` DATE NULL,
  `basic_lemdik` VARCHAR(100) NULL,
  `basic_cert_number` VARCHAR(100) NULL,
  `junior_lemdik` VARCHAR(100) NULL,
  `junior_cert_number` VARCHAR(100) NULL,
  `senior_lemdik` VARCHAR(100) NULL,
  `senior_cert_number` VARCHAR(100) NULL,
  `salvage_license_number` VARCHAR(100) NULL,
  `salvage_expiry_date` DATE NULL,
  `refreshing_cert_number` VARCHAR(100) NULL,
  `refreshing_date` DATE NULL,
  `salvage_refreshing_cert_number` VARCHAR(100) NULL,
  `salvage_refreshing_date` DATE NULL,
  `additional_competencies` JSON NULL,
  `signature_url` VARCHAR(255) NULL DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_personnel_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `vehicles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code_name` VARCHAR(50) NOT NULL UNIQUE,
  `vehicle_name` VARCHAR(100) NOT NULL,
  `category` ENUM('utama', 'pendukung', 'posko') NOT NULL DEFAULT 'utama',
  `license_plate` VARCHAR(30) NULL,
  `description` TEXT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `vehicle_readiness_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `vehicle_id` INT NOT NULL,
  `shift_date` DATE NOT NULL,
  `shift_number` TINYINT NOT NULL,
  `team_group` ENUM('Alpha', 'Bravo', 'Charlie', 'Delta') NOT NULL,
  `pic_personnel_id` INT NULL,
  `status` ENUM('serviceable', 'unserviceable', 'belum_dilaporkan') NOT NULL DEFAULT 'belum_dilaporkan',
  `justification` TEXT NULL,
  `photo_webp_url` VARCHAR(255) NULL,
  `follow_up_status` ENUM('pending', 'in_progress', 'resolved') NOT NULL DEFAULT 'pending',
  `resolved_at` TIMESTAMP NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_vehicle_shift_team` (`vehicle_id`, `shift_date`, `shift_number`, `team_group`),
  CONSTRAINT `fk_vrl_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_vrl_pic` FOREIGN KEY (`pic_personnel_id`) REFERENCES `personnel` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `personnel_shifts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `shift_date` DATE NOT NULL,
  `shift_number` TINYINT NOT NULL,
  `team_group` ENUM('Alpha', 'Bravo', 'Charlie', 'Delta') NOT NULL,
  `supervisor_id` INT NULL,
  `status` ENUM('open', 'approved') NOT NULL DEFAULT 'open',
  `handover_notes` TEXT NULL,
  `approved_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_personnel_shift` (`shift_date`, `shift_number`, `team_group`),
  CONSTRAINT `fk_ps_supervisor` FOREIGN KEY (`supervisor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `personnel_deployments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `shift_id` INT NOT NULL,
  `personnel_id` INT NOT NULL,
  `deployment_type` ENUM('vehicle_utama', 'vehicle_pendukung', 'watchroom', 'absent') NOT NULL,
  `vehicle_id` INT NULL,
  `is_pic` TINYINT(1) NOT NULL DEFAULT 0,
  `absent_reason` ENUM('cuti', 'sakit', 'dinas', 'tukar_dinas') NULL,
  `assigned_by` INT NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_shift_personnel` (`shift_id`, `personnel_id`),
  INDEX `idx_deployments_personnel_shift` (`personnel_id`, `shift_id`),
  INDEX `idx_deployments_personnel_type` (`personnel_id`, `deployment_type`),
  CONSTRAINT `fk_pd_shift` FOREIGN KEY (`shift_id`) REFERENCES `personnel_shifts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pd_personnel` FOREIGN KEY (`personnel_id`) REFERENCES `personnel` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pd_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_pd_assigned_by` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `incidents` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `report_number` VARCHAR(50) NOT NULL UNIQUE,
  `incident_date` DATE NOT NULL,
  `incident_time` TIME NOT NULL,
  `report_time` TIME NOT NULL,
  `team_group` ENUM('Alpha', 'Bravo', 'Charlie', 'Delta') NOT NULL,
  `shift_number` TINYINT NOT NULL,
  `reporter_id` INT NULL,
  `supervisor_id` INT NULL,
  `category` ENUM('aircraft_accident', 'aircraft_incident', 'fire', 'medical_emergency', 'hazmat', 'other') NOT NULL DEFAULT 'other',
  `title` VARCHAR(200) NOT NULL,
  `location` VARCHAR(200) NOT NULL,
  `chronology` TEXT NOT NULL,
  `source_info` VARCHAR(100) NULL,
  `aircraft_info` VARCHAR(100) NULL,
  `priority_level` ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
  `activation_time` TIME NULL,
  `action_taken` TEXT NULL,
  `last_condition` TEXT NULL,
  `coordinated_parties` TEXT NULL,
  `status` ENUM('dalam_proses', 'selesai', 'menunggu_tindak_lanjut') NOT NULL DEFAULT 'dalam_proses',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_incidents_date_shift_team` (`incident_date`, `shift_number`, `team_group`),
  CONSTRAINT `fk_inc_reporter` FOREIGN KEY (`reporter_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_inc_supervisor` FOREIGN KEY (`supervisor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `incident_attachments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `incident_id` INT NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_path` VARCHAR(255) NOT NULL,
  `file_type` VARCHAR(50) NOT NULL DEFAULT 'image/webp',
  `uploaded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_ia_incident` FOREIGN KEY (`incident_id`) REFERENCES `incidents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `daily_shift_activities` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `shift_id` INT NOT NULL,
  `activity_type` VARCHAR(50) NOT NULL,
  `activity_time` TIME NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT NULL,
  `result_notes` TEXT NULL,
  `actor_ids` JSON NULL,
  `attachment_url` VARCHAR(255) NULL,
  `created_by` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_dsa_shift_type` (`shift_id`, `activity_type`),
  CONSTRAINT `fk_dsa_shift` FOREIGN KEY (`shift_id`) REFERENCES `personnel_shifts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dsa_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `personnel_documents` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `personnel_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `document_type` ENUM('lisensi_stkp', 'sertifikat_diklat', 'medical_checkup', 'sk_tugas', 'cuti', 'dokumen_lain') NOT NULL DEFAULT 'dokumen_lain',
  `file_name` VARCHAR(255) NOT NULL,
  `file_url` VARCHAR(500) NOT NULL,
  `file_size` INT DEFAULT 0,
  `mime_type` VARCHAR(100) NULL,
  `uploaded_by` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_personnel_documents_filename` (`file_name`),
  INDEX `idx_personnel_documents_url` (`file_url`(255)),
  CONSTRAINT `fk_pdoc_personnel` FOREIGN KEY (`personnel_id`) REFERENCES `personnel` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pdoc_uploader` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `announcements` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `circular_number` VARCHAR(100) NULL,
  `description` TEXT NULL,
  `is_pinned` TINYINT(1) DEFAULT 0,
  `file_path` VARCHAR(255) NOT NULL,
  `file_name` VARCHAR(255) NULL,
  `published_date` DATETIME NOT NULL,
  `created_by` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_pub_date` (`published_date`),
  CONSTRAINT `fk_announcement_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `announcement_reads` (
  `announcement_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `read_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `archived_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`announcement_id`, `user_id`),
  CONSTRAINT `fk_ar_announcement` FOREIGN KEY (`announcement_id`) REFERENCES `announcements` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ar_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `schedule_rosters` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `roster_date` DATE NOT NULL UNIQUE,
  `shift_1_team` ENUM('Alpha', 'Bravo', 'Charlie', 'Delta') NOT NULL,
  `shift_2_team` ENUM('Alpha', 'Bravo', 'Charlie', 'Delta') NOT NULL,
  `shift_3_team` ENUM('Alpha', 'Bravo', 'Charlie', 'Delta') NOT NULL,
  `off_team` ENUM('Alpha', 'Bravo', 'Charlie', 'Delta') NOT NULL,
  `notes` TEXT NULL,
  `created_by` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_sr_date` (`roster_date`),
  CONSTRAINT `fk_sr_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `system_settings` (
  `setting_key` VARCHAR(100) NOT NULL PRIMARY KEY,
  `setting_value` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
