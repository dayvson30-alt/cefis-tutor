import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import ragData from "../../../data/rag_index.json";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface RagEntry {
  cid: string;
  ct: string;
  lid: string;
  lt: string;
  tx: string;
}

const ragIndex = ragData as RagEntry[];

function searchIndex(query: string, topK = 4): RagEntry[] {
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);
  if (keywords.length === 0) return [];

  const scored = ragIndex.map((entry) => {
    const searchable = `${entry.ct} ${entry.lt} ${entry.tx}`.toLowerCase();
    const score = keywords.reduce((acc, kw) => {
      const count = (searchable.match(new RegExp(kw, "g")) || []).length;
      return acc + count;
    }, 0);
    return { entry, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((s) => s.entry);
}

export async function POST(req: NextRequest) {
  const { messages, profile, studyPlan, cefisKey } = await req.json();

  const lastUserMsg =
    (messages as { role: string; content: string }[])
      .filter((m) => m.role === "user")
      .pop()?.content || "";

  const results = searchIndex(lastUserMsg);

  const contextText = results.length > 0
    ? results
        .map((r) => `[Curso: ${r.ct} | Aula: ${r.lt}]\n${r.tx}`)
        .join("\n\n---\n\n")
    : "";

  const STYLE_INSTRUCTIONS: Record<string, string> = {
    visual: "Use listas, tabelas, estruturas visuais em texto e formatação clara",
    auditory: "Explique de forma conversacional, como se estivesse falando diretamente",
    kinesthetic: "Foque em exemplos práticos, exercícios e aplicações reais",
  };

  const systemPrompt = `Você é o Tutor IA da CEFIS, especialista educacional personalizado.
Responda em português brasileiro de forma didática, motivadora e adaptada ao perfil do aluno.

PERFIL DO ALUNO:
- Objetivo: ${profile?.goal || "não informado"}
- Nível: ${profile?.level || "não informado"}
- Estilo de aprendizagem: ${profile?.learningStyle || "não informado"}
${profile?.learningStyle ? `- Instrução de estilo: ${STYLE_INSTRUCTIONS[profile.learningStyle] || ""}` : ""}

CURSOS NO PLANO DE ESTUDOS:
${studyPlan?.courses?.map((c: { title: string }) => `- ${c.title}`).join("\n") || "nenhum definido"}

${
  contextText
    ? `CONTEÚDO REAL DAS TRANSCRIÇÕES DA CEFIS (use para responder com precisão):
${contextText}`
    : "Obs: Sem transcrição correspondente — use conhecimento geral."
}

${cefisKey ? "O aluno está autenticado na plataforma CEFIS." : ""}

Instruções:
- Se tiver transcrições, baseie sua resposta nelas e cite o curso/aula pelo nome
- Crie exercícios, resumos, quizzes e mapas mentais quando pedido
- Seja motivador, objetivo e sempre sugira o próximo passo`;

  const claudeMessages = (
    messages as { role: string; content: string }[]
  ).slice(-10).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: systemPrompt,
    messages: claudeMessages,
  });

  const answer =
    response.content[0].type === "text"
      ? response.content[0].text
      : "Desculpe, ocorreu um erro. Tente novamente.";

  return NextResponse.json({ answer });
}
