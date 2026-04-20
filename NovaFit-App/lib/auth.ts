// Tipos de autenticación usados por la UI.
// La lógica real vive en `lib/auth-context.tsx` y habla con Supabase.

export type PublicUser = {
  id: string
  username: string
  email: string | null
  displayName: string
  friendCode: string
  avatarColor: string
  createdAt: number
}

export type RegisterInput = {
  email: string
  password: string
  username: string
  displayName?: string
}

export type AuthResult = {
  ok: boolean
  error?: string
  user?: PublicUser
}
