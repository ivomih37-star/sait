import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/auth/magicLink";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getUserId(req) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  const v = verifySession(token);
  return v.ok ? v.userId : null;
}

// Заявка B2B на аллокацию редкой/лимитированной серии
export async function POST(req) {
  const userId = getUserId(req);
  if (!userId) return Response.json({ ok: false, reason: "auth" }, { status: 401 });

  const { productId, quantity, note } = await req.json().catch(() => ({}));
  const qty = Number(quantity);
  if (!productId || !(qty > 0)) {
    return Response.json({ ok: false, reason: "invalid" }, { status: 400 });
  }

  const profile = await prisma.b2bProfile.findUnique({ where: { userId } });
  if (!profile || profile.status !== "APPROVED") {
    return Response.json({ ok: false, reason: "profile_not_approved" }, { status: 403 });
  }

  const reqRow = await prisma.allocationRequest.create({
    data: { b2bProfileId: profile.id, productId, quantity: qty, note: note || null },
  });
  return Response.json({ ok: true, id: reqRow.id, status: reqRow.status });
}

// Список заявок текущего B2B-профиля
export async function GET(req) {
  const userId = getUserId(req);
  if (!userId) return Response.json({ ok: false, reason: "auth" }, { status: 401 });
  const profile = await prisma.b2bProfile.findUnique({ where: { userId } });
  if (!profile) return Response.json({ ok: true, requests: [] });
  const requests = await prisma.allocationRequest.findMany({
    where: { b2bProfileId: profile.id },
    include: { product: { select: { name: true, slug: true } } },
    orderBy: { createdAt: "desc" },
  });
  return Response.json({ ok: true, requests });
}
