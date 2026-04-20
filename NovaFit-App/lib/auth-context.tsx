'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { AuthResult, PublicUser, RegisterInput } from './auth'
import type { ProfileRow } from './database.types'

type AuthContextValue = {
  user: PublicUser | null
  loading: boolean
  login: (emailOrUsername: string, password: string) => Promise<AuthResult>
  register: (input: RegisterInput) => Promise<AuthResult>
  logout: () => Promise<void>
  updateProfile: (
    patch: Partial<Pick<PublicUser, 'displayName' | 'avatarColor'>>,
  ) => Promise<AuthResult>
  changePassword: (newPassword: string) => Promise<AuthResult>
  deleteAccount: () => Promise<AuthResult>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function profileToPublicUser(row: ProfileRow, email: string | null): PublicUser {
  return {
    id: row.id,
    username: row.username,
    email,
    displayName: row.display_name,
    friendCode: row.friend_code,
    avatarColor: row.avatar_color,
    createdAt: Date.parse(row.created_at) || Date.now(),
  }
}

async function loadProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (error) {
    console.warn('[auth] loadProfile error:', error.message)
    return null
  }
  return data ?? null
}

/**
 * Si el usuario entra con algo que parece username (sin @), lo traducimos a
 * email consultando public.profiles + auth.admin (no disponible desde cliente).
 * Como workaround usaremos un flujo simple: login siempre por email.
 * Dejamos la firma abierta (emailOrUsername) para futura RPC.
 */
function looksLikeEmail(s: string): boolean {
  return /.+@.+\..+/.test(s)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null)
  const [loading, setLoading] = useState(true)
  const sessionRef = useRef<Session | null>(null)

  const refreshUserFromSession = useCallback(async (session: Session | null) => {
    sessionRef.current = session
    if (!session?.user) {
      setUser(null)
      return
    }
    const profile = await loadProfile(session.user.id)
    if (!profile) {
      // El trigger debería crear el profile; si no existe, avisamos.
      setUser(null)
      return
    }
    setUser(profileToPublicUser(profile, session.user.email ?? null))
  }, [])

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      await refreshUserFromSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, session) => {
      if (!active) return
      await refreshUserFromSession(session)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [refreshUserFromSession])

  const register = useCallback(
    async (input: RegisterInput): Promise<AuthResult> => {
      const email = input.email.trim().toLowerCase()
      const username = input.username.trim().toLowerCase()
      const displayName = (input.displayName ?? '').trim() || username

      if (!/^[a-z0-9_]{3,24}$/.test(username)) {
        return {
          ok: false,
          error: 'Usuario 3-24 caracteres: minúsculas, números, guión bajo.',
        }
      }
      if (!looksLikeEmail(email)) {
        return { ok: false, error: 'Introduce un email válido.' }
      }
      if (input.password.length < 6) {
        return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' }
      }

      // Comprobación previa de username único (para evitar 500 del trigger)
      const { data: existing, error: existingErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle()
      if (existingErr && existingErr.code !== 'PGRST116') {
        return { ok: false, error: existingErr.message }
      }
      if (existing) {
        return { ok: false, error: 'Ese nombre de cazador ya existe.' }
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password: input.password,
        options: {
          data: {
            username,
            display_name: displayName,
          },
        },
      })
      if (error) return { ok: false, error: error.message }
      if (!data.user) {
        return {
          ok: false,
          error: 'Tu cazador se creó pero necesita confirmar el email antes de entrar.',
        }
      }

      if (!data.session) {
        // Email confirmation requerido
        return {
          ok: true,
          error:
            'Revisa tu correo para confirmar el registro y luego inicia sesión.',
        }
      }

      const profile = await loadProfile(data.user.id)
      const pub = profile
        ? profileToPublicUser(profile, data.user.email ?? email)
        : undefined
      if (pub) setUser(pub)
      return { ok: true, user: pub }
    },
    [],
  )

  const login = useCallback(
    async (emailOrUsername: string, password: string): Promise<AuthResult> => {
      const raw = emailOrUsername.trim()
      if (!raw || !password) {
        return { ok: false, error: 'Introduce tus credenciales.' }
      }

      const email = raw.toLowerCase()
      if (!looksLikeEmail(email)) {
        return {
          ok: false,
          error: 'Inicia sesión con tu email (no el nombre de usuario).',
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) return { ok: false, error: error.message }
      if (!data.user) return { ok: false, error: 'No se pudo iniciar sesión.' }

      const profile = await loadProfile(data.user.id)
      const pub = profile
        ? profileToPublicUser(profile, data.user.email ?? email)
        : undefined
      if (pub) setUser(pub)
      return { ok: true, user: pub }
    },
    [],
  )

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
  }, [])

  const updateProfile = useCallback<AuthContextValue['updateProfile']>(
    async (patch) => {
      if (!user) return { ok: false, error: 'Sesión no iniciada.' }
      const dbPatch: Partial<ProfileRow> = {}
      if (patch.displayName !== undefined) dbPatch.display_name = patch.displayName
      if (patch.avatarColor !== undefined) dbPatch.avatar_color = patch.avatarColor
      if (Object.keys(dbPatch).length === 0) return { ok: true, user }

      const { data, error } = await supabase
        .from('profiles')
        .update(dbPatch)
        .eq('id', user.id)
        .select('*')
        .maybeSingle()
      if (error || !data) {
        return { ok: false, error: error?.message ?? 'No se pudo actualizar.' }
      }
      const next = profileToPublicUser(data, user.email)
      setUser(next)
      return { ok: true, user: next }
    },
    [user],
  )

  const changePassword = useCallback(
    async (newPassword: string): Promise<AuthResult> => {
      if (newPassword.length < 6) {
        return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' }
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) return { ok: false, error: error.message }
      return { ok: true }
    },
    [],
  )

  const deleteAccount = useCallback(async (): Promise<AuthResult> => {
    if (!user) return { ok: false, error: 'Sesión no iniciada.' }
    // Sin permisos admin desde el cliente: borramos el profile (cascada borra
    // routines/sessions). auth.users quedará huérfano, el admin del proyecto
    // puede limpiarlo si hace falta.
    const { error } = await supabase.from('profiles').delete().eq('id', user.id)
    if (error) return { ok: false, error: error.message }
    await supabase.auth.signOut()
    setUser(null)
    return { ok: true }
  }, [user])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      updateProfile,
      changePassword,
      deleteAccount,
    }),
    [
      user,
      loading,
      login,
      register,
      logout,
      updateProfile,
      changePassword,
      deleteAccount,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
