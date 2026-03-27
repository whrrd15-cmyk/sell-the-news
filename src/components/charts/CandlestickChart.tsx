import { useRef, useEffect, useMemo } from 'react'
import {
  createChart,
  ColorType,
  CandlestickSeries,
  HistogramSeries,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type Time,
} from 'lightweight-charts'

interface CandlestickChartProps {
  prices: number[]
  volatility?: number
  width?: number
  height?: number
}

interface CandleData {
  open: number
  high: number
  low: number
  close: number
  volume: number
}

function synthesizeCandles(prices: number[], volatility: number): CandleData[] {
  if (prices.length < 2) return []
  const candles: CandleData[] = []
  for (let i = 1; i < prices.length; i++) {
    const open = prices[i - 1]
    const close = prices[i]
    const spread = Math.abs(close - open) * (0.3 + volatility * 0.7)
    const high = Math.max(open, close) + spread * (0.5 + Math.sin(i * 7.3) * 0.5)
    const low = Math.min(open, close) - spread * (0.5 + Math.cos(i * 5.1) * 0.5)
    const baseVolume = 100 + Math.abs(close - open) / open * 2000
    const volume = baseVolume * (0.6 + Math.sin(i * 3.7) * 0.4)
    candles.push({ open, high, low: Math.max(low, 0.01), close, volume })
  }
  return candles
}

// 발라트로 스타일 색상
const BALATRO = {
  bg: '#151528',
  text: '#8888aa',
  textBright: '#e8e8f0',
  grid: 'rgba(255,255,255,0.04)',
  green: '#5ec269',
  red: '#e8534a',
  greenDim: 'rgba(94,194,105,0.3)',
  redDim: 'rgba(232,83,74,0.3)',
  crosshair: '#8888aa',
}

// 기준 날짜 (UNIX timestamp, 게임 내 턴을 날짜로 변환)
const BASE_TIME = 1704067200 // 2024-01-01
const DAY_SECONDS = 86400 * 7 // 1턴 = 1주

export default function CandlestickChart({ prices, volatility = 0.3, width = 600, height = 300 }: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)

  const candles = useMemo(() => synthesizeCandles(prices, volatility), [prices, volatility])

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
        scaleMargins: { top: 0.05, bottom: 0.25 },
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.08)',
        timeVisible: false,
        tickMarkFormatter: (time: Time) => {
          const t = typeof time === 'number' ? time : 0
          const turnIndex = Math.round((t - BASE_TIME) / DAY_SECONDS) + 1
          return `${turnIndex}`
        },
      },
      handleScroll: false,
      handleScale: false,
    })

    // 캔들스틱 시리즈
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: BALATRO.green,
      downColor: BALATRO.red,
      borderVisible: false,
      wickUpColor: BALATRO.green,
      wickDownColor: BALATRO.red,
      priceFormat: { type: 'price', precision: 0, minMove: 1 },
    })

    // 볼륨 히스토그램 시리즈
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    })

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
      drawTicks: false,
      borderVisible: false,
    })

    chartRef.current = chart
    candleSeriesRef.current = candleSeries
    volumeSeriesRef.current = volumeSeries

    return () => {
      chart.remove()
      chartRef.current = null
      candleSeriesRef.current = null
      volumeSeriesRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 수동 리사이즈 백업 (autoSize가 안 먹힐 경우)
  useEffect(() => {
    if (chartRef.current && width > 0 && height > 0) {
      chartRef.current.resize(width, height)
    }
  }, [width, height])

  // 데이터 업데이트
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return

    const candleData: CandlestickData[] = candles.map((c, i) => ({
      time: (BASE_TIME + i * DAY_SECONDS) as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }))

    const volumeData: HistogramData[] = candles.map((c, i) => ({
      time: (BASE_TIME + i * DAY_SECONDS) as Time,
      value: c.volume,
      color: c.close >= c.open ? BALATRO.greenDim : BALATRO.redDim,
    }))

    candleSeriesRef.current.setData(candleData)
    volumeSeriesRef.current.setData(volumeData)

    // 마지막 가격 라인
    if (candles.length > 0) {
      const last = candles[candles.length - 1]
      const color = last.close >= last.open ? BALATRO.green : BALATRO.red
      candleSeriesRef.current.applyOptions({
        lastValueVisible: true,
      })
      candleSeriesRef.current.createPriceLine({
        price: last.close,
        color,
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: '',
      })
    }

    chartRef.current?.timeScale().fitContent()
  }, [candles])

  if (candles.length === 0) {
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
