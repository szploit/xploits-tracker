const Database = require('better-sqlite3')
const db = new Database('tracker.db')

db.exec(`
  CREATE TABLE IF NOT EXISTS executors (
    name TEXT PRIMARY KEY,
    version TEXT,
    detected INTEGER DEFAULT 0,
    update_status INTEGER DEFAULT 1,
    updated_date TEXT,
    platform TEXT,
    last_checked INTEGER
  )
`)

module.exports = {
  getExecutor: (name) =>
    db.prepare('SELECT * FROM executors WHERE name = ?').get(name),

  upsertExecutor: (data) =>
    db.prepare(`
      INSERT INTO executors (name, version, detected, update_status, updated_date, platform, last_checked)
      VALUES (@name, @version, @detected, @update_status, @updated_date, @platform, @last_checked)
      ON CONFLICT(name) DO UPDATE SET
        version = @version,
        detected = @detected,
        update_status = @update_status,
        updated_date = @updated_date,
        platform = @platform,
        last_checked = @last_checked
    `).run(data),

  getAllExecutors: () =>
    db.prepare('SELECT * FROM executors').all(),
}
