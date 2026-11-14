"use client";

import { useMemo, useState } from "react";
import { ListChecks } from "lucide-react";
import { Badge, Card, EmptyState } from "@/components/ui/display";
import { DataTable, Pagination, usePagination, type Column } from "@/components/ui/data-table";
import { SearchInput } from "@/components/ui/form";
import { taskPriorityLabel, taskPriorityTone, taskStatusLabel, taskStatusTone } from "@/i18n/uk";
import { cn } from "@/lib/cn";
import { dayKey, formatDate } from "@/lib/dates";
import { isOpenTask as isOpen, isOverdue } from "@/lib/tasks";
import { users } from "@/mocks/data";
import type { Task } from "@/types/domain";
import { CaseLink, FilterBar, FilterSelect, UserCell, labelOptions } from "../common";
import { useRecordForm } from "../quick-create";


function TaskTitle({ task }: { task: Task }) {
  const form = useRecordForm();
  return (
    <button
      type="button"
      onClick={() =>
        form.open("task", {
          isEdit: true,
          defaults: {
            title: task.title, description: task.description, assignedTo: task.assignedTo, dueDate: task.dueDate ?? "",
            priority: task.priority, status: task.status, clientId: task.clientId ?? "", caseId: task.caseId ?? "",
          },
        })
      }
      className={cn("text-left font-medium hover:text-accent hover:underline", !isOpen(task) && "text-muted line-through")}
    >
      {task.title}
    </button>
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

type TasksTableProps = { rows: Task[]; compact?: boolean; showCase?: boolean; emptyTitle?: string };

export function TasksTable({ rows, compact = false, showCase = true, emptyTitle = "Завдань немає" }: TasksTableProps) {
  return (
    <DataTable
      columns={taskColumns(compact, showCase)}
      rows={rows}
      rowKey={(t) => t.id}
      empty={<EmptyState icon={<ListChecks className="h-6 w-6" />} title={emptyTitle} />}
    />
  );
}

export function TasksList({ rows, initialQuery = "" }: { rows: Task[]; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState("");
  const [assignee, setAssignee] = useState("");
  const [priority, setPriority] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter(
        (t) =>
          (!status || t.status === status) &&
          (!assignee || t.assignedTo === assignee) &&
          (!priority || t.priority === priority) &&
          (!q || t.title.toLowerCase().includes(q)),
      )
      .sort((a, b) => Number(!isOpen(a)) - Number(!isOpen(b)) || (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
  }, [rows, query, status, assignee, priority]);

  const paging = usePagination(filtered);

  return (
    <Card flush>
      <FilterBar>
        <SearchInput
          className="w-full sm:w-64"
          placeholder="Назва завдання…"
          aria-label="Пошук завдань"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <FilterSelect label="Статус" value={status} onChange={setStatus} options={labelOptions(taskStatusLabel)} />
        <FilterSelect
          label="Виконавець"
          value={assignee}
          onChange={setAssignee}
          options={users.map((u) => ({ value: u.id, label: u.fullName }))}
        />
        <FilterSelect label="Пріоритет" value={priority} onChange={setPriority} options={labelOptions(taskPriorityLabel)} />
      </FilterBar>
      <TasksTable rows={paging.pageRows} emptyTitle="Завдань за цими умовами немає" />
      <Pagination page={paging.page} pageCount={paging.pageCount} total={paging.total} pageSize={paging.pageSize} onChange={paging.setPage} />
    </Card>
  );
}
