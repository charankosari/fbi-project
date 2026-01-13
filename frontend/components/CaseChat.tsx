"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { parseMarkdown } from "@/lib/markdown";

interface Case {
  _id: string;
  incidentTitle: string;
  description?: string;
  locationDescription?: string;
  dateReported?: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  status: "Active" | "Inactive" | "Resolved";
  statusReason?: string;
  images?: Array<{
    filename: string;
    originalName: string;
    uploadedAt: string;
  }>;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface CaseChatProps {
  caseId: string;
  caseData: Case;
}

export default function CaseChat({ caseId, caseData }: CaseChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(
        `https://fbi-backend-production-402c.up.railway.app/api/ai/chat/${caseId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ question: userMessage.content }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const assistantMessage: Message = {
          role: "assistant",
          content:
            data.answer || data.response || "I couldn't process that question.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const error = await response.json();
        const errorMessage: Message = {
          role: "assistant",
          content: `Error: ${error.error || "Failed to get response"}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="card-premium p-6">
      <h2 className="text-2xl font-semibold text-foreground mb-4">
        Ask Questions About This Case
      </h2>
      <p className="text-sm text-foreground-subtle mb-4">
        Ask questions about the case details, images, or get insights from the
        AI assistant.
      </p>

      {/* Messages Container */}
      <div className="border border-border rounded-lg bg-gray-50 h-96 overflow-y-auto p-4 mb-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div className="text-foreground-subtle">
              <svg
                className="mx-auto h-12 w-12 mb-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p className="font-medium">Start a conversation</p>
              <p className="text-sm mt-2">
                Ask questions like:
                <br />
                "What can you tell me about this case?"
                <br />
                "Describe what you see in the images"
                <br />
                "What are the key details?"
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, idx) => (
              <div
                key={idx}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-foreground text-white"
                      : "bg-white border border-border text-foreground"
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">
                    {message.role === "assistant"
                      ? parseMarkdown(message.content)
                      : message.content}
                  </div>
                  <p
                    className={`text-xs mt-2 ${
                      message.role === "user"
                        ? "text-gray-300"
                        : "text-foreground-subtle"
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.4s" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="flex gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask a question about this case..."
          rows={2}
          className="flex-1 px-4 py-3 bg-gray-50 text-foreground border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-purple/20 focus:border-accent-purple transition-all resize-none"
          disabled={loading}
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className="bg-foreground hover:bg-foreground/90 text-white px-6 self-end"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          )}
        </Button>
      </div>
    </div>
  );
}
