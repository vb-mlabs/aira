"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Pencil } from "lucide-react"
import Link from "next/link"
import { apiClient } from "@/lib/api-client"
import type { Category } from "@aira/validators/categories"

interface CategoryNode {
  root: Category
  children: Category[]
}

interface CategoryTreeManagerProps {
  tree: CategoryNode[]
}

export function CategoryTreeManager({ tree: initialTree }: CategoryTreeManagerProps) {
  const router = useRouter()
  const [tree, setTree] = useState(initialTree)
  const [, startTransition] = useTransition()

  const sensors = useSensors(useSensor(PointerSensor))

  function handleRootDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = tree.findIndex((n) => n.root.id === active.id)
    const newIndex = tree.findIndex((n) => n.root.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(tree, oldIndex, newIndex)
    setTree(reordered)

    startTransition(async () => {
      await apiClient.post("/api/v1/admin/categories/reorder", {
        city_id: reordered[0]?.root.city_id ?? "city-atlanta",
        ordered_ids: reordered.map((n) => n.root.id),
      })
      router.refresh()
    })
  }

  function handleChildDragEnd(parentId: string, event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const nodeIdx = tree.findIndex((n) => n.root.id === parentId)
    if (nodeIdx === -1) return

    const children = tree[nodeIdx]!.children
    const oldIdx = children.findIndex((c) => c.id === active.id)
    const newIdx = children.findIndex((c) => c.id === over.id)
    if (oldIdx === -1 || newIdx === -1) return

    const reorderedChildren = arrayMove(children, oldIdx, newIdx)
    const updatedTree = tree.map((n, i) =>
      i === nodeIdx ? { ...n, children: reorderedChildren } : n,
    )
    setTree(updatedTree)

    startTransition(async () => {
      await apiClient.post("/api/v1/admin/categories/reorder", {
        city_id: tree[nodeIdx]!.root.city_id,
        ordered_ids: reorderedChildren.map((c) => c.id),
      })
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      {/* Explicit `id` so the aria-describedby helper element dnd-kit
          mounts gets a deterministic suffix. Without it, the nested
          DndContexts below increment a shared internal counter whose
          order differs between SSR and client hydration → hydration
          mismatch warning. */}
      <DndContext
        id="category-tree-root"
        sensors={sensors}
        onDragEnd={handleRootDragEnd}
      >
        <SortableContext
          items={tree.map((n) => n.root.id)}
          strategy={verticalListSortingStrategy}
        >
          {tree.map((node) => (
            <SortableRootRow
              key={node.root.id}
              node={node}
              onChildDragEnd={(e) => handleChildDragEnd(node.root.id, e)}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  )
}

function SortableRootRow({
  node,
  onChildDragEnd,
}: {
  node: CategoryNode
  onChildDragEnd: (event: DragEndEvent) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: node.root.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const sensors = useSensors(useSensor(PointerSensor))

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg border border-border bg-card"
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
        >
          <GripVertical className="size-4" />
        </button>
        <span className="flex-1 font-medium">{node.root.name}</span>
        <ActiveBadge active={node.root.active} />
        <Link
          href={`/admin/settings/categories/${node.root.id}`}
          className="ml-2 text-muted-foreground hover:text-foreground"
          aria-label={`Edit ${node.root.name}`}
        >
          <Pencil className="size-3.5" />
        </Link>
      </div>

      {node.children.length > 0 && (
        <div className="border-t border-border bg-muted/20 px-2 pb-2">
          {/* Stable per-parent id keeps the dnd-kit aria-describedby
              suffix deterministic across SSR/CSR. See the comment on
              the outer DndContext. */}
          <DndContext
            id={`category-tree-${node.root.id}`}
            sensors={sensors}
            onDragEnd={onChildDragEnd}
          >
            <SortableContext
              items={node.children.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              {node.children.map((child) => (
                <SortableChildRow key={child.id} child={child} />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  )
}

function SortableChildRow({ child }: { child: Category }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: child.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="mt-1 flex items-center gap-2 rounded-md px-3 py-1.5 hover:bg-muted/40"
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground/60 hover:text-muted-foreground"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="size-3.5" />
      </button>
      <span className="flex-1 text-sm text-muted-foreground">{child.name}</span>
      <ActiveBadge active={child.active} small />
      <Link
        href={`/admin/settings/categories/${child.id}`}
        className="text-muted-foreground hover:text-foreground"
        aria-label={`Edit ${child.name}`}
      >
        <Pencil className="size-3" />
      </Link>
    </div>
  )
}

function ActiveBadge({ active, small }: { active: boolean; small?: boolean }) {
  const cls = small ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"
  if (active) {
    return (
      <span
        className={`${cls} inline-flex items-center rounded-full bg-success/15 font-medium text-success`}
      >
        Active
      </span>
    )
  }
  return (
    <span
      className={`${cls} inline-flex items-center rounded-full bg-muted font-medium text-muted-foreground`}
    >
      Inactive
    </span>
  )
}
