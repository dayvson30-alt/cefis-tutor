"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Course {
  id: number;
  title: string;
  subtitle?: string;
  duration: number;
  averageRating?: number;
  lessonCount?: number;
  categories?: number[];
  progress?: { percentage: number } | null;
}

interface StudyPlan {
  diagnosis: string;
  plan: string;
  courses: Course[];
  suggestedStart?: string;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? ` ${m}min` : ""}`;
  return `${m}min`;
}

export default function TutorPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [activeTab, setActiveTab] = useState<"plan" | "chat">("plan");
  const [freeLearnInput, setFreeLearnInput] = useState("");
  const [freeLearnOpen, setFreeLearnOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = sessionStorage.getItem("cefis_profile");
    const u = sessionStorage.getItem("cefis_user");
    if (!p) { router.push("/onboarding"); return; }
    setProfile(JSON.parse(p));
    if (u) setUser(JSON.parse(u));
  }, [router]);

  useEffect(() => {
    if (!profile) return;
    generatePlan();
  }, [profile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function generatePlan() {
    setLoadingPlan(true);
    try {
      const cefisKey = sessionStorage.getItem("cefis_key");
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, cefisKey }),
      });
      const data = await res.json();
      setStudyPlan(data);
      setMessages([{
        role: "assistant",
        content: `Olá${user ? `, ${(user as { first_name?: string }).first_name || ""}` : ""}! 👋 Seu plano de estudos foi gerado. Agora pode me fazer qualquer pergunta sobre o conteúdo da CEFIS ou sobre seu plano de estudos. Estou aqui para ajudar!`,
      }]);
    } catch {
      setStudyPlan({ diagnosis: "Erro ao gerar plano", plan: "", courses: [] });
    } finally {
      setLoadingPlan(false);
    }
  }

  async function sendFreeLearn() {
    if (!freeLearnInput.trim() || loadingMsg) return;
    const prompt = `Crie um material de estudo completo sobre: "${freeLearnInput.trim()}". Adapte ao meu perfil, nível e estilo de aprendizagem. Seja didático e estruturado.`;
    setFreeLearnInput("");
    setFreeLearnOpen(false);
    setActiveTab("chat");
    const newMessages: Message[] = [...messages, { role: "user", content: prompt }];
    setMessages(newMessages);
    setLoadingMsg(true);
    try {
      const cefisKey = sessionStorage.getItem("cefis_key");
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, profile, studyPlan, cefisKey }),
      });
      const data = await res.json();
      setMessages([...newMessages, { role: "assistant", content: data.answer }]);
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Desculpe, ocorreu um erro. Tente novamente." }]);
    } finally {
      setLoadingMsg(false);
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loadingMsg) return;
    const userMsg = input.trim();
    setInput("");
    const newMessages: Message[] = [...messages, { role: "user", content: userMsg }];
    setMessages(newMessages);
    setLoadingMsg(true);
    try {
      const cefisKey = sessionStorage.getItem("cefis_key");
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          profile,
          studyPlan,
          cefisKey,
        }),
      });
      const data = await res.json();
      setMessages([...newMessages, { role: "assistant", content: data.answer }]);
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Desculpe, ocorreu um erro. Tente novamente." }]);
    } finally {
      setLoadingMsg(false);
    }
  }

  const userName = user ? ((user as { first_name?: string; name?: string }).first_name || (user as { name?: string }).name || "Aluno") : "Aluno";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-900 flex items-center justify-center text-white font-bold text-lg">
            {userName[0]}
          </div>
          <div>
            <div className="font-bold text-blue-900">CEFIS Tutor IA</div>
            <div className="text-gray-500 text-xs">Olá, {userName}!</div>
          </div>
        </div>
        <button
          onClick={() => { sessionStorage.clear(); router.push("/"); }}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          Sair
        </button>
      </header>

      {/* Mobile tabs */}
      <div className="flex md:hidden border-b border-gray-200 bg-white">
        {(["plan", "chat"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === tab ? "text-blue-900 border-b-2 border-blue-900" : "text-gray-500"
            }`}
          >
            {tab === "plan" ? "📋 Plano de Estudos" : "💬 Chat com Tutor"}
          </button>
        ))}
      </div>

      <div className="flex-1 flex overflow-hidden" style={{ height: "calc(100vh - 73px)" }}>
        {/* Study Plan Panel */}
        <aside className={`w-full md:w-96 border-r border-gray-200 bg-white overflow-y-auto flex-shrink-0 ${activeTab === "chat" ? "hidden md:flex md:flex-col" : "flex flex-col"}`}>
          {loadingPlan ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="typing-dots mb-4">
                <span></span><span></span><span></span>
              </div>
              <p className="text-gray-500">Analisando seu perfil e gerando seu plano personalizado...</p>
            </div>
          ) : studyPlan ? (
            <div className="p-6">
              <h2 className="text-lg font-bold text-blue-900 mb-4">📊 Diagnóstico</h2>
              <div className="bg-blue-50 rounded-xl p-4 mb-6 text-sm text-blue-900 leading-relaxed whitespace-pre-wrap">
                {studyPlan.diagnosis}
              </div>

              <h2 className="text-lg font-bold text-blue-900 mb-4">📋 Plano de Estudos</h2>
              <div className="text-sm text-gray-700 leading-relaxed mb-6 whitespace-pre-wrap">
                {studyPlan.plan}
              </div>

              {studyPlan.courses && studyPlan.courses.length > 0 && (
                <>
                  <h2 className="text-lg font-bold text-blue-900 mb-4">📚 Cursos Recomendados</h2>
                  <div className="space-y-3">
                    {studyPlan.courses.map((course, i) => (
                      <div key={course.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="w-7 h-7 rounded-full bg-blue-900 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 text-sm leading-tight">{course.title}</div>
                            {course.subtitle && <div className="text-gray-500 text-xs mt-0.5">{course.subtitle}</div>}
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                              <span>⏱ {formatDuration(course.duration)}</span>
                              {course.lessonCount && <span>📹 {course.lessonCount} aulas</span>}
                              {course.averageRating && <span>⭐ {course.averageRating.toFixed(1)}</span>}
                            </div>
                            {course.progress && (
                              <div className="mt-2">
                                <div className="flex justify-between text-xs text-gray-400 mb-1">
                                  <span>Progresso</span>
                                  <span>{course.progress.percentage}%</span>
                                </div>
                                <div className="h-1.5 bg-gray-100 rounded-full">
                                  <div
                                    className="h-1.5 bg-blue-600 rounded-full"
                                    style={{ width: `${course.progress.percentage}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <button
                onClick={generatePlan}
                className="w-full mt-6 py-2.5 border border-gray-300 rounded-xl text-gray-600 text-sm hover:bg-gray-50 transition-colors"
              >
                🔄 Regenerar Plano
              </button>
            </div>
          ) : null}
        </aside>

        {/* Chat Panel */}
        <main className={`flex-1 flex flex-col ${activeTab === "plan" ? "hidden md:flex" : "flex"}`}>
          {/* Aprendizado Livre */}
          <div className={`border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 transition-all ${freeLearnOpen ? "p-4" : "px-4 py-2"}`}>
            <button
              onClick={() => setFreeLearnOpen(!freeLearnOpen)}
              className="w-full flex items-center justify-between text-blue-900 font-semibold text-sm"
            >
              <span>🎯 Aprendizado Livre — estude o que quiser, do jeito que preferir</span>
              <span className="text-gray-400 text-xs">{freeLearnOpen ? "▲ recolher" : "▼ expandir"}</span>
            </button>
            {freeLearnOpen && (
              <div className="mt-3">
                <textarea
                  value={freeLearnInput}
                  onChange={(e) => setFreeLearnInput(e.target.value)}
                  disabled={loadingMsg}
                  rows={2}
                  placeholder="Ex: Quero aprender Reforma Tributária em formato de mapa mental com exemplos práticos"
                  className="w-full border border-blue-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white disabled:opacity-50"
                />
                <div className="flex flex-wrap gap-2 mt-2 items-center justify-between">
                  <div className="flex flex-wrap gap-1.5">
                    {["📊 Mapa Mental", "📝 Resumo", "❓ Quiz", "💡 Exercícios Práticos"].map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => setFreeLearnInput((prev) => prev ? `${prev} — formato: ${fmt}` : `Formato: ${fmt} — `)}
                        className="text-xs bg-white border border-blue-200 text-blue-700 px-2.5 py-1 rounded-full hover:bg-blue-100 transition-colors"
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={sendFreeLearn}
                    disabled={!freeLearnInput.trim() || loadingMsg}
                    className="px-4 py-1.5 bg-blue-900 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 disabled:opacity-40 transition-all flex-shrink-0"
                  >
                    Gerar Conteúdo →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} fade-in`}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center text-white text-sm mr-3 flex-shrink-0 mt-0.5">
                    🎓
                  </div>
                )}
                <div
                  className={`max-w-lg rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-blue-900 text-white rounded-br-sm"
                      : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loadingMsg && (
              <div className="flex justify-start fade-in">
                <div className="w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center text-white text-sm mr-3 flex-shrink-0">
                  🎓
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <div className="typing-dots">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 bg-white p-4">
            <div className="flex gap-2 items-center">
              <div className="flex gap-2 overflow-x-auto pb-2 mb-2 flex-wrap hidden md:flex">
                {["O que devo estudar primeiro?", "Crie um resumo do plano", "Faça 3 perguntas de revisão"].map((q) => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="flex-shrink-0 text-xs bg-blue-50 text-blue-800 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors border border-blue-200"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
            <form onSubmit={sendMessage} className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loadingMsg || loadingPlan}
                placeholder="Pergunte sobre o conteúdo, peça resumos, exercícios..."
                className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-sm"
              />
              <button
                type="submit"
                disabled={!input.trim() || loadingMsg || loadingPlan}
                className="px-5 py-3 bg-blue-900 text-white rounded-xl font-bold hover:bg-blue-800 disabled:opacity-40 transition-all flex-shrink-0"
              >
                →
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
