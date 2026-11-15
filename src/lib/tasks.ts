import type { Task } from "@/types/domain";
import { dayKey } from "./dates";

export const isOpenTask = (task: Pick<Task, "status">) => task.status !== "completed" && task.status !== "cancelled";

export const isOverdue = (task: Pick<Task, "status" | "dueDate">, today = dayKey()) =>
  isOpenTask(task) && !!task.dueDate && task.dueDate < today;
