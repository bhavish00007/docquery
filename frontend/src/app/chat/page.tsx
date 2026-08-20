"use client";

import { useState } from "react";

export default function ChatPage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSend() {
    console.log("Send button clicked");

    if (!question.trim()) {
      console.log("Question is empty");
      return;
    }

    setLoading(true);
    setError("");
    setAnswer("");

    try {
      const token = localStorage.getItem("token");

      console.log("Token exists:", !!token);

      if (!token) {
        throw new Error("Please log in first");
      }

      console.log("Sending request to backend...");

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

      console.log("Backend response status:", res.status);

      if (!res.ok) {
        const errorText = await res.text();
        console.log("Backend error:", errorText);
        throw new Error(`Request failed: ${res.status}`);
      }

      const data = await res.json();

      console.log("Backend response:", data);

      setAnswer(data.answer);
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

                <p className="whitespace-pre-wrap text-sm leading-7 text-gray-900">
                  {answer}
                </p>
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
                onChange={(event) => setQuestion(event.target.value)}
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