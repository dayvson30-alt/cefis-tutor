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

type Mode = null | "cefis" | "free";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? ` ${m}min` : ""}`;
  return `${m}min`;
}

const APPROACHES = [
  { value: "zero", label: "Do zero 🌱", desc: "Começo do básico" },
  { value: "aprofundamento", label: "Aprofundamento 📚", desc: "Já tenho base" },
  { value: "revisao", label: "Revisão rápida ⚡", desc: "Preciso revisar" },
  { value: "concurso", label: "Para concurso 🏆", desc: "Foco em prova" },
  { value: "trabalho", label: "Para o trabalho 💼", desc: "Aplicação prática" },
];

const FORMATS = [
  { value: "semanas", label: "📅 Por semanas" },
  { value: "topicos", label: "📋 Por tópicos" },
  { value: "intensivo", label: "🔥 Intensivo" },
];

export default function TutorPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [mode, setMode] = useState<Mode>(null);
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [activeTab, setActiveTab] = useState<"plan" | "chat">("plan");
  const [freeLearnInput, setFreeLearnInput] = useState("");
  const [freeLearnOpen, setFreeLearnOpen] = useState(true);
  // Free mode form
  const [freeFormTopic, setFreeFormTopic] = useState("");
  const [freeFormApproach, setFreeFormApproach] = useState("");
  const [freeFormFormat, setFreeFormFormat] = useState("semanas");
  const [freeFormGenerated, setFreeFormGenerated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = sessionStorage.getItem("cefis_profile");
    const u = sessionStorage.getItem("cefis_user");
    if (!p) { router.push("/onboarding"); return; }
    setProfile(JSON.parse(p));
    if (u) setUser(JSON.parse(u));
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function startCefisMode() {
    setMode("cefis");
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
      const firstName = (user as { first_name?: string } | null)?.first_name || "";
      setMessages([{
        role: "assistant",
        content: `Olá${firstName ? `, ${firstName}` : ""}! 👋 Seu plano com os cursos da CEFIS está pronto. Explore os cursos recomendados e me pergunte qualquer coisa sobre o conteúdo!`,
      }]);
    } catch {
      setStudyPlan({ diagnosis: "Erro ao gerar plano", plan: "", courses: [] });
    } finally {
      setLoadingPlan(false);
    }
  }

  async function startFreeMode() {
    setMode("free");
    const firstName = (user as { first_name?: string } | null)?.first_name || "";
    setMessages([{
      role: "assistant",
      content: `Olá${firstName ? `, ${firstName}` : ""}! 🎯 Diga o que você quer aprender e como — eu monto seu plano personalizado do zero!`,
    }]);
  }

  async function generateFreePlan() {
    if (!freeFormTopic.trim() || loadingPlan) return;
    setLoadingPlan(true);
    setFreeFormGenerated(true);
    const approachLabel = APPROACHES.find(a => a.value === freeFormApproach)?.label || "";
    const formatLabel = FORMATS.find(f => f.value === freeFormFormat)?.label || "";
    const prompt = `Crie um plano de estudos completo e personalizado sobre: "${freeFormTopic}".
Abordagem: ${approachLabel || "geral"}
Formato: ${formatLabel}
Perfil do aluno: nível ${(profile as Record<string, string> | null)?.level || "não informado"}, ${(profile as Record<string, string> | null)?.hoursPerWeek || "5"}h/semana, estilo ${(profile as Record<string, string> | null)?.learningStyle || "visual"}.

Estruture com: diagnóstico rápido, sequência de tópicos, tempo estimado por tópico e próximos passos concretos.`;

    const newMessages: Message[] = [...messages, { role: "user", content: `Quero aprender: ${freeFormTopic} — ${approachLabel} — ${formatLabel}` }];
    setMessages(newMessages);
    setActiveTab("chat");
    try {
      const cefisKey = sessionStorage.getItem("cefis_key");
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }], profile, studyPlan: null, cefisKey }),
      });
      const data = await res.json();
      setMessages([...newMessages, { role: "assistant", content: data.answer }]);
      setStudyPlan({ diagnosis: `Plano livre: ${freeFormTopic}`, plan: data.answer, courses: [] });
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Erro ao gerar plano. Tente novamente." }]);
    } finally {
      setLoadingPlan(false);
    }
  }

  async function sendFreeLearn() {
    if (!freeLearnInput.trim() || loadingMsg) return;
    const prompt = `Crie um material de estudo completo sobre: "${freeLearnInput.trim()}". Adapte ao meu perfil, nível e estilo de aprendizagem. Seja didático e estruturado.`;
    setFreeLearnInput("");
    setFreeLearnOpen(false);
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

  const userName = user
    ? ((user as { first_name?: string; name?: string }).first_name || (user as { name?: string }).name || "Aluno")
    : "Aluno";

  // ── Choice Screen ──────────────────────────────────────────────
  if (mode === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
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
          <button onClick={() => { sessionStorage.clear(); router.push("/"); }} className="text-sm text-gray-400 hover:text-gray-600">Sair</button>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="max-w-2xl w-full fade-in">
            <h1 className="text-3xl font-bold text-blue-900 text-center mb-2">Como você quer estudar hoje?</h1>
            <p className="text-gray-500 text-center mb-10">Escolha seu ponto de partida — você pode mudar a qualquer momento.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card A — CEFIS */}
              <button
                onClick={startCefisMode}
                className="group bg-white border-2 border-gray-200 rounded-2xl p-8 text-left hover:border-blue-600 hover:shadow-lg transition-all flex flex-col gap-4"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center text-3xl transition-colors">
                  🎓
                </div>
                <div>
                  <div className="text-lg font-bold text-blue-900 mb-1">O que a CEFIS preparou para você</div>
                  <div className="text-gray-500 text-sm leading-relaxed">
                    Receba um diagnóstico personalizado com os melhores cursos da plataforma para o seu objetivo e nível.
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-auto">
                  <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-100">Cursos reais da CEFIS</span>
                  <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-100">Plano personalizado</span>
                  <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-100">Progresso salvo</span>
                </div>
              </button>

              {/* Card B — Livre */}
              <button
                onClick={startFreeMode}
                className="group bg-white border-2 border-gray-200 rounded-2xl p-8 text-left hover:border-indigo-500 hover:shadow-lg transition-all flex flex-col gap-4"
              >
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center text-3xl transition-colors">
                  🎯
                </div>
                <div>
                  <div className="text-lg font-bold text-indigo-900 mb-1">O que você quer aprender</div>
                  <div className="text-gray-500 text-sm leading-relaxed">
                    Diga qualquer assunto, do jeito que quiser aprender — o tutor monta um plano do zero só para você.
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-auto">
                  <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-100">Tema livre</span>
                  <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-100">Seu ritmo</span>
                  <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-100">Formato que preferir</span>
                </div>
              </button>
            </div>

            <p className="text-center text-gray-400 text-xs mt-8">Nos dois casos o tutor estará disponível para tirar dúvidas, criar exercícios e resumos.</p>
          </div>
        </main>
      </div>
    );
  }

  // ── Main Tutor Layout ──────────────────────────────────────────
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
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setMode(null); setStudyPlan(null); setMessages([]); setFreeFormGenerated(false); }}
            className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
          >
            ← Trocar modo
          </button>
          <button onClick={() => { sessionStorage.clear(); router.push("/"); }} className="text-sm text-gray-400 hover:text-gray-600">Sair</button>
        </div>
      </header>

      {/* Mobile tabs */}
      <div className="flex md:hidden border-b border-gray-200 bg-white">
        {(["plan", "chat"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === tab ? "text-blue-900 border-b-2 border-blue-900" : "text-gray-500"}`}
          >
            {tab === "plan" ? (mode === "cefis" ? "📋 Plano CEFIS" : "🎯 Meu Plano") : "💬 Chat com Tutor"}
          </button>
        ))}
      </div>

      <div className="flex-1 flex overflow-hidden" style={{ height: "calc(100vh - 73px)" }}>
        {/* Left Panel */}
        <aside className={`w-full md:w-96 border-r border-gray-200 bg-white overflow-y-auto flex-shrink-0 ${activeTab === "chat" ? "hidden md:flex md:flex-col" : "flex flex-col"}`}>

          {/* CEFIS mode */}
          {mode === "cefis" && (
            loadingPlan ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="typing-dots mb-4"><span></span><span></span><span></span></div>
                <p className="text-gray-500 text-sm">Analisando seu perfil nos cursos da CEFIS...</p>
              </div>
            ) : studyPlan ? (
              <div className="p-6">
                <h2 className="text-lg font-bold text-blue-900 mb-4">📊 Diagnóstico</h2>
                <div className="bg-blue-50 rounded-xl p-4 mb-6 text-sm text-blue-900 leading-relaxed whitespace-pre-wrap">{studyPlan.diagnosis}</div>
                <h2 className="text-lg font-bold text-blue-900 mb-4">📋 Plano de Estudos</h2>
                <div className="text-sm text-gray-700 leading-relaxed mb-6 whitespace-pre-wrap">{studyPlan.plan}</div>
                {studyPlan.courses && studyPlan.courses.length > 0 && (
                  <>
                    <h2 className="text-lg font-bold text-blue-900 mb-4">📚 Cursos Recomendados</h2>
                    <div className="space-y-3">
                      {studyPlan.courses.map((course, i) => (
                        <div key={course.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-full bg-blue-900 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
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
                                    <span>Progresso</span><span>{course.progress.percentage}%</span>
                                  </div>
                                  <div className="h-1.5 bg-gray-100 rounded-full">
                                    <div className="h-1.5 bg-blue-600 rounded-full" style={{ width: `${course.progress.percentage}%` }} />
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
                <button onClick={startCefisMode} className="w-full mt-6 py-2.5 border border-gray-300 rounded-xl text-gray-600 text-sm hover:bg-gray-50 transition-colors">
                  🔄 Regenerar Plano
                </button>
              </div>
            ) : null
          )}

          {/* Free mode */}
          {mode === "free" && (
            <div className="p-6 flex flex-col gap-4">
              {!freeFormGenerated ? (
                <>
                  <h2 className="text-lg font-bold text-indigo-900">🎯 Monte seu plano</h2>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">O que você quer aprender? <span className="text-red-400">*</span></label>
                    <textarea
                      value={freeFormTopic}
                      onChange={(e) => setFreeFormTopic(e.target.value)}
                      rows={3}
                      placeholder="Ex: Reforma Tributária e seus impactos no comércio"
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Abordagem</label>
                    <div className="flex flex-wrap gap-2">
                      {APPROACHES.map((a) => (
                        <button
                          key={a.value}
                          onClick={() => setFreeFormApproach(a.value)}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-all ${freeFormApproach === a.value ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"}`}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Formato do plano</label>
                    <div className="flex gap-2">
                      {FORMATS.map((f) => (
                        <button
                          key={f.value}
                          onClick={() => setFreeFormFormat(f.value)}
                          className={`flex-1 text-xs px-3 py-2 rounded-xl border transition-all ${freeFormFormat === f.value ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"}`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={generateFreePlan}
                    disabled={!freeFormTopic.trim() || loadingPlan}
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-40 transition-all mt-2"
                  >
                    {loadingPlan ? "Gerando seu plano..." : "Gerar meu plano →"}
                  </button>
                </>
              ) : loadingPlan ? (
                <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
                  <div className="typing-dots mb-4"><span></span><span></span><span></span></div>
                  <p className="text-gray-500 text-sm">Montando seu plano personalizado...</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-indigo-900">🎯 Seu Plano</h2>
                    <button
                      onClick={() => { setFreeFormGenerated(false); setFreeFormTopic(""); setFreeFormApproach(""); }}
                      className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 px-2 py-1 rounded-lg"
                    >
                      Novo plano
                    </button>
                  </div>
                  <div className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full inline-block self-start border border-indigo-100">
                    {freeFormTopic}
                  </div>
                  <p className="text-sm text-gray-500">O plano foi gerado no chat. Continue a conversa para aprofundar qualquer tópico!</p>
                </>
              )}
            </div>
          )}
        </aside>

        {/* Chat Panel */}
        <main className={`flex-1 flex flex-col ${activeTab === "plan" ? "hidden md:flex" : "flex"}`}>
          {/* Aprendizado Livre card */}
          <div className={`border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 transition-all ${freeLearnOpen ? "p-4" : "px-4 py-2"}`}>
            <button
              onClick={() => setFreeLearnOpen(!freeLearnOpen)}
              className="w-full flex items-center justify-between text-blue-900 font-semibold text-sm"
            >
              <span>🎯 Aprendizado Livre — estude o que quiser, do jeito que preferir</span>
              <span className="text-gray-400 text-xs ml-2 flex-shrink-0">{freeLearnOpen ? "▲ recolher" : "▼ expandir"}</span>
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
                    Gerar →
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
                  <div className="w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center text-white text-sm mr-3 flex-shrink-0 mt-0.5">🎓</div>
                )}
                <div className={`max-w-lg rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user" ? "bg-blue-900 text-white rounded-br-sm" : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loadingMsg && (
              <div className="flex justify-start fade-in">
                <div className="w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center text-white text-sm mr-3 flex-shrink-0">🎓</div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <div className="typing-dots"><span></span><span></span><span></span></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 bg-white p-4">
            <div className="hidden md:flex gap-2 flex-wrap mb-2">
              {["O que devo estudar primeiro?", "Crie um resumo do plano", "Faça 3 perguntas de revisão"].map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="text-xs bg-blue-50 text-blue-800 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors border border-blue-200"
                >
                  {q}
                </button>
              ))}
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
