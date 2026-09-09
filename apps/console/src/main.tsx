import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { App } from './app'
import './styles.css'
import '../../../packages/ui/src/button.css'
import '../../../packages/ui/src/table.css'
import '../../../packages/ui/src/tag.css'
import '../../../packages/ui/src/empty-state.css'
import '../../../packages/ui/src/popover.css'
import '../../../packages/ui/src/modal.css'
import '../../../packages/ui/src/toast.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
