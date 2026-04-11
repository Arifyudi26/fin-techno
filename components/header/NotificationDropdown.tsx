import { useState } from "react";
import { Dropdown } from "@components/ui/dropdown/Dropdown";
import { useNotifications, UploadNotification } from "@lib/context/NotificationContext";

const typeIcon: Record<UploadNotification["type"], React.ReactNode> = {
  success: (
    <span className="flex items-center justify-center w-9 h-9 rounded-full bg-success-100 dark:bg-success-500/20 shrink-0">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-success-600 dark:text-success-400">
        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.707 7.293a1 1 0 00-1.414 0L10 14.586l-2.293-2.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l6-6a1 1 0 000-1.414z" fill="currentColor" />
      </svg>
    </span>
  ),
  error: (
    <span className="flex items-center justify-center w-9 h-9 rounded-full bg-error-100 dark:bg-error-500/20 shrink-0">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-error-600 dark:text-error-400">
        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 5a1 1 0 112 0v5a1 1 0 11-2 0V7zm1 9a1.25 1.25 0 100-2.5A1.25 1.25 0 0013 16z" fill="currentColor" />
      </svg>
    </span>
  ),
  warning: (
    <span className="flex items-center justify-center w-9 h-9 rounded-full bg-warning-100 dark:bg-warning-500/20 shrink-0">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-warning-600 dark:text-warning-400">
        <path fillRule="evenodd" clipRule="evenodd" d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9a1 1 0 011 1v4a1 1 0 11-2 0v-4a1 1 0 011-1zm0 8a1.25 1.25 0 100-2.5A1.25 1.25 0 0012 17z" fill="currentColor" />
      </svg>
    </span>
  ),
  info: (
    <span className="flex items-center justify-center w-9 h-9 rounded-full bg-brand-100 dark:bg-brand-500/20 shrink-0">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-brand-600 dark:text-brand-400">
        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm1 7a1 1 0 10-2 0 1 1 0 002 0zm-1 3a1 1 0 011 1v4a1 1 0 11-2 0v-4a1 1 0 011-1z" fill="currentColor" />
      </svg>
    </span>
  ),
};

function timeAgo(date: Date | string): string {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return "Baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return `${Math.floor(diff / 86400)} hari lalu`;
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAllRead, clearAll } = useNotifications();

  const handleOpen = () => {
    setIsOpen((v) => !v);
    if (!isOpen && unreadCount > 0) markAllRead();
  };

  return (
    <div className="relative">
      <button
        className="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full dropdown-toggle hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={handleOpen}
      >
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-orange-400 text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
            <span className="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 animate-ping" />
          </span>
        )}
        <svg className="fill-current" width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" clipRule="evenodd" d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z" fill="currentColor" />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        className="absolute -right-[240px] mt-[17px] flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Notifikasi
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-orange-400 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </h5>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="text-xs text-gray-400 hover:text-error-500 dark:hover:text-error-400 transition-colors"
              >
                Hapus semua
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 transition dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <svg className="fill-current" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>

        {/* List */}
        <ul className="flex flex-col flex-1 overflow-y-auto custom-scrollbar gap-1">
          {notifications.length === 0 ? (
            <li className="flex flex-col items-center justify-center flex-1 py-10 text-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-gray-300 dark:text-gray-600 mb-3">
                <path fillRule="evenodd" clipRule="evenodd" d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z" fill="currentColor" />
              </svg>
              <p className="text-sm text-gray-400 dark:text-gray-500">Belum ada notifikasi</p>
              <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Hasil upload akan muncul di sini</p>
            </li>
          ) : (
            notifications.map((n) => (
              <li key={n.id}>
                <div className={`flex gap-3 rounded-xl p-3 transition-colors ${!n.read ? "bg-brand-50/60 dark:bg-brand-500/5" : "hover:bg-gray-50 dark:hover:bg-white/5"}`}>
                  {typeIcon[n.type]}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90 leading-snug">
                      {n.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                      {n.message}
                    </p>
                    {n.fileName && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">
                        📄 {n.fileName}
                      </p>
                    )}
                    <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0 mt-1.5" />
                  )}
                </div>
              </li>
            ))
          )}
        </ul>
      </Dropdown>
    </div>
  );
}
