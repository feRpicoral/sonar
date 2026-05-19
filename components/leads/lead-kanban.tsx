"use client";

import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { ReactNode } from "react";
import { useOptimistic, useTransition } from "react";
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

export function LeadKanban({ leads }: { leads: LeadCardProps[] }) {
  const [optimisticLeads, applyOptimistic] = useOptimistic<
    LeadCardProps[],
    { leadId: string; status: Status }
  >(leads, (state, { leadId, status }) =>
    state.map((l) => (l.id === leadId ? { ...l, status } : l)),
  );
  const [, startTransition] = useTransition();

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

  const onDragEnd = (event: DragEndEvent) => {
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
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
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
                    <p className="text-muted-foreground font-mono text-[10px]">empty</p>
                  </div>
                ) : (
                  items.map((lead) => <DraggableLeadCard key={lead.id} {...lead} />)
                )}
              </DroppableColumn>
            </div>
          );
        })}
      </div>
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
        isOver && "border-primary/40 bg-primary/5",
      )}
    >
      {children}
    </div>
  );
}

function DraggableLeadCard(props: LeadCardProps) {
  const { setNodeRef, listeners, attributes, transform, isDragging } = useDraggable({
    id: props.id,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(isDragging && "opacity-40")}
    >
      <LeadCard {...props} />
    </div>
  );
}
