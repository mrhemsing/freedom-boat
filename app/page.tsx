import Link from 'next/link';

export default async function HomePage() {
  return (
    <main style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ marginTop: 0 }}>Freedom Boat</h1>
      <p style={{ color: '#444' }}>
        Hyper-local boating conditions for Freedom Boat Club BC.
      </p>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
        <Card title="Port Moody (default)">
          <ul>
            <li>
              <Link href="/location/port-moody">Dashboard</Link>
            </li>
            <li>
              <Link href="/api/port-moody/now">API: now</Link>
            </li>
            <li>
              <Link href="/api/port-moody/forecast?hours=24">API: forecast</Link>
            </li>
          </ul>
        </Card>

        <Card title="North Saanich">
          <ul>
            <li>
              <Link href="/location/north-saanich">Dashboard</Link>
            </li>
            <li>
              <Link href="/api/north-saanich/now">API: now</Link>
            </li>
            <li>
              <Link href="/api/north-saanich/forecast?hours=24">API: forecast</Link>
            </li>
          </ul>
        </Card>
      </section>

      <p style={{ marginTop: 24, color: '#666' }}>
        Plan: <Link href="/docs">docs</Link>
      </p>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 16 }}>
      <h2 style={{ margin: '0 0 8px 0', fontSize: 18 }}>{title}</h2>
      <div>{children}</div>
    </div>
  );
}
