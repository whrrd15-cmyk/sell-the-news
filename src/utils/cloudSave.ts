// Cloud save/load via Firestore — syncs MetaProgress per Google user
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { db } from './firebase'
import { type MetaProgress } from '../data/types'

export interface CloudProfile {
  uid: string
  displayName: string
  email: string
  photoURL: string
  meta: MetaProgress
  lastSynced: number
}

export async function saveToCloud(uid: string, meta: MetaProgress): Promise<void> {
  if (!db) return
  try {
    await setDoc(doc(db, 'users', uid), { meta, lastSynced: Date.now() }, { merge: true })
  } catch (e) {
    console.warn('Cloud save failed:', e)
  }
}

export async function loadFromCloud(uid: string): Promise<MetaProgress | null> {
  if (!db) return null
  try {
    const snap = await getDoc(doc(db, 'users', uid))
    if (!snap.exists()) return null
    const data = snap.data() as { meta?: MetaProgress }
    return data.meta ?? null
  } catch (e) {
    console.warn('Cloud load failed:', e)
    return null
  }
}
