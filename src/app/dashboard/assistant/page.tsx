"use client";

import { useState, useRef, useEffect } from "react";
import Lightfall from "@/components/Lightfall";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (messageText: string = input) => {
    if (!messageText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText }),
      });

      const data = await res.json();

      const replyText: string = res.ok
        ? data.reply
        : `⚠️ ${data.error || "Something went wrong. Please try again."}`;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: replyText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "⚠️ Failed to reach the assistant. Please check your connection and try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      console.error("[Assistant] request failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "relative",
        height: "calc(100vh - 140px)",
        // CHANGED: removed maxWidth: 1024px + margin: auto centering.
        // That hard cap was the main cause of the "windowed" look — a
        // fixed-width box floating with visible gaps on either side.
        // Now spans the full width of whatever this page's parent
        // container allows.
        width: "100%",
        overflow: "hidden",
        borderRadius: "0.75rem",
      }}
    >
      {/* Full-bleed animated background — sits behind everything else in this page only */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        <Lightfall
          colors={["#A6C8FF", "#5227FF", "#FF9FFC"]}
          backgroundColor="#0A29FF"
          speed={0.5}
          streakCount={2}
          streakWidth={1}
          streakLength={1}
          glow={1}
          density={0.6}
          twinkle={1}
          zoom={3}
          backgroundGlow={0.5}
          opacity={1}
          mouseInteraction
          mouseStrength={0.5}
          mouseRadius={1}
        />
      </div>

      {/* Foreground content — everything below sits above the shader */}
      <div
        className="h-full flex flex-col"
        style={{ position: "relative", zIndex: 1 }}
      >
        {/* Minimal Header */}
        <div className="mb-6 slide-in px-4 pt-2">
          <h1 className="text-2xl font-bold" style={{ color: "#ffffff" }}>
            Trading Assistant
          </h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.75)" }}>
            Chat with AI for market analysis and trading advice
          </p>
        </div>

        {/* Chat Container — glassmorphism, now spanning near-full width
            with a small margin instead of a hard maxWidth cap */}
        <div
          className="flex-1 rounded-xl border overflow-hidden flex flex-col mx-4 mb-4"
          style={{
            background: "rgba(255, 255, 255, 0.08)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderColor: "rgba(255, 255, 255, 0.18)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.25)",
          }}
        >
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="text-6xl mb-4">💬</div>
                <h2 className="text-xl font-semibold mb-2" style={{ color: "#ffffff" }}>
                  Start a conversation
                </h2>
                <p className="text-sm max-w-sm" style={{ color: "rgba(255,255,255,0.75)" }}>
                  Ask me about market trends, portfolio analysis, trading strategies, or risk management
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-fadeIn`}
                >
                  <div
                    className="max-w-2xl px-6 py-4 rounded-2xl"
                    style={{
                      background:
                        message.role === "user"
                          ? "rgba(59, 130, 246, 0.22)"
                          : "rgba(255, 255, 255, 0.12)",
                      backdropFilter: "blur(12px)",
                      WebkitBackdropFilter: "blur(12px)",
                      borderColor:
                        message.role === "user"
                          ? "rgba(59, 130, 246, 0.35)"
                          : "rgba(255, 255, 255, 0.2)",
                      border: "1px solid",
                      boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
                      color: "#ffffff",
                    }}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </p>
                  </div>
                </div>
              ))
            )}

            {isLoading && (
              <div className="flex justify-start">
                <div
                  className="px-6 py-4 rounded-2xl"
                  style={{
                    background: "rgba(255, 255, 255, 0.12)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                  }}
                >
                  <div className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-300 animate-bounce" />
                    <div
                      className="w-2 h-2 rounded-full bg-emerald-300 animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <div
                      className="w-2 h-2 rounded-full bg-emerald-300 animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div
            className="border-t p-6"
            style={{
              borderColor: "rgba(255, 255, 255, 0.15)",
              background: "rgba(255, 255, 255, 0.05)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
            }}
          >
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask anything about markets, trading, or analysis..."
                className="flex-1 px-4 py-3 rounded-lg border bg-transparent outline-none text-sm"
                style={{
                  background: "rgba(255, 255, 255, 0.06)",
                  borderColor: "rgba(255, 255, 255, 0.2)",
                  color: "#ffffff",
                }}
                disabled={isLoading}
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={isLoading || !input.trim()}
                className="px-6 py-3 rounded-lg font-semibold text-sm transition-all"
                style={{
                  background:
                    isLoading || !input.trim()
                      ? "rgba(59, 130, 246, 0.15)"
                      : "rgba(59, 130, 246, 0.4)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  color: "#ffffff",
                  cursor: isLoading || !input.trim() ? "not-allowed" : "pointer",
                  opacity: isLoading || !input.trim() ? 0.6 : 1,
                }}
              >
                {isLoading ? "..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}