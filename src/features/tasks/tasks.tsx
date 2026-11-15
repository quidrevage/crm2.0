"use client";

import { Check, Circle, ListChecks } from "lucide-react";
import { Badge, Card, EmptyState } from "@/components/ui/display";
import { DataTable, type Column } from "@/components/ui/data-table";
import { taskPriorityLabel, taskPriorityTone, taskStatusLabel, taskStatusTone } from "@/i18n/uk";
import { cn } from "@/lib/cn";
import { dayKey, formatDate } from "@/lib/dates";
import { isOpenTask, isOverdue } from "@/lib/tasks";
import type { Task } from "@/types/domain";
import { CaseLink, FilterBar, UrlPagination, UrlSearch, UrlSelect, UserCell, labelOptions, useUrlFilters } from "../common";
import { editTask } from "../form-values";
import { useLookups } from "../lookups/context";
import { useRecordForm } from "../quick-create";
import { CreateButton, useRunAction } from "../record-actions";
import { setTaskStatus } from "../records/actions";

/** One-click completion; reopening goes back to "in progress". */
function TaskCheck({ task }: { task: Task }) {
  const { run, pending } = useRunAction();
  const done = task.status === "completed";
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={done ? "Позначити як невиконане" : "Позначити як виконане"}
      title={done ? "Позначити як невиконане" : "Позначити як виконане"}
      onClick={() =>
        run(
          () => setTaskStatus(task.id, task.rowVersion, done ? "in_progress" : "completed"),
          done ? "Завдання знову відкрито" : "Завдання виконано",
        )
      }
      className={cn(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors disabled:opacity-50",
        done ? "border-success bg-success text-white" : "border-line-strong text-transparent hover:border-success hover:text-success",
      )}
    >
      {done ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />}
    </button>
  );
}

function TaskTitle({ task }: { task: Task }) {
  const form = useRecordForm();
  return (
    <span className="flex items-center gap-2.5">
      <TaskCheck task={task} />
      <button
        type="button"
        onClick={() => form.open("task", editTask(task))}
        className={cn("text-left font-medium hover:text-accent hover:underline", !isOpenTask(task) && "text-muted line-through")}
      >
        {task.title}
      </button>
    </span>
  );
}

function taskColumns(compact: boolean, showCase: boolean): Column<Task>[] {
  const today = dayKey();
  const columns: Column<Task>[] = [
    { key: "title", header: "Завдання", cell: (t) => <TaskTitle task={t} />, mobile: "title" },
    { key: "case", header: "Справа", cell: (t) => <CaseLink id={t.caseId} /> },
    { key: "assignee", header: "Виконавець", cell: (t) => <UserCell id={t.assignedTo} /> },
    {
      key: "due", header: "Термін",
      cell: (t) => (
        <span className={cn("num whitespace-nowrap", isOverdue(t, today) && "font-medium text-danger")}>
          {t.dueDate === today ? "Сьогодні" : formatDate(t.dueDate)}
        </span>
      ),
    },
    { key: "priority", header: "Пріоритет", cell: (t) => <Badge tone={taskPriorityTone[t.priority]}>{taskPriorityLabel[t.priority]}</Badge> },
    { key: "status", header: "Статус", cell: (t) => <Badge tone={taskStatusTone[t.status]}>{taskStatusLabel[t.status]}</Badge> },
  ];
  return columns.filter((c) => (showCase || c.key !== "case") && (!compact || !["case", "status", "priority"].includes(c.key)));
}

type TasksTableProps = { rows: Task[]; compact?: boolean; showCase?: boolean; empty?: React.ReactNode; emptyTitle?: string };

export function TasksTable({ rows, compact = false, showCase = true, empty, emptyTitle = "Завдань немає" }: TasksTableProps) {
  return (
    <DataTable
      columns={taskColumns(compact, showCase)}
      rows={rows}
      rowKey={(t) => t.id}
      empty={empty ?? <EmptyState icon={<ListChecks className="h-6 w-6" />} title={emptyTitle} />}
    />
  );
}

const statusOptions = [{ value: "all", label: "Усі статуси" }, ...labelOptions(taskStatusLabel)];

export function TasksList({ rows, total, page, pageSize }: { rows: Task[]; total: number; page: number; pageSize: number }) {
  const { users, me } = useLookups();
  const filters = useUrlFilters();
  const filtered = ["q", "status", "assignee", "priority", "due"].some((k) => filters.get(k));

  return (
    <Card flush>
      <FilterBar pending={filters.pending}>
        <UrlSearch placeholder="Назва або опис завдання…" label="Пошук завдань" className="w-full sm:w-64" />
        <UrlSelect param="status" label="Статус" allLabel="Відкриті" options={statusOptions} />
        <UrlSelect
          param="assignee"
          label="Виконавець"
          options={users.map((u) => ({ value: u.id, label: u.id === me.id ? `${u.fullName} (я)` : u.fullName }))}
        />
        <UrlSelect param="priority" label="Пріоритет" options={labelOptions(taskPriorityLabel)} />
        <UrlSelect param="due" label="Термін" allLabel="Будь-який термін" options={[{ value: "today", label: "Сьогодні" }, { value: "overdue", label: "Прострочені" }]} />
      </FilterBar>
      <TasksTable
        rows={rows}
        empty={
          filtered ? (
            <EmptyState icon={<ListChecks className="h-6 w-6" />} title="Завдань за цими умовами немає" />
          ) : (
            <EmptyState
              icon={<ListChecks className="h-6 w-6" />}
              title="Відкритих завдань немає"
              hint="Завдання можна прив’язати до справи — тоді воно з’явиться і на сторінці справи, і в клієнта."
              action={<CreateButton kind="task" label="Додати завдання" />}
            />
          )
        }
      />
      <UrlPagination page={page} pageSize={pageSize} total={total} />
    </Card>
  );
}
