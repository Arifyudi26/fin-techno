/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { ModalProps, ModalData } from "@/lib/types";

const ModalTask: React.FC<
  ModalProps & {
    users: any[];
    selectedUser: string | null;
    onAssignUser: (userId: string | null) => void;
    data: ModalData;
  }
> = ({
  onShow,
  onClose,
  data,
  type,
  onChange,
  onSubmit,
  loading,
  users,
  selectedUser,
  onAssignUser,
}) => {
  if (!onShow) return null;

  return (
    <div className="fixed inset-0 z-40 min-h-full overflow-y-auto overflow-x-hidden flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
        <button
          type="button"
          className="absolute top-2 right-2 text-gray-400 hover:rotate-180 transition-all duration-500"
          onClick={onClose}
        >
          <svg
            className="h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        <div className="text-center text-gray-900 dark:text-white">
          <h2 className="text-xs font-bold">
            {type === "update" ? "Update Task" : "Create a New Task"}
          </h2>
          <p className="text-gray-500 text-xs">
            {type === "update"
              ? "Please edit the details below to update the task."
              : "Please fill out the details below to create a new task."}
          </p>
        </div>
        <form className="space-y-4 mt-4" onSubmit={onSubmit}>
          <div>
            <label className="block text-gray-400 text-xs">Title</label>
            <input
              type="text"
              name="title"
              className="w-full border p-3 rounded-lg focus:outline-none text-xs"
              placeholder="Title"
              value={data?.title || ""}
              onChange={onChange}
              required
            />
          </div>
          <div>
            <label className="block text-gray-400 text-xs">Description</label>
            <textarea
              name="description"
              className="w-full border p-3 rounded-lg focus:outline-none text-xs"
              placeholder="Description"
              value={data?.description || ""}
              onChange={onChange}
              required
            ></textarea>
          </div>

          <div>
            <label className="block text-gray-400 text-xs">Assign To</label>
            <select
              name="assignedTo"
              className="w-full border p-3 rounded-lg focus:outline-none text-xs"
              value={selectedUser || data?.assignee?.id}
              onChange={(e) => onAssignUser(e.target.value)}
            >
              <option value="">Select a user</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} - {user.email}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              className="px-4 py-2 text-gray-800 bg-gray-200 rounded-lg hover:bg-gray-300 text-xs"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-white bg-[#4d1b80] rounded-lg hover:bg-[#7127BA] text-xs"
            >
              {loading ? "Loading..." : "Send"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalTask;
