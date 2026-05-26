"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getProjects, deleteProject, Project } from "@/lib/projects";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>Progresso</span>
        <span className="font-semibold text-blue-900">{value}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-2 rounded-full transition-all"
          style={{
            width: `${value}%`,
            background: value >= 70 ? "#16a34a" : value >= 40 ? "#2563eb" : "#6366f1",
          }}
        />
      </div>
    </div>
  );
}

export default function MeusEstudos() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    setProjects(getProjects());
  }, []);

  function handleDelete(id: string) {
    deleteProject(id);
    setProjects(getProjects());
  }

  function handleContinue(project: Project) {
    sessionStorage.setItem("cefis_resume_project", JSON.stringify(project));
    router.push("/tutor");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            ← Voltar
          </button>
          <div className="font-bold text-blue-900 text-lg">📚 Meus Estudos</div>
        </div>
        <button
          type="button"
          onClick={() => router.push("/onboarding")}
          className="px-4 py-2 bg-blue-900 text-white rounded-xl text-sm font-semibold hover:bg-blue-800 transition-colors"
        >
          + Novo Estudo
        </button>
      </header>

      <main className="max-w-5xl mx-auto p-6">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center fade-in">
            <div className="text-6xl mb-4">📖</div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">Nenhum estudo salvo ainda</h2>
            <p className="text-gray-400 mb-8 max-w-sm">
              Inicie um novo estudo e ele aparecerá aqui com seu progresso e diagnóstico de lacunas.
            </p>
            <button
              type="button"
              onClick={() => router.push("/onboarding")}
              className="px-6 py-3 bg-blue-900 text-white rounded-xl font-bold hover:bg-blue-800 transition-colors"
            >
              Começar agora →
            </button>
          </div>
        ) : (
          <>
            <p className="text-gray-500 text-sm mb-6">{projects.length} estudo{projects.length !== 1 ? "s" : ""} salvo{projects.length !== 1 ? "s" : ""}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {projects.map((p) => (
                <div key={p.id} className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-blue-200 hover:shadow-md transition-all flex flex-col gap-4 fade-in">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${p.mode === "cefis" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-indigo-50 text-indigo-700 border-indigo-200"}`}>
                          {p.mode === "cefis" ? "🎓 CEFIS" : "🎯 Livre"}
                        </span>
                        {p.approach && (
                          <span className="text-xs text-gray-400">{p.approach}</span>
                        )}
                      </div>
                      <h3 className="font-bold text-gray-900 text-base leading-snug line-clamp-2">{p.name}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      className="text-gray-300 hover:text-red-400 text-lg flex-shrink-0 transition-colors"
                      title="Excluir"
                    >
                      ×
                    </button>
                  </div>

                  {/* Progress */}
                  <ProgressBar value={p.progress} />

                  {/* Stats */}
                  <div className="flex gap-4 text-xs text-gray-400">
                    <span>💬 {p.messages.length} mensagens</span>
                    <span>📅 {formatDate(p.updatedAt)}</span>
                  </div>

                  {/* Gaps */}
                  {p.gaps && p.gaps.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-1.5">🔍 Lacunas identificadas</div>
                      <ul className="space-y-1">
                        {p.gaps.slice(0, 3).map((gap, i) => (
                          <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                            <span className="text-orange-400 mt-0.5 flex-shrink-0">•</span>
                            <span>{gap}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Covered topics */}
                  {p.covered && p.covered.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {p.covered.slice(0, 4).map((t, i) => (
                        <span key={i} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-100">
                          ✓ {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Action */}
                  <button
                    type="button"
                    onClick={() => handleContinue(p)}
                    className="w-full py-2.5 bg-blue-900 text-white rounded-xl text-sm font-semibold hover:bg-blue-800 transition-colors mt-auto"
                  >
                    Continuar Estudando →
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
