"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type DocumentItem = {
  document_id: number;
  filename: string;
  status: string;
};

export default function DocumentsPage() {
  const router = useRouter();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  function handleLogout() {
    localStorage.removeItem("token");
    router.push("/");
  }

  async function loadDocuments() {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      if (!token) {
        router.push("/");
        return;
      }

      const response = await fetch(
        "http://127.0.0.1:8000/documents",
        {
          method: "GET",
          headers: {
            Accept: "application/json",
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
          `Request failed: ${response.status}`
        );
      }

      const data: DocumentItem[] =
        await response.json();

      setDocuments(data);
    } catch (err) {
      console.error(
        "Failed to load documents:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load documents"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");
    setMessage("");

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are supported.");
      event.target.value = "";
      return;
    }

    try {
      setUploading(true);

      const token = localStorage.getItem("token");

      if (!token) {
        router.push("/");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        "http://127.0.0.1:8000/documents/upload",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (response.status === 401) {
        localStorage.removeItem("token");
        router.push("/");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            `Upload failed: ${response.status}`
        );
      }

      setMessage(
        `${file.name} uploaded successfully.`
      );

      await loadDocuments();
    } catch (err) {
      console.error("Upload error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to upload document"
      );
    } finally {
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleDelete(
    documentId: number,
    filename: string
  ) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${filename}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(documentId);
      setError("");
      setMessage("");

      const token = localStorage.getItem("token");

      if (!token) {
        router.push("/");
        return;
      }

      const response = await fetch(
        `http://127.0.0.1:8000/documents/${documentId}`,
        {
          method: "DELETE",
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            `Delete failed: ${response.status}`
        );
      }

      setMessage(
        `${filename} deleted successfully.`
      );

      await loadDocuments();
    } catch (err) {
      console.error("Delete error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete document"
      );
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    loadDocuments();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50">

      <header className="border-b bg-white">

        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-5">

          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Documents
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Manage your uploaded documents
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">

            <button
              type="button"
              onClick={() => router.push("/chat")}
              className="rounded-lg border bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Chat
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Logout
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleUpload}
              className="hidden"
            />

            <button
              type="button"
              onClick={() =>
                fileInputRef.current?.click()
              }
              disabled={
                uploading ||
                deletingId !== null
              }
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading
                ? "Uploading..."
                : "Upload PDF"}
            </button>

            <button
              type="button"
              onClick={loadDocuments}
              disabled={
                loading ||
                uploading ||
                deletingId !== null
              }
              className="rounded-lg border bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Refresh
            </button>

          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-8">

        {message && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="text-sm text-green-700">
              {message}
            </p>
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-600">
              {error}
            </p>
          </div>
        )}

        {loading && (
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Loading documents...
            </p>
          </div>
        )}

        {!loading &&
          documents.length === 0 &&
          !error && (
            <div className="rounded-xl border bg-white p-10 text-center shadow-sm">

              <h2 className="text-lg font-semibold text-gray-900">
                No documents yet
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                Upload a PDF to start asking questions
                about your documents.
              </p>

            </div>
          )}

        {!loading &&
          documents.length > 0 && (
            <div className="space-y-3">

              {documents.map((document) => (
                <div
                  key={document.document_id}
                  className="flex flex-col gap-4 rounded-xl border bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >

                  <div className="flex min-w-0 items-center gap-4">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                      <span className="text-lg">
                        📄
                      </span>
                    </div>

                    <div className="min-w-0">

                      <h2 className="break-words text-sm font-medium text-gray-900">
                        {document.filename}
                      </h2>

                      <p className="mt-1 text-xs text-gray-500">
                        Document ID:{" "}
                        {document.document_id}
                      </p>

                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 sm:shrink-0">

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        document.status === "ready"
                          ? "bg-green-50 text-green-700"
                          : "bg-yellow-50 text-yellow-700"
                      }`}
                    >
                      {document.status}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        handleDelete(
                          document.document_id,
                          document.filename
                        )
                      }
                      disabled={
                        deletingId !== null ||
                        uploading
                      }
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingId ===
                      document.document_id
                        ? "Deleting..."
                        : "Delete"}
                    </button>

                  </div>
                </div>
              ))}

            </div>
          )}

      </section>
    </main>
  );
}