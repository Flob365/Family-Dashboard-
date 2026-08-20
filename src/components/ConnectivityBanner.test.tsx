import { act, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ConnectivityBanner } from './ConnectivityBanner'

afterEach(() => {
  vi.restoreAllMocks()
})

it('shows a non-blocking notice offline and removes it when connectivity returns', () => {
  let online = true
  vi.spyOn(window.navigator, 'onLine', 'get').mockImplementation(() => online)
  render(<ConnectivityBanner />)

  expect(screen.queryByRole('status')).not.toBeInTheDocument()

  act(() => {
    online = false
    window.dispatchEvent(new Event('offline'))
  })
  expect(screen.getByRole('status')).toHaveTextContent(/hors ligne/i)
  expect(screen.getByRole('status')).toHaveTextContent(/ne seront pas envoyées/i)

  act(() => {
    online = true
    window.dispatchEvent(new Event('online'))
  })
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})
