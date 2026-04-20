'use client'

import { useRouter } from 'next/router'
import Link from 'next/link'
import { FiArrowLeft } from 'react-icons/fi'
import { AppShell } from '@/components/AppShell'
import { RoutineForm } from '@/components/RoutineForm'
import { useNovaFit } from '@/lib/store/context'

export default function NewRoutinePage() {
  const router = useRouter()
  const { upsertRoutine } = useNovaFit()

  return (
    <AppShell
      eyebrow="[ NEW QUEST ]"
      title="Registrar nueva misión"
      subtitle="Ponle nombre y define sus objetivos. Podrás ajustar pesos y repeticiones en cada combate."
    >
      <nav className="mb-6" aria-label="Volver">
        <Link
          href="/routines"
          className="sl-focus sl-label inline-flex items-center gap-2 text-[var(--sl-text-dim)] hover:text-[var(--sl-cyan)]"
        >
          <FiArrowLeft className="h-4 w-4" aria-hidden />
          Volver al tablero
        </Link>
      </nav>
      <RoutineForm
        submitLabel="Guardar misión"
        onSubmit={async (r) => {
          await upsertRoutine(r)
          router.push('/routines')
        }}
      />
    </AppShell>
  )
}
