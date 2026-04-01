import { useRef, useEffect } from 'react'
import {
  createChart,
  ColorType,
  BaselineSeries,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from 'lightweight-charts'

interface RealtimeLineChartProps {
  prices: number[]
  currentPrice: number
  openPrice: number
  width?: number
  height?: number
}

const BALATRO = {
  bg: '#151528',
  text: '#8888aa',
  grid: 'rgba(255,255,255,0.04)',
  green: '#5ec269',
  red: '#e8534a',
  crosshair: '#8888aa',
}

const BASE_TIME = 1704067200 // 2024-01-01
const TIME_STEP = 3600 // 1시간 간격 (시각적 간격)

export default function RealtimeLineChart({
  prices,
  currentPrice,
  openPrice,
  width = 600,
  height = 300,
}: RealtimeLineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Baseline'> | null>(null)
  const openLineRef = useRef<ReturnType<ISeriesApi<'Baseline'>['createPriceLine']> | null>(null)

  // 차트 생성 (한 번만)
  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: BALATRO.bg },
        textColor: BALATRO.text,
        fontFamily: "'DungGeunMo', 'm6x11plus', monospace",
        fontSize: 10,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: BALATRO.grid },
        horzLines: { color: BALATRO.grid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: BALATRO.crosshair,
          width: 1,
          style: 3,
          labelBackgroundColor: '#2a2a4a',
        },
        horzLine: {
          color: BALATRO.crosshair,
          width: 1,
          style: 3,
          labelBackgroundColor: '#2a2a4a',
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.08)',
        scaleMargins: { top: 0.08, bottom: 0.08 },
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.08)',
        timeVisible: false,
        visible: false,
      },
      handleScroll: false,
      handleScale: false,
    })

    const series = chart.addSeries(BaselineSeries, {
      baseValue: { type: 'price', price: openPrice || 100 },
      topLineColor: BALATRO.green,
      topFillColor1: 'rgba(94, 194, 105, 0.28)',
      topFillColor2: 'rgba(94, 194, 105, 0.02)',
      bottomLineColor: BALATRO.red,
      bottomFillColor1: 'rgba(232, 83, 74, 0.02)',
      bottomFillColor2: 'rgba(232, 83, 74, 0.28)',
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBackgroundColor: '#fff',
      lastValueVisible: true,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    })

    chartRef.current = chart
    seriesRef.current = series

    return () => {
      openLineRef.current = null
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 리사이즈
  useEffect(() => {
    if (chartRef.current && width > 0 && height > 0) {
      chartRef.current.resize(width, height)
    }
  }, [width, height])

  // 히스토리 데이터 갱신 + 기준선 업데이트
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) return
    if (prices.length === 0) return

    const data = prices.map((p, i) => ({
      time: (BASE_TIME + i * TIME_STEP) as Time,
      value: p,
    }))

    seriesRef.current.setData(data)

    // 기준선(openPrice) 업데이트
    seriesRef.current.applyOptions({
      baseValue: { type: 'price' as const, price: openPrice },
    })

    // 시작가 대시 점선
    if (openLineRef.current) {
      try { seriesRef.current.removePriceLine(openLineRef.current) } catch { /* noop */ }
      openLineRef.current = null
    }
    openLineRef.current = seriesRef.current.createPriceLine({
      price: openPrice,
      color: 'rgba(136, 136, 170, 0.5)',
      lineWidth: 1,
      lineStyle: 2, // dashed
      axisLabelVisible: true,
      title: 'OPEN',
    })

    chartRef.current.timeScale().fitContent()
  }, [prices, openPrice])

  // 실시간 틱 업데이트 (currentPrice 변경 시)
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) return
    if (prices.length === 0 || currentPrice <= 0) return

    // 히스토리의 다음 시점에 라이브 포인트 추가/업데이트
    const liveTime = (BASE_TIME + prices.length * TIME_STEP) as Time
    seriesRef.current.update({ time: liveTime, value: currentPrice })

    chartRef.current.timeScale().scrollToRealTime()
  }, [currentPrice, prices.length])

  if (prices.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-bal-text-dim text-sm w-full h-full"
        style={{ background: BALATRO.bg, borderRadius: 6 }}
      >
        데이터 없음
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ borderRadius: 6, overflow: 'hidden' }}
    />
  )
}
