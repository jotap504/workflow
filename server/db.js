const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'workflow.db');
const isProd = process.env.DATABASE_URL;
const isFirebase = process.env.USE_FIREBASE === 'true' || process.env.VERCEL === '1';

let db;

if (isFirebase) {
    const { db: firestore } = require('./firebase');

    // Wrapper to mimic sqlite3's API using Firestore
    // Note: This is an abstraction for basic CRUD. 
    // Complex queries will need specialized Firestore logic.
    db = {
        run: async (sql, params, cb) => {
            console.log('[FIRESTORE] Run:', sql);
            // Basic implementation details for migrations (we skip these in Firestore or handle as collections)
            if (sql.includes('CREATE TABLE') || sql.includes('ALTER TABLE')) {
                if (cb) cb(null);
                return;
            }
            // For actual data writes, we'll need to map SQL to Firestore
            if (cb) cb(new Error("Generic SQL 'run' not fully implemented for Firestore shim. Use specific methods for migration."));
        },
        get: (sql, params, cb) => {
            console.log('[FIRESTORE] Get:', sql);
            // This will be implemented as we migrate specific routes
            if (cb) cb(null, null);
        },
        all: (sql, params, cb) => {
            console.log('[FIRESTORE] All:', sql);
            if (cb) cb(null, []);
        },
        serialize: (fn) => fn(),
        close: () => { },
        prepare: (sql) => {
            return {
                run: (params, cb) => { if (cb) cb(null); },
                finalize: () => { }
            };
        }
    };
    console.log('Connected to Firebase Firestore (Serverless Mode)');
} else if (isProd) {
    const { Pool } = require('pg');
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    // Wrapper to mimic sqlite3's API loosely for basic methods
    db = {
        run: (sql, params, cb) => {
            // Convert ? to $1, $2 etc for Postgres
            let count = 0;
            const pgSql = sql.replace(/\?/g, () => `$${++count}`);
            pool.query(pgSql, Array.isArray(params) ? params : [], (err, res) => {
                if (cb) cb(err, res);
            });
        },
        get: (sql, params, cb) => {
            let count = 0;
            const pgSql = sql.replace(/\?/g, () => `$${++count}`);
            pool.query(pgSql, Array.isArray(params) ? params : [], (err, res) => {
                if (cb) cb(err, res ? res.rows[0] : null);
            });
        },
        all: (sql, params, cb) => {
            let count = 0;
            const pgSql = sql.replace(/\?/g, () => `$${++count}`);
            pool.query(pgSql, Array.isArray(params) ? params : [], (err, res) => {
                if (cb) cb(err, res ? res.rows : []);
            });
        },
        serialize: (fn) => fn(), // Postgres is already async/buffered
        close: () => pool.end(),
        prepare: (sql) => {
            return {
                run: (params, cb) => {
                    let count = 0;
                    const pgSql = sql.replace(/\?/g, () => `$${++count}`);
                    pool.query(pgSql, Array.isArray(params) ? params : [], cb);
                },
                finalize: () => { }
            };
        }
    };
    console.log('Connected to PostgreSQL (Production Mode)');
} else {
    db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Error opening database ' + dbPath + ': ' + err.message);
        } else {
            console.log('Connected to the SQLite database.');
            db.run('PRAGMA foreign_keys = ON'); // Enable Foreign Keys
        }
    });
}

function initDB() {
    db.serialize(() => {
        // Users Table
        db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

        // Categories Table
        db.run(`CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      color TEXT DEFAULT '#6366f1'
    )`);

        // Tasks Table
        db.run(`CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      urgency TEXT CHECK(urgency IN ('low', 'medium', 'high')) DEFAULT 'medium',
      status TEXT CHECK(status IN ('pending', 'in-progress', 'done')) DEFAULT 'pending',
      category_id INTEGER,
      created_by INTEGER,
      due_date DATETIME,
      attachment_url TEXT,
      recurrence TEXT DEFAULT 'none', -- none, daily, weekly, monthly
      is_recurring_parent BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(category_id) REFERENCES categories(id),
      FOREIGN KEY(created_by) REFERENCES users(id)
    )`);

        // Task Notes (Chat) Table
        db.run(`CREATE TABLE IF NOT EXISTS task_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

        // Category Permissions
        db.run(`CREATE TABLE IF NOT EXISTS user_category_permissions (
      user_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      PRIMARY KEY(user_id, category_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE
    )`);

        // Notification Read tracking
        db.run(`CREATE TABLE IF NOT EXISTS task_notifications_read (
      user_id INTEGER NOT NULL,
      task_id INTEGER NOT NULL,
      read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(user_id, task_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )`);

        // Migration: Add columns to tasks if they don't exist
        db.run(`ALTER TABLE tasks ADD COLUMN recurrence TEXT DEFAULT 'none'`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error('Migration error (recurrence):', err.message);
            }
        });
        db.run(`ALTER TABLE tasks ADD COLUMN is_recurring_parent BOOLEAN DEFAULT 0`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error('Migration error (is_recurring_parent):', err.message);
            }
        });
        db.run(`ALTER TABLE tasks ADD COLUMN parent_id INTEGER`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error('Migration error (parent_id):', err.message);
            }
        });

        // Basic Seed for Categories if empty
        db.get("SELECT count(*) as count FROM categories", [], (err, row) => {
            if (row && row.count === 0) {
                const names = ["General", "Desarrollo", "Marketing"];
                const colors = ["#94a3b8", "#6366f1", "#ec4899"];

                names.forEach((name, i) => {
                    db.run("INSERT INTO categories (name, color) VALUES (?, ?)", [name, colors[i]], (err) => {
                        if (err) console.error("Error seeding categories:", err.message);
                    });
                });
                console.log("Seeded basic categories.");
            }
        });

        // Basic Seed for Admin User if empty
        db.get("SELECT count(*) as count FROM users", (err, row) => {
            if (row && row.count === 0) {
                const password = 'admin123';
                const hashedPassword = bcrypt.hashSync(password, 8);
                db.run(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`, ['admin', hashedPassword, 'admin'], (err) => {
                    if (err) console.error('Error seeding admin user:', err.message);
                    else console.log('Admin user seeded (admin / admin123)');
                });
            }
        });
    });
}

if (!isFirebase) {
    initDB();
}

module.exports = db;
