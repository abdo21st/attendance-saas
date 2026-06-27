"use server"

import { signIn } from "@/lib/auth"

export async function authenticate(username: string, password: string) {
  await signIn("credentials", {
    username,
    password,
    redirectTo: "/",
  })
}
