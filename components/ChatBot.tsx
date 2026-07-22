"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bot, ChevronDown, CircleHelp, MessageCircle, Send, Sparkles, Trash2, X } from "lucide-react";
import faqsData from "@/lib/faqs.json";
import { ChatMessage, useChatbotStore } from "@/lib/chatbot-store";

type FAQItem = {
  question: string;
  answer: string;
  keywords: string[];
  pages: string[];
};

type FAQMap = Record<string, FAQItem[]>;

const FAQs = faqsData as FAQMap;
const SUPPORT_EMAIL = "sih-support@kiet.edu";

function normalize(text: string) {
  return text.toLowerCase().trim();
}

function slugFromPath(pathname: string) {
  if (pathname === "/") return "home";
  return pathname.replace(/^\/+|\/+$/g, "").toLowerCase();
}

function pageContext(pathname: string) {
  const path = slugFromPath(pathname);
  if (path.startsWith("dashboard")) {
    return {
      title: "Dashboard",
      hint: "Ask about team creation, invites, requests, and your squad workflow.",
      keywords: ["dashboard", "team", "invite", "request"],
    };
  }
  if (path.startsWith("teams")) {
    return {
      title: "Team Finder",
      hint: "Ask about joining teams, public profiles, requests, and mentor assignment.",
      keywords: ["team", "join", "mentor", "public profile"],
    };
  }
  if (path.startsWith("onboard")) {
    return {
      title: "Onboarding",
      hint: "Ask about profile completion, roll number, GitHub sync, and skill setup.",
      keywords: ["profile", "github", "roll number", "skills"],
    };
  }
  if (path.startsWith("mentors")) {
    return {
      title: "Mentors",
      hint: "Ask about mentor requests, faculty access, and mentor hub setup.",
      keywords: ["mentor", "faculty", "request"],
    };
  }
  if (path.startsWith("archive")) {
    return {
      title: "Archive",
      hint: "Ask about pitch deck submission, upvotes, and archive rules.",
      keywords: ["archive", "pitch deck", "upvote"],
    };
  }
  return {
    title: "General",
    hint: "Ask about login, team size, support, or anything else in the portal.",
    keywords: ["login", "help", "support", "team size"],
  };
}

function flattenFaqs() {
  return Object.entries(FAQs).flatMap(([category, items]) =>
    items.map((item) => ({
      ...item,
      category,
    }))
  );
}

function matchFaq(message: string, pathname: string) {
  const normalized = normalize(message);
  const page = slugFromPath(pathname);
  const allFaqs = flattenFaqs();

  const ranked = allFaqs
    .map((faq) => {
      const questionScore = normalize(faq.question) === normalized ? 100 : 0;
      const keywordScore = faq.keywords.reduce((score, keyword) => {
        const hit = normalized.includes(normalize(keyword)) ? 1 : 0;
        return score + hit;
      }, 0);
      const pageScore =
        faq.pages.includes("all") || faq.pages.some((item) => page.startsWith(item))
          ? 2
          : 0;

      const fuzzyQuestionScore = faq.question
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length > 3 && normalized.includes(word)).length;

      return {
        faq,
        score: questionScore + keywordScore * 18 + pageScore * 8 + fuzzyQuestionScore * 4,
      };
    })
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.score ? ranked[0].faq : null;
}

function supportLink(subject: string, body: string) {
  const url = new URL(`mailto:${SUPPORT_EMAIL}`);
  url.searchParams.set("subject", subject);
  url.searchParams.set("body", body);
  return url.toString();
}

export default function ChatBot() {
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState("");
  const [ready, setReady] = useState(false);

  const open = useChatbotStore((state) => state.open);
  const messages = useChatbotStore((state) => state.messages);
  const setOpen = useChatbotStore((state) => state.setOpen);
  const toggleOpen = useChatbotStore((state) => state.toggleOpen);
  const addMessage = useChatbotStore((state) => state.addMessage);
  const clearMessages = useChatbotStore((state) => state.clearMessages);

  const context = useMemo(() => pageContext(pathname), [pathname]);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (messages.length === 0) {
      addMessage({
        role: "bot",
        text: `Hi, I’m SIH Help. I can answer common questions about ${context.title.toLowerCase()} and the portal.`,
        page: pathname,
      });
    }
  }, [addMessage, context.title, messages.length, pathname, ready]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  const suggestedQuestions = useMemo(() => {
    const candidates = flattenFaqs()
      .filter((faq) => faq.pages.includes("all") || faq.pages.some((item) => pathname.startsWith(`/${item}`)))
      .slice(0, 4);

    if (candidates.length > 0) {
      return candidates.map((item) => item.question);
    }

    return [
      "What is the team size requirement?",
      "How do I request a mentor?",
      "How do I submit a pitch deck?",
    ];
  }, [pathname]);

  const sendBotResponse = (userText: string) => {
    const match = matchFaq(userText, pathname);
    if (match) {
      addMessage({
        role: "bot",
        text: match.answer,
        page: pathname,
      });
      return;
    }

    addMessage({
      role: "bot",
      text: `I couldn’t find an exact match for that here. ${context.hint} If you want, I can help you contact support.`,
      page: pathname,
    });
  };

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    addMessage({ role: "user", text, page: pathname });
    setDraft("");
    window.setTimeout(() => sendBotResponse(text), 180);
  };

  const handleQuickAsk = (question: string) => {
    addMessage({ role: "user", text: question, page: pathname });
    window.setTimeout(() => sendBotResponse(question), 180);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSend();
    }
  };

  const lastUserMessage = [...messages].reverse().find((message) => message.role === "user")?.text || "";

  return (
    <div className="fixed bottom-4 right-4 z-[60]">
      {open ? (
        <div className="w-[min(92vw,420px)] h-[70vh] max-h-[640px] rounded-3xl border border-white/10 bg-[#09112a]/95 shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-white/10 bg-gradient-to-r from-[#f97316]/15 via-transparent to-[#10b981]/15 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-white font-bold">
                <div className="h-8 w-8 rounded-2xl bg-[#f97316]/15 border border-[#f97316]/20 flex items-center justify-center text-[#f97316]">
                  <Bot className="h-4 w-4" />
                </div>
                SIH Help Bot
              </div>
              <div className="text-[11px] text-gray-400 mt-1">
                {context.title} support for this page
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearMessages}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                title="Clear chat"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                onClick={toggleOpen}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                title="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="px-4 py-3 border-b border-white/10 bg-white/5">
            <div className="flex items-center gap-2 text-[11px] text-gray-300 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-[#10b981]" />
              Quick questions
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((question) => (
                <button
                  key={question}
                  onClick={() => handleQuickAsk(question)}
                  className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-semibold text-gray-200 hover:bg-white/10 transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 custom-scrollbar">
            {messages.map((message) => {
              const isUser = message.role === "user";
              return (
                <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[86%] rounded-2xl px-3 py-2.5 text-sm border ${
                      isUser
                        ? "bg-[#f97316]/15 border-[#f97316]/20 text-white"
                        : "bg-white/5 border-white/10 text-gray-100"
                    }`}
                  >
                    <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">
                      {isUser ? "You" : "Bot"}
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
                  </div>
                </div>
              );
            })}

            {lastUserMessage && !matchFaq(lastUserMessage, pathname) && (
              <div className="rounded-2xl border border-[#10b981]/20 bg-[#10b981]/5 p-3 text-xs text-green-100">
                Need a human?{" "}
                <a
                  href={supportLink(
                    `SIH support needed for ${context.title}`,
                    `Page: ${pathname}\nQuestion: ${lastUserMessage}\nPlease help me with this issue.`
                  )}
                  className="font-semibold text-white underline underline-offset-4"
                >
                  Email support
                </a>
              </div>
            )}
          </div>

          <div className="border-t border-white/10 p-3 bg-[#050816]">
            <div className="flex items-center gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask about ${context.title.toLowerCase()}...`}
                className="flex-1 rounded-2xl bg-black/30 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#f97316]"
              />
              <button
                onClick={handleSend}
                className="inline-flex items-center justify-center h-11 w-11 rounded-2xl bg-[#f97316] text-white hover:bg-[#ea580c] transition-colors"
                title="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-gray-500">
              <span className="inline-flex items-center gap-1">
                <CircleHelp className="h-3.5 w-3.5" />
                FAQ + page-aware answers
              </span>
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5" />
                History saved locally
              </span>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={toggleOpen}
          className="group flex items-center gap-3 rounded-full border border-white/10 bg-[#09112a]/95 px-4 py-3 shadow-2xl backdrop-blur-xl hover:border-[#f97316]/30 hover:bg-[#0d1636] transition-colors"
        >
          <div className="h-11 w-11 rounded-full bg-gradient-to-br from-[#f97316] to-[#10b981] flex items-center justify-center text-white shadow-lg">
            <Bot className="h-5 w-5" />
          </div>
          <div className="text-left">
            <div className="text-sm font-bold text-white">Need help?</div>
            <div className="text-[11px] text-gray-400">Open SIH Help Bot</div>
          </div>
          <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-white transition-colors" />
        </button>
      )}
    </div>
  );
}
