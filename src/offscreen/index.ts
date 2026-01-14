import { openDB } from "web-sqlite-js";
import type { LogEntry, LogLevel } from "@/types/logging";
import { logAdd, logGet, logMeta, logClear } from "@/messaging/channels";

let dbPromise: ReturnType<typeof openDB> | null = null;

async function getDB() {
  if (dbPromise) {
    return dbPromise;
  }

  try {
    const db = await openDB("logs.sqlite3", { debug: true });

    // Create table if not exists
    await db.exec(`
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level TEXT,
        message TEXT,
        agentId TEXT,
        timestamp TEXT
      )
    `);

    console.log("Database initialized in offscreen");
    dbPromise = Promise.resolve(db);
    return db;
  } catch (err) {
    console.error("Failed to initialize database in offscreen", err);
    throw err;
  }
}

// --- Message Handlers ---

function setupMessaging() {
  logAdd.on(async (data) => {
    const db = await getDB();
    const { level, message, agentId, timestamp } = data;

    await db.exec(
      "INSERT INTO logs (level, message, agentId, timestamp) VALUES (?, ?, ?, ?)",
      [level, message, agentId || null, timestamp],
    );

    return { success: true };
  });

  logGet.on(async (data) => {
    const db = await getDB();
    const { limit, offset } = data;

    const result = await db.query(
      "SELECT * FROM logs ORDER BY id DESC LIMIT ? OFFSET ?",
      [limit, offset],
    );

    const rows = result as unknown as {
      id: number;
      level: string;
      message: string;
      agentId: string | null;
      timestamp: string;
    }[];
    const logs: LogEntry[] = rows.map((row) => ({
      id: row.id,
      level: row.level as LogLevel,
      message: row.message,
      agentId: row.agentId || undefined,
      timestamp: row.timestamp,
    }));

    return { logs: logs.reverse() };
  });

  logMeta.on(async () => {
    const db = await getDB();
    const result = (await db.query(
      "SELECT COUNT(*) as total FROM logs",
    )) as unknown as {
      total: number;
    }[];
    const total = result[0].total;
    return { total };
  });

  logClear.on(async () => {
    const db = await getDB();
    await db.exec("DELETE FROM logs");
    return { success: true };
  });
}

// Initialize only in the window context (not in the worker spawned by web-sqlite-js)
if (typeof document !== "undefined") {
  console.log("Offscreen document starting...");
  getDB();
  setupMessaging();
}
