import { useState, useEffect } from "react";
import { getConfig, saveConfig, testConnection } from "@/lib/api-client";

export function App() {
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "testing" | "connected" | "failed">("idle");

  useEffect(() => {
    getConfig().then((config) => {
      if (config) {
        setApiUrl(config.apiUrl);
        setApiKey(config.apiKey);
      }
    });
  }, []);

  const handleSave = async () => {
    setStatus("saving");
    await saveConfig({ apiUrl, apiKey });
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2000);
  };

  const handleTest = async () => {
    setStatus("testing");
    // Save first so testConnection uses latest values
    await saveConfig({ apiUrl, apiKey });
    const ok = await testConnection();
    setStatus(ok ? "connected" : "failed");
    setTimeout(() => setStatus("idle"), 3000);
  };

  return (
    <div className="options">
      <h1>Focus Reader Settings</h1>

      <label>
        API URL
        <input
          type="url"
          value={apiUrl}
          onChange={(e) => setApiUrl(e.target.value)}
          placeholder="https://your-focus-reader.example.com"
        />
      </label>

      <label>
        API Key
        <div className="key-input">
          <input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Your API key"
          />
          <button type="button" className="toggle-key" onClick={() => setShowKey(!showKey)}>
            {showKey ? "Hide" : "Show"}
          </button>
        </div>
      </label>

      <div className="actions">
        <button onClick={handleSave} disabled={status === "saving"}>
          {status === "saving" ? "Saving..." : status === "saved" ? "Saved!" : "Save"}
        </button>
        <button onClick={handleTest} disabled={status === "testing" || !apiUrl || !apiKey}>
          {status === "testing" ? "Testing..." : "Test Connection"}
        </button>
      </div>

      {status === "connected" && <p className="status success">Connected successfully!</p>}
      {status === "failed" && <p className="status error">Connection failed. Check your URL and API key.</p>}
    </div>
  );
}
