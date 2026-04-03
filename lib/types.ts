import { TaskStatus } from "@prisma/client";
export type UserRole = "USER" | "ADMIN";

export type RegisterBody = {
  email: string;
  password: string;
  role: UserRole;
};

export type LoginRequestBody = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  role: UserRole;
  name: string;
};

export type User = {
  id: string;
  role: UserRole;
};

export type TaskAssigneeRequestBody = {
  taskId: string;
  userId: string;
};

export type TaskRequestBody = {
  taskId: string;
  status: TaskStatus;
  note?: string;
  title?: string;
  description?: string;
  assigneeId?: string;
};

export type Assignee = {
  id: string;
  name: string;
  email: string;
};

export type TaskItem = {
  id: string;
  title: string;
  description: string;
  status: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  assignee: Assignee | null;
};

export type CardData = Record<
  "not_started" | "on_progress" | "done" | "reject",
  TaskItem[]
>;

export type LogData = {
  action: string;
  createdAt: string;
  note: string;
}[];

export type CardItemProps = {
  item: TaskItem;
  index: number;
  onCardClick: (item: TaskItem) => void;
};

export type CardProps = {
  title: string;
  items: TaskItem[];
  background: string;
  droppableId: string;
  onCardClick: (item: TaskItem) => void;
};

export type Log = {
  id: string;
  action: string;
  createdAt: string;
  user: { email: string };
  oldStatus?: string;
  newStatus?: string;
};

export type ModalProps = {
  loading: boolean;
  onShow: boolean;
  onClose: () => void;
  data?: { title: string; description: string };
  type?: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  onSubmit: (event: React.FormEvent) => void;
};

export type ModalData = {
  title: string;
  description: string;
  assignee: Assignee | null;
};
