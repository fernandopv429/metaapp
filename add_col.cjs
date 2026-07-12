const { db } = require('./src/db/database');
async function run() {
  await db.execute('ALTER TABLE meta_credentials ADD COLUMN phone_number_id VARCHAR(255) UNIQUE;');
  console.log("Added column");
  process.exit(0);
}
run();
