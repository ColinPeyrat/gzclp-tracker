import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
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

  useEffect(() => {
    if (isOpen) {
      setWeight(currentWeight.toString())
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 0)
    }
  }, [isOpen, currentWeight])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newWeight = parseFloat(weight)
    if (!isNaN(newWeight) && newWeight > 0 && onSave) {
      onSave(newWeight)
      onClose()
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-xs mx-4 bg-zinc-900 rounded-lg shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold">Change Weight</h2>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-200"
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="number"
              inputMode="decimal"
              step="any"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="flex-1 px-3 py-2 text-lg text-center bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-blue-500"
            />
            <span className="text-lg text-zinc-400">{unit}</span>
          </div>
          <button
            type="submit"
            className="w-full mt-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
          >
            Save
          </button>
        </form>
      </div>
    </div>
  )
}
