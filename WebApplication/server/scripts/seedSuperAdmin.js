#!/usr/bin/env node
/**
 * Master Super Admin Seeder CLI for iNWebTools.
 *
 * Usage:
 *   node server/scripts/seedSuperAdmin.js [username] [email] [password] [fullName]
 *
 * Defaults:
 *   username: admin
 *   email:    admin@inwebtools.com
 *   password: AdminSuperSecret2026!
 *   fullName: Master Super Administrator
 */

import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

import { initDatabase, query, queryOne } from '../db/index.js';
import { logger } from '../utils/logger.js';

async function seedSuperAdmin() {
  const args = process.argv.slice(2);
  const username = (args[0] || process.env.ADMIN_DEFAULT_USER || 'admin').trim().toLowerCase();
  const email = (args[1] || process.env.ADMIN_DEFAULT_EMAIL || 'admin@inwebtools.com')
    .trim()
    .toLowerCase();
  const password = args[2] || process.env.ADMIN_DEFAULT_PASS || 'AdminSuperSecret2026!';
  const fullName = args[3] || 'Master Super Administrator';

  try {
    await initDatabase();
    logger.info('Connected to PostgreSQL for Super Admin seeding');

    const passwordHash = await bcrypt.hash(password, 12);

    // Check if user exists by username or email
    const existing = await queryOne(
      'SELECT id, username, email, role FROM users WHERE LOWER(username) = ? OR LOWER(email) = ? LIMIT 1',
      [username, email],
    );

    if (existing) {
      await query(
        `UPDATE users
         SET username = ?, email = ?, password_hash = ?, full_name = ?, role = 'super_admin', is_active = TRUE, updated_at = NOW()
         WHERE id = ?`,
        [username, email, passwordHash, fullName, existing.id],
      );

      logger.info('Super Admin account updated successfully', {
        id: existing.id,
        username,
        email,
        role: 'super_admin',
      });
      console.log(
        `\n✔ Super Admin account [${username}] updated successfully with role: super_admin\n`,
      );
    } else {
      const inserted = await queryOne(
        `INSERT INTO users (username, email, password_hash, full_name, role, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'super_admin', TRUE, NOW(), NOW())
         RETURNING id, username, email, role`,
        [username, email, passwordHash, fullName],
      );

      logger.info('Super Admin account created successfully', {
        id: inserted?.id,
        username,
        email,
        role: 'super_admin',
      });
      console.log(
        `\n✔ New Super Admin account [${username}] created successfully with role: super_admin\n`,
      );
    }

    process.exit(0);
  } catch (error) {
    logger.error('Failed to seed Super Admin', { error: error.message });
    console.error('\n✖ Error seeding Super Admin:', error.message, '\n');
    process.exit(1);
  }
}

seedSuperAdmin();
