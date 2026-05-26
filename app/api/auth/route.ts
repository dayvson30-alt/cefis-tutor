import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, pass } = body;

  if (!email || !pass) {
    return NextResponse.json({ message: "E-mail e senha são obrigatórios" }, { status: 400 });
  }

  const res = await fetch(`${process.env.CEFIS_BASE_URL}/api/v1/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, pass }),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json({ message: data.message || "Credenciais inválidas" }, { status: res.status });
  }

  return NextResponse.json({ key: data.data.key, user: data.data.user });
}
