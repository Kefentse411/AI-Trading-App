"use client";

import { useState, useEffect } from "react";
import { Bell, Envelope, Phone } from "lucide-react";

export default function NotificationSettings() {
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    smsNotifications: false,
    bullishSignals: true,
    bearishSignals: true,
    riskAlerts: true,
    minConfidenceThreshold: 0.5,
    emailAddress: "",
    phoneNumber: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const res = await fetch("/api/notifications/preferences");
      const data = await res.json();
      setPreferences(data.preferences);
    } catch (error) {
      console.error("Failed to fetch preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });

      if (res.ok) {
        setMessage("✅ Preferences saved successfully!");
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("❌ Failed to save preferences");
      }
    } catch (error) {
      setMessage("❌ Error saving preferences");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ color: "var(--text-secondary)" }}>Loading preferences...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Bell size={28} />
          Notification Settings
        </h2>
        <p style={{ color: "var(--text-secondary)" }} className="text-sm mt-1">
          Choose how you want to be notified about trading signals
        </p>
      </div>

      {/* Email Section */}
      <div
        className="p-6 rounded-xl border"
        style={{
          background: "var(--bg-glass)",
          borderColor: "var(--border-color)",
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Envelope size={20} style={{ color: "var(--accent-blue)" }} />
          <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            Email Notifications
          </h3>
        </div>

        <div className="space-y-4">
          {/* Email toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.emailNotifications}
              onChange={(e) =>
                setPreferences({ ...preferences, emailNotifications: e.target.checked })
              }
              className="w-4 h-4 rounded"
            />
            <span style={{ color: "var(--text-secondary)" }}>
              Send email notifications for new signals
            </span>
          </label>

          {/* Email address */}
          {preferences.emailNotifications && (
            <input
              type="email"
              placeholder="your@email.com"
              value={preferences.emailAddress}
              onChange={(e) =>
                setPreferences({ ...preferences, emailAddress: e.target.value })
              }
              className="w-full px-4 py-2 rounded-lg border text-sm"
              style={{
                background: "var(--bg-tertiary)",
                borderColor: "var(--border-color)",
                color: "var(--text-primary)",
              }}
            />
          )}

          {/* Signal type preferences */}
          <div className="space-y-3 pt-4 border-t" style={{ borderColor: "var(--border-color)" }}>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.bullishSignals}
                onChange={(e) =>
                  setPreferences({ ...preferences, bullishSignals: e.target.checked })
                }
                className="w-4 h-4 rounded"
              />
              <span style={{ color: "var(--text-secondary)" }}>📈 Bullish signals</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.bearishSignals}
                onChange={(e) =>
                  setPreferences({ ...preferences, bearishSignals: e.target.checked })
                }
                className="w-4 h-4 rounded"
              />
              <span style={{ color: "var(--text-secondary)" }}>📉 Bearish signals</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.riskAlerts}
                onChange={(e) =>
                  setPreferences({ ...preferences, riskAlerts: e.target.checked })
                }
                className="w-4 h-4 rounded"
              />
              <span style={{ color: "var(--text-secondary)" }}>⚠️ Risk alerts</span>
            </label>
          </div>
        </div>
      </div>

      {/* SMS Section */}
      <div
        className="p-6 rounded-xl border"
        style={{
          background: "var(--bg-glass)",
          borderColor: "var(--border-color)",
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Phone size={20} style={{ color: "#10b981" }} />
          <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            SMS Notifications
          </h3>
        </div>

        <div className="space-y-4">
          {/* SMS toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.smsNotifications}
              onChange={(e) =>
                setPreferences({ ...preferences, smsNotifications: e.target.checked })
              }
              className="w-4 h-4 rounded"
            />
            <span style={{ color: "var(--text-secondary)" }}>
              Send SMS notifications for new signals
            </span>
          </label>

          {/* Phone number */}
          {preferences.smsNotifications && (
            <input
              type="tel"
              placeholder="+1234567890"
              value={preferences.phoneNumber}
              onChange={(e) =>
                setPreferences({ ...preferences, phoneNumber: e.target.value })
              }
              className="w-full px-4 py-2 rounded-lg border text-sm"
              style={{
                background: "var(--bg-tertiary)",
                borderColor: "var(--border-color)",
                color: "var(--text-primary)",
              }}
            />
          )}
        </div>
      </div>

      {/* Confidence Threshold */}
      <div
        className="p-6 rounded-xl border"
        style={{
          background: "var(--bg-glass)",
          borderColor: "var(--border-color)",
        }}
      >
        <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Signal Confidence Threshold
        </h3>
        <p style={{ color: "var(--text-secondary)" }} className="text-sm mb-4">
          Only notify me for signals with at least this confidence level
        </p>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={preferences.minConfidenceThreshold}
            onChange={(e) =>
              setPreferences({
                ...preferences,
                minConfidenceThreshold: parseFloat(e.target.value),
              })
            }
            className="flex-1"
          />
          <span
            className="font-bold text-lg"
            style={{ color: "var(--accent-blue)" }}
          >
            {(preferences.minConfidenceThreshold * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className="p-4 rounded-lg text-sm font-medium"
          style={{
            background: message.includes("✅")
              ? "rgba(16, 185, 129, 0.1)"
              : "rgba(239, 68, 68, 0.1)",
            color: message.includes("✅") ? "#10b981" : "#ef4444",
            borderLeft: `3px solid ${message.includes("✅") ? "#10b981" : "#ef4444"}`,
          }}
        >
          {message}
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50"
        style={{
          background: "linear-gradient(135deg, var(--accent-blue), var(--accent-purple))",
          color: "white",
        }}
        onMouseEnter={(e) => {
          if (!saving) {
            (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
            (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 20px rgba(59, 130, 246, 0.3)";
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
          (e.currentTarget as HTMLElement).style.boxShadow = "none";
        }}
      >
        {saving ? "Saving..." : "Save Preferences"}
      </button>
    </div>
  );
}