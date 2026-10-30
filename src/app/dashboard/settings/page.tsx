"use client";

import { useState, useEffect } from "react";
import { Settings, Bell, Key, Sliders } from "lucide-react";
import { Copy, Check } from "lucide-react";

interface NotificationPreferences {
  emailNotifications: boolean;
  smsNotifications: boolean;
  bullishSignals: boolean;
  bearishSignals: boolean;
  riskAlerts: boolean;
  minConfidenceThreshold: number;
  emailAddress: string;
  phoneNumber: string;
}

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed?: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"account" | "notifications" | "api" | "preferences">("account");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Notification state
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    emailNotifications: true,
    smsNotifications: false,
    bullishSignals: true,
    bearishSignals: true,
    riskAlerts: true,
    minConfidenceThreshold: 0.5,
    emailAddress: "",
    phoneNumber: "",
  });

  // API state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);

  // Account state
  const [accountData, setAccountData] = useState({
    name: "",
    email: "",
    joinDate: "",
  });

  // Preferences state
  const [preferences, setPreferences] = useState({
    theme: "dark",
    language: "en",
    autoRefresh: true,
    refreshInterval: 30,
    timezone: "UTC",
  });

  useEffect(() => {
    if (activeTab === "notifications") {
      fetchNotificationPreferences();
    } else if (activeTab === "account") {
      fetchAccountData();
    } else if (activeTab === "api") {
      fetchApiKeys();
    }
  }, [activeTab]);

  // ============================================================================
  // NOTIFICATIONS TAB
  // ============================================================================

  const fetchNotificationPreferences = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications/preferences");
      const data = await res.json();
      setNotificationPrefs(data.preferences || notificationPrefs);
    } catch (error) {
      console.error("Failed to fetch notification preferences:", error);
      setMessage("❌ Failed to load notification preferences");
    } finally {
      setLoading(false);
    }
  };

  const saveNotificationPreferences = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notificationPrefs),
      });

      if (res.ok) {
        setMessage("✅ Notification preferences saved successfully!");
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("❌ Failed to save preferences");
      }
    } catch (error) {
      setMessage("❌ Error saving preferences");
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // ACCOUNT TAB
  // ============================================================================

  const fetchAccountData = async () => {
    setLoading(true);
    try {
      // This would typically fetch from your backend
      // For now, we'll use placeholder data
      setAccountData({
        name: "Your Name",
        email: "your@email.com",
        joinDate: new Date().toLocaleDateString(),
      });
    } catch (error) {
      console.error("Failed to fetch account data:", error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // API KEYS TAB
  // ============================================================================

  const fetchApiKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/account/api-keys");
      const data = await res.json();
      setApiKeys(data.keys || []);
    } catch (error) {
      console.error("Failed to fetch API keys:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = async () => {
    if (!newKeyName.trim()) {
      setMessage("❌ Please enter a key name");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/account/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName }),
      });

      if (res.ok) {
        const data = await res.json();
        setApiKeys([...apiKeys, data.key]);
        setNewKeyName("");
        setShowNewKeyForm(false);
        setMessage("✅ API key generated successfully!");
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("❌ Failed to generate API key");
      }
    } catch (error) {
      setMessage("❌ Error generating API key");
    } finally {
      setLoading(false);
    }
  };

  const deleteApiKey = async (id: string) => {
    if (!confirm("Are you sure you want to delete this API key?")) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/account/api-keys/${id}`, { method: "DELETE" });

      if (res.ok) {
        setApiKeys(apiKeys.filter((key) => key.id !== id));
        setMessage("✅ API key deleted successfully!");
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("❌ Failed to delete API key");
      }
    } catch (error) {
      setMessage("❌ Error deleting API key");
    } finally {
      setLoading(false);
    }
  };

  const copyApiKey = (key: string, id: string) => {
    navigator.clipboard.writeText(key);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ============================================================================
  // RENDER TABS
  // ============================================================================

  const tabs = [
    { id: "account", label: "Account", icon: Settings },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "api", label: "API Keys", icon: Key },
    { id: "preferences", label: "Preferences", icon: Sliders },
  ] as const;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div
        className="backdrop-blur-xl rounded-2xl p-8 border relative overflow-hidden transition-all duration-300 slide-in"
        style={{
          background: "var(--bg-glass)",
          borderColor: "var(--border-color)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
        }}
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-bl-full pointer-events-none" />

        <div className="relative z-10">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium uppercase tracking-wider mb-3"
            style={{
              borderColor: "rgba(99, 102, 241, 0.2)",
              background: "rgba(99, 102, 241, 0.05)",
              color: "#6366f1",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#6366f1" }} />
            User Settings
          </div>

          <h1 className="text-3xl font-extrabold" style={{ color: "var(--text-primary)" }}>
            Settings
          </h1>

          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Manage your account, notifications, API keys, and preferences.
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div
        className="flex gap-2 border-b overflow-x-auto"
        style={{ borderColor: "var(--border-color)" }}
      >
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-all duration-300 border-b-2 -mb-px whitespace-nowrap group"
            style={{
              borderColor: activeTab === id ? "var(--accent-blue)" : "transparent",
              color: activeTab === id ? "var(--accent-blue)" : "var(--text-muted)",
            }}
            onMouseEnter={(e) => {
              if (activeTab !== id) {
                (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== id) {
                (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
              }
            }}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </div>

      {/* Message Alert */}
      {message && (
        <div
          className="p-4 rounded-lg text-sm font-medium animate-in fade-in slide-in-from-top duration-300"
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

      {/* Tab Content */}
      <div
        className="backdrop-blur-xl rounded-xl p-8 border slide-in"
        style={{
          background: "var(--bg-glass)",
          borderColor: "var(--border-color)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
        }}
      >
        {/* ACCOUNT TAB */}
        {activeTab === "account" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
                Account Information
              </h2>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={accountData.name}
                    onChange={(e) => setAccountData({ ...accountData, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border text-sm"
                    style={{
                      background: "var(--bg-tertiary)",
                      borderColor: "var(--border-color)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={accountData.email}
                    disabled
                    className="w-full px-4 py-2 rounded-lg border text-sm opacity-50"
                    style={{
                      background: "var(--bg-tertiary)",
                      borderColor: "var(--border-color)",
                      color: "var(--text-primary)",
                    }}
                  />
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    Email cannot be changed. Contact support to update.
                  </p>
                </div>

                {/* Join Date */}
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
                    Member Since
                  </label>
                  <input
                    type="text"
                    value={accountData.joinDate}
                    disabled
                    className="w-full px-4 py-2 rounded-lg border text-sm opacity-50"
                    style={{
                      background: "var(--bg-tertiary)",
                      borderColor: "var(--border-color)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div
              className="p-4 rounded-lg border"
              style={{
                background: "rgba(239, 68, 68, 0.05)",
                borderColor: "rgba(239, 68, 68, 0.15)",
              }}
            >
              <h3 className="text-lg font-bold mb-2" style={{ color: "#ef4444" }}>
                Danger Zone
              </h3>
              <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
                Permanently delete your account and all associated data.
              </p>
              <button
                className="px-4 py-2 rounded-lg font-semibold text-sm transition-all"
                style={{
                  background: "#ef4444",
                  color: "white",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.opacity = "0.9";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.opacity = "1";
                }}
              >
                Delete Account
              </button>
            </div>
          </div>
        )}

        {/* NOTIFICATIONS TAB */}
        {activeTab === "notifications" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>
                Notification Preferences
              </h2>

              {/* Email Section */}
              <div
                className="p-6 rounded-lg border mb-6"
                style={{
                  background: "var(--bg-tertiary)",
                  borderColor: "var(--border-color)",
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <Bell size={20} style={{ color: "var(--accent-blue)" }} />
                  <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                    Email Notifications
                  </h3>
                </div>

                <div className="space-y-4">
                  {/* Email toggle */}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationPrefs.emailNotifications}
                      onChange={(e) =>
                        setNotificationPrefs({
                          ...notificationPrefs,
                          emailNotifications: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded"
                    />
                    <span style={{ color: "var(--text-secondary)" }}>
                      Send email notifications for new signals
                    </span>
                  </label>

                  {/* Email address */}
                  {notificationPrefs.emailNotifications && (
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={notificationPrefs.emailAddress}
                      onChange={(e) =>
                        setNotificationPrefs({
                          ...notificationPrefs,
                          emailAddress: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 rounded-lg border text-sm"
                      style={{
                        background: "var(--bg-secondary)",
                        borderColor: "var(--border-color)",
                        color: "var(--text-primary)",
                      }}
                    />
                  )}

                  {/* Signal preferences */}
                  {notificationPrefs.emailNotifications && (
                    <div className="space-y-3 pt-4 border-t" style={{ borderColor: "var(--border-color)" }}>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationPrefs.bullishSignals}
                          onChange={(e) =>
                            setNotificationPrefs({
                              ...notificationPrefs,
                              bullishSignals: e.target.checked,
                            })
                          }
                          className="w-4 h-4 rounded"
                        />
                        <span style={{ color: "var(--text-secondary)" }}>📈 Bullish signals</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationPrefs.bearishSignals}
                          onChange={(e) =>
                            setNotificationPrefs({
                              ...notificationPrefs,
                              bearishSignals: e.target.checked,
                            })
                          }
                          className="w-4 h-4 rounded"
                        />
                        <span style={{ color: "var(--text-secondary)" }}>📉 Bearish signals</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationPrefs.riskAlerts}
                          onChange={(e) =>
                            setNotificationPrefs({
                              ...notificationPrefs,
                              riskAlerts: e.target.checked,
                            })
                          }
                          className="w-4 h-4 rounded"
                        />
                        <span style={{ color: "var(--text-secondary)" }}>⚠️ Risk alerts</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* SMS Section */}
              <div
                className="p-6 rounded-lg border mb-6"
                style={{
                  background: "var(--bg-tertiary)",
                  borderColor: "var(--border-color)",
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <Bell size={20} style={{ color: "#10b981" }} />
                  <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                    SMS Notifications
                  </h3>
                </div>

                <div className="space-y-4">
                  {/* SMS toggle */}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationPrefs.smsNotifications}
                      onChange={(e) =>
                        setNotificationPrefs({
                          ...notificationPrefs,
                          smsNotifications: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded"
                    />
                    <span style={{ color: "var(--text-secondary)" }}>
                      Send SMS notifications for new signals
                    </span>
                  </label>

                  {/* Phone number */}
                  {notificationPrefs.smsNotifications && (
                    <input
                      type="tel"
                      placeholder="+1234567890"
                      value={notificationPrefs.phoneNumber}
                      onChange={(e) =>
                        setNotificationPrefs({
                          ...notificationPrefs,
                          phoneNumber: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 rounded-lg border text-sm"
                      style={{
                        background: "var(--bg-secondary)",
                        borderColor: "var(--border-color)",
                        color: "var(--text-primary)",
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Confidence Threshold */}
              <div
                className="p-6 rounded-lg border"
                style={{
                  background: "var(--bg-tertiary)",
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
                    value={notificationPrefs.minConfidenceThreshold}
                    onChange={(e) =>
                      setNotificationPrefs({
                        ...notificationPrefs,
                        minConfidenceThreshold: parseFloat(e.target.value),
                      })
                    }
                    className="flex-1 cursor-pointer"
                  />
                  <span
                    className="font-bold text-lg min-w-[60px] text-right"
                    style={{ color: "var(--accent-blue)" }}
                  >
                    {(notificationPrefs.minConfidenceThreshold * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={saveNotificationPreferences}
              disabled={loading}
              className="w-full px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, var(--accent-blue), var(--accent-purple))",
                color: "white",
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    "0 8px 20px rgba(59, 130, 246, 0.3)";
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
              }}
            >
              {loading ? "Saving..." : "Save Preferences"}
            </button>
          </div>
        )}

        {/* API KEYS TAB */}
        {activeTab === "api" && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                    API Keys
                  </h2>
                  <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                    Manage your API keys for programmatic access
                  </p>
                </div>
                <button
                  onClick={() => setShowNewKeyForm(!showNewKeyForm)}
                  className="px-4 py-2 rounded-lg font-semibold text-sm transition-all"
                  style={{
                    background: "rgba(59, 130, 246, 0.1)",
                    color: "var(--accent-blue)",
                    border: "1px solid rgba(59, 130, 246, 0.2)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "rgba(59, 130, 246, 0.2)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "rgba(59, 130, 246, 0.1)";
                  }}
                >
                  {showNewKeyForm ? "Cancel" : "Generate New Key"}
                </button>
              </div>

              {/* New Key Form */}
              {showNewKeyForm && (
                <div
                  className="p-4 rounded-lg border mb-6"
                  style={{
                    background: "rgba(59, 130, 246, 0.05)",
                    borderColor: "rgba(59, 130, 246, 0.15)",
                  }}
                >
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Enter key name (e.g., Production API)"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      className="flex-1 px-4 py-2 rounded-lg border text-sm"
                      style={{
                        background: "var(--bg-secondary)",
                        borderColor: "var(--border-color)",
                        color: "var(--text-primary)",
                      }}
                    />
                    <button
                      onClick={generateApiKey}
                      disabled={loading}
                      className="px-4 py-2 rounded-lg font-semibold text-sm transition-all disabled:opacity-50"
                      style={{
                        background: "var(--accent-blue)",
                        color: "white",
                      }}
                      onMouseEnter={(e) => {
                        if (!loading) {
                          (e.currentTarget as HTMLElement).style.opacity = "0.9";
                        }
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.opacity = "1";
                      }}
                    >
                      {loading ? "Generating..." : "Generate"}
                    </button>
                  </div>
                </div>
              )}

              {/* API Keys List */}
              <div className="space-y-3">
                {apiKeys.length === 0 ? (
                  <div
                    className="p-6 rounded-lg border text-center"
                    style={{
                      background: "var(--bg-tertiary)",
                      borderColor: "var(--border-color)",
                    }}
                  >
                    <p style={{ color: "var(--text-muted)" }}>No API keys generated yet</p>
                  </div>
                ) : (
                  apiKeys.map((key) => (
                    <div
                      key={key.id}
                      className="p-4 rounded-lg border flex items-center justify-between group hover:border-blue-500/30 transition-all"
                      style={{
                        background: "var(--bg-tertiary)",
                        borderColor: "var(--border-color)",
                      }}
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                          {key.name}
                        </p>
                        <p className="text-xs mt-1 font-mono" style={{ color: "var(--text-muted)" }}>
                          {key.key.substring(0, 10)}...{key.key.substring(key.key.length - 10)}
                        </p>
                        <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                          Created: {new Date(key.createdAt).toLocaleDateString()}
                          {key.lastUsed && ` • Last used: ${new Date(key.lastUsed).toLocaleDateString()}`}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => copyApiKey(key.key, key.id)}
                          className="p-2 rounded-lg transition-all"
                          style={{
                            background: "rgba(59, 130, 246, 0.1)",
                            color: "var(--accent-blue)",
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.background =
                              "rgba(59, 130, 246, 0.2)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background =
                              "rgba(59, 130, 246, 0.1)";
                          }}
                        >
                          {copiedId === key.id ? (
                            <Check size={16} />
                          ) : (
                            <Copy size={16} />
                          )}
                        </button>
                        <button
                          onClick={() => deleteApiKey(key.id)}
                          className="p-2 rounded-lg transition-all"
                          style={{
                            background: "rgba(239, 68, 68, 0.1)",
                            color: "#ef4444",
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.background =
                              "rgba(239, 68, 68, 0.2)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background =
                              "rgba(239, 68, 68, 0.1)";
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* PREFERENCES TAB */}
        {activeTab === "preferences" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>
                User Preferences
              </h2>

              <div className="space-y-6">
                {/* Theme */}
                <div>
                  <label className="block text-sm font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>
                    Theme
                  </label>
                  <div className="flex gap-3">
                    {["light", "dark", "auto"].map((option) => (
                      <button
                        key={option}
                        onClick={() => setPreferences({ ...preferences, theme: option as any })}
                        className="px-4 py-2 rounded-lg border transition-all capitalize text-sm font-semibold"
                        style={{
                          background:
                            preferences.theme === option
                              ? "rgba(59, 130, 246, 0.2)"
                              : "var(--bg-tertiary)",
                          borderColor:
                            preferences.theme === option
                              ? "rgba(59, 130, 246, 0.3)"
                              : "var(--border-color)",
                          color:
                            preferences.theme === option
                              ? "var(--accent-blue)"
                              : "var(--text-secondary)",
                        }}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language */}
                <div>
                  <label className="block text-sm font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>
                    Language
                  </label>
                  <select
                    value={preferences.language}
                    onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border text-sm"
                    style={{
                      background: "var(--bg-tertiary)",
                      borderColor: "var(--border-color)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                  </select>
                </div>

                {/* Timezone */}
                <div>
                  <label className="block text-sm font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>
                    Timezone
                  </label>
                  <select
                    value={preferences.timezone}
                    onChange={(e) => setPreferences({ ...preferences, timezone: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border text-sm"
                    style={{
                      background: "var(--bg-tertiary)",
                      borderColor: "var(--border-color)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <option value="UTC">UTC</option>
                    <option value="EST">Eastern Time (EST)</option>
                    <option value="CST">Central Time (CST)</option>
                    <option value="MST">Mountain Time (MST)</option>
                    <option value="PST">Pacific Time (PST)</option>
                    <option value="GMT">GMT</option>
                  </select>
                </div>

                {/* Auto Refresh */}
                <div>
                  <label className="flex items-center gap-3 cursor-pointer mb-3">
                    <input
                      type="checkbox"
                      checked={preferences.autoRefresh}
                      onChange={(e) =>
                        setPreferences({ ...preferences, autoRefresh: e.target.checked })
                      }
                      className="w-4 h-4 rounded"
                    />
                    <span style={{ color: "var(--text-secondary)" }}>
                      Auto-refresh dashboard data
                    </span>
                  </label>

                  {preferences.autoRefresh && (
                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
                        Refresh Interval (seconds)
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="10"
                          max="300"
                          step="10"
                          value={preferences.refreshInterval}
                          onChange={(e) =>
                            setPreferences({
                              ...preferences,
                              refreshInterval: parseInt(e.target.value),
                            })
                          }
                          className="flex-1 cursor-pointer"
                        />
                        <span
                          className="font-bold min-w-[50px] text-right"
                          style={{ color: "var(--accent-blue)" }}
                        >
                          {preferences.refreshInterval}s
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={() => {
                setMessage("✅ Preferences saved successfully!");
                setTimeout(() => setMessage(""), 3000);
              }}
              className="w-full px-6 py-3 rounded-lg font-semibold transition-all"
              style={{
                background: "linear-gradient(135deg, var(--accent-blue), var(--accent-purple))",
                color: "white",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLElement).style.boxShadow =
                  "0 8px 20px rgba(59, 130, 246, 0.3)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
              }}
            >
              Save Preferences
            </button>
          </div>
        )}
      </div>
    </div>
  );
}