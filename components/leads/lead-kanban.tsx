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

import { Dot } from "@/components/ui/status-pill";
import { updateLeadStatusAction } from "@/lib/leads/actions";
import {
  canMoveLeadStage,
  CLOSED_GUARD_MESSAGE,
  LEAD_STAGE_ORDER,
  leadStageMeta,
} from "@/lib/status";
import { cn } from "@/lib/utils";

import { LeadCard, type LeadCardProps } from "./lead-card";

type Status = LeadCardProps["status"];

const COLUMN_IDS: ReadonlySet<string> = new Set(LEAD_STAGE_ORDER);

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
    if (!canMoveLeadStage(current.status, newStatus)) {
      toast.error(CLOSED_GUARD_MESSAGE);
      return;
    }

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
      <div className="flex gap-4 overflow-x-auto px-6 py-5">
        {LEAD_STAGE_ORDER.map((status) => {
          const items = grouped[status];
          const meta = leadStageMeta[status];
          return (
            <div key={status} className="flex w-[230px] shrink-0 flex-col lg:w-auto lg:flex-1">
              <header className="flex items-center gap-[7px] px-1 pb-3">
                <Dot stage={meta.stage} />
                <h2 className="text-[12.5px] font-semibold">{meta.label}</h2>
                <span className="text-muted-foreground ml-auto font-mono text-[11px]">
                  {items.length}
                </span>
              </header>
              <DroppableColumn
                status={status}
                invalid={Boolean(activeLead && !canMoveLeadStage(activeLead.status, status))}
                active={Boolean(activeLead)}
              >
                {items.length === 0 ? (
                  <div className="grid h-20 place-items-center">
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
          <div className="shadow-pop rotate-1 cursor-grabbing">
            <LeadCard {...activeLead} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function DroppableColumn({
  status,
  invalid,
  active,
  children,
}: {
  status: Status;
  invalid: boolean;
  active: boolean;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-1 flex-col gap-2 rounded-lg border border-transparent p-1 transition-colors",
        active && "border-border border-dashed",
        isOver && !invalid && "border-primary/50 bg-primary/5",
        isOver && invalid && "border-rose-bd bg-rose-bg/40",
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
