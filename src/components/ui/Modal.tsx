import type { ReactNode } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface ModalProps {
  children: ReactNode
  onClose?: () => void
  title?: ReactNode
  description?: ReactNode
}

export function Modal({ children, onClose, title, description }: ModalProps) {
  const dismissable = !!onClose

  return (
    <Dialog open onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent
        showCloseButton={false}
        {...(!description && { 'aria-describedby': undefined })}
        onEscapeKeyDown={(e) => !dismissable && e.preventDefault()}
        onInteractOutside={(e) => !dismissable && e.preventDefault()}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
      >
        {title ? (
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold tracking-tight">{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        ) : (
          <DialogTitle className="sr-only">Dialog</DialogTitle>
        )}
        <div>{children}</div>
      </DialogContent>
    </Dialog>
  )
}
