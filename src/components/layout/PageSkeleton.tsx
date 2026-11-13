import { Skeleton } from '@/components/ui/skeleton'

export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-md space-y-5 px-4 pt-6">
      <Skeleton className="h-6 w-24" />
      <Skeleton className="h-72 w-full rounded-xl" />
      <Skeleton className="h-16 w-full rounded-2xl" />
    </div>
  )
}
