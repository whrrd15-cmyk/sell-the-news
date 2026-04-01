import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { auth, isFirebaseConfigured } from '../../utils/firebase'
import { saveToCloud, loadFromCloud } from '../../utils/cloudSave'
import { loadMetaProgress, saveMetaProgress } from '../../data/metaUpgrades'
import { useGameStore } from '../../stores/gameStore'

export function GoogleLoginButton() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const refreshMeta = useGameStore((s) => s.refreshMeta)

  useEffect(() => {
    if (!auth) return
    const unsub = onAuthStateChanged(auth, (u) => {
      console.log('[Auth] onAuthStateChanged:', u?.email ?? 'null')
      setUser(u)
      setLoading(false)
      // 로그인 감지 시 클라우드 동기화
      if (u) syncCloudMeta(u.uid)
    })
    return unsub
  }, [])

  // 리다이렉트 후 복귀 시 결과 처리
  useEffect(() => {
    if (!auth) return
    getRedirectResult(auth).then(async (result) => {
      console.log('[Auth] getRedirectResult:', result?.user?.email ?? 'no result')
      if (!result) return
      await syncCloudMeta(result.user.uid)
    }).catch((e) => {
      console.error('[Auth] getRedirectResult error:', e)
    })
  }, [])

  async function syncCloudMeta(uid: string) {
    setSyncing(true)
    const cloudMeta = await loadFromCloud(uid)
    if (cloudMeta) {
      const localMeta = loadMetaProgress()
      const merged = {
        ...localMeta,
        totalRuns: Math.max(localMeta.totalRuns, cloudMeta.totalRuns),
        highestRunCleared: Math.max(localMeta.highestRunCleared, cloudMeta.highestRunCleared),
        metaPoints: Math.max(localMeta.metaPoints, cloudMeta.metaPoints),
        unlockedMetaUpgrades: Array.from(new Set([...localMeta.unlockedMetaUpgrades, ...cloudMeta.unlockedMetaUpgrades])),
        achievements: Array.from(new Set([...(localMeta.achievements ?? []), ...(cloudMeta.achievements ?? [])])),
      }
      saveMetaProgress(merged)
      refreshMeta?.()
    }
    setSyncing(false)
  }

  async function handleSignIn() {
    if (!auth) return
    setLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      console.log('[Auth] Popup sign-in success:', result.user.email)
      await syncCloudMeta(result.user.uid)
    } catch (e: any) {
      console.error('[Auth] Sign-in error:', e?.code, e?.message)
      if (e?.code === 'auth/popup-blocked') {
        // 팝업 차단 → 리다이렉트 폴백
        const provider = new GoogleAuthProvider()
        await signInWithRedirect(auth, provider)
        return
      }
    }
    setLoading(false)
  }

  async function handleSignOut() {
    if (!auth) return
    setShowMenu(false)
    // 로그아웃 전 현재 메타 저장
    if (user) {
      await saveToCloud(user.uid, loadMetaProgress())
    }
    await signOut(auth)
  }

  async function handleSyncNow() {
    if (!auth || !user) return
    setShowMenu(false)
    setSyncing(true)
    await saveToCloud(user.uid, loadMetaProgress())
    setSyncing(false)
  }

  // Firebase 미설정 시 안내 버튼
  if (!isFirebaseConfigured) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-bal-text-dim"
        style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
        title=".env에 Firebase 설정 필요">
        <GoogleIcon className="opacity-40" />
        <span className="opacity-40">Google 로그인</span>
      </div>
    )
  }

  // 로그인 상태
  if (user) {
    return (
      <div className="relative">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all"
          style={{ border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)' }}
        >
          {user.photoURL ? (
            <img src={user.photoURL} alt="" className="w-5 h-5 rounded-full" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-bal-blue flex items-center justify-center text-white text-[9px] font-bold">
              {(user.displayName ?? user.email ?? '?')[0].toUpperCase()}
            </div>
          )}
          <span className="text-white max-w-[100px] truncate">{user.displayName ?? user.email}</span>
          {syncing && <span className="text-bal-gold text-[9px]">동기화 중...</span>}
          <ChevronIcon />
        </motion.button>

        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              className="absolute top-full mt-1 right-0 z-50 min-w-[160px] rounded-xl overflow-hidden"
              style={{ background: '#1e1e38', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}
            >
              <div className="px-3 py-2 border-b border-white/10">
                <p className="text-[10px] text-bal-text-dim truncate">{user.email}</p>
              </div>
              <button onClick={handleSyncNow}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-bal-text hover:bg-white/5 transition-colors text-left">
                <span>☁️</span> 지금 동기화
              </button>
              <button onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-bal-red hover:bg-white/5 transition-colors text-left">
                <span>↩️</span> 로그아웃
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 메뉴 외부 클릭 닫기 */}
        {showMenu && <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />}
      </div>
    )
  }

  // 미로그인 상태
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleSignIn}
      disabled={loading}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-white transition-all disabled:opacity-60"
      style={{ border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.07)' }}
    >
      <GoogleIcon />
      {loading ? '로그인 중...' : 'Google로 로그인'}
    </motion.button>
  )
}

function GoogleIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}
