import { create } from 'zustand'
import { uid } from '../lib/utils'

export type ToastLevel = 'info' | 'success' | 'warn' | 'error'
export type Toast = { id: string; level: ToastLevel; message: string; ttl: number }

type UiState = {
  toasts: Toast[]
  commandOpen: boolean
  printMode: boolean
  notify: (message: string, level?: ToastLevel, ttl?: number) => void
  dismiss: (id: string) => void
  setCommandOpen: (open: boolean) => void
  setPrintMode: (mode: boolean) => void
}

export const useUi = create<UiState>((set, get) => ({
  toasts: [],
  commandOpen: false,
  printMode: false,

  notify(message, level = 'info', ttl = 4200) {
    const id = uid('toast')
    set({ toasts: [...get().toasts, { id, level, message, ttl }] })
    if (ttl > 0) {
      setTimeout(() => get().dismiss(id), ttl)
    }
  },

  dismiss(id) {
    set({ toasts: get().toasts.filter((t) => t.id !== id) })
  },

  setCommandOpen(open) {
    set({ commandOpen: open })
  },

  setPrintMode(mode) {
    set({ printMode: mode })
  },
}))

export const notify = (message: string, level: ToastLevel = 'info') => useUi.getState().notify(message, level)
