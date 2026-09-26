"use client";

import { useState } from "react";

const consoleUrl = "https://dash.cloudflare.com/053c099ab7ba73f3093afa8f2456595b/workers/d1/databases/dca7f965-103c-48c3-81fd-c6e4ee08d430/console";

export default function OwnerSetup() {
  const [password, setPassword] = useState("");
  const [sql, setSql] = useState("");
  const [message, setMessage] = useState("");

  async function generate() {
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    const raw = String.fromCharCode(...bytes);
    const value = btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const hashBytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
    const hash = Array.from(hashBytes, byte => byte.toString(16).padStart(2, "0")).join("");
    setPassword(value);
    setSql(`UPDATE workspace_members SET code_hash='${hash}', failed_attempts=0, locked_until=NULL WHERE email='amalpradeep25@gmail.com';`);
    setMessage("Save this password before leaving the page. It is shown only here.");
  }

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(`${label} copied.`);
    } catch {
      setMessage(`Select and copy the ${label.toLowerCase()} manually.`);
    }
  }

  return <details className="rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5">
    <summary className="cursor-pointer text-lg font-medium">Amal: first-time password setup</summary>
    <p className="mt-3 text-sm text-[var(--prism-muted)]">This one-time step links your COMIT password to your Cloudflare database. Your password is generated in this browser. Keep it private.</p>
    <ol className="mt-4 list-inside list-decimal space-y-3 text-sm">
      <li>Click <strong>Generate my password</strong> and save it privately.</li>
      <li>Copy the SQL below into the <a className="text-violet-300 underline" href={consoleUrl} target="_blank" rel="noreferrer">Cloudflare D1 Console</a> and click <strong>Execute</strong>. The SQL contains only a password hash.</li>
      <li>Sign in here using <strong>amalpradeep25@gmail.com</strong> and your saved password.</li>
    </ol>
    <button type="button" onClick={() => void generate()} className="mt-5 rounded-xl bg-white px-4 py-2 text-sm font-medium text-black">Generate my password</button>
    {password && <div className="mt-5 space-y-4">
      <div><p className="text-xs text-amber-200">Your private password. Do not share it or paste it into chat.</p><code className="mt-2 block break-all rounded-xl border border-[var(--prism-border)] p-3 text-sm select-all">{password}</code><button type="button" onClick={() => void copy(password, "Password")} className="mt-2 text-sm text-violet-300 underline">Copy password</button></div>
      <div><p className="text-xs text-[var(--prism-muted)]">Database setup SQL</p><code className="mt-2 block break-all rounded-xl border border-[var(--prism-border)] p-3 text-xs select-all">{sql}</code><button type="button" onClick={() => void copy(sql, "SQL")} className="mt-2 text-sm text-violet-300 underline">Copy SQL</button></div>
    </div>}
    {message && <p role="status" className="mt-4 text-xs text-[var(--prism-muted)]">{message}</p>}
  </details>;
}

