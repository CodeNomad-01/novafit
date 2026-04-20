import '../styles/global.css'

import type { AppProps } from 'next/app'
import { Orbitron, Rajdhani } from 'next/font/google'
import { AuthProvider } from '@/lib/auth/context'
import { NovaFitProvider } from '@/lib/store/context'

const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
})

const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
})

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={`${rajdhani.variable} ${orbitron.variable}`}>
      <AuthProvider>
        <NovaFitProvider>
          <Component {...pageProps} />
        </NovaFitProvider>
      </AuthProvider>
    </div>
  )
}
