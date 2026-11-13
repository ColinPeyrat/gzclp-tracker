import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { WeightUnit } from '../../lib/types'

interface WeightEditModalProps {
  isOpen: boolean
  onClose: () => void
  currentWeight: number
  unit: WeightUnit
  onSave?: (weight: number) => void
}

export function WeightEditModal({ isOpen, onClose, currentWeight, unit, onSave }: WeightEditModalProps) {
  const [weight, setWeight] = useState(currentWeight.toString())
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newWeight = parseFloat(weight)
    if (!isNaN(newWeight) && newWeight > 0 && onSave) {
      onSave(newWeight)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-xs"
        aria-describedby={undefined}
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          setWeight(currentWeight.toString())
          setTimeout(() => {
            inputRef.current?.focus()
            inputRef.current?.select()
          }, 0)
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">Change weight</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-3">
            <Input
              ref={inputRef}
              type="number"
              inputMode="decimal"
              step="any"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="h-14 text-center text-2xl font-semibold tabular-nums md:text-2xl"
            />
            <span className="text-muted-foreground">{unit}</span>
          </div>
          <Button type="submit" size="xl" className="w-full">
            Save
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
