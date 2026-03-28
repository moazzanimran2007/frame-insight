import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const VIDEO_CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/video-chat`;

interface VoiceAgentProps {
  frameDescriptions: string[];
}

type ConversationEntry = {
  role: "user" | "assistant";
  text: string;
};

const SpeechRecognitionAPI =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export default function VoiceAgent({ frameDescriptions }: VoiceAgentProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const transcriptRef = useRef("");
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef(window.speechSynthesis);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const supported = !!SpeechRecognitionAPI;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation]);

  const speak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      // Try to pick a natural-sounding voice
      const voices = synthRef.current.getVoices();
      const preferred = voices.find(
        (v) => v.lang.startsWith("en") && v.name.toLowerCase().includes("natural")
      ) || voices.find(
        (v) => v.lang.startsWith("en") && !v.name.toLowerCase().includes("compact")
      );
      if (preferred) utterance.voice = preferred;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        resolve();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        resolve();
      };
      synthRef.current.speak(utterance);
    });
  }, []);

  const getAIResponse = useCallback(
    async (userText: string, history: ConversationEntry[]): Promise<string> => {
      const controller = new AbortController();
      abortRef.current = controller;

      const messages = [
        ...history.map((e) => ({ role: e.role, content: e.text })),
        { role: "user" as const, content: userText },
      ];

      const resp = await fetch(VIDEO_CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages, frameDescriptions }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || `Error ${resp.status}`);
      }
      if (!resp.body) throw new Error("No response stream");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nlIdx: number;
        while ((nlIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nlIdx);
          buffer = buffer.slice(nlIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) fullText += content;
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      return fullText;
    },
    [frameDescriptions]
  );

  const startListening = useCallback(() => {
    if (!supported) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }

    synthRef.current.cancel();
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      const results = Array.from(event.results as SpeechRecognitionResultList);
      const text = results.map((r: any) => r[0].transcript).join("");
      setTranscript(text);
      transcriptRef.current = text;
    };

    recognition.onend = async () => {
      setIsListening(false);
      const finalText = transcript || "";
      // We need to get the transcript from the latest state
      // Use a small trick: read from the DOM or the ref
    };

    recognition.onerror = (e: any) => {
      setIsListening(false);
      if (e.error !== "no-speech") {
        toast.error(`Mic error: ${e.error}`);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setTranscript("");
  }, [supported, transcript]);

  const stopAndProcess = useCallback(async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);

    // Wait a tick for final transcript
    await new Promise((r) => setTimeout(r, 200));

    const userText = transcript.trim();
    if (!userText) return;

    const updatedConvo = [...conversation, { role: "user" as const, text: userText }];
    setConversation(updatedConvo);
    setTranscript("");
    setIsThinking(true);

    try {
      const response = await getAIResponse(userText, conversation);
      const finalConvo = [...updatedConvo, { role: "assistant" as const, text: response }];
      setConversation(finalConvo);
      setIsThinking(false);
      await speak(response);
    } catch (e) {
      setIsThinking(false);
      const msg = e instanceof Error ? e.message : "Failed to get response";
      toast.error(msg);
    }
  }, [transcript, conversation, getAIResponse, speak]);

  const stopEverything = useCallback(() => {
    synthRef.current.cancel();
    if (recognitionRef.current) recognitionRef.current.stop();
    if (abortRef.current) abortRef.current.abort();
    setIsListening(false);
    setIsSpeaking(false);
    setIsThinking(false);
  }, []);

  const statusText = isListening
    ? "Listening…"
    : isThinking
    ? "Thinking…"
    : isSpeaking
    ? "Speaking…"
    : "Tap the mic to ask about this video";

  return (
    <section className="max-w-[960px] mx-auto px-7 pb-8" aria-label="Voice assistant">
      <div className="border border-border rounded-2xl overflow-hidden bg-background shadow-lg">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center gap-2.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-accent-foreground">
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" stroke="currentColor" strokeWidth="1.5" />
            <path d="M19 10v2a7 7 0 01-14 0v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M12 19v4M8 23h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <h3 className="text-[14px] font-medium text-foreground font-mono">
            Voice Assistant
          </h3>
          <span className="ml-auto text-[10px] font-mono text-muted-foreground">
            accessibility mode
          </span>
        </div>

        {/* Conversation log */}
        <div ref={scrollRef} className="max-h-[200px] overflow-y-auto p-4 space-y-2">
          {conversation.map((entry, i) => (
            <div
              key={i}
              className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-[13px] leading-relaxed ${
                  entry.role === "user"
                    ? "bg-foreground text-background rounded-br-sm"
                    : "bg-secondary text-secondary-foreground rounded-bl-sm"
                }`}
              >
                {entry.text}
              </div>
            </div>
          ))}
          {isThinking && (
            <div className="flex justify-start">
              <div className="bg-secondary rounded-xl rounded-bl-sm px-3.5 py-2.5">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Live transcript */}
        <AnimatePresence>
          {transcript && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 pb-2"
            >
              <div className="text-[12px] text-muted-foreground font-mono italic bg-secondary/50 rounded-lg px-3 py-2">
                "{transcript}"
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls */}
        <div className="px-4 py-4 border-t border-border flex flex-col items-center gap-3">
          <p className="text-[12px] text-muted-foreground font-mono" aria-live="polite">
            {statusText}
          </p>

          <div className="flex items-center gap-3">
            {/* Main mic button */}
            <button
              onClick={isListening ? stopAndProcess : startListening}
              disabled={isThinking || isSpeaking}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
                isListening
                  ? "bg-destructive text-destructive-foreground animate-pulse scale-110"
                  : "bg-foreground text-background hover:scale-105"
              } disabled:opacity-40 disabled:scale-100`}
              aria-label={isListening ? "Stop listening and send" : "Start listening"}
            >
              {isListening ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                  <path d="M19 10v2a7 7 0 01-14 0v-2" strokeLinecap="round" />
                  <path d="M12 19v4M8 23h8" strokeLinecap="round" />
                </svg>
              )}
            </button>

            {/* Stop speaking button */}
            {isSpeaking && (
              <button
                onClick={stopEverything}
                className="w-10 h-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center hover:bg-secondary/80 transition-colors"
                aria-label="Stop speaking"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>

          {!supported && (
            <p className="text-[11px] text-destructive font-mono">
              Speech recognition is not supported in this browser. Try Chrome or Edge.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
