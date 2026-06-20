import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Clip } from '../types'

interface VoiceDraftDB extends DBSchema {
  clips: {
    key: string
    value: Clip
    indexes: { 'by-script': string }
  }
}

let dbPromise: Promise<IDBPDatabase<VoiceDraftDB>> | null = null

function getDB(): Promise<IDBPDatabase<VoiceDraftDB>> {
  if (!dbPromise) {
    dbPromise = openDB<VoiceDraftDB>('voicedraft', 1, {
      upgrade(database) {
        const clipStore = database.createObjectStore('clips', { keyPath: 'id' })
        clipStore.createIndex('by-script', 'scriptId')
      },
    })
  }

  return dbPromise
}

export async function getClipsForScript(scriptId: string): Promise<Clip[]> {
  const database = await getDB()
  const clips = await database.getAllFromIndex('clips', 'by-script', scriptId)
  return clips.sort((first, second) => first.orderIndex - second.orderIndex)
}

export async function saveClip(clip: Clip): Promise<void> {
  const database = await getDB()
  await database.put('clips', clip)
}

export async function deleteClip(id: string): Promise<void> {
  const database = await getDB()
  await database.delete('clips', id)
}

export async function deleteAllClipsForScript(scriptId: string): Promise<void> {
  const database = await getDB()
  const clips = await getClipsForScript(scriptId)
  const transaction = database.transaction('clips', 'readwrite')

  await Promise.all(clips.map((clip) => transaction.store.delete(clip.id)))
  await transaction.done
}
