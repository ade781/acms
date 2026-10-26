import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { successResponse, errorResponse } from '../utils/responseHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateUniqueUsername(nip, fullName) {
  let baseUsername = '';
  if (nip && nip.trim() && nip.trim() !== '-') {
    baseUsername = nip.trim().replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  }
  if (!baseUsername) {
    const cleanName = fullName.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const parts = cleanName.split(/\s+/).filter(Boolean);
    baseUsername = parts[0] || 'personel';
  }

  let finalUsername = baseUsername;
  let counter = 1;
  while (true) {
    const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [finalUsername]);
    if (existing.length === 0) {
      return finalUsername;
    }
    counter++;
    finalUsername = `${baseUsername}${counter}`;
  }
}

/**
 * Controller Khusus Manajemen Pejabat Struktural ARFF YIA
 * Mematuhi Aturan GEMINI.md Rule 4 (Dilarang Hardcode Nama Pejabat) & Rule 18 (Input Struktural Dept Head)
 */

export const getOfficials = async (req, res) => {
  try {
    // 1. Dept Head (Airport Technology & ARFF Dept. Head)
    const [deptHeads] = await pool.query(
      `SELECT p.*, u.username, u.email as user_email, u.role as user_role,
              COALESCE(u.signature_url, p.signature_url) as signature_url
       FROM personnel p
       LEFT JOIN users u ON u.id = p.user_id
       WHERE (p.rank_position LIKE '%Dept%Head%' OR p.rank_position LIKE '%Department Head%' OR u.role = 'dept_head')
         AND p.rank_position NOT LIKE '%Section%'
       ORDER BY p.id ASC
       LIMIT 1`
    );
    const deptHead = deptHeads.length > 0 ? deptHeads[0] : null;

    // 2. Section Head (Airport Technology & ARFF Section Head)
    const [sectionHeads] = await pool.query(
      `SELECT p.*, u.username, u.email as user_email, u.role as user_role,
              COALESCE(u.signature_url, p.signature_url) as signature_url
       FROM personnel p
       LEFT JOIN users u ON u.id = p.user_id
       WHERE p.rank_position LIKE '%Section%Head%' OR p.rank_position LIKE '%Seksi%' OR u.role = 'section_head'
       ORDER BY p.id ASC
       LIMIT 1`
    );
    const sectionHead = sectionHeads.length > 0 ? sectionHeads[0] : null;

    // 3. 4 Chiefs for Alpha, Bravo, Charlie, Delta (Case-Insensitive Normalization)
    const [chiefs] = await pool.query(
      `SELECT p.*, u.username, u.email as user_email, u.role as user_role,
              COALESCE(u.signature_url, p.signature_url) as signature_url
       FROM personnel p
       LEFT JOIN users u ON u.id = p.user_id
       WHERE (u.role IN ('chief', 'supervisor') OR p.rank_position LIKE '%Chief%' OR p.rank_position LIKE '%Ketua%')
         AND p.rank_position NOT LIKE '%Assistant%'
         AND p.rank_position NOT LIKE '%Asisten%'
         AND p.rank_position NOT LIKE '%Wakil%'
         AND u.role != 'chief_assistant'
       ORDER BY p.team_group ASC, p.id ASC`
    );

    const chiefsByTeam = {
      Alpha: chiefs.find((c) => (c.team_group || '').toLowerCase().trim() === 'alpha') || null,
      Bravo: chiefs.find((c) => (c.team_group || '').toLowerCase().trim() === 'bravo') || null,
      Charlie: chiefs.find((c) => (c.team_group || '').toLowerCase().trim() === 'charlie') || null,
      Delta: chiefs.find((c) => (c.team_group || '').toLowerCase().trim() === 'delta') || null,
    };

    // 4. Staf Administrasi (Personel Non-Shift / Role Admin)
    const [administrasi] = await pool.query(
      `SELECT p.*, u.username, u.email as user_email, u.role as user_role,
              COALESCE(u.signature_url, p.signature_url) as signature_url
       FROM personnel p
       LEFT JOIN users u ON u.id = p.user_id
       WHERE (p.team_group = 'Non-Shift' OR p.team_group IS NULL)
         AND (p.rank_position NOT LIKE '%Dept%Head%' AND (u.role IS NULL OR u.role != 'dept_head'))
       ORDER BY p.id ASC`
    );

    return successResponse(res, 'Data pejabat berhasil diambil', {
      dept_head: deptHead,
      chiefs: chiefsByTeam,
      administrasi: administrasi,
      raw_chiefs: chiefs,
    });
  } catch (error) {
    console.error('Error getOfficials:', error);
    return errorResponse(res, 'Gagal mengambil data pejabat', 500);
  }
};

export const replaceDeptHead = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { full_name, nip, rank_position, new_personnel_id } = req.body;

    await connection.beginTransaction();

    // 1. Ambil data Dept Head lama
    const [currentDeptHeads] = await connection.query(
      `SELECT p.*, u.id as u_id
       FROM personnel p
       LEFT JOIN users u ON u.id = p.user_id
       WHERE p.rank_position LIKE '%Dept%Head%' OR p.rank_position LIKE '%Department Head%' OR u.role = 'dept_head'`
    );

    // KASUS A: Input Data Mandiri (Sesuai Aturan GEMINI.md Rule 18 & task_agent1.md)
    if (full_name && full_name.trim()) {
      const cleanName = full_name.trim();
      const cleanNip = nip && nip.trim() && nip.trim() !== '-' ? nip.trim() : null;
      const cleanRank = rank_position && rank_position.trim() ? rank_position.trim() : 'Airport Technology & ARFF Dept. Head';

      let deptHeadId;
      if (currentDeptHeads.length > 0) {
        const existingDh = currentDeptHeads[0];
        deptHeadId = existingDh.id;
        await connection.query(
          `UPDATE personnel 
           SET full_name = ?, nip = ?, rank_position = ?, team_group = 'Non-Shift' 
           WHERE id = ?`,
          [cleanName, cleanNip, cleanRank, deptHeadId]
        );
        if (existingDh.u_id) {
          await connection.query(
            `UPDATE users SET name = ?, role = 'dept_head' WHERE id = ? AND role != 'admin'`,
            [cleanName, existingDh.u_id]
          );
        }
      } else {
        const accountUsername = await generateUniqueUsername(cleanNip, cleanName);
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('123456', salt);

        const [uRes] = await connection.query(
          'INSERT INTO users (username, name, password_hash, role, must_change_password) VALUES (?, ?, ?, ?, 1)',
          [accountUsername, cleanName, passwordHash, 'dept_head']
        );
        const [pRes] = await connection.query(
          `INSERT INTO personnel (
            user_id, nip, full_name, rank_position,
            employment_status, team_group, cert_level, is_active
          ) VALUES (?, ?, ?, ?, 'organik', 'Non-Shift', 'Senior', 1)`,
          [uRes.insertId, cleanNip, cleanName, cleanRank]
        );
        deptHeadId = pRes.insertId;
      }

      await connection.commit();
      return successResponse(res, `Data Dept. Head berhasil disimpan atas nama ${cleanName}.`, { id: deptHeadId });
    }

    // KASUS B: Penunjukan via ID Personel (Fallback kompatibilitas)
    if (new_personnel_id) {
      for (const oldDh of currentDeptHeads) {
        if (oldDh.id === Number(new_personnel_id)) continue;

        if (oldDh.signature_url) {
          const sigPath = path.resolve(__dirname, '../../', oldDh.signature_url.replace(/^\//, ''));
          if (fs.existsSync(sigPath)) {
            try { fs.unlinkSync(sigPath); } catch (e) {}
          }
        }

        await connection.query(
          `UPDATE personnel 
           SET rank_position = 'Staf Non-Operasional', team_group = 'Non-Shift', signature_url = NULL 
           WHERE id = ?`,
          [oldDh.id]
        );
        if (oldDh.u_id) {
          await connection.query(
            `UPDATE users 
             SET role = 'junior_firefighter', signature_url = NULL 
             WHERE id = ? AND role = 'dept_head'`,
            [oldDh.u_id]
          );
        }
      }

      const [newCandidate] = await connection.query(
        `SELECT p.*, u.id as u_id FROM personnel p LEFT JOIN users u ON u.id = p.user_id WHERE p.id = ?`,
        [new_personnel_id]
      );

      if (newCandidate.length === 0) {
        await connection.rollback();
        return errorResponse(res, 'Personel baru tidak ditemukan', 404);
      }

      const candidate = newCandidate[0];
      await connection.query(
        `UPDATE personnel 
         SET rank_position = 'Airport Technology & ARFF Dept. Head', team_group = 'Non-Shift' 
         WHERE id = ?`,
        [candidate.id]
      );

      if (candidate.u_id) {
        await connection.query(
          `UPDATE users SET role = 'dept_head' WHERE id = ? AND role != 'admin'`,
          [candidate.u_id]
        );
      }

      await connection.commit();
      return successResponse(res, `Dept. Head berhasil diperbarui menjadi ${candidate.full_name}.`, { id: candidate.id });
    }

    await connection.rollback();
    return errorResponse(res, 'Nama lengkap Dept. Head wajib diisi', 400);
  } catch (error) {
    await connection.rollback();
    console.error('Error replaceDeptHead:', error);
    return errorResponse(res, 'Gagal memperbarui Dept Head: ' + error.message, 500);
  } finally {
    connection.release();
  }
};

export const replaceChief = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { team_group, new_chief_id, old_chief_target_role } = req.body;
    if (!team_group || !new_chief_id) {
      return errorResponse(res, 'Regu dan Ketua Regu baru wajib dipilih', 400);
    }

    const validTargetRoles = [
      'ARFF Operation Senior Fire Fighter',
      'ARFF Operation Chief Assistant',
      'ARFF Operation Junior Fire Fighter',
    ];
    const demoteRole = validTargetRoles.includes(old_chief_target_role)
      ? old_chief_target_role
      : 'ARFF Operation Senior Fire Fighter';

    const demoteUserRole =
      demoteRole === 'ARFF Operation Chief Assistant'
        ? 'chief_assistant'
        : demoteRole === 'ARFF Operation Senior Fire Fighter'
        ? 'senior_firefighter'
        : 'junior_firefighter';

    await connection.beginTransaction();

    // 1. Ambil Chief lama untuk regu ini
    const [currentChiefs] = await connection.query(
      `SELECT p.*, u.id as u_id
       FROM personnel p
       LEFT JOIN users u ON u.id = p.user_id
       WHERE p.team_group = ? 
         AND (u.role IN ('chief', 'supervisor') OR p.rank_position LIKE '%Chief%' OR p.rank_position LIKE '%Ketua%')
         AND p.rank_position NOT LIKE '%Assistant%'
         AND p.rank_position NOT LIKE '%Asisten%'
         AND u.role != 'chief_assistant'`,
      [team_group]
    );

    const isAlreadyChief = currentChiefs.some((c) => c.id === Number(new_chief_id));
    if (isAlreadyChief) {
      await connection.rollback();
      connection.release();
      return errorResponse(
        res,
        `Personel tersebut saat ini sudah menjabat sebagai Ketua Regu ${team_group}. Silakan pilih anggota regu lain untuk melakukan pergantian Ketua Regu.`,
        400
      );
    }

    for (const oldChief of currentChiefs) {
      if (oldChief.id === Number(new_chief_id)) continue;

      // Hapus file tanda tangan lama jika ada
      if (oldChief.signature_url) {
        const sigPath = path.resolve(__dirname, '../../', oldChief.signature_url.replace(/^\//, ''));
        if (fs.existsSync(sigPath)) {
          try {
            fs.unlinkSync(sigPath);
          } catch (e) {}
        }
      }

      // Demote Chief lama ke target posisi sesuai Opsi C, tanda tangan otomatis terhapus
      await connection.query(
        `UPDATE personnel 
         SET rank_position = ?, signature_url = NULL 
         WHERE id = ?`,
        [demoteRole, oldChief.id]
      );
      if (oldChief.u_id) {
        await connection.query(
          `UPDATE users 
           SET role = ?, signature_url = NULL 
           WHERE id = ? AND role != 'admin'`,
          [demoteUserRole, oldChief.u_id]
        );
      }
    }

    // 2. Angkat Chief baru untuk regu ini
    const [newCandidate] = await connection.query(
      `SELECT p.*, u.id as u_id FROM personnel p LEFT JOIN users u ON u.id = p.user_id WHERE p.id = ?`,
      [new_chief_id]
    );

    if (newCandidate.length === 0) {
      await connection.rollback();
      return errorResponse(res, 'Personel baru tidak ditemukan', 404);
    }

    const candidate = newCandidate[0];
    await connection.query(
      `UPDATE personnel 
       SET rank_position = 'ARFF Operation Chief', team_group = ? 
       WHERE id = ?`,
      [team_group, candidate.id]
    );

    if (candidate.u_id) {
      await connection.query(
        `UPDATE users SET role = 'chief' WHERE id = ? AND role != 'admin'`,
        [candidate.u_id]
      );
    }

    await connection.commit();
    return successResponse(res, `Ketua Regu ${team_group} berhasil diganti menjadi ${candidate.full_name}.`);
  } catch (error) {
    await connection.rollback();
    console.error('Error replaceChief:', error);
    return errorResponse(res, 'Gagal mengganti Ketua Regu: ' + error.message, 500);
  } finally {
    connection.release();
  }
};

export const replaceSectionHead = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { new_personnel_id } = req.body;
    if (!new_personnel_id) {
      return errorResponse(res, 'Personel Section Head baru wajib dipilih', 400);
    }

    await connection.beginTransaction();

    // 1. Ambil data Section Head lama
    const [currentSectionHeads] = await connection.query(
      `SELECT p.*, u.id as u_id
       FROM personnel p
       LEFT JOIN users u ON u.id = p.user_id
       WHERE p.rank_position LIKE '%Section%Head%' OR p.rank_position LIKE '%Seksi%' OR u.role = 'section_head'`
    );

    for (const oldSh of currentSectionHeads) {
      if (oldSh.id === Number(new_personnel_id)) continue;

      // Hapus file tanda tangan lama jika ada
      if (oldSh.signature_url) {
        const sigPath = path.resolve(__dirname, '../../', oldSh.signature_url.replace(/^\//, ''));
        if (fs.existsSync(sigPath)) {
          try {
            fs.unlinkSync(sigPath);
          } catch (e) {}
        }
      }

      await connection.query(
        `UPDATE personnel 
         SET rank_position = 'Staf Non-Operasional', team_group = 'Non-Shift', signature_url = NULL 
         WHERE id = ?`,
        [oldSh.id]
      );

      if (oldSh.u_id) {
        await connection.query(
          `UPDATE users 
           SET role = 'junior_firefighter', signature_url = NULL 
           WHERE id = ? AND role = 'section_head'`,
          [oldSh.u_id]
        );
      }
    }

    // 2. Angkat Section Head baru
    const [newCandidate] = await connection.query(
      `SELECT p.*, u.id as u_id FROM personnel p LEFT JOIN users u ON u.id = p.user_id WHERE p.id = ?`,
      [new_personnel_id]
    );

    if (newCandidate.length === 0) {
      await connection.rollback();
      return errorResponse(res, 'Personel baru tidak ditemukan', 404);
    }

    const candidate = newCandidate[0];
    await connection.query(
      `UPDATE personnel 
       SET rank_position = 'Airport Technology & ARFF Section Head', team_group = 'Non-Shift' 
       WHERE id = ?`,
      [candidate.id]
    );

    if (candidate.u_id) {
      await connection.query(
        `UPDATE users SET role = 'section_head' WHERE id = ? AND role != 'admin'`,
        [candidate.u_id]
      );
    }

    await connection.commit();
    return successResponse(res, `Section Head berhasil diperbarui menjadi ${candidate.full_name}.`);
  } catch (error) {
    await connection.rollback();
    console.error('Error replaceSectionHead:', error);
    return errorResponse(res, 'Gagal memperbarui Section Head: ' + error.message, 500);
  } finally {
    connection.release();
  }
};
