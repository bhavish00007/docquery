"use client";

import { useEffect, useState } from "react";
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
  const [question, setQuestion] = useState("");

  const [messages, setMessages] = useState<Message[]>(
    []
  );

  const [chats, setChats] = useState<Chat[]>(
    []
  );

  const [currentChatId, setCurrentChatId] =
    useState<number | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [loadingChats, setLoadingChats] =
    useState(true);

  const [loadingChat, setLoadingChat] =
    useState(false);

  const [error, setError] = useState("");

  async function loadChats() {
    try {
      const token =
        localStorage.getItem("token");

      if (!token) {
        throw new Error("Please log in first");
      }

      const response = await fetch(
        "http://127.0.0.1:8000/chats",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to load chats: ${response.status}`
        );
      }

      const data = await response.json();

      setChats(data);
    } catch (err) {
      console.error(
        "Failed to load chats:",
        err
      );

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

      const token =
        localStorage.getItem("token");

      if (!token) {
        throw new Error("Please log in first");
      }

      const response = await fetch(
        `http://127.0.0.1:8000/chats/${chatId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to load chat: ${response.status}`
        );
      }

      const data = await response.json();

      setCurrentChatId(data.chat_id);
      setMessages(data.messages || []);
      setQuestion("");
    } catch (err) {
      console.error(
        "Failed to load chat:",
        err
      );

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
  }

  async function handleSend() {
    if (!question.trim() || loading) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const token =
        localStorage.getItem("token");

      if (!token) {
        throw new Error("Please log in first");
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

      if (!response.ok) {
        const errorText =
          await response.text();

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
        message_id:
          Date.now(),
        role: "user",
        content: question.trim(),
        sources: [],
      };

      const assistantMessage: Message = {
        message_id:
          Date.now() + 1,
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
      console.error(
        "Query error:",
        err
      );

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
    <main className="flex min-h-screen bg-gray-50">

      {/* SIDEBAR */}

      <aside className="hidden w-72 flex-col border-r bg-white md:flex">

        <div className="border-b p-5">
          <div className="text-xl font-semibold">
            DocQuery
          </div>

          <button
            type="button"
            onClick={handleNewChat}
            className="mt-5 w-full rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            + New chat
          </button>
        </div>

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
                  currentChatId ===
                  chat.chat_id
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

      <section className="flex min-h-screen flex-1 flex-col">

        <header className="border-b bg-white px-6 py-4">
          <h1 className="text-lg font-semibold">
            Document Chat
          </h1>

          <p className="text-sm text-gray-500">
            Ask questions about your uploaded
            documents
          </p>
        </header>

        <div className="flex flex-1 justify-center px-6 py-10">

          <div className="w-full max-w-3xl">

            {loadingChat && (
              <div className="mb-6 rounded-xl border bg-white p-6 text-center shadow-sm">
                <p className="text-sm text-gray-500">
                  Loading conversation...
                </p>
              </div>
            )}

            {!loadingChat &&
              messages.length === 0 &&
              !loading && (
                <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">

                  <h2 className="text-3xl font-semibold text-gray-900">
                    Ask your documents
                  </h2>

                  <p className="mt-2 text-gray-500">
                    Upload documents and ask
                    questions to get grounded
                    answers.
                  </p>

                </div>
              )}

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
                        ? "max-w-[80%] rounded-2xl bg-black px-5 py-3 text-sm text-white"
                        : "w-full rounded-xl border bg-white p-6 shadow-sm"
                    }
                  >

                    {message.role ===
                      "assistant" ? (
                      <>
                        <h3 className="mb-3 text-sm font-semibold text-gray-500">
                          Answer
                        </h3>

                        <div className="text-sm leading-7 text-gray-900">

                          <ReactMarkdown
                            remarkPlugins={[
                              remarkGfm,
                            ]}
                            components={{
                              p: ({
                                children,
                              }) => (
                                <p className="mb-3 last:mb-0">
                                  {children}
                                </p>
                              ),

                              ul: ({
                                children,
                              }) => (
                                <ul className="mb-3 list-disc space-y-1 pl-6">
                                  {children}
                                </ul>
                              ),

                              ol: ({
                                children,
                              }) => (
                                <ol className="mb-3 list-decimal space-y-1 pl-6">
                                  {children}
                                </ol>
                              ),

                              strong: ({
                                children,
                              }) => (
                                <strong className="font-semibold">
                                  {children}
                                </strong>
                              ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>

                        </div>

                        {message.sources &&
                          message.sources.length >
                            0 && (
                            <div className="mt-6 border-t pt-5">

                              <h3 className="mb-3 text-sm font-semibold text-gray-500">
                                Sources
                              </h3>

                              <div className="space-y-2">

                                {message.sources.map(
                                  (
                                    source,
                                    index
                                  ) => (
                                    <div
                                      key={`${source.filename}-${source.page_number}-${source.chunk_index}-${index}`}
                                      className="rounded-lg border bg-gray-50 p-3"
                                    >
                                      <p className="text-sm font-medium text-gray-900">
                                        📄{" "}
                                        {
                                          source.filename
                                        }
                                      </p>

                                      <p className="mt-1 text-xs text-gray-500">
                                        Page{" "}
                                        {
                                          source.page_number
                                        }
                                      </p>
                                    </div>
                                  )
                                )}

                              </div>
                            </div>
                          )}
                      </>
                    ) : (
                      <p className="whitespace-pre-wrap">
                        {message.content}
                      </p>
                    )}

                  </div>
                </div>
              ))}

            </div>

            {loading && (
              <div className="mt-6 rounded-xl border bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">
                  Searching your documents...
                </p>
              </div>
            )}

            {error && (
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-600">
                  {error}
                </p>
              </div>
            )}

            <div className="mt-6 flex rounded-xl border bg-white p-2 shadow-sm">

              <input
                type="text"
                value={question}
                onChange={(event) =>
                  setQuestion(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter"
                  ) {
                    handleSend();
                  }
                }}
                placeholder="Ask something about your documents..."
                disabled={loading}
                className="flex-1 px-3 py-3 text-sm outline-none disabled:bg-gray-50"
              />

              <button
                type="button"
                onClick={handleSend}
                disabled={
                  loading ||
                  !question.trim()
                }
                className="rounded-lg bg-black px-5 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Sending..."
                  : "Send"}
              </button>

            </div>

          </div>
        </div>
      </section>
    </main>
  );
}