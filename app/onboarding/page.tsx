"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  { id: 1, name: "Direito" },
  { id: 2, name: "Contabilidade" },
  { id: 3, name: "Administração" },
  { id: 4, name: "Economia" },
  { id: 5, name: "Fiscal e Tributário" },
  { id: 6, name: "Tecnologia" },
  { id: 7, name: "Outros" },
];

const LEARNING_STYLES = [
  { value: "visual", label: "Visual", desc: "Prefiro imagens, diagramas e vídeos", icon: "👁️" },
  { value: "auditory", label: "Auditivo", desc: "Aprendo melhor ouvindo e discutindo", icon: "👂" },
  { value: "kinesthetic", label: "Prático", desc: "Aprendo fazendo exercícios e aplicando", icon: "✍️" },
];

const LEVELS = [
  { value: "beginner", label: "Iniciante", desc: "Pouco ou nenhum conhecimento na área" },
  { value: "intermediate", label: "Intermediário", desc: "Tenho base, quero aprofundar" },
  { value: "advanced", label: "Avançado", desc: "Já domino o essencial, busco excelência" },
];

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    goal: "",
    categories: [] as number[],
    level: "",
    hoursPerWeek: "5",
    timeAvailable: "30",
    learningStyle: "",
  });

  function toggleCategory(id: number) {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(id)
        ? f.categories.filter((c) => c !== id)
        : [...f.categories, id],
    }));
  }

  function handleNext() {
    if (step < 4) setStep(step + 1);
    else handleSubmit();
  }

  function canNext() {
    if (step === 1) return form.goal.trim().length > 5;
    if (step === 2) return form.categories.length > 0;
    if (step === 3) return form.level !== "";
    if (step === 4) return form.learningStyle !== "";
    return true;
  }

  function handleSubmit() {
    sessionStorage.setItem("cefis_profile", JSON.stringify(form));
    router.push("/tutor");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <div className="text-blue-900 font-bold text-lg">CEFIS Tutor</div>
        <div className="flex-1 flex items-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  s < step ? "bg-green-500 text-white" : s === step ? "bg-blue-900 text-white" : "bg-gray-200 text-gray-500"
                }`}
              >
                {s < step ? "✓" : s}
              </div>
              {s < 4 && <div className={`h-1 w-12 rounded ${s < step ? "bg-green-400" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>
        <span className="text-sm text-gray-500">Passo {step} de 4</span>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-xl w-full fade-in">
          {/* Step 1: Objetivo */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-blue-900 mb-2">Qual é seu objetivo?</h2>
              <p className="text-gray-500 mb-6">Seja específico — quanto mais detalhe, melhor seu plano de estudos.</p>
              <textarea
                value={form.goal}
                onChange={(e) => setForm({ ...form, goal: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-32 text-base"
                placeholder="Ex: Quero passar no concurso do TRF, sou formado em Direito e tenho 6 meses para estudar..."
              />
              <p className="text-gray-400 text-sm mt-2">Dica: mencione seu objetivo, prazo e contexto profissional</p>
            </div>
          )}

          {/* Step 2: Área */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-blue-900 mb-2">Qual área te interessa?</h2>
              <p className="text-gray-500 mb-6">Selecione uma ou mais áreas de estudo.</p>
              <div className="grid grid-cols-2 gap-3">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className={`p-4 rounded-xl border-2 text-left font-medium transition-all ${
                      form.categories.includes(cat.id)
                        ? "border-blue-600 bg-blue-50 text-blue-900"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Nível + Tempo */}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-blue-900 mb-2">Qual é seu nível atual?</h2>
              <p className="text-gray-500 mb-6">Escolha o que melhor descreve você nesta área.</p>
              <div className="space-y-3 mb-8">
                {LEVELS.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => setForm({ ...form, level: l.value })}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                      form.level === l.value
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className={`font-semibold ${form.level === l.value ? "text-blue-900" : "text-gray-800"}`}>{l.label}</div>
                    <div className="text-gray-500 text-sm mt-0.5">{l.desc}</div>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Horas disponíveis por semana</label>
                  <select
                    value={form.hoursPerWeek}
                    onChange={(e) => setForm({ ...form, hoursPerWeek: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {["2", "5", "10", "15", "20", "30", "40"].map((h) => (
                      <option key={h} value={h}>{h} horas</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tempo disponível agora (minutos)</label>
                  <select
                    value={form.timeAvailable}
                    onChange={(e) => setForm({ ...form, timeAvailable: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {["10", "20", "30", "60", "90", "120"].map((t) => (
                      <option key={t} value={t}>{t} minutos</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Estilo */}
          {step === 4 && (
            <div>
              <h2 className="text-2xl font-bold text-blue-900 mb-2">Como você aprende melhor?</h2>
              <p className="text-gray-500 mb-6">O tutor vai adaptar o conteúdo ao seu estilo.</p>
              <div className="space-y-3">
                {LEARNING_STYLES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setForm({ ...form, learningStyle: s.value })}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4 ${
                      form.learningStyle === s.value
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <span className="text-3xl">{s.icon}</span>
                    <div>
                      <div className={`font-semibold ${form.learningStyle === s.value ? "text-blue-900" : "text-gray-800"}`}>{s.label}</div>
                      <div className="text-gray-500 text-sm">{s.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-medium"
              >
                Voltar
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!canNext()}
              className="flex-1 py-3 bg-blue-900 text-white rounded-xl font-bold hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {step === 4 ? "Iniciar Meu Plano de Estudos 🚀" : "Continuar →"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
