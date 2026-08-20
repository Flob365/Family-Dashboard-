import { useLayoutEffect, useRef, type KeyboardEvent } from 'react'

const focusableSelector =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'

export function useModalFocus<ElementType extends HTMLElement>(onClose: () => void) {
  const containerRef = useRef<ElementType>(null)
  const returnFocusRef = useRef<HTMLElement | null>(
    document.activeElement instanceof HTMLElement ? document.activeElement : null,
  )

  useLayoutEffect(() => {
    const firstControl =
      containerRef.current?.querySelector<HTMLElement>('[data-autofocus]') ??
      containerRef.current?.querySelector<HTMLElement>('input, select, textarea, button')
    queueMicrotask(() => firstControl?.focus())
    return () => returnFocusRef.current?.focus()
  }, [])

  function handleKeyDown(event: KeyboardEvent<ElementType>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      onClose()
      return
    }
    if (event.key !== 'Tab') return

    event.stopPropagation()
    const controls = [...(containerRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])]
    if (controls.length === 0) return
    const first = controls[0]
    const last = controls.at(-1)
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return { containerRef, handleKeyDown }
}
