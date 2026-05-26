"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, pass: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Credenciais inválidas");
      sessionStorage.setItem("cefis_key", data.key);
      sessionStorage.setItem("cefis_user", JSON.stringify(data.user));
      router.push("/onboarding");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  }

  function handleGuest() {
    sessionStorage.removeItem("cefis_key");
    sessionStorage.removeItem("cefis_user");
    router.push("/onboarding");
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #2d5a8f 50%, #1e3a5f 100%)" }}>
      {/* Header */}
      <header className="p-6 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-3xl font-bold tracking-wide">CEFIS</div>
          <div className="text-blue-200 text-sm">Tutor de Aprendizado com IA</div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="max-w-2xl w-full text-center">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/10 mb-6">
              <span className="text-4xl">🎓</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">
              Seu tutor que realmente te conhece
            </h1>
            <p className="text-blue-100 text-lg leading-relaxed">
              Sabe o que você já domina, entende onde você quer chegar e traça o caminho mais
              inteligente para lá. Personalizado para você, baseado no conteúdo real da CEFIS.
            </p>
          </div>

          {/* Cards de features */}
          <div className="grid grid-cols-3 gap-4 mb-10">
            {[
              { icon: "🔍", title: "Diagnóstico", desc: "Identifica suas lacunas de conhecimento" },
              { icon: "📋", title: "Plano de Estudos", desc: "Cursos reais da CEFIS para seu objetivo" },
              { icon: "💬", title: "Chat com IA", desc: "Tire dúvidas com base no conteúdo real" },
            ].map((f) => (
              <div key={f.title} className="bg-white/10 rounded-xl p-4 text-white">
                <div className="text-2xl mb-2">{f.icon}</div>
                <div className="font-semibold text-sm">{f.title}</div>
                <div className="text-blue-200 text-xs mt-1">{f.desc}</div>
              </div>
            ))}
          </div>

          {/* Botões */}
          {!showLogin ? (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setShowLogin(true)}
                className="px-8 py-4 bg-white text-blue-900 font-bold rounded-xl hover:bg-blue-50 transition-all shadow-lg text-lg"
              >
                Entrar com CEFIS
              </button>
              <button
                onClick={handleGuest}
                className="px-8 py-4 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-all border border-white/30 text-lg"
              >
                Continuar sem conta
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="bg-white rounded-2xl p-8 max-w-md mx-auto shadow-2xl text-left fade-in">
              <h2 className="text-blue-900 font-bold text-xl mb-6 text-center">Entrar com sua conta CEFIS</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail ou CPF</label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="seu@email.com"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                  required
                />
              </div>
              {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-900 text-white py-3 rounded-lg font-bold hover:bg-blue-800 disabled:opacity-60 transition-all"
              >
                {loading ? "Entrando..." : "Entrar"}
              </button>
              <button
                type="button"
                onClick={() => setShowLogin(false)}
                className="w-full mt-3 text-gray-500 text-sm hover:text-gray-700"
              >
                Cancelar
              </button>
            </form>
          )}
        </div>
      </main>

      <footer className="p-4 text-center text-blue-200 text-sm">
        CEFIS — Hackathon de Inovação em Aprendizado · 2026
      </footer>
    </div>
  );
}
