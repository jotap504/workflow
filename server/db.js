const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'workflow.db');
const isProd = process.env.DATABASE_URL;
const isFirebase = process.env.USE_FIREBASE === 'true' || process.env.VERCEL === '1';

let db;

if (isFirebase) {
    const firebase = require('./firebase');
    db = firebase.db;
    db.isFirebase = true;
    console.log('Connected to Firebase Firestore (Native Mode)');
}
else if (isProd) {
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
    const sqlite3 = require('sqlite3').verbose();
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

        // Hub Clients Table (Local Mirror)
        db.run(`CREATE TABLE IF NOT EXISTS hub_clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      contactName TEXT,
      socialMedia TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
      client_id TEXT,
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

        // --- E-commerce (Carrito Pro) Tables ---

        // Products Table
        db.run(`CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            type TEXT CHECK(type IN ('physical', 'virtual', 'subscription', 'course')) DEFAULT 'physical',
            image_url TEXT,
            category TEXT,
            active BOOLEAN DEFAULT 1,
            stock INTEGER DEFAULT 10,
            discount_price REAL,
            meta_features TEXT, -- JSON string for dynamic features
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Orders Table
        db.run(`CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            customer_email TEXT NOT NULL,
            customer_name TEXT,
            total_amount REAL NOT NULL,
            status TEXT CHECK(status IN ('pending', 'paid', 'shipped', 'completed', 'cancelled')) DEFAULT 'pending',
            payment_id TEXT,
            payment_method TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`);

        // Order Items Table
        db.run(`CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            quantity INTEGER DEFAULT 1,
            unit_price REAL NOT NULL,
            FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
            FOREIGN KEY(product_id) REFERENCES products(id)
        )`);

        // Product Access Table (for Courses/Virtual)
        db.run(`CREATE TABLE IF NOT EXISTS product_access (
            user_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            access_granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY(user_id, product_id),
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
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
        db.run(`ALTER TABLE tasks ADD COLUMN client_id TEXT`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error('Migration error (client_id):', err.message);
            }
        });

        // --- Products Migrations ---
        db.run(`ALTER TABLE products ADD COLUMN stock INTEGER DEFAULT 10`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error('Migration error (product stock):', err.message);
            }
        });
        db.run(`ALTER TABLE products ADD COLUMN discount_price REAL`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error('Migration error (product discount_price):', err.message);
            }
        });
        db.run(`ALTER TABLE products ADD COLUMN meta_features TEXT`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error('Migration error (product meta_features):', err.message);
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

        // Basic Seed for Products if empty
        db.get("SELECT count(*) as count FROM products", [], (err, row) => {
            if (row && row.count === 0) {
                const products = [
                    {
                        name: 'Matcha Ceremonial Orgánico',
                        description: 'Matcha de grado ceremonial premium proveniente de Uji, Japón. Sabor suave, umami vibrante y color verde intenso.',
                        price: 45000,
                        type: 'physical',
                        image_url: '/products/matcha.png',
                        category: 'Matcha'
                    },
                    {
                        name: 'Batidor de Bambú (Chasen)',
                        description: 'Batidor artesanal de bambú con 100 cerdas finas, esencial para lograr la espuma perfecta en tu matcha.',
                        price: 15000,
                        type: 'physical',
                        image_url: '/products/whisk.png',
                        category: 'Accesorios'
                    },
                    {
                        name: 'Cuenco de Cerámica (Chawan)',
                        description: 'Cuenco artesanal de cerámica diseñado específicamente para la preparación y el disfrute del matcha.',
                        price: 28000,
                        type: 'physical',
                        image_url: '/products/bowl.png',
                        category: 'Accesorios'
                    },
                    {
                        name: 'Té Verde Sencha Premium',
                        description: 'Hojas de té verde Sencha de primera cosecha. Un clásico japonés con notas herbales y refrescantes.',
                        price: 12000,
                        type: 'physical',
                        image_url: '/products/sencha.png',
                        category: 'Té en Hebras'
                    },
                    {
                        name: 'Espumador Eléctrico Premium',
                        description: 'Espumador de leche de acero inoxidable de alta potencia para preparar lattes de matcha cremosos en segundos.',
                        price: 18500,
                        type: 'physical',
                        image_url: '/products/frother.png',
                        category: 'Accesorios'
                    }
                ];

                products.forEach((p) => {
                    db.run(`INSERT INTO products (name, description, price, type, image_url, category) 
                           VALUES (?, ?, ?, ?, ?, ?)`,
                        [p.name, p.description, p.price, p.type, p.image_url, p.category], (err) => {
                            if (err) console.error("Error seeding products:", err.message);
                        });
                });
                console.log("Seeded example products.");
            }
        });
    });
}

if (!isFirebase) {
    initDB();
}

module.exports = db;
