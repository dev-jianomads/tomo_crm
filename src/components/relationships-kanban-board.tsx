"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Relationship, Stage } from "@/lib/mockData";
import { STAGE_COLORS, stageLabelOnColorClasses } from "@/lib/mockData";

type Column = { stage: Stage; items: Relationship[] };

function KanbanDragCardPreview({ rel }: { rel: Relationship }) {
  return (
    <div className="pointer-events-none min-w-[100px] max-w-[180px] rounded border border-[color:color-mix(in_srgb,var(--tomo-teal)_28%,var(--tomo-rule))] bg-[color:var(--tomo-card)] px-1.5 py-1.5 shadow-[var(--tomo-modal-shadow)]">
      <span className="block min-w-0 truncate text-[11px] font-medium text-[color:var(--foreground)]">{rel.firm}</span>
      <span className="block min-w-0 truncate text-[10px] text-[color:var(--tomo-body)]">{rel.name}</span>
    </div>
  );
}

function KanbanDraggableCard({
  rel,
  isActive,
  onSelect,
}: {
  rel: Relationship;
  isActive: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: rel.id,
    data: { type: "card" as const, rel },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.35 : undefined,
  };

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onSelect()}
      className={`block w-full min-w-0 max-w-full touch-none rounded border px-1.5 py-1.5 text-left shadow-[var(--tomo-shadow-1)] transition ${
        isActive
          ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] ring-1 ring-[color:color-mix(in_srgb,var(--accent)_22%,transparent)]"
          : "border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] hover:border-[color:color-mix(in_srgb,var(--tomo-teal)_22%,var(--tomo-rule))]"
      } ${isDragging ? "z-10 cursor-grabbing shadow-md" : "cursor-grab active:cursor-grabbing"}`}
    >
      <span className="block min-w-0 max-w-full truncate text-[11px] font-medium text-[color:var(--foreground)]" title={rel.firm}>
        {rel.firm}
      </span>
      <span className="block min-w-0 max-w-full truncate text-[10px] text-[color:var(--tomo-body)]" title={rel.name}>
        {rel.name}
      </span>
    </button>
  );
}

function KanbanColumn({
  stage,
  items,
  activeId,
  onSelect,
}: {
  stage: Stage;
  items: Relationship[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  const headerChrome = stageLabelOnColorClasses(stage);
  const { setNodeRef, isOver } = useDroppable({
    id: `kanban-stage-${stage}`,
    data: { type: "column" as const, stage },
  });

  return (
    <section
      ref={setNodeRef}
      className={`flex min-h-0 min-w-0 flex-1 flex-col rounded-[var(--tomo-radius-md)] border bg-[color:var(--tomo-card)] shadow-[var(--tomo-shadow-1)] transition-shadow ${
        isOver
          ? "border-[color:var(--tomo-teal)] ring-2 ring-[color:color-mix(in_srgb,var(--tomo-teal)_28%,transparent)]"
          : "border-[color:var(--tomo-rule-soft)]"
      }`}
      aria-label={`${stage}, ${items.length} relationships`}
    >
      <header
        className={`pointer-events-none shrink-0 px-1 py-1.5 ${headerChrome.border}`}
        style={{ backgroundColor: STAGE_COLORS[stage] }}
      >
        <h3
          className={`truncate text-center text-[10px] font-semibold leading-tight ${headerChrome.title}`}
          title={stage}
        >
          {stage}
        </h3>
        <p className={`text-center text-[10px] tabular-nums ${headerChrome.count}`}>{items.length}</p>
      </header>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-1">
        {items.length === 0 ? (
          <p className="px-0.5 py-2 text-center text-[10px] leading-snug text-[color:var(--tomo-mute)]">No contacts</p>
        ) : (
          items.map((rel) => (
            <KanbanDraggableCard
              key={rel.id}
              rel={rel}
              isActive={activeId === rel.id}
              onSelect={() => onSelect(rel.id)}
            />
          ))
        )}
      </div>
    </section>
  );
}

export function RelationshipsKanbanBoard({
  columns,
  activeId,
  onSelect,
  onMoveToStage,
  fundRaiseLabel,
}: {
  columns: Column[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onMoveToStage: (relationshipId: string, targetStage: Stage) => void;
  /** Shown in region aria-label — active fund / current raise (v3 Kanban context). */
  fundRaiseLabel?: string;
}) {
  const [activeDrag, setActiveDrag] = useState<Relationship | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const rel = event.active.data.current?.rel as Relationship | undefined;
    setActiveDrag(rel ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDrag(null);
    if (!over) return;
    const targetStage = over.data.current?.stage as Stage | undefined;
    if (!targetStage) return;
    const rel = active.data.current?.rel as Relationship | undefined;
    if (!rel || rel.stage === targetStage) return;
    onMoveToStage(rel.id, targetStage);
  };

  const handleDragCancel = () => {
    setActiveDrag(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div
        className="flex min-h-0 min-w-0 flex-1 gap-1 overflow-x-hidden"
        role="region"
        aria-label={
          fundRaiseLabel
            ? `Relationships by stage · current raise · ${fundRaiseLabel}`
            : "Relationships by stage"
        }
      >
        {columns.map(({ stage, items }) => (
          <KanbanColumn key={stage} stage={stage} items={items} activeId={activeId} onSelect={onSelect} />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.25, 1, 0.5, 1)" }}>
        {activeDrag ? <KanbanDragCardPreview rel={activeDrag} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
