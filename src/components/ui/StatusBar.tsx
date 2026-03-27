import { useSettingsStore } from '../../utils/settings'
import { SFX } from '../../utils/sound'

interface StatusBarProps {
  runName: string
  phaseMessage: string
  turn: number
  maxTurns: number
}

export function StatusBar({ runName, phaseMessage, turn, maxTurns }: StatusBarProps) {
  const muted = useSettingsStore((s) => s.muted)
  const toggleMuted = useSettingsStore((s) => s.toggleMuted)

  return (
    <div className="bal-panel-inset flex items-center justify-between px-3 py-1.5 text-xs font-pixel">
      <span className="text-bal-green font-bold">{runName}</span>
      <span className="text-bal-text-dim">{phaseMessage}</span>
      <div className="flex items-center gap-3">
        <span className="text-bal-text">
          WEEK <span className="text-bal-green font-bold">{turn}</span> / {maxTurns}
        </span>
        <button
          onClick={() => { toggleMuted(); SFX.click() }}
          className="text-bal-text-dim hover:text-white transition-colors"
          title={muted ? '사운드 켜기' : '사운드 끄기'}
        >
          {muted ? '🔇' : '🔊'}
        </button>
      </div>
    </div>
  )
}
