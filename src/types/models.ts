import type { Timestamp } from "firebase/firestore";
export interface TaskImage {
  url: string;
  storagePath: string;
  fileName: string;
}
export interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  estimatedMinutes: number | null;
  dueDate: Timestamp | null;
  images: TaskImage[];
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}
export interface DayBlock {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  type: "task" | "routine" | "custom";
  taskId: string | null;
  order: number;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}
export interface RoutineBlock {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  order: number;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}
export interface DaySettings {
  startTime: string;
  endTime: string;
}
export const DEFAULT_SETTINGS: DaySettings = {
  startTime: "07:00",
  endTime: "22:00",
};
