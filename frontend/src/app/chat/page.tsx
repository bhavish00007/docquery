"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ChatPage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const [sources, setSources] = useState<
    {
      filename: string;
      page_number: number;
      chunk_index: number;
      text: string;
    }[]
  >([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSend() {
    if (!question.trim()) {
      return;
    }

    setLoading(true);
    setError("");
    setAnswer("");
    setSources([]);

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Please log in first");
      }

      const res = await fetch("http://127.0.0.1:8000/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: question.trim(),
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Backend error:", errorText);
        throw new Error(`Request failed: ${res.status}`);
      }

      const data = await res.json();

      setAnswer(data.answer);
      setSources(data.sources || []);
    } catch (err) {
      console.error("Query error:", err);

      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen bg-gray-50">
      <aside className="hidden w-64 border-r bg-white p-4 md:block">
        <div className="mb-6 text-xl font-semibold">
          DocQuery
        </div>

        <button
          type="button"
          className="w-full rounded-lg border px-4 py-2 text-left text-sm hover:bg-gray-50"
        >
          + New chat
        </button>

        <div className="mt-6">
          <p className="text-xs font-medium uppercase text-gray-400">
            Recent chats
          </p>
        </div>
      </aside>

      <section className="flex min-h-screen flex-1 flex-col">
        <header className="border-b bg-white px-6 py-4">
          <h1 className="text-lg font-semibold">
            Document Chat
          </h1>

          <p className="text-sm text-gray-500">
            Ask questions about your uploaded documents
          </p>
        </header>

        <div className="flex flex-1 justify-center px-6 py-10">
          <div className="w-full max-w-3xl">
            {!answer && !loading && (
              <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
                <h2 className="text-3xl font-semibold text-gray-900">
                  Ask your documents
                </h2>

                <p className="mt-2 text-gray-500">
                  Upload documents and ask questions to get grounded answers.
                </p>
              </div>
            )}

            {loading && (
              <div className="mb-6 rounded-xl border bg-white p-6 shadow-sm">
                <p className="text-sm text-gray-500">
                  Searching your documents...
                </p>
              </div>
            )}

            {answer && (
              <div className="mb-6 rounded-xl border bg-white p-6 text-left shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-gray-500">
                  Answer
                </h3>

                <div className="text-sm leading-7 text-gray-900">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => (
                        <p className="mb-3 last:mb-0">{children}</p>
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
                      li: ({ children }) => (
                        <li>{children}</li>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold">
                          {children}
                        </strong>
                      ),
                      h1: ({ children }) => (
                        <h1 className="mb-3 text-xl font-semibold">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="mb-3 text-lg font-semibold">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="mb-3 text-base font-semibold">
                          {children}
                        </h3>
                      ),
                      code: ({ children }) => (
                        <code className="rounded bg-gray-100 px-1 py-0.5 text-sm">
                          {children}
                        </code>
                      ),
                    }}
                  >
                    {answer}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {sources.length > 0 && (
              <div className="mb-6 rounded-xl border bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-sm font-semibold text-gray-500">
                  Sources
                </h3>

                <div className="space-y-3">
                  {sources.map((source, index) => (
                    <div
                      key={`${source.filename}-${source.page_number}-${source.chunk_index}-${index}`}
                      className="rounded-lg border bg-gray-50 p-4"
                    >
                      <p className="text-sm font-medium text-gray-900">
                        📄 {source.filename}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        Page {source.page_number}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-600">
                  {error}
                </p>
              </div>
            )}

            <div className="flex rounded-xl border bg-white p-2 shadow-sm">
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
                className="flex-1 px-3 py-3 text-sm outline-none"
              />

              <button
                type="button"
                onClick={handleSend}
                className="rounded-lg bg-black px-5 py-3 text-sm font-medium text-white hover:bg-gray-800"
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