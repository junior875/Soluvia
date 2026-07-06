// Seletor de empresa (padrão "workspace do Slack").
// Renderize após o login quando `needsTenantSelection` for true (Seção 13.5).

import { useAuth } from '../lib/auth'
import { localizeRole } from '../lib/systemNames'

export default function TenantSelector() {
  const { memberships, selectTenant } = useAuth()

  return (
    <div style={{ maxWidth: 420, margin: '60px auto', textAlign: 'center' }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
        Em qual empresa você quer entrar?
      </h2>
      <p style={{ color: 'rgba(255,255,255,.55)', marginBottom: 24 }}>
        Sua identidade é única; o acesso muda conforme a empresa.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {memberships.map((m) => (
          <button
            key={m.id}
            onClick={() => void selectTenant(m.tenant_id)}
            disabled={m.status !== 'active'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,.12)',
              background: 'rgba(255,255,255,.06)',
              color: 'white',
              cursor: m.status === 'active' ? 'pointer' : 'not-allowed',
              opacity: m.status === 'active' ? 1 : 0.5,
            }}
          >
            <span style={{ fontWeight: 700 }}>{m.tenant_name}</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,.5)' }}>
              {m.roles.map(localizeRole).join(', ') || m.status}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
