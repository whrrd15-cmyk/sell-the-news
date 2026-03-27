import { useSettingsStore } from '../../utils/settings'

export function CRTOverlay() {
  const crtEffect = useSettingsStore((s) => s.crtEffect)
  if (!crtEffect) return null

  return (
    <div className="crt-overlay">
      <div className="crt-scanlines" />
      <div className="crt-vignette" />
    </div>
  )
}
