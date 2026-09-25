"use client";

import { FormEvent, useState } from "react";
import { Mic, Send, Volume2 } from "lucide-react";
import { buildBusinessResponse } from "@/lib/ai-system";

type RecognitionResult = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type Recognition = { lang: string; interimResults: boolean; maxAlternatives: number; onresult: ((event: RecognitionResult) => void) | null; onerror: (() => void) | null; start(): void };
type RecognitionConstructor = new () => Recognition;
type KokoroEngine = { generate(text: string, options: { voice: string }): Promise<{ toBlob(): Blob }> };
type KokoroModule = { KokoroTTS: { from_pretrained(model: string, options: { device: string; dtype: string }): Promise<KokoroEngine> } };
let kokoro: Promise<KokoroEngine> | undefined;

async function loadKokoro() {
  if (!kokoro) {
    kokoro = (async () => {
      const url = "https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm";
      const { KokoroTTS } = await import(/* webpackIgnore: true */ url) as unknown as KokoroModule;
      if ("gpu" in navigator) {
        try { return await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { device: "webgpu", dtype: "fp32" }); }
        catch { /* WebGPU support varies; use local WebAssembly below. */ }
      }
      return KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { device: "wasm", dtype: "q8" });
    })().catch((error) => { kokoro = undefined; throw error; });
  }
  return kokoro;
}

export default function ComitAssistant() {
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState<ReturnType<typeof buildBusinessResponse> | null>(null);
  const [status, setStatus] = useState("");

  function ask(event: FormEvent) {
    event.preventDefault();
    const request = message.trim();
    if (!request) {
      setStatus("Enter a business goal or question first.");
      return;
    }
    setReply(buildBusinessResponse(request));
    setStatus("Generated locally in this browser. No external service was called.");
  }

  function listen() {
    const w = window as Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus("Speech recognition is unavailable in this browser. Type your request instead.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = navigator.language || "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => { setMessage(event.results[0][0].transcript); setStatus("Voice input ready. Review it, then choose Ask locally."); };
    recognition.onerror = () => setStatus("Microphone input failed. Check browser permission or type your request.");
    setStatus("Listening…");
    recognition.start();
  }

  function speak() {
    if (!reply) return;
    const text = `${reply.recommendation.experiment}. Next step: ${reply.recommendation.steps[0]}`;
    setStatus("Loading the local Kokoro model. First use downloads model files to this browser.");
    void loadKokoro().then(async (tts) => {
      const audio = await tts.generate(text, { voice: "af_heart" });
      const player = new Audio(URL.createObjectURL(audio.toBlob()));
      player.onended = () => URL.revokeObjectURL(player.src);
      await player.play();
      setStatus("Speaking with Kokoro in this browser.");
    }).catch(() => {
      if (!("speechSynthesis" in window)) { setStatus("Speech playback is unavailable. You can still read the response."); return; }
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
      setStatus("Kokoro did not load. Using this browser’s built-in speech voice.");
    });
  }

  return <section aria-labelledby="assistant-title" className="mt-5 rounded-2xl border border-[var(--prism-border)] bg-[var(--prism-surface)] p-5">
    <h2 id="assistant-title" className="font-medium">COMIT assistant</h2>
    <p className="mt-1 text-xs text-[var(--prism-muted)]">Deterministic business guidance runs in this browser. It does not call an AI provider or upload your request.</p>
    <form onSubmit={ask} className="mt-4 flex flex-wrap gap-2">
      <label className="sr-only" htmlFor="comit-question">Ask COMIT</label>
      <input id="comit-question" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="What business outcome are you working toward?" className="min-w-0 flex-1 rounded-xl border border-[var(--prism-border)] bg-transparent px-3 py-2 text-sm" />
      <button type="button" onClick={listen} className="inline-flex items-center gap-2 rounded-xl border border-[var(--prism-border)] px-3 py-2 text-sm"><Mic size={15}/> Voice input</button>
      <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-black"><Send size={15}/> Ask locally</button>
    </form>
    {status && <p role="status" className="mt-3 text-xs text-[var(--prism-muted)]">{status}</p>}
    {reply && <div className="mt-4 rounded-xl border border-[var(--prism-border)] p-4"><p className="text-sm">{reply.recommendation.experiment}</p><p className="mt-2 text-sm">Opportunity: {reply.recommendation.kpi}</p><p className="mt-2 text-xs text-[var(--prism-muted)]">Next: {reply.recommendation.steps[0]}</p><button type="button" onClick={speak} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[var(--prism-border)] px-3 py-2 text-xs"><Volume2 size={14}/> Read aloud</button></div>}
  </section>;
}
