'use client'

import { useEffect, useState } from 'react'

interface CountdownTimerProps {
  endTime: number
  onEnd?: () => void
}

export function CountdownTimer({ endTime, onEnd }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Math.floor(Date.now() / 1000)
      const difference = endTime - now

      if (difference <= 0) {
        onEnd?.()
        return { days: 0, hours: 0, minutes: 0, seconds: 0 }
      }

      return {
        days: Math.floor(difference / (60 * 60 * 24)),
        hours: Math.floor((difference % (60 * 60 * 24)) / (60 * 60)),
        minutes: Math.floor((difference % (60 * 60)) / 60),
        seconds: difference % 60
      }
    }

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    setTimeLeft(calculateTimeLeft())

    return () => clearInterval(timer)
  }, [endTime, onEnd])

  return (
    <div className="flex gap-4 text-center">
      <div>
        <div className="text-2xl font-bold">{timeLeft.days}</div>
        <div className="text-sm text-gray-400">Days</div>
      </div>
      <div>
        <div className="text-2xl font-bold">{timeLeft.hours}</div>
        <div className="text-sm text-gray-400">Hours</div>
      </div>
      <div>
        <div className="text-2xl font-bold">{timeLeft.minutes}</div>
        <div className="text-sm text-gray-400">Minutes</div>
      </div>
      <div>
        <div className="text-2xl font-bold">{timeLeft.seconds}</div>
        <div className="text-sm text-gray-400">Seconds</div>
      </div>
    </div>
  )
}
