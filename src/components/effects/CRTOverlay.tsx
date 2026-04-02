import { useSettingsStore } from '../../utils/settings'

interface CRTOverlayProps {
  glitch?: boolean
}

export function CRTOverlay({ glitch }: CRTOverlayProps) {
  const crtEffect = useSettingsStore((s) => s.crtEffect)
  if (!crtEffect && !glitch) return null

  return (
    <div className="crt-overlay">
      <div className="crt-scanlines" />
      <div className="crt-vignette" />
      {glitch && <div className="crt-glitch-rgb" />}
    </div>
  )
}
