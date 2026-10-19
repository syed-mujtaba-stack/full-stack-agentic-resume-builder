import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export { gsap, ScrollTrigger }

/** Reveal every `[data-reveal]` child on scroll with a staggered fade-up. */
export function useReveal<T extends HTMLElement>(options: { y?: number; stagger?: number; start?: string } = {}) {
  const ref = useRef<T | null>(null)
  const { y = 34, stagger = 0.09, start = 'top 85%' } = options

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const targets = el.querySelectorAll('[data-reveal]')
    const list = targets.length ? Array.from(targets) : [el]
    const ctx = gsap.context(() => {
      gsap.fromTo(
        list,
        { opacity: 0, y, filter: 'blur(6px)' },
        {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 0.9,
          ease: 'power3.out',
          stagger,
          scrollTrigger: { trigger: el, start, once: true },
        },
      )
    }, el)
    return () => ctx.revert()
  }, [y, stagger, start])

  return ref
}

/** Elements drift with the cursor (magnetic hover). */
export function useMagnetic<T extends HTMLElement>(strength = 0.25) {
  const ref = useRef<T | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const move = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const dx = e.clientX - (rect.left + rect.width / 2)
      const dy = e.clientY - (rect.top + rect.height / 2)
      gsap.to(el, { x: dx * strength, y: dy * strength, duration: 0.7, ease: 'power3.out' })
    }
    const leave = () => gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1,0.4)' })
    el.addEventListener('mousemove', move)
    el.addEventListener('mouseleave', leave)
    return () => {
      el.removeEventListener('mousemove', move)
      el.removeEventListener('mouseleave', leave)
    }
  }, [strength])
  return ref
}

/** Animated number for dashboard counters. */
export function useCountUp(target: number, duration = 1.1): number {
  const [value, setValue] = useState(0)
  const prev = useRef(0)
  useEffect(() => {
    const obj = { v: prev.current }
    const tween = gsap.to(obj, {
      v: target,
      duration,
      ease: 'power2.out',
      onUpdate: () => setValue(Math.round(obj.v)),
      onComplete: () => {
        prev.current = target
      },
    })
    return () => {
      tween.kill()
    }
  }, [target, duration])
  return value
}

/** Draws an SVG path (sparklines) when the element scrolls into view. */
export function useDrawPath(active = true) {
  const ref = useRef<SVGPathElement | null>(null)
  useEffect(() => {
    const path = ref.current
    if (!path || !active) return
    const length = path.getTotalLength()
    gsap.set(path, { strokeDasharray: length, strokeDashoffset: length })
    gsap.to(path, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut' })
  }, [active])
  return ref
}
