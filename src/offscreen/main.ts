import { sendMsgFromCSToOffscreen } from '@/messaging/channels'
import { openDB } from 'web-sqlite-js'

console.log('[offscreen] Offscreen document loaded')

sendMsgFromCSToOffscreen.on(async (msg) => {
  console.log('[offscreen] Received message via channel:', msg)
  return `Hi`
})

let dbPromise: ReturnType<typeof openDB> | null = null

async function getDB(): ReturnType<typeof openDB> {
  if (dbPromise) {
    return dbPromise
  }

  try {
    dbPromise = openDB('db.sqlite3', {
      debug: true,
      releases: [
        {
          version: '0.0.1',
          migrationSQL: `
            CREATE TABLE IF NOT EXISTS logs (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              level TEXT,
              message TEXT,
              agentId TEXT,
              timestamp TEXT
            )`,
        },
      ],
    })

    console.log('[offscreen] Initialized database in offscreen')

    return await dbPromise
  } catch (err) {
    console.error('Failed to initialize database in offscreen', err)
    dbPromise = null
    throw err
  }
}

getDB().then()
