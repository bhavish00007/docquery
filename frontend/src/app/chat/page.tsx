"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Source = {
  filename: string;
  page_number: number;
  chunk_index: number;
  text: string;
};

type Chat = {
  chat_id: number;
  title: string;
  created_at: string;
  updated_at: string;
};

type Message = {
  message_id: number;
  role: "user" | "assistant";
  content: string;
  sources: Source[];
};

export default function ChatPage() {
  const router = useRouter();

  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] =
    useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [error, setError] = useState("");

  // Mobile sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleLogout() {
    localStorage.removeItem("token");
    router.push("/");
  }

  async function loadChats() {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        router.push("/");
        return;
      }

      const response = await fetch(
        "http://127.0.0.1:8000/chats",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        localStorage.removeItem("token");
        router.push("/");
        return;
      }

      if (!response.ok) {
        throw new Error(
          `Failed to load chats: ${response.status}`
        );
      }

      const data = await response.json();
      setChats(data);
    } catch (err) {
      console.error("Failed to load chats:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load chats"
      );
    } finally {
      setLoadingChats(false);
    }
  }

  async function loadChat(chatId: number) {
    try {
      setLoadingChat(true);
      setError("");

      const token = localStorage.getItem("token");

      if (!token) {
        router.push("/");
        return;
      }

      const response = await fetch(
        `http://127.0.0.1:8000/chats/${chatId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        localStorage.removeItem("token");
        router.push("/");
        return;
      }

      if (!response.ok) {
        throw new Error(
          `Failed to load chat: ${response.status}`
        );
      }

      const data = await response.json();

      setCurrentChatId(data.chat_id);
      setMessages(data.messages || []);
      setQuestion("");

      // Close mobile sidebar after selecting a chat
      setSidebarOpen(false);
    } catch (err) {
      console.error("Failed to load chat:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load chat"
      );
    } finally {
      setLoadingChat(false);
    }
  }

  function handleNewChat() {
    setCurrentChatId(null);
    setMessages([]);
    setQuestion("");
    setError("");

    // Close mobile sidebar
    setSidebarOpen(false);
  }

  async function handleSend() {
    if (!question.trim() || loading) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      if (!token) {
        router.push("/");
        return;
      }

      const response = await fetch(
        "http://127.0.0.1:8000/query",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            question: question.trim(),
            chat_id: currentChatId,
          }),
        }
      );

      if (response.status === 401) {
        localStorage.removeItem("token");
        router.push("/");
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();

        console.error(
          "Backend error:",
          errorText
        );

        throw new Error(
          `Request failed: ${response.status}`
        );
      }

      const data = await response.json();

      setCurrentChatId(data.chat_id);

      const userMessage: Message = {
        message_id: Date.now(),
        role: "user",
        content: question.trim(),
        sources: [],
      };

      const assistantMessage: Message = {
        message_id: Date.now() + 1,
        role: "assistant",
        content: data.answer,
        sources: data.sources || [],
      };

      setMessages((previous) => [
        ...previous,
        userMessage,
        assistantMessage,
      ]);

      setQuestion("");

      await loadChats();
    } catch (err) {
      console.error("Query error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadChats();
  }, []);

  return (
    <main className="flex min-h-screen overflow-hidden bg-gray-50">

      {/* MOBILE SIDEBAR OVERLAY */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          flex w-[280px] max-w-[85vw] flex-col
          border-r bg-white
          transition-transform duration-200 ease-in-out
          md:static md:w-72 md:max-w-none md:translate-x-0
          ${
            sidebarOpen
              ? "translate-x-0"
              : "-translate-x-full"
          }
        `}
      >

        {/* SIDEBAR HEADER */}
        <div className="border-b p-5">

          <div className="flex items-center justify-between">

            <div className="text-xl font-semibold">
              DocQuery
            </div>

            {/* MOBILE CLOSE BUTTON */}
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
              className="rounded-lg px-2 py-1 text-2xl leading-none text-gray-500 hover:bg-gray-100 md:hidden"
            >
              ×
            </button>

          </div>

          {/* NEW CHAT */}
          <button
            type="button"
            onClick={handleNewChat}
            className="mt-5 w-full rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            + New chat
          </button>

          {/* DOCUMENTS */}
          <button
            type="button"
            onClick={() => {
              setSidebarOpen(false);
              router.push("/documents");
            }}
            className="mt-3 w-full rounded-lg border px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Documents
          </button>

          {/* LOGOUT */}
          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 w-full rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Logout
          </button>

        </div>

        {/* RECENT CHATS */}
        <div className="flex-1 overflow-y-auto p-4">

          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-400">
            Recent chats
          </p>

          {loadingChats && (
            <p className="text-sm text-gray-400">
              Loading chats...
            </p>
          )}

          {!loadingChats &&
            chats.length === 0 && (
              <p className="text-sm text-gray-400">
                No conversations yet.
              </p>
            )}

          <div className="space-y-1">

            {chats.map((chat) => (
              <button
                key={chat.chat_id}
                type="button"
                onClick={() =>
                  loadChat(chat.chat_id)
                }
                className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${
                  currentChatId === chat.chat_id
                    ? "bg-gray-100 font-medium text-gray-900"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <div className="truncate">
                  {chat.title}
                </div>
              </button>
            ))}

          </div>
        </div>
      </aside>

      {/* MAIN CHAT */}
      <section className="flex min-h-screen min-w-0 flex-1 flex-col">

        {/* HEADER */}
        <header className="border-b bg-white px-4 py-4 sm:px-6">

          <div className="flex items-center gap-3">

            {/* MOBILE MENU BUTTON */}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-xl text-gray-700 hover:bg-gray-50 md:hidden"
            >
              ☰
            </button>

            <div className="min-w-0">
              <h1 className="text-lg font-semibold">
                Document Chat
              </h1>

              <p className="truncate text-sm text-gray-500">
                Ask questions about your uploaded documents
              </p>
            </div>

          </div>

        </header>

        {/* CHAT AREA */}
        <div className="flex min-h-0 flex-1 justify-center px-3 py-5 sm:px-6 sm:py-10">

          <div className="flex w-full max-w-3xl flex-col">

            {/* LOADING CHAT */}
            {loadingChat && (
              <div className="mb-6 rounded-xl border bg-white p-6 text-center shadow-sm">
                <p className="text-sm text-gray-500">
                  Loading conversation...
                </p>
              </div>
            )}

            {/* EMPTY CHAT */}
            {!loadingChat &&
              messages.length === 0 &&
              !loading && (
                <div className="flex min-h-[55vh] flex-col items-center justify-center px-4 text-center">

                  <h2 className="text-2xl font-semibold text-gray-900 sm:text-3xl">
                    Ask your documents
                  </h2>

                  <p className="mt-2 max-w-xl text-sm text-gray-500 sm:text-base">
                    Upload documents and ask questions
                    to get grounded answers.
                  </p>

                </div>
              )}

            {/* MESSAGES */}
            <div className="space-y-6">

              {messages.map((message) => (
                <div
                  key={message.message_id}
                  className={
                    message.role === "user"
                      ? "flex justify-end"
                      : "flex justify-start"
                  }
                >

                  <div
                    className={
                      message.role === "user"
                        ? "max-w-[90%] rounded-2xl bg-black px-4 py-3 text-sm text-white sm:max-w-[80%] sm:px-5"
                        : "w-full rounded-xl border bg-white p-4 shadow-sm sm:p-6"
                    }
                  >

                    {message.role === "assistant" ? (
                      <>
                        <h3 className="mb-3 text-sm font-semibold text-gray-500">
                          Answer
                        </h3>

                        <div className="break-words text-sm leading-7 text-gray-900">

                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              p: ({ children }) => (
                                <p className="mb-3 last:mb-0">
                                  {children}
                                </p>
                              ),

                              ul: ({ children }) => (
                                <ul className="mb-3 list-disc space-y-1 pl-6">
                                  {children}
                                </ul>
                              ),

                              ol: ({ children }) => (
                                <ol className="mb-3 list-decimal space-y-1 pl-6">
                                  {children}
                                </ol>
                              ),

                              strong: ({ children }) => (
                                <strong className="font-semibold">
                                  {children}
                                </strong>
                              ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>

                        </div>

                        {/* SOURCES */}
                        {message.sources &&
                          message.sources.length > 0 && (
                            <div className="mt-6 border-t pt-5">

                              <h3 className="mb-3 text-sm font-semibold text-gray-500">
                                Sources
                              </h3>

                              <div className="space-y-2">

                                {message.sources.map(
                                  (source, index) => (
                                    <div
                                      key={`${source.filename}-${source.page_number}-${source.chunk_index}-${index}`}
                                      className="rounded-lg border bg-gray-50 p-3"
                                    >

                                      <p className="break-words text-sm font-medium text-gray-900">
                                        📄{" "}
                                        {source.filename}
                                      </p>

                                      <p className="mt-1 text-xs text-gray-500">
                                        Page{" "}
                                        {source.page_number}
                                      </p>

                                    </div>
                                  )
                                )}

                              </div>
                            </div>
                          )}

                      </>
                    ) : (
                      <p className="whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    )}

                  </div>
                </div>
              ))}

            </div>

            {/* SEARCHING */}
            {loading && (
              <div className="mt-6 rounded-xl border bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">
                  Searching your documents...
                </p>
              </div>
            )}

            {/* ERROR */}
            {error && (
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="break-words text-sm text-red-600">
                  {error}
                </p>
              </div>
            )}

            {/* INPUT */}
            <div className="mt-6 flex min-w-0 rounded-xl border bg-white p-2 shadow-sm">

              <input
                type="text"
                value={question}
                onChange={(event) =>
                  setQuestion(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleSend();
                  }
                }}
                placeholder="Ask something about your documents..."
                disabled={loading}
                className="min-w-0 flex-1 px-2 py-3 text-sm outline-none disabled:bg-gray-50 sm:px-3"
              />

              <button
                type="button"
                onClick={handleSend}
                disabled={
                  loading || !question.trim()
                }
                className="shrink-0 rounded-lg bg-black px-4 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 sm:px-5"
              >
                {loading ? "Sending..." : "Send"}
              </button>

            </div>

          </div>
        </div>
      </section>
    </main>
  );
}