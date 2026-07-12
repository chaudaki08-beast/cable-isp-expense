import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import type { Profile, UserRole } from "@/lib/supabase/types"

/**
 * Returns whether Supabase is configured. Lets the UI render a friendly
 * "connect Supabase" state instead of crashing during early development.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

/** Get the current user's profile, or null if not signed in. */
export async function getCurrentProfile(): Promise<Profile | null> {
  if (!isSupabaseConfigured()) return null

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  return profile ?? null
}

/** Require a signed-in user; redirect to /login otherwise. */
export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/login")
  return profile
}

/** Require one of the given roles; redirect to /dashboard if not allowed. */
export async function requireRole(...roles: UserRole[]): Promise<Profile> {
  const profile = await requireProfile()
  if (!roles.includes(profile.role)) redirect("/dashboard")
  return profile
}

export function isAdmin(role: UserRole): boolean {
  return role === "owner" || role === "accountant"
}
