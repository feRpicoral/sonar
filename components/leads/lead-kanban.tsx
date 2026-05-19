"use client";

import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { ReactNode } from "react";
import { useOptimistic, useState, useSyncExternalStore, useTransition } from "react";
import { toast } from "sonner";

import { updateLeadStatusAction } from "@/lib/leads/actions";
import { cn } from "@/lib/utils";

import { LeadCard, type LeadCardProps } from "./lead-card";

type Status = LeadCardProps["status"];

const COLUMNS: { status: Status; label: string }[] = [
  { status: "DISCOVERY", label: "Discovery" },
  { status: "QUALIFIED", label: "Qualified" },
  { status: "DEMO", label: "Demo" },
  { status: "PROPOSAL", label: "Proposal" },
  { status: "CLOSED", label: "Closed" },
];

const COLUMN_IDS: ReadonlySet<string> = new Set(COLUMNS.map((c) => c.status));

const COARSE_QUERY = "(hover: none) and (pointer: coarse)";

// Touch devices fall back to the dropdown "Move to" menu on each card — drag
// is desktop-only because columns scroll horizontally and a long-press to
// drag fights with that scroll on mobile.
function usePointerCoarse(): boolean {
  return useSyncExternalStore(
    (callback) => {
      const mq = window.matchMedia(COARSE_QUERY);
      mq.addEventListener("change", callback);
      return () => mq.removeEventListener("change", callback);
    },
    () => window.matchMedia(COARSE_QUERY).matches,
    () => false,
  );
}

export function LeadKanban({ leads }: { leads: LeadCardProps[] }) {
  const [optimisticLeads, applyOptimistic] = useOptimistic<
    LeadCardProps[],
    { leadId: string; status: Status }
  >(leads, (state, { leadId, status }) =>
    state.map((l) => (l.id === leadId ? { ...l, status } : l)),
  );
  const [, startTransition] = useTransition();
  const isCoarse = usePointerCoarse();
  const [activeLead, setActiveLead] = useState<LeadCardProps | null>(null);

  // Distance threshold lets cards still receive clicks (Link, dropdown trigger)
  // without immediately starting a drag.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const grouped: Record<Status, LeadCardProps[]> = {
    DISCOVERY: [],
    QUALIFIED: [],
    DEMO: [],
    PROPOSAL: [],
    CLOSED: [],
  };
  for (const lead of optimisticLeads) grouped[lead.status].push(lead);

  const onDragStart = (event: DragStartEvent) => {
    const lead = optimisticLeads.find((l) => l.id === event.active.id);
    if (lead) setActiveLead(lead);
  };

  const onDragCancel = () => setActiveLead(null);

  const onDragEnd = (event: DragEndEvent) => {
    setActiveLead(null);
    const { active, over } = event;
    if (!over) return;
    const leadId = String(active.id);
    const overId = String(over.id);
    if (!COLUMN_IDS.has(overId)) return;
    const newStatus = overId as Status;
    const current = optimisticLeads.find((l) => l.id === leadId);
    if (!current || current.status === newStatus) return;

    startTransition(async () => {
      applyOptimistic({ leadId, status: newStatus });
      const result = await updateLeadStatusAction(leadId, newStatus);
      if (result.error) toast.error(result.error);
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragCancel={onDragCancel}
      onDragEnd={onDragEnd}
    >
      <div className="flex h-full gap-3 overflow-x-auto px-4 pt-6 pb-8 sm:px-8 sm:pt-8">
        {COLUMNS.map((col) => {
          const items = grouped[col.status];
          return (
            <div key={col.status} className="flex w-64 shrink-0 flex-col sm:w-72">
              <header className="mb-3 flex items-center justify-between">
                <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  {col.label}
                </h2>
                <span className="text-muted-foreground bg-muted rounded-full px-2 py-0.5 font-mono text-[10px]">
                  {items.length}
                </span>
              </header>
              <DroppableColumn status={col.status}>
                {items.length === 0 ? (
                  <div className="grid h-24 place-items-center">
                    <p className="text-muted-foreground font-mono text-[10px]">
                      {activeLead ? "drop here" : "empty"}
                    </p>
                  </div>
                ) : (
                  items.map((lead) => (
                    <DraggableLeadCard key={lead.id} disabled={isCoarse} {...lead} />
                  ))
                )}
              </DroppableColumn>
            </div>
          );
        })}
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }}>
        {activeLead ? (
          <div className="rotate-1 cursor-grabbing shadow-lg ring-1 ring-black/5">
            <LeadCard {...activeLead} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function DroppableColumn({ status, children }: { status: Status; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "bg-muted/60 border-border/60 flex flex-1 flex-col gap-2 rounded-lg border p-2 transition-colors",
        isOver && "border-primary/50 bg-primary/5",
      )}
    >
      {children}
    </div>
  );
}

function DraggableLeadCard({ disabled, ...props }: LeadCardProps & { disabled?: boolean }) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: props.id,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(!disabled && "cursor-grab", isDragging && "opacity-40")}
    >
      <LeadCard {...props} />
    </div>
  );
}
