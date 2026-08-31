"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignup(event: React.FormEvent) {
    event.preventDefault();

    if (
      !companyName.trim() ||
      !email.trim() ||
      !password.trim()
    ) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/auth/signup",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            company_name: companyName.trim(),
            email: email.trim(),
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Signup failed");
      }

      if (data.access_token) {
        localStorage.setItem("token", data.access_token);
        router.push("/chat");
      } else {
        router.push("/login");
      }
    } catch (err) {
      console.error("Signup error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "450px",
        }}
      >
        <h1
          className="font-serif"
          style={{
            fontSize: "26px",
            fontWeight: 500,
            marginBottom: "8px",
          }}
        >
          DocQuery
        </h1>

        <p
          style={{
            color: "var(--color-taupe)",
            fontSize: "14px",
            marginBottom: "32px",
          }}
        >
          Create your DocQuery account
        </p>

        {error && (
          <div
            style={{
              marginBottom: "16px",
              padding: "10px 12px",
              border: "1px solid #f0b4b4",
              borderRadius: "6px",
              background: "#fff5f5",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "var(--color-error)",
                fontSize: "13px",
              }}
            >
              {error}
            </p>
          </div>
        )}

        <form onSubmit={handleSignup}>
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                fontSize: "13px",
                color: "var(--color-muted-text)",
                display: "block",
                marginBottom: "6px",
              }}
            >
              Company name
            </label>

            <input
              type="text"
              value={companyName}
              onChange={(event) =>
                setCompanyName(event.target.value)
              }
              placeholder="Enter company name"
              required
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "10px 12px",
                border: "1px solid var(--color-border)",
                borderRadius: "6px",
                fontSize: "14px",
                background: "white",
              }}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                fontSize: "13px",
                color: "var(--color-muted-text)",
                display: "block",
                marginBottom: "6px",
              }}
            >
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="Enter your email"
              required
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "10px 12px",
                border: "1px solid var(--color-border)",
                borderRadius: "6px",
                fontSize: "14px",
                background: "white",
              }}
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label
              style={{
                fontSize: "13px",
                color: "var(--color-muted-text)",
                display: "block",
                marginBottom: "6px",
              }}
            >
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Create a password"
              required
              minLength={6}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "10px 12px",
                border: "1px solid var(--color-border)",
                borderRadius: "6px",
                fontSize: "14px",
                background: "white",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px",
              background: "var(--color-forest)",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <p
          style={{
            marginTop: "24px",
            textAlign: "center",
            fontSize: "14px",
            color: "var(--color-muted-text)",
          }}
        >
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => router.push("/login")}
            style={{
              border: "none",
              background: "transparent",
              padding: 0,
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Sign in
          </button>
        </p>
      </div>
    </main>
  );
}