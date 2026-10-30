"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function CheckEmailPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

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
        <div className="text-center">
          <div className="text-6xl mb-6">📬</div>
          
          <h1 className="text-2xl font-bold mb-4" style={{ color: "#ffffff" }}>
            Check your email
          </h1>
          
          <p className="text-sm mb-6" style={{ color: "#a1a1aa" }}>
            We've sent a magic link to:
          </p>
          
          {email && (
            <div 
              className="p-3 rounded-lg mb-6 font-mono text-sm"
              style={{ background: "#1a1a24", border: "1px solid #33333f" }}
            >
              <span style={{ color: "#10b981" }}>{email}</span>
            </div>
          )}
          
          <p className="text-sm mb-8" style={{ color: "#a1a1aa" }}>
            Click the link in the email to sign in. The link will expire in <strong style={{ color: "#ffffff" }}>15 minutes</strong>.
          </p>

          <div 
            className="p-4 rounded-lg mb-6"
            style={{ background: "#1a1a24", border: "1px solid #33333f" }}
          >
            <h3 className="text-sm font-semibold mb-2" style={{ color: "#ffffff" }}>
              Didn't receive the email?
            </h3>
            <ul className="text-xs space-y-1" style={{ color: "#888888" }}>
              <li>• Check your spam/junk folder</li>
              <li>• Make sure the email address is correct</li>
              <li>• Wait a few minutes for delivery</li>
            </ul>
          </div>
          
          <Link
            href="/login"
            className="inline-block w-full py-3 rounded-xl font-semibold transition-all text-center"
            style={{
              background: "#1a1a24",
              border: "1px solid #33333f",
              color: "#a1a1aa",
            }}
          >
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}