/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import Swal from "sweetalert2";
import { BiShow, BiHide } from "react-icons/bi";
import {
  CardData,
  LogData,
  CardItemProps,
  CardProps,
  TaskItem,
} from "@/lib/types";
import Navbar from "../components/Navbar";
import axiosGlobal from "@/services/AxiosGlobal";
import { formatDate } from "../../lib/formatter/FormatDate";
import { TaskStatus } from "@prisma/client";
import ModalTask from "./components/modal/ModalTask";

const CardItem = ({ item, index, onCardClick }: CardItemProps) => {
  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength
      ? text.substring(0, maxLength) + "..."
      : text;
  };

  return (
    <Draggable draggableId={item.id} index={index}>
      {(provided) => (
        <div className="flex justify-center items-center pb-3">
          <div
            className="card mb-1 p-3 bg-white shadow-md rounded-lg w-[95%] max-w-md border-l-4 border-blue-500"
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={() => onCardClick(item)}
          >
            <div className="card-body">
              <h6 className="card-title text-lg font-semibold text-gray-800 mb-1">
                {item.title}
              </h6>
              <p className="text-sm text-gray-700">
                {truncateText(item.description, 100)}
              </p>
              <div className="text-xs text-gray-500 mt-2 text-[8px]">
                <p>Assign To: {item.assignee?.name}</p>
                <p>Created By: {item.createdBy}</p>
                <p>Created At: {formatDate(item.createdAt)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
};

const Card = ({
  title,
  items,
  background,
  droppableId,
  onCardClick,
}: CardProps) => {
  const [hideTitle, setHideTitle] = useState(false);

  const toggleTitleVisibility = () => {
    setHideTitle((prev) => !prev);
  };

  return (
    <Droppable droppableId={droppableId}>
      {(provided) => (
        <div
          className="col-md-3 p-3"
          ref={provided.innerRef}
          {...provided.droppableProps}
        >
          <div
            className="card-body rounded-3"
            style={{ background, borderRadius: "10px" }}
          >
            <div className="flex justify-between items-center">
              <h5 className="card-title text-lg font-semibold mt-2 ml-2">
                {title}
              </h5>
              <p className="text-sm flex items-center space-x-1 m-2">
                <span>{items.length} Cards</span>
              </p>
            </div>
            <div className="flex justify-end">
              <button
                onClick={toggleTitleVisibility}
                className="text-gray-600 hover:text-gray-800 p-1 text-xs"
                title={hideTitle ? "Show" : "Hide"}
              >
                {hideTitle ? <BiHide size={14} /> : <BiShow size={14} />}
              </button>
            </div>
            {!hideTitle && (
              <>
                <hr className="my-2" />
                <div className="space-y-3">
                  {items.map((item) => (
                    <CardItem
                      key={item.id}
                      item={item}
                      index={items.indexOf(item)}
                      onCardClick={onCardClick}
                    />
                  ))}
                </div>
              </>
            )}
            {provided.placeholder}
          </div>
        </div>
      )}
    </Droppable>
  );
};

const Admin: React.FC = () => {
  const [taskCards, setTaskCards] = useState<CardData>({
    not_started: [],
    on_progress: [],
    done: [],
    reject: [],
  });
  const [activityLog, setActivityLog] = useState<LogData>([]);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalType, setModalType] = useState<"add" | "update">("add");
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isLogHidden, setIsLogHidden] = useState(false);

  const [loading, setLoading] = useState(false);

  const [listUser, setListUser] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const fetchUser = async () => {
    try {
      const response = await axiosGlobal.get("/user");
      setListUser(response.data.data);
    } catch (error) {
      console.error(error);
      Swal.fire({
        title: "Error!",
        text: "Failed to load users. Please try again later.",
        icon: "error",
        confirmButtonText: "OK",
        customClass: {
          popup: "rounded-lg shadow-lg",
          title: "text-xl font-semibold text-gray-900",
          confirmButton:
            "bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md",
        },
      });
    }
  };

  const fetchTaskCards = async () => {
    try {
      const response = await axiosGlobal.get("/task");
      setTaskCards(response.data.data);
    } catch (error) {
      console.error(error);
      Swal.fire({
        title: "Error!",
        text: "Failed to load tasks. Please try again later.",
        icon: "error",
        confirmButtonText: "OK",
        customClass: {
          popup: "rounded-lg shadow-lg",
          title: "text-xl font-semibold text-gray-900",
          confirmButton:
            "bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md",
        },
      });
    }
  };

  const fetchActivityLog = async () => {
    setIsLoading(true);
    try {
      const response = await axiosGlobal.get("/task/log");
      setActivityLog(response.data.data);
    } catch (error) {
      console.error(error);
      Swal.fire({
        title: "Error!",
        text: "Failed to load activity log. Please try again later.",
        icon: "error",
        confirmButtonText: "OK",
        customClass: {
          popup: "rounded-lg shadow-lg",
          title: "text-xl font-semibold text-gray-900",
          confirmButton:
            "bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md",
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    setIsLoading(true);
    try {
      await axiosGlobal.patch("/task/update", { taskId, status: newStatus });
      fetchTaskCards();
      fetchActivityLog();
    } catch (error) {
      console.error(error);
      Swal.fire({
        text: "An error occurred while updating task status.",
        icon: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragEnd = async (result: any) => {
    const { source, destination, draggableId } = result;

    if (!destination || !draggableId) return;

    const statusMap: Record<string, TaskStatus> = {
      not_started: "NOT_STARTED",
      on_progress: "ON_PROGRESS",
      done: "DONE",
      reject: "REJECT",
    };

    const newStatus = statusMap[destination.droppableId] || "NOT_STARTED";

    if (source.droppableId === destination.droppableId) return;

    updateTaskStatus(draggableId, newStatus);

    const sourceList = [...taskCards[source.droppableId as keyof CardData]];
    const destinationList = [
      ...taskCards[destination.droppableId as keyof CardData],
    ];

    const [movedTask] = sourceList.splice(source.index, 1);
    destinationList.splice(destination.index, 0, movedTask);

    setTaskCards((prev) => ({
      ...prev,
      [source.droppableId]: sourceList,
      [destination.droppableId]: destinationList,
    }));
  };

  const toggleModalVisibility = () => {
    setIsModalVisible((prevState) => !prevState);
    setSelectedUser(null);
  };

  const handleCardClick = (task: TaskItem) => {
    setModalType("update");
    setSelectedTask(task);
    setIsModalVisible(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (modalType === "add") {
        await axiosGlobal.post("/task/create", {
          ...selectedTask,
          assigneeId: selectedUser,
        });
      } else {
        await axiosGlobal.patch("/task/update", {
          taskId: selectedTask?.id,
          status: selectedTask?.status,
          title: selectedTask?.title,
          description: selectedTask?.description,
          assigneeId: selectedUser,
        });
      }

      fetchTaskCards();
      fetchActivityLog();
    } catch (error) {
      console.error(error);
      Swal.fire({
        title: "Error!",
        text:
          modalType === "add"
            ? "Failed to add task. Please try again later."
            : "Failed to update task. Please try again later.",
        icon: "error",
        confirmButtonText: "OK",
        customClass: {
          popup: "rounded-lg shadow-lg",
          title: "text-xl font-semibold text-gray-900",
          confirmButton:
            "bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md",
        },
      });
    } finally {
      toggleModalVisibility();
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setSelectedTask((prevTask) => ({
      ...prevTask!,
      [name]: value,
    }));
  };

  useEffect(() => {
    fetchTaskCards();
    fetchActivityLog();
    fetchUser();
  }, []);

  const handleAssignUser = (userId: string | null) => {
    setSelectedUser(userId);
  };

  return (
    <>
      <Navbar />
      <ModalTask
        onShow={isModalVisible}
        onClose={toggleModalVisibility}
        data={selectedTask!}
        type={modalType}
        onChange={handleInputChange}
        onSubmit={handleFormSubmit}
        loading={loading}
        users={listUser}
        selectedUser={selectedUser}
        onAssignUser={handleAssignUser}
      />
      <div className={`flex flex-col ${!isLogHidden && "md:flex-row"} w-full`}>
        <div className={`p-4 ${!isLogHidden && "md:w-9/12"}`}>
          <button
            onClick={() => {
              setIsModalVisible(true);
              setModalType("add");
              setSelectedTask(null);
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded text-xs ml-5"
          >
            Create Task
          </button>
          <div className="mb-0 p-2 w-full">
            <div style={{ minHeight: "700px" }}>
              <DragDropContext onDragEnd={handleDragEnd}>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {["not_started", "on_progress", "done", "reject"].map(
                    (status) => (
                      <Card
                        key={status}
                        title={status.replace("_", " ").toUpperCase()}
                        items={taskCards[status as keyof CardData]}
                        background={
                          status === "done"
                            ? "#09B11D1A"
                            : status === "on_progress"
                              ? "#FAD3382E"
                              : status === "reject"
                                ? "#FF1E1E26"
                                : "#DBDCDF"
                        }
                        droppableId={status}
                        onCardClick={handleCardClick}
                      />
                    ),
                  )}
                </div>
              </DragDropContext>
            </div>
          </div>
        </div>
        {isLogHidden ? (
          <button
            className="fixed bottom-6 right-6 bg-gradient-to-br from-green-600 to-green-400 text-white px-4 py-2 rounded-full shadow-lg transition text-xs"
            onClick={() => setIsLogHidden(!isLogHidden)}
          >
            Log Activity
          </button>
        ) : (
          <div className="mb-0 p-2 md:w-3/12 flex flex-col items-center">
            <div className="w-full p-4 border border-gray-300 rounded-lg shadow-md h-[40em] relative">
              <small
                className="absolute top-2 right-2 cursor-pointer"
                onClick={() => setIsLogHidden(!isLogHidden)}
              >
                x
              </small>
              <h5 className="text-center font-bold text-xl mb-2">
                Log Activity
              </h5>
              <div className="h-[90%] overflow-y-auto pr-2 hide-scrollbar">
                {isLoading ? (
                  [...Array(6)].map((_, index) => (
                    <div
                      className="flex items-center mb-3 animate-pulse"
                      key={index}
                    >
                      <div className="flex-grow">
                        <div className="h-4 bg-gray-300 rounded w-3/4 mb-1"></div>
                        <div className="h-3 bg-gray-200 rounded w-5/6 mb-1"></div>
                        <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))
                ) : activityLog.length > 0 ? (
                  activityLog.map((log, index) => (
                    <div className="flex items-center mb-3" key={index}>
                      <div className="flex-grow">
                        <div className="font-medium text-xs">{log.action}</div>
                        <p className=" text-gray-700 text-[12px]">{log.note}</p>
                        <p className="text-gray-500 text-end text-[8px]">
                          {formatDate(log.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    Log activity is empty
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Admin;
