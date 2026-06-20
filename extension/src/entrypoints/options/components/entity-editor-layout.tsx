import { cn } from "@/utils/styles/utils"

interface EntityEditorLayoutProps {
  list: React.ReactNode
  editor: React.ReactNode
  className?: string
  listClassName?: string
}

export function EntityEditorLayout({ list, editor, className, listClassName }: EntityEditorLayoutProps) {
  // Side-by-side (list rail + editor) on tablets/desktop, but stacked on narrow
  // phone screens where two columns can't fit.
  return (
    <div className={cn("flex flex-col sm:flex-row gap-4", className)}>
      <div className={cn("w-full sm:w-40 lg:w-52 flex flex-col gap-4", listClassName)}>
        {list}
      </div>
      <div className="flex-1 min-w-0">
        {editor}
      </div>
    </div>
  )
}
