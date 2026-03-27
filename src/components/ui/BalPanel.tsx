import type { ReactNode, CSSProperties } from 'react'

interface BalPanelProps {
  label?: string
  children: ReactNode
  className?: string
  accentColor?: string
  style?: CSSProperties
}

export function BalPanel({ label, children, className = '', accentColor, style: extraStyle }: BalPanelProps) {
  const baseStyle = accentColor ? { borderColor: accentColor } : {}
  const mergedStyle = { ...baseStyle, ...extraStyle }

  const isFlex = className.includes('flex')

  return (
    <div className={`bal-panel ${className}`} style={Object.keys(mergedStyle).length > 0 ? mergedStyle : undefined}>
      {label && (
        <div className="bal-panel-header flex-shrink-0" style={accentColor ? { color: accentColor, borderBottomColor: `${accentColor}33` } : undefined}>
          {label}
        </div>
      )}
      <div className={isFlex ? 'p-2 flex-1 min-h-0 flex flex-col' : 'p-2'}>
        {children}
      </div>
    </div>
  )
}

export function BalPanelInset({ label, children, className = '' }: BalPanelProps) {
  return (
    <div className={`bal-panel-inset ${className}`}>
      {label && (
        <div className="bal-panel-header">{label}</div>
      )}
      <div className="p-2">
        {children}
      </div>
    </div>
  )
}
