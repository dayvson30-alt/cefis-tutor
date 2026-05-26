import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function fetchCourses(categories: number[], cefisKey?: string) {
  try {
    const params = new URLSearchParams({ count: "30", page: "1" });
    if (categories.length > 0) {
      categories.forEach((c) => params.append("categories[]", String(c)));
    }
    const headers: Record<string, string> = { Accept: "application/json" };
    if (cefisKey) headers["Authorization"] = `Bearer ${cefisKey}`;

    const res = await fetch(`${process.env.CEFIS_API_V3_URL}/courses?${params}`, { headers });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch {
    return [];
  }
}

async function fetchTracks(categories: number[], cefisKey?: string) {
  try {
    const params = new URLSearchParams({ count: "10", page: "1" });
    if (categories.length > 0) {
      categories.forEach((c) => params.append("categories[]", String(c)));
    }
    const headers: Record<string, string> = { Accept: "application/json" };
    if (cefisKey) headers["Authorization"] = `Bearer ${cefisKey}`;

    const res = await fetch(`${process.env.CEFIS_API_V3_URL}/tracks?${params}`, { headers });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch {
    return [];
  }
}

const LEVEL_MAP: Record<string, string> = {
  beginner: "Iniciante",
  intermediate: "Intermediário",
  advanced: "Avançado",
};
const STYLE_MAP: Record<string, string> = {
  visual: "Visual",
  auditory: "Auditivo",
  kinesthetic: "Prático/Cinestésico",
};

export async function POST(req: NextRequest) {
  const { profile, cefisKey } = await req.json();

  const [courses, tracks] = await Promise.all([
    fetchCourses(profile.categories || [], cefisKey),
    fetchTracks(profile.categories || [], cefisKey),
  ]);

  const coursesText = courses
    .slice(0, 20)
    .map(
      (c: { id: number; title: string; subtitle?: string; summary?: string; duration: number; lessonCount?: number; averageRating?: number }) =>
        `- ID:${c.id} | "${c.title}"${c.subtitle ? ` (${c.subtitle})` : ""} | ${Math.round(c.duration / 3600)}h | ${c.lessonCount || "?"} aulas | ★${c.averageRating?.toFixed(1) || "?"}${c.summary ? ` | Resumo: ${c.summary.slice(0, 100)}` : ""}`
    )
    .join("\n");

  const tracksText = tracks
    .slice(0, 5)
    .map((t: { name: string; description?: string; course_count: number }) => `- "${t.name}" | ${t.course_count} cursos${t.description ? ` | ${t.description.slice(0, 80)}` : ""}`)
    .join("\n");

  const systemPrompt = `Você é o Tutor IA da CEFIS, plataforma líder em educação para profissionais.
Você cria planos de estudo altamente personalizados combinando o catálogo real da CEFIS com conteúdo adicional.
Seja direto, motivador e específico. Use português brasileiro.`;

  const userPrompt = `PERFIL DO ALUNO:
- Objetivo: ${profile.goal}
- Nível: ${LEVEL_MAP[profile.level] || profile.level}
- Estilo de aprendizagem: ${STYLE_MAP[profile.learningStyle] || profile.learningStyle}
- Horas disponíveis/semana: ${profile.hoursPerWeek}h
- Disponível agora: ${profile.timeAvailable} minutos

CATÁLOGO CEFIS DISPONÍVEL:
${coursesText || "Nenhum curso encontrado para as categorias selecionadas."}

TRILHAS DISPONÍVEIS:
${tracksText || "Nenhuma trilha encontrada."}

Com base no perfil e no catálogo acima, responda em JSON com exatamente esta estrutura:
{
  "diagnosis": "Diagnóstico de 3-4 linhas: o que o aluno já sabe, quais são suas lacunas principais para atingir o objetivo, e o que deve priorizar",
  "plan": "Plano de estudos detalhado em semanas/fases. Mencione cursos específicos do catálogo pelo nome. Adapte ao estilo ${STYLE_MAP[profile.learningStyle]} e ao tempo disponível.",
  "courseIds": [array com os IDs dos cursos recomendados em ordem de prioridade, máximo 8],
  "suggestedStart": "Sugestão do que fazer nos próximos ${profile.timeAvailable} minutos com base no plano"
}`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [{ role: "user", content: userPrompt }],
    system: systemPrompt,
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  let parsed: { diagnosis: string; plan: string; courseIds: number[]; suggestedStart: string };
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch?.[0] || text);
  } catch {
    parsed = { diagnosis: text, plan: "", courseIds: [], suggestedStart: "" };
  }

  const recommendedCourses = (parsed.courseIds || [])
    .map((id: number) => courses.find((c: { id: number }) => c.id === id))
    .filter(Boolean)
    .slice(0, 8);

  if (recommendedCourses.length === 0 && courses.length > 0) {
    recommendedCourses.push(...courses.slice(0, 5));
  }

  return NextResponse.json({
    diagnosis: parsed.diagnosis,
    plan: parsed.plan,
    courses: recommendedCourses,
    suggestedStart: parsed.suggestedStart,
  });
}
