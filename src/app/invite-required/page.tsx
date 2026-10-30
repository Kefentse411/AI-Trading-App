"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import toast from "react-hot-toast";

export default function InviteRequiredPage() {
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!inviteCode.trim()) {
      toast.error("Please enter an invite code");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/validate-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          code: inviteCode.trim().toUpperCase(),
          email 
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Invalid invite code");
        return;
      }

      toast.success("Invite code validated! Completing registration...");
      
      // Redirect back to Google auth with invite code in session
      window.location.href = `/api/auth/signin/google?invite=${inviteCode.trim().toUpperCase()}`;
      
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#0a0a0f" }}
    >
      <div
        className="w-full max-w-md p-8 rounded-2xl"
        style={{
          background: "#11111a",
          border: "1px solid #22222a",
        }}
      >
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">🎟️</div>
          <h1 className="text-2xl font-bold" style={{ color: "#ffffff" }}>
            Invite Required
          </h1>
          <p className="mt-2 text-sm" style={{ color: "#a1a1aa" }}>
            This platform requires an invite code to join.
            {email && (
              <>
                <br />
                <span style={{ color: "#10b981" }}>{email}</span>
              </>
            )}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "#ffffff" }}>
              Invite Code
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="INV-XXXX-XXXX"
              maxLength={13}
              className="w-full px-4 py-3 rounded-xl text-center font-mono text-lg tracking-wider outline-none"
              style={{
                background: "#1a1a24",
                border: "2px solid #33333f",
                color: "#ffffff",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold transition-all"
            style={{
              background: loading ? "#666666" : "#10b981",
              color: "#ffffff",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Validating..." : "Continue with Invite"}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t text-center" style={{ borderColor: "#22222a" }}>
          <p className="text-xs" style={{ color: "#888888" }}>
            Don't have an invite code?{" "}
            <br />
            Contact an administrator for access.
          </p>
          
          <button
            onClick={() => router.push("/login")}
            className="mt-3 text-sm underline"
            style={{ color: "#a1a1aa" }}
          >
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}