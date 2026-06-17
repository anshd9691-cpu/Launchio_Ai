import { useEffect, useRef, useState } from 'react'

interface Props {
  end: number
  duration?: number
  prefix?: string
  suffix?: string
  trigger?: boolean
}

export default function CountUp({ end, duration = 2000, prefix = '', suffix = '', trigger = true }: Props) {
  const [count, setCount] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    if (!trigger || started.current) return
    started.current = true
    let startTime: number | null = null
    const step = (ts: number) => {
      if (!startTime) startTime = ts
      const progress = Math.min((ts - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * end))
      if (progress < 1) requestAnimationFrame(step)
      else setCount(end)
    }
    requestAnimationFrame(step)
  }, [trigger, end, duration])

  return <span>{prefix}{count.toLocaleString()}{suffix}</span>
}
