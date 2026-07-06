import { useState, type FormEvent } from 'react'
import { api } from '../../lib/api'
import { useCaps } from '../capabilities'
import { useT } from '../strings'
import { Button, Card, EmptyState, Field, Input, PageHeader, SectionLabel } from '../ui'

interface AxisResult { axis: string; average: number; responses: number }
interface Results { cycle_id: string; total_responses: number; axes: AxisResult[]; overall_average: number }

export default function NR1() {
  const { hasModule } = useCaps()
  const t = useT()
  const [cycle, setCycle] = useState('2026-T2')
  const [results, setResults] = useState<Results | null>(null)
  const [busy, setBusy] = useState(false)
  const [searched, setSearched] = useState(false)

  if (!hasModule('nr1')) {
    return (
      <div className="app-screen">
        <PageHeader title={t.nr1.title} subtitle={t.nr1.subtitle} />
        <Card><EmptyState icon="lock" title={t.locked.title} body={t.nr1.locked} action={<Button onClick={() => (window.location.hash = 'painel/billing')}>{t.common.upgrade}</Button>} /></Card>
      </div>
    )
  }

  async function query(e: FormEvent) {
    e.preventDefault()
    setBusy(true); setSearched(true)
    try {
      setResults(await api.get<Results>(`/nr1/results?cycle_id=${encodeURIComponent(cycle)}`))
    } catch { setResults(null) } finally { setBusy(false) }
  }

  return (
    <div className="app-screen">
      <PageHeader title={t.nr1.title} subtitle={t.nr1.subtitle} />
      <Card style={{ marginBottom: 16 }}>
        <form onSubmit={query} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <Field label={t.nr1.cycle}><Input value={cycle} onChange={(e) => setCycle(e.target.value)} placeholder={t.nr1.egCycle} /></Field>
          </div>
          <Button type="submit" loading={busy}>{t.common.search}</Button>
        </form>
      </Card>

      {results && results.total_responses > 0 ? (
        <Card>
          <SectionLabel>{t.nr1.average} · {results.total_responses} {t.nr1.responses.toLowerCase()} · {results.overall_average}</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
            {results.axes.map((a) => (
              <div key={a.axis}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 6 }}>
                  <span style={{ color: 'var(--heading)', fontWeight: 600 }}>{a.axis}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{a.average} · {a.responses}</span>
                </div>
                <div style={{ height: 9, background: 'var(--surface-2)', borderRadius: 100, overflow: 'hidden' }}>
                  <div style={{ width: `${(a.average / 5) * 100}%`, height: '100%', background: 'linear-gradient(90deg,var(--accent),var(--accent-2))', borderRadius: 100, transition: 'width .6s var(--ease-out)' }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : searched && !busy ? (
        <Card><EmptyState icon="nr1" title={t.common.empty} body={`${t.nr1.cycle}: ${cycle}`} /></Card>
      ) : null}
    </div>
  )
}
