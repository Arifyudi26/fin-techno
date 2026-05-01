"use client";
import { useState, useRef, useEffect } from "react";
import axiosGlobal from "@/services/AxiosGlobal";
import { useI18n } from "@lib/i18n";

interface Message {
  id: string;
  role: "user" | "model";
  parts: string;
  timestamp: Date;
}

export default function AIChat() {
  const { t, lang } = useI18n();
  const tr = t.dashboard;

  const SUGGESTED_QUESTIONS = [
    tr.chatSuggest1,
    tr.chatSuggest2,
    tr.chatSuggest3,
    tr.chatSuggest4,
    tr.chatSuggest5,
  ];

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "model",
          parts: tr.chatWelcome,
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen, messages.length, tr.chatWelcome]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      parts: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const historyForApi = messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, parts: m.parts }));

      const res = await axiosGlobal.post("/ai/chat", {
        message: text.trim(),
        history: historyForApi,
        lang,
      });

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "model",
        parts: res.data.reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message || "Gagal mendapatkan respons. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const renderMessage = (text: string) => {
    return text.split("\n").map((line, i) => {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      const rendered = parts.map((part, j) =>
        j % 2 === 1 ? (
          <strong key={j} className="font-semibold">{part}</strong>
        ) : (
          <span key={j}>{part}</span>
        )
      );
      if (line.startsWith("- ") || line.startsWith("• ")) {
        return <li key={i} className="ml-4 list-disc">{rendered}</li>;
      }
      if (line.trim() === "") return <br key={i} />;
      return <p key={i}>{rendered}</p>;
    });
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg hover:bg-violet-700 transition-all duration-200 hover:scale-105"
        aria-label={tr.chatTitle}
      >
        {isOpen ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="8" width="18" height="12" rx="2" stroke="white" strokeWidth="1.8" />
            <path d="M8 8V6a4 4 0 018 0v2" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="9" cy="13" r="1.2" fill="white" />
            <circle cx="15" cy="13" r="1.2" fill="white" />
            <path d="M9 17h6" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="12" cy="2" r="1" fill="white" />
          </svg>
        )}
      </button>

      {/* Chat window */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 z-50 flex w-[360px] max-w-[calc(100vw-2rem)] flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 overflow-hidden"
          style={{ height: "520px" }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-gray-100 bg-violet-600 px-4 py-3 dark:border-gray-700">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="8" width="18" height="12" rx="2" stroke="white" strokeWidth="1.8" />
                <path d="M8 8V6a4 4 0 018 0v2" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="9" cy="13" r="1.2" fill="white" />
                <circle cx="15" cy="13" r="1.2" fill="white" />
                <path d="M9 17h6" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="12" cy="2" r="1" fill="white" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{tr.chatTitle}</p>
              <p className="text-xs text-violet-200">{tr.chatSubtitle}</p>
            </div>
            <button
              onClick={() => { setMessages([]); setIsOpen(false); }}
              className="text-white/70 hover:text-white transition-colors"
              title="Tutup & reset chat"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed space-y-0.5 ${msg.role === "user"
                      ? "bg-violet-600 text-white rounded-br-sm"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 rounded-bl-sm"
                    }`}
                >
                  {renderMessage(msg.parts)}
                  <p className={`text-[10px] mt-1 ${msg.role === "user" ? "text-violet-200 text-right" : "text-gray-400"}`}>
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1 items-center">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested questions */}
          {messages.length <= 1 && !loading && (
            <div className="px-4 pb-2">
              <p className="text-xs text-gray-400 mb-2">{tr.chatSuggestLabel}</p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs text-violet-700 hover:bg-violet-100 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-gray-100 dark:border-gray-700 px-3 py-2.5">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={tr.chatPlaceholder}
                rows={1}
                className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-500"
                style={{ maxHeight: "80px", scrollbarWidth: "none", msOverflowStyle: "none" }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-gray-400">
              {tr.chatHint}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
