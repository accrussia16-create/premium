import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';

let dbInstance: SqlJsDatabase | null = null;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'database.sqlite');

export interface QueryResult {
  lastInsertRowid?: number;
  changes?: number;
}

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export async function getDb(): Promise<SqlJsDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      dbInstance = new SQL.Database(fileBuffer);
    } catch (err) {
      console.error('[DB] Error loading existing database file, creating new:', err);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
    saveDb();
  }

  return dbInstance;
}

export function saveDb(): void {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('[DB] Error persisting database to disk:', err);
  }
}

// Database helper methods for relational abstraction
export async function queryAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const db = await getDb();
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params);
    const results: T[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as T;
      results.push(row);
    }
    return results;
  } finally {
    stmt.free();
  }
}

export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await queryAll<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function execute(sql: string, params: any[] = []): Promise<QueryResult> {
  const db = await getDb();
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params);
    stmt.step();
    saveDb();
    
    // Fetch last inserted ID if applicable
    const lastIdRes = db.exec('SELECT last_insert_rowid() as id;');
    const lastId = lastIdRes?.[0]?.values?.[0]?.[0] as number | undefined;
    return {
      lastInsertRowid: lastId,
      changes: 1
    };
  } finally {
    stmt.free();
  }
}

export async function executeRaw(sql: string): Promise<void> {
  const db = await getDb();
  db.exec(sql);
  saveDb();
}
