import { useState } from "react";
import { useRouter } from "next/router";
import { signOut } from "next-auth/react";
import { DropdownItem } from "@components/ui/dropdown/DropdownItem";
import { Dropdown } from "@components/ui/dropdown/Dropdown";
import useAuthStore from "@/store/authStore";
import { useAvatarUrl } from "@lib/hooks/useAvatarUrl";
import { ThemeToggleButton } from "@components/common/ThemeToggleButton";
import LanguageSwitcher from "@components/common/LanguageSwitcher";

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const router = useRouter();
  const { logout, role, name } = useAuthStore();
  const avatarObjectUrl = useAvatarUrl();

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
    setIsSettingsOpen(false);
  }

  function handleLogout() {
    closeDropdown();
    logout();
    signOut({ redirect: false }).then(() => {
      router.push("/auth/login");
    });
  }

  const displayName = name || (role?.toLowerCase() === "admin" ? "Admin" : "User");
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="flex items-center text-gray-700 dropdown-toggle dark:text-gray-400"
      >
        <span className="mr-3 overflow-hidden rounded-full h-11 w-11 bg-brand-500 flex items-center justify-center text-white font-semibold text-sm shrink-0 border border-gray-200 dark:border-gray-800">
          {avatarObjectUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={avatarObjectUrl} alt={displayName} className="h-11 w-11 object-cover rounded-full" />
            : initials}
        </span>
        <span className="block mr-1 font-medium text-theme-sm">
          {displayName}
        </span>
        <svg
          className={`stroke-gray-500 dark:stroke-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          width="18"
          height="20"
          viewBox="0 0 18 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.3125 8.65625L9 13.3437L13.6875 8.65625"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute right-0 mt-[17px] flex w-[260px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
      >
        <div>
          <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
            {displayName}
          </span>
          <span className="block text-xs text-gray-500 dark:text-gray-400 capitalize mt-0.5">
            {role || "user"}
          </span>
        </div>

        <ul className="flex flex-col gap-1 pt-4 pb-3 border-b border-gray-200 dark:border-gray-800">
          {/* Edit Profile */}
          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              to="/profile"
              className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              <svg
                className="fill-gray-500 group-hover:fill-gray-700 dark:fill-gray-400 dark:group-hover:fill-gray-300"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 3.5C7.30558 3.5 3.5 7.30558 3.5 12C3.5 14.1526 4.3002 16.1184 5.61936 17.616C6.17279 15.3096 8.24852 13.5955 10.7246 13.5955H13.2746C15.7509 13.5955 17.8268 15.31 18.38 17.6167C19.6996 16.119 20.5 14.153 20.5 12C20.5 7.30558 16.6944 3.5 12 3.5ZM17.0246 18.8566V18.8455C17.0246 16.7744 15.3457 15.0955 13.2746 15.0955H10.7246C8.65354 15.0955 6.97461 16.7744 6.97461 18.8455V18.856C8.38223 19.8895 10.1198 20.5 12 20.5C13.8798 20.5 15.6171 19.8898 17.0246 18.8566ZM2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM11.9991 7.25C10.8847 7.25 9.98126 8.15342 9.98126 9.26784C9.98126 10.3823 10.8847 11.2857 11.9991 11.2857C13.1135 11.2857 14.0169 10.3823 14.0169 9.26784C14.0169 8.15342 13.1135 7.25 11.9991 7.25ZM8.48126 9.26784C8.48126 7.32499 10.0563 5.75 11.9991 5.75C13.9419 5.75 15.5169 7.32499 15.5169 9.26784C15.5169 11.2107 13.9419 12.7857 11.9991 12.7857C10.0563 12.7857 8.48126 11.2107 8.48126 9.26784Z"
                  fill=""
                />
              </svg>
              Edit profile
            </DropdownItem>
          </li>

          {/* Settings — expandable panel for Theme & Language */}
          <li>
            <button
              onClick={() => setIsSettingsOpen((v) => !v)}
              className="flex w-full items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              {/* Gear icon */}
              <svg
                className="fill-gray-500 group-hover:fill-gray-700 dark:fill-gray-400 dark:group-hover:fill-gray-300"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M11.318 2C10.8799 2 10.5045 2.31962 10.4217 2.75L10.1659 4.0765C9.61435 4.28553 9.09744 4.57332 8.6273 4.92776L7.33834 4.49593C6.92148 4.35779 6.46421 4.52855 6.24522 4.90983L5.56321 6.09017C5.34422 6.47145 5.43829 6.9549 5.78833 7.22829L6.84929 8.04716C6.78472 8.35631 6.75 8.67434 6.75 9C6.75 9.32566 6.78472 9.64369 6.84929 9.95284L5.78833 10.7717C5.43829 11.0451 5.34422 11.5286 5.56321 11.9098L6.24522 13.0902C6.46421 13.4715 6.92148 13.6422 7.33834 13.5041L8.6273 13.0722C9.09744 13.4267 9.61435 13.7145 10.1659 13.9235L10.4217 15.25C10.5045 15.6804 10.8799 16 11.318 16H12.682C13.1201 16 13.4955 15.6804 13.5783 15.25L13.8341 13.9235C14.3857 13.7145 14.9026 13.4267 15.3727 13.0722L16.6617 13.5041C17.0785 13.6422 17.5358 13.4715 17.7548 13.0902L18.4368 11.9098C18.6558 11.5286 18.5617 11.0451 18.2117 10.7717L17.1507 9.95284C17.2153 9.64369 17.25 9.32566 17.25 9C17.25 8.67434 17.2153 8.35631 17.1507 8.04716L18.2117 7.22829C18.5617 6.9549 18.6558 6.47145 18.4368 6.09017L17.7548 4.90983C17.5358 4.52855 17.0785 4.35779 16.6617 4.49593L15.3727 4.92776C14.9026 4.57332 14.3857 4.28553 13.8341 4.0765L13.5783 2.75C13.4955 2.31962 13.1201 2 12.682 2H11.318ZM12 11.25C12.6904 11.25 13.25 10.6904 13.25 10C13.25 9.30964 12.6904 8.75 12 8.75C11.3096 8.75 10.75 9.30964 10.75 10C10.75 10.6904 11.3096 11.25 12 11.25Z"
                  fill=""
                />
              </svg>
              <span className="flex-1 text-left">Settings</span>
              {/* Chevron */}
              <svg
                className={`w-4 h-4 fill-gray-400 transition-transform duration-200 ${isSettingsOpen ? "rotate-180" : ""}`}
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                />
              </svg>
            </button>

            {/* Expandable settings panel */}
            {isSettingsOpen && (
              <div className="mx-3 mt-1 mb-1 rounded-lg border border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 px-3 py-3 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Theme
                  </span>
                  <ThemeToggleButton />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Language
                  </span>
                  <LanguageSwitcher />
                </div>
              </div>
            )}
          </li>
        </ul>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 mt-3 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300 w-full text-left"
        >
          <svg
            className="fill-gray-500 group-hover:fill-gray-700 dark:group-hover:fill-gray-300"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M15.1007 19.247C14.6865 19.247 14.3507 18.9112 14.3507 18.497L14.3507 14.245H12.8507V18.497C12.8507 19.7396 13.8581 20.747 15.1007 20.747H18.5007C19.7434 20.747 20.7507 19.7396 20.7507 18.497L20.7507 5.49609C20.7507 4.25345 19.7433 3.24609 18.5007 3.24609H15.1007C13.8581 3.24609 12.8507 4.25345 12.8507 5.49609V9.74501L14.3507 9.74501V5.49609C14.3507 5.08188 14.6865 4.74609 15.1007 4.74609L18.5007 4.74609C18.9149 4.74609 19.2507 5.08188 19.2507 5.49609L19.2507 18.497C19.2507 18.9112 18.9149 19.247 18.5007 19.247H15.1007ZM3.25073 11.9984C3.25073 12.2144 3.34204 12.4091 3.48817 12.546L8.09483 17.1556C8.38763 17.4485 8.86251 17.4487 9.15549 17.1559C9.44848 16.8631 9.44863 16.3882 9.15583 16.0952L5.81116 12.7484L16.0007 12.7484C16.4149 12.7484 16.7507 12.4127 16.7507 11.9984C16.7507 11.5842 16.4149 11.2484 16.0007 11.2484L5.81528 11.2484L9.15585 7.90554C9.44864 7.61255 9.44847 7.13767 9.15547 6.84488C8.86248 6.55209 8.3876 6.55226 8.09481 6.84525L3.52309 11.4202C3.35673 11.5577 3.25073 11.7657 3.25073 11.9984Z"
              fill=""
            />
          </svg>
          Sign out
        </button>
      </Dropdown>
    </div>
  );
}
