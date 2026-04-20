import type { NovaFitState, Profile } from './types'

function emptyProfile(): Profile {
  return {
    id: '',
    displayName: 'Atleta',
    friendCode: '',
  }
}

export function createDefaultState(): NovaFitState {
  return {
    version: 1,
    profile: emptyProfile(),
    routines: [],
    sessions: [],
    friends: [],
    pending: [],
    activeSessionId: null,
  }
}
