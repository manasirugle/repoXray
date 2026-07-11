"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, MessageSquare, Bot, User as UserIcon, Trash2 } from "lucide-react";
import Markdown from "./Markdown";
import type { User } from "firebase/auth";
import { getIdToken } from "../config/firebase";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
}

interface ChatPanelProps {
  repoUrl: string;
  user: User | null;
}

const PRESETS = [
  "Explain the overall architecture and codebase structure.",
  "Are there any security vulnerabilities or SQL injection risks?",
  "What design patterns are used, and where is the entry point?",
  "Analyze the dependency layout and suggest architectural upgrades."
];

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://coderecall.onrender.com";

export default function ChatPanel({ repoUrl, user }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "Hello! I am your AI Architect. I have indexed this repository and generated vector embeddings for a full semantic understanding. Ask me anything about the codebase!"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (text: string) => {
    if (!text.trim() || loading) return;

    // Add user message
    const userMsg: Message = {
      id: Math.random().toString(),
      sender: "user",
      text
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const idToken = await getIdToken(user);
      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": idToken ? `Bearer ${idToken}` : ""
        },
        body: JSON.stringify({
          repo_url: repoUrl,
          question: text
        })
      });

      const data = await response.json();

      if (data && data.answer) {
        const aiMsg: Message = {
          id: Math.random().toString(),
          sender: "ai",
          text: data.answer
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      console.error("Chat API Error:", err);
      const errorMsg: Message = {
        id: Math.random().toString(),
        sender: "ai",
        text: "❌ **Failed to retrieve answer from AI service.** Please ensure the backend service is running and configured correctly."
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        id: "welcome",
        sender: "ai",
        text: "Hello! I am your AI Architect. I have indexed this repository and generated vector embeddings for a full semantic understanding. Ask me anything about the codebase!"
      }
    ]);
  };

  return (
    <div className="flex flex-col h-[600px] border border-glass rounded-xl bg-white/[0.01] overflow-hidden">
      {/* Panel Header */}
      <div className="px-5 py-4 border-b border-glass bg-white/[0.01] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white font-heading">AI Chat Architect</h3>
            <p className="text-[10px] text-secondary">RAG Q&A Engine • Gemini 3.5 Reasoning</p>
          </div>
        </div>

        {messages.length > 1 && (
          <button
            onClick={handleClear}
            className="p-1.5 rounded hover:bg-white/10 text-secondary hover:text-white transition-colors"
            title="Reset Conversation"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
            {msg.sender === "ai" && (
              <div className="w-8 h-8 rounded-full border border-glass bg-[#0f1115] flex items-center justify-center text-violet-400 shrink-0 mt-1">
                <Bot size={15} />
              </div>
            )}
            
            <div className={`chat-bubble ${msg.sender === "user" ? "chat-bubble-user" : "chat-bubble-ai"}`}>
              {msg.sender === "ai" ? (
                <Markdown content={msg.text} />
              ) : (
                <p className="text-white text-sm select-text whitespace-pre-wrap">{msg.text}</p>
              )}
            </div>

            {msg.sender === "user" && (
              <div className="w-8 h-8 rounded-full border border-glass bg-violet-600 flex items-center justify-center text-white shrink-0 mt-1">
                <UserIcon size={15} />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start animate-pulse">
            <div className="w-8 h-8 rounded-full border border-glass bg-[#0f1115] flex items-center justify-center text-violet-400 shrink-0">
              <Bot size={15} />
            </div>
            <div className="chat-bubble chat-bubble-ai flex items-center gap-2 text-secondary py-3 px-4">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              <span className="text-[12px] ml-1 font-mono text-cyan-400/70">Formulating response...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Preset cards if conversation is fresh */}
      {messages.length === 1 && (
        <div className="chat-preset-container">
          <p className="text-[10px] text-muted uppercase font-bold tracking-wider mb-2">Suggested Prompts</p>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(preset)}
                className={`chat-preset-btn chat-preset-${idx + 1}`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Tray */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(input);
        }}
        className="p-4 border-t border-glass bg-[#0c0e12] flex gap-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about the codebase..."
          className="flex-1 glass-input py-2.5 font-sans"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="glass-btn px-4 py-2.5 h-10 shrink-0 disabled:opacity-40 disabled:hover:transform-none disabled:shadow-none"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
