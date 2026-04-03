"use client";

import React, { useState } from "react";
import useAuthStore from "../../store/authStore";
import Swal from "sweetalert2";

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const onLogout = () => {
    Swal.fire({
      title: "Are you sure?",
      text: "You will be logged out from your account.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, logout",
      cancelButtonText: "Cancel",
      customClass: {
        popup: "rounded-lg shadow-lg",
        title: "text-xl font-semibold text-gray-900",
        confirmButton:
          "bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md",
        cancelButton:
          "bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded-md",
      },
    }).then((result) => {
      if (result.isConfirmed) {
        useAuthStore.getState().logout();
        Swal.fire({
          title: "Logged Out!",
          text: "You have been successfully logged out.",
          icon: "success",
          confirmButtonText: "OK",
          customClass: {
            popup: "rounded-lg shadow-lg",
            title: "text-xl font-semibold text-gray-900",
            confirmButton:
              "bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md",
          },
        }).then(() => {
          window.location.href = "/auth/login";
        });
      }
    });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-lg">
      <nav className="mx-auto flex  items-center justify-between px-6 py-4 lg:px-12">
        <div className="hidden md:flex items-center gap-6 justify-end w-full">
          <div
            className="rounded-md bg-gradient-to-br from-red-600 to-red-400 px-4 py-2 text-white shadow-md transition-transform duration-200 hover:scale-105 cursor-pointer text-xs"
            onClick={() => onLogout()}
          >
            Log out
          </div>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          onClick={() => setIsOpen(!isOpen)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="h-6 w-6 text-slate-900"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        </button>
      </nav>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white shadow-md border-t border-slate-200 p-4">
          <ul className="flex flex-col gap-4">
            <li>
              <div
                className="block rounded-md bg-gradient-to-br from-red-600 to-red-400 px-4 py-2 text-center text-white shadow-md"
                onClick={onLogout}
              >
                Log out
              </div>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}

export default Navbar;
