import { useMemo, useCallback } from "react";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type ChatModelAdapter,
  ThreadPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  BranchPickerPrimitive,
} from "@assistant-ui/react";
import ReactMarkdown from "react-markdown";

const VIDEO_CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/video-chat`;

const STARTER_QUESTIONS = [
  "What is this video about?",
  "Describe what happens step by step",
  "Is there any text visible in the video?",
];

interface VideoChatPanelProps {
  frameDescriptions: string[];
}

function makeAdapter(frameDescriptions: string[]): ChatModelAdapter {
  return {
    async *run({ messages, abortSignal }) {
      const apiMessages = messages.map((m) => ({
        role: m.role,
        content:
          m.content
            ?.filter((c) => c.type === "text")
            .map((c) => c.text)
            .join("") || "",
      }));

      const resp = await fetch(VIDEO_CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: apiMessages,
          frameDescriptions,
        }),
        signal: abortSignal,
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
            if (content) {
              fullText += content;
              yield { content: [{ type: "text" as const, text: fullText }] };
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    },
  };
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-end mb-3">
      <div className="max-w-[85%] rounded-xl rounded-br-sm bg-foreground text-background px-3.5 py-2.5 text-[13px] leading-relaxed">
        <MessagePrimitive.Content
          components={{
            Text: ({ text }) => <span>{text}</span>,
          }}
        />
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-start mb-3">
      <div className="max-w-[85%] rounded-xl rounded-bl-sm bg-secondary text-secondary-foreground px-3.5 py-2.5 text-[13px] leading-relaxed">
        <MessagePrimitive.Content
          components={{
            Text: ({ text }) => (
              <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none [&>p]:m-0 [&>p+p]:mt-2 [&>ul]:mt-1 [&>ul]:mb-0">
                <ReactMarkdown>{text}</ReactMarkdown>
              </div>
            ),
          }}
        />
      </div>
    </MessagePrimitive.Root>
  );
}

function ChatThread({ onSendStarter }: { onSendStarter?: (text: string) => void }) {
  return (
    <ThreadPrimitive.Root className="flex flex-col h-full">
      <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto p-4">
        <ThreadPrimitive.Empty>
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-4">
              Ask anything about the video you just analyzed.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {STARTER_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => onSendStarter?.(q)}
                  className="text-xs bg-secondary hover:bg-accent/20 text-secondary-foreground border border-border rounded-full px-3 py-1.5 transition-colors cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </ThreadPrimitive.Empty>

        <ThreadPrimitive.Messages
          components={{
            UserMessage,
            AssistantMessage,
          }}
        />
      </ThreadPrimitive.Viewport>

      {/* Composer */}
      <div className="border-t border-border px-3 py-3">
        <ComposerPrimitive.Root className="flex gap-2">
          <ComposerPrimitive.Input
            placeholder="Ask anything about this video…"
            className="flex-1 text-[13px] bg-secondary border-none rounded-lg px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            autoFocus
          />
          <ComposerPrimitive.Send className="px-3 py-2.5 bg-foreground text-background rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity">
            Send
          </ComposerPrimitive.Send>
        </ComposerPrimitive.Root>
        <div className="text-center mt-2">
          <span className="text-[10px] text-muted-foreground font-mono opacity-60">
            Powered by Assistant UI + Lovable AI
          </span>
        </div>
      </div>
    </ThreadPrimitive.Root>
  );
}

export default function VideoChatPanel({ frameDescriptions }: VideoChatPanelProps) {
  const adapter = useMemo(() => makeAdapter(frameDescriptions), [frameDescriptions]);
  const runtime = useLocalRuntime(adapter);

  const handleSendStarter = useCallback(
    (text: string) => {
      runtime.thread.append({
        role: "user",
        content: [{ type: "text", text }],
      });
    },
    [runtime]
  );

  return (
    <section className="max-w-[960px] mx-auto px-7 pb-12">
      {/* Ready badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2 h-2 bg-accent rounded-full animate-[pulse-dot_2s_infinite]" />
        <span className="text-xs font-mono text-accent-foreground font-medium">
          AI is ready to answer questions
        </span>
      </div>

      <div className="border border-border rounded-2xl overflow-hidden bg-background shadow-lg">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-accent-foreground">
            <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h3 className="text-[14px] font-medium text-foreground font-mono">Ask about this video</h3>
        </div>

        <div className="h-[400px] md:h-[460px]">
          <AssistantRuntimeProvider runtime={runtime}>
            <ChatThread onSendStarter={handleSendStarter} />
          </AssistantRuntimeProvider>
        </div>
      </div>
    </section>
  );
}
