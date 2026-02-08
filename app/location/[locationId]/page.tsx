import { notFound } from 'next/navigation';

const LOCS = {
  'port-moody': { name: 'Port Moody', lat: 49.282, lon: -122.86 },
  'north-saanich': { name: 'North Saanich', lat: 48.65, lon: -123.43 }
} as const;

export default async function LocationPage({
  params
}: {
  params: { locationId: string };
}) {
  const loc = (LOCS as Record<string, { name: string; lat: number; lon: number }>)[
    params.locationId
  ];
  if (!loc) return notFound();

  const [nowRes, forecastRes] = await Promise.all([
    fetch(`${baseUrl()}/api/${params.locationId}/now`, { cache: 'no-store' }),
    fetch(`${baseUrl()}/api/${params.locationId}/forecast?hours=24`, {
      cache: 'no-store'
    })
  ]);

  const now = nowRes.ok ? await nowRes.json() : null;
  const forecast = forecastRes.ok ? await forecastRes.json() : null;

  return (
    <main style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ marginTop: 0 }}>{loc.name}</h1>

      <section style={{ display: 'grid', gap: 12 }}>
        <Panel title="Now">
          <pre style={preStyle}>{JSON.stringify(now, null, 2)}</pre>
        </Panel>

        <Panel title="Forecast (next 24h)">
          <pre style={preStyle}>{JSON.stringify(forecast, null, 2)}</pre>
        </Panel>

        <Panel title="Alerts">
          <p style={{ margin: 0, color: '#666' }}>
            Coming next: compute and store alert feed.
          </p>
        </Panel>

        <Panel title="Tides">
          <p style={{ margin: 0, color: '#666' }}>
            Coming next: integrate a tide provider.
          </p>
        </Panel>
      </section>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 16 }}>
      <h2 style={{ margin: '0 0 8px 0', fontSize: 18 }}>{title}</h2>
      {children}
    </div>
  );
}

const preStyle: React.CSSProperties = {
  margin: 0,
  overflow: 'auto',
  background: '#fafafa',
  borderRadius: 8,
  padding: 12
};

function baseUrl() {
  // Server Components need an absolute URL for server-side fetch.
  // In local dev, default to localhost.
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}
