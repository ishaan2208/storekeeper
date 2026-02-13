"use server";

import { clearSessionCookie } from "@/lib/auth-server";
import { redirect } from "next/navigation";

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}
