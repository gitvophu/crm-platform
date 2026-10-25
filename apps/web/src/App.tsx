import { HealthStatus } from './health/HealthStatus';

export function App() {
  return (
    <main className="app">
      <h1>Nova CRM</h1>
      <HealthStatus />
    </main>
  );
}
