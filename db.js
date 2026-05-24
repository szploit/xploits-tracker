const Database = require('better-sqlite3')
const db = new Database('tracker.db')

db.exec(`
  CREATE TABLE IF NOT EXISTS executors (
    name TEXT PRIMARY KEY,
    version TEXT,
    status TEXT DEFAULT 'unknown',
    changelog TEXT,
    last_updated INTEGER
  )
`)

module.exports = {
  getExecutor: (name) => db.prepare('SELECT * FROM executors WHERE name = ?').get(name),
  upsertExecutor: (data) => db.prepare(`
    INSERT INTO executors (name, version, status, changelog, last_updated)
    VALUES (@name, @version, @status, @changelog, @last_updated)
    ON CONFLICT(name) DO UPDATE SET
      version = @version,
      status = @status,
      changelog = @changelog,
      last_updated = @last_updated
  `).run(data),
  getAllExecutors: () => db.prepare('SELECT * FROM executors').all(),
}
