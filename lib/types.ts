export type UserRole = "user" | "admin";

export type RegisterBody = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
};

export type LoginRequestBody = {
  email: string;
  password: string;
};

export type LoginResponse = {
  id: string;
  token: string;
  role: UserRole;
  name: string;
  avatar?: string | null;
};

export type User = {
  id: string;
  role: UserRole;
};

export type Assignee = {
  id: string;
  name: string;
  email: string;
};

export type LogData = {
  action: string;
  createdAt: string;
  note: string;
}[];

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
