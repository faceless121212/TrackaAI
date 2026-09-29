"use client";

import { Plus, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LabelDot } from "@/components/tasks/label-chip";
import type { MemberOption } from "@/components/tasks/member-avatar";
import { PRIORITY_META, PriorityIcon } from "@/components/tasks/priority";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { EMPTY_FILTERS, PRIORITIES, isFiltered, type BoardFilters, type Label } from "@/lib/domain";

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

function FilterTrigger({ label, count }: { label: string; count: number }) {
  return (
    <DropdownMenuTrigger asChild>
      <Button variant="outline" size="sm">
        {label}
        {count > 0 && <Badge variant="secondary">{count}</Badge>}
      </Button>
    </DropdownMenuTrigger>
  );
}

export function BoardToolbar({
  filters,
  onChange,
  members,
  labels,
  onNewTask,
  saving,
}: {
  filters: BoardFilters;
  onChange: (filters: BoardFilters) => void;
  members: MemberOption[];
  labels: Label[];
  onNewTask: () => void;
  saving: boolean;
}) {
  // Search is uncontrolled and debounced into the URL; the timer reads the
  // latest filters so a filter changed meanwhile isn't reverted.
  const latest = useRef(filters);
  useEffect(() => {
    latest.current = filters;
  });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [searchKey, setSearchKey] = useState(0);

  const keepOpen = (event: Event) => event.preventDefault();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          aria-label="Search tasks"
          placeholder="Search tasks"
          className="h-8 w-48 pl-8"
          key={searchKey}
          defaultValue={filters.query}
          onChange={(event) => {
            const query = event.target.value.trim();
            clearTimeout(timer.current);
            timer.current = setTimeout(() => onChange({ ...latest.current, query }), 250);
          }}
        />
      </div>

      <DropdownMenu>
        <FilterTrigger label="Assignee" count={filters.assignee === "any" ? 0 : 1} />
        <DropdownMenuContent align="start">
          <DropdownMenuRadioGroup
            value={filters.assignee}
            onValueChange={(assignee) => onChange({ ...filters, assignee })}
          >
            <DropdownMenuRadioItem value="any">Anyone</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="me">Me</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="none">Unassigned</DropdownMenuRadioItem>
            {members.map((member) => (
              <DropdownMenuRadioItem key={member.id} value={member.id}>
                {member.name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <FilterTrigger label="Priority" count={filters.priorities.length} />
        <DropdownMenuContent align="start">
          {PRIORITIES.map((priority) => (
            <DropdownMenuCheckboxItem
              key={priority}
              checked={filters.priorities.includes(priority)}
              onSelect={keepOpen}
              onCheckedChange={() => onChange({ ...filters, priorities: toggle(filters.priorities, priority) })}
            >
              <PriorityIcon priority={priority} />
              {PRIORITY_META[priority].label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <FilterTrigger label="Labels" count={filters.labelIds.length} />
        <DropdownMenuContent align="start">
          {labels.map((label) => (
            <DropdownMenuCheckboxItem
              key={label.id}
              checked={filters.labelIds.includes(label.id)}
              onSelect={keepOpen}
              onCheckedChange={() => onChange({ ...filters, labelIds: toggle(filters.labelIds, label.id) })}
            >
              <LabelDot color={label.color} />
              {label.name}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {isFiltered(filters) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            clearTimeout(timer.current);
            setSearchKey((key) => key + 1);
            onChange(EMPTY_FILTERS);
          }}
        >
          <X />
          Clear filters
        </Button>
      )}

      <span role="status" className="text-muted-foreground ml-auto text-xs">
        {saving ? "Saving…" : ""}
      </span>
      <Button size="sm" onClick={onNewTask}>
        <Plus />
        New task
        <kbd className="bg-primary-foreground/20 rounded px-1 font-mono text-[10px]">C</kbd>
      </Button>
    </div>
  );
}
