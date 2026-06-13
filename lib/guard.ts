import { NextRequest, NextResponse } from "next/server";
import { sessionUserId } from "./auth";
import { getRepo } from "./repo";
import { User } from "./types";

type GuardResult = { user: User; res?: never } | { user?: never; res: NextResponse };

export async function requireUser(req: NextRequest): Promise<GuardResult> {
  const uid = sessionUserId(req);
  if (!uid) return { res: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  const user = await getRepo().getUser(uid);
  if (!user) return { res: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  return { user };
}

export async function requireAdmin(req: NextRequest): Promise<GuardResult> {
  const g = await requireUser(req);
  if (g.res) return g;
  if (g.user.role !== "admin")
    return { res: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  return g;
}
