import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !anon) {
  // No lanzamos en runtime server-side para permitir `next build` sin env;
  // pero avisamos en consola. Las páginas que usen supabase fallarán hasta
  // configurar .env.local.
  if (typeof window !== 'undefined') {
     
    console.warn(
      '[NovaFit] Falta NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Copia .env.example a .env.local y rellénalas.',
    )
  }
}

export const supabase: SupabaseClient<Database> = createClient<Database>(
  url ?? 'http://localhost:54321',
  anon ?? 'public-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)
