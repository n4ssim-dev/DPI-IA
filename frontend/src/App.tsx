import { useEffect, useState } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

type HealthStatus = {
  status: string
  db: string
}

function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((res) => res.json())
      .then(setHealth)
      .catch(() => setError('Impossible de joindre l\'API'))
  }, [])

  return (
    <main>
      <h1>DPI Intelligent — NovaSanté Lab</h1>
      <p>
        API :{' '}
        {error ? (
          <strong>KO</strong>
        ) : (
          <strong>{health ? health.status.toUpperCase() : '...'}</strong>
        )}
      </p>
      <p>
        Base de données :{' '}
        <strong>{health ? health.db.toUpperCase() : '...'}</strong>
      </p>
    </main>
  )
}

export default App
