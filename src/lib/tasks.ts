import type { Task } from "@/types/domain";
import { dayKey } from "./dates";

export const isOpenTask = (task: Task) => task.status !== "completed" && task.status !== "cancelled";

export const isOverdue = (task: Task, today = dayKey()) => isOpenTask(task) && !!task.dueDate && task.dueDate < today;
