import type { ReactNode } from 'react'

interface ModalProps {
  children: ReactNode
  onClose?: () => void
}

export function Modal({ children, onClose }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose()
        }
      }}
    >
      <div className="w-full max-w-sm rounded-lg bg-zinc-800 p-6">
        {children}
      </div>
    </div>
  )
}
