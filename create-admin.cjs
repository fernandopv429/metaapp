const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createAdmin() {
  try {
    const passwordHash = await bcrypt.hash('admin123', 10);
    await pool.query(
      "INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING",
      ['admin@nexus.com', passwordHash, 'admin']
    );
    console.log('Admin user created: admin@nexus.com / admin123');
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

createAdmin();
