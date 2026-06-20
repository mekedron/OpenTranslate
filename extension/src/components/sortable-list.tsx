import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core"
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { restrictToFirstScrollableAncestor, restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Icon } from "@iconify/react"
import { useState } from "react"
import { i18n } from "#imports"
import { cn } from "@/utils/styles/utils"

/** Static grip used in the drag overlay (the real, interactive handle lives on each item). */
function DragHandleIcon() {
  return <Icon icon="tabler:grip-vertical" className="size-4 shrink-0 text-muted-foreground" />
}

export function SortableList<T extends { id: string }>({
  list,
  setList,
  renderItem,
  className,
}: {
  list: T[]
  setList: (items: T[]) => void
  /**
   * Renders one item. `dragHandle` is the ONLY draggable affordance — place it
   * (typically a left-side grip) inside the item so the rest of the card stays
   * scrollable/tappable on touch devices.
   */
  renderItem: (item: T, dragHandle: React.ReactNode) => React.ReactNode
  className?: string
}) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const activeItem = activeId ? (list.find(item => item.id === activeId) ?? null) : null

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (over && String(active.id) !== String(over.id)) {
      const activeItemId = String(active.id)

      const activeElement = document.querySelector<HTMLElement>(`[data-sortable-id="${activeItemId}"]`)
      const scrollContainer = findVerticalScrollContainer(activeElement)
      const scrollTopBeforeUpdate = scrollContainer?.scrollTop

      const oldIndex = list.findIndex(item => item.id === activeItemId)
      const newIndex = list.findIndex(item => item.id === String(over.id))
      if (oldIndex === -1 || newIndex === -1)
        return
      setList(arrayMove(list, oldIndex, newIndex))

      // Keep the scroll position stable after reordering.
      if (scrollContainer && scrollTopBeforeUpdate !== undefined) {
        requestAnimationFrame(() => {
          scrollContainer.scrollTop = scrollTopBeforeUpdate
        })
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToFirstScrollableAncestor]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext
        items={list.map(item => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className={className} style={{ overflowAnchor: "none" }}>
          {list.map(item => (
            <SortableItemWrapper key={item.id} id={item.id} item={item} renderItem={renderItem} />
          ))}
        </div>
      </SortableContext>
      <DragOverlay>
        <div className="cursor-grabbing rounded-xl shadow-xl">
          {activeItem ? renderItem(activeItem, <DragHandleIcon />) : null}
        </div>
      </DragOverlay>
    </DndContext>
  )
}

function SortableItemWrapper<T extends { id: string }>({
  id,
  item,
  renderItem,
}: {
  id: string
  item: T
  renderItem: (item: T, dragHandle: React.ReactNode) => React.ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    overflowAnchor: "none" as const,
  }

  // The drag listeners live ONLY on this handle (not the whole card). `touch-none`
  // lets a touch on the grip start a drag, while a swipe anywhere else on the card
  // scrolls the list normally — this is what stops accidental drags on iOS.
  const dragHandle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      aria-label={i18n.t("options.dragToReorder")}
      className="flex shrink-0 cursor-grab touch-none select-none items-center self-stretch text-muted-foreground transition-colors hover:text-foreground active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <Icon icon="tabler:grip-vertical" className="size-4" />
    </button>
  )

  return (
    <div
      ref={setNodeRef}
      data-sortable-id={id}
      style={style}
      className={cn(
        "rounded-xl transition-all duration-200",
        isDragging && "opacity-50",
      )}
    >
      {renderItem(item, dragHandle)}
    </div>
  )
}

function findVerticalScrollContainer(element: HTMLElement | null): HTMLElement | null {
  let current: HTMLElement | null = element
  while (current) {
    const style = window.getComputedStyle(current)
    const overflowY = style.overflowY
    const isScrollable = overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay"
    if (isScrollable && current.scrollHeight > current.clientHeight) {
      return current
    }
    current = current.parentElement
  }
  return null
}
