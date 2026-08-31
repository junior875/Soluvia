import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { api, deleteAccount, downloadAuthedFile } from '../../lib/api'
import type { AiMemberRow, AiUsage, ApiError } from '../../lib/types'

/** Espelho do GET /storage/usage — o teto de armazenamento visto de dentro. */
type StorageUsage = {
  used_bytes: number
  limit_bytes: number
  unlimited: boolean
  remaining_bytes: number | null
  by_category: Record<string, number>
}
import { useTheme } from '../../theme/ThemeProvider'
import { useTranslation } from '../../i18n/LanguageProvider'
import type { Lang } from '../../i18n/translations'
import { FONT_STEPS, applyFontScale, applyThemePref, getFontScale, getThemePref, pushPrefs, type ThemePref } from '../../lib/prefs'
import { useCaps } from '../capabilities'
import { useT } from '../strings'
import { Button, Card, Field, Input, Modal, PageHeader, SectionLabel, PasswordInput } from '../ui'
import { Icon } from '../icons'

function Segmented<T extends string | number>({ value, options, onChange }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div style={{ display: 'inline-flex', flexWrap: 'wrap', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 100, padding: 4, gap: 2 }}>
      {options.map((o) => (
        <button key={String(o.v)} onClick={() => onChange(o.v)} className="app-btn" style={{ border: 'none', cursor: 'pointer', padding: '7px 16px', borderRadius: 100, fontSize: 13.5, fontWeight: 700, background: value === o.v ? 'var(--accent)' : 'transparent', color: value === o.v ? '#fff' : 'var(--text-muted)' }}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
      <div>
        <span style={{ color: 'var(--heading)', fontWeight: 600, fontSize: 14.5 }}>{label}</span>
        {hint && <p style={{ color: 'var(--text-muted)', fontSize: 12.5, marginTop: 3 }}>{hint}</p>}
      </div>
      {children}
    </div>
  )
}

function TokenBar({ pct }: { pct: number }) {
  const color = pct >= 100 ? '#e11d48' : pct >= 85 ? '#f59e0b' : 'var(--accent)'
  return (
    <div style={{ height: 9, borderRadius: 100, background: 'rgba(120,140,160,.2)', overflow: 'hidden' }}>
      <div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', borderRadius: 100, background: color, transition: 'width .4s' }} />
    </div>
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} className="app-btn" aria-pressed={on} style={{ width: 52, height: 30, borderRadius: 100, border: 'none', cursor: 'pointer', background: on ? 'var(--accent)' : 'var(--surface-2)', position: 'relative', transition: 'background .2s', boxShadow: on ? 'none' : 'inset 0 0 0 1px var(--border)' }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 25 : 3, width: 24, height: 24, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.3)' }} />
    </button>
  )
}

export default function Settings() {
  const t = useT()
  const { ctx, can } = useCaps()
  const canManageUsers = can('admin.manage_users')
  const { theme, setTheme } = useTheme()
  const { lang, setLang } = useTranslation()
  const [themePref, setThemePref] = useState<ThemePref>(getThemePref())
  const [font, setFont] = useState(getFontScale())
  const [name, setName] = useState(ctx.user.full_name)
  const [curPw, setCurPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [consent, setConsent] = useState(ctx.user.marketing_consent)
  const [confirmDel, setConfirmDel] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [ai, setAi] = useState<AiUsage | null>(null)
  const [storage, setStorage] = useState<StorageUsage | null>(null)
  const [members, setMembers] = useState<AiMemberRow[] | null>(null)
  const [creditInputs, setCreditInputs] = useState<Record<string, string>>({})

  useEffect(() => { void api.get<AiUsage>('/ai/usage').then(setAi).catch(() => setAi(null)) }, [])
  useEffect(() => { void api.get<StorageUsage>('/storage/usage').then(setStorage).catch(() => setStorage(null)) }, [])
  useEffect(() => { if (canManageUsers) void api.get<AiMemberRow[]>('/ai/members').then(setMembers).catch(() => setMembers([])) }, [canManageUsers])

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2200) }
  const fmtNum = (n: number) => n.toLocaleString(lang === 'pt' ? 'pt-BR' : lang === 'es' ? 'es-ES' : 'en-US')
  const pctOf = (used: number, limit: number) => (limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0)
  const fmtBytes = (b: number) =>
    b >= 1024 * 1024 * 1024 ? `${(b / 1024 / 1024 / 1024).toFixed(1)} GB`
      : b >= 1024 * 1024 ? `${Math.round(b / 1024 / 1024)} MB`
        : `${Math.max(0, Math.round(b / 1024))} KB`

  async function addCredit(id: string) {
    const amt = Number(creditInputs[id])
    if (!amt || Number.isNaN(amt)) return
    try {
      await api.post(`/ai/members/${id}/credit`, { tokens: amt })
      setCreditInputs((s) => ({ ...s, [id]: '' }))
      setMembers(await api.get<AiMemberRow[]>('/ai/members'))
      setAi(await api.get<AiUsage>('/ai/usage'))
      flash(t.settings.saved)
    } catch (e) { flash((e as ApiError).detail ?? 'Erro') }
  }

  const chooseTheme = (p: ThemePref) => { setThemePref(p); applyThemePref(p, setTheme); pushPrefs({ theme: p }) }
  const chooseFont = (scale: number) => { setFont(scale); applyFontScale(scale); pushPrefs({ font_scale: scale }) }
  const chooseLang = (l: Lang) => { setLang(l); pushPrefs({ language: l }) }
  const toggleConsent = (v: boolean) => { setConsent(v); pushPrefs({ marketing_consent: v }) }

  async function saveName() {
    try { await api.patch('/me/profile', { full_name: name.trim() }); flash(t.settings.saved) }
    catch (e) { flash((e as ApiError).detail ?? 'Erro') }
  }
  async function changePassword() {
    try { await api.post('/me/password', { current_password: curPw, new_password: newPw }); setCurPw(''); setNewPw(''); flash(t.settings.saved) }
    catch (e) { flash((e as ApiError).detail ?? 'Erro') }
  }
  async function exportData(fmt: string) {
    try { await downloadAuthedFile(`/me/data-export?format=${fmt}`) }
    catch (e) { flash((e as ApiError).detail ?? 'Erro') }
  }
  async function doDelete() {
    setDeleting(true)
    try {
      await deleteAccount()
      // Volta para o site, já deslogado.
      window.location.href = window.location.pathname
    } catch (e) {
      setDeleting(false)
      flash((e as ApiError).detail ?? 'Erro')
    }
  }

  return (
    <div className="app-screen">
      <PageHeader title={t.settings.title} subtitle={t.settings.subtitle} />

      {/* Aparência */}
      <Card style={{ marginBottom: 16 }}>
        <SectionLabel>{t.settings.appearance}</SectionLabel>
        <Row label={t.settings.theme}>
          <Segmented<ThemePref> value={themePref} onChange={chooseTheme} options={[{ v: 'light', label: t.settings.light }, { v: 'dark', label: t.settings.dark }, { v: 'system', label: t.settings.system }]} />
        </Row>
        <Row label={t.settings.fontSize}>
          <Segmented<number> value={font} onChange={chooseFont} options={FONT_STEPS.map((s, i) => ({ v: s, label: ['A⁻', 'A', 'A⁺', 'A⁺⁺'][i] }))} />
        </Row>
        <Row label={t.settings.language} hint={t.settings.langHint}>
          <Segmented<Lang> value={lang} onChange={chooseLang} options={[{ v: 'pt', label: 'PT' }, { v: 'en', label: 'EN' }, { v: 'es', label: 'ES' }]} />
        </Row>
      </Card>

      {/* Conta */}
      <Card style={{ marginBottom: 16 }}>
        <SectionLabel>{t.settings.account}</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end', marginBottom: 16 }} className="rb-id">
          <Field label={t.settings.name}><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Button variant="ghost" onClick={() => void saveName()} disabled={!name.trim() || name === ctx.user.full_name}>{t.settings.save}</Button>
        </div>
        <SectionLabel>{t.settings.changePassword}</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end' }} className="rb-id">
          <Field label={t.settings.currentPassword}><PasswordInput value={curPw} onChange={(e) => setCurPw(e.target.value)} /></Field>
          <Field label={t.settings.newPassword}><PasswordInput value={newPw} onChange={(e) => setNewPw(e.target.value)} /></Field>
          <Button variant="ghost" onClick={() => void changePassword()} disabled={newPw.length < 8}>{t.settings.save}</Button>
        </div>
      </Card>

      {/* Uso de IA — meu crédito pessoal + cota da empresa */}
      {ai && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="spark" size={18} /></span>
            <SectionLabel>{t.settings.aiTitle}</SectionLabel>
          </div>
          {ai.my_unlimited ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{fmtNum(ai.my_used)} {t.settings.aiTokens} · {t.settings.aiNoPersonalLimit}</p>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
                <span>{fmtNum(ai.my_used)} / {fmtNum(ai.my_limit)} {t.settings.aiTokens}</span>
                <span>{pctOf(ai.my_used, ai.my_limit)}%</span>
              </div>
              <TokenBar pct={pctOf(ai.my_used, ai.my_limit)} />
              <p style={{ color: 'var(--text-muted)', fontSize: 12.5, marginTop: 8 }}>
                {t.settings.aiRemaining}: <strong style={{ color: 'var(--heading)' }}>{fmtNum(ai.my_remaining ?? 0)}</strong> {t.settings.aiTokens}
              </p>
            </>
          )}
          <Row label={t.settings.aiCompany}>
            <span style={{ color: 'var(--heading)', fontWeight: 700 }}>{fmtNum(ai.used)} / {ai.unlimited ? '∞' : fmtNum(ai.limit)} {t.settings.aiTokens}</span>
          </Row>
          {/* A cota da EMPRESA também avisa antes de estourar — era só um
              número, e número não grita. A barra fica âmbar aos 85% e o texto
              diz o que fazer; esperar o 402 no meio de uma conversa com a IA
              é o pior jeito de descobrir. */}
          {!ai.unlimited && (
            <div style={{ marginTop: 10 }}>
              <TokenBar pct={pctOf(ai.used, ai.limit)} />
              {pctOf(ai.used, ai.limit) >= 85 && (
                <p style={{ color: pctOf(ai.used, ai.limit) >= 100 ? '#e11d48' : '#b45309', fontSize: 12.5, marginTop: 8, fontWeight: 600 }}>
                  {pctOf(ai.used, ai.limit) >= 100 ? t.settings.aiCompanyFull : t.settings.aiCompanyWarn}
                </p>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Armazenamento — o teto visto de DENTRO da empresa. A cota de IA sempre
          teve espelho aqui; a de storage não tinha nenhum, e a empresa só
          descobria o limite quando um upload voltava 413 na frente de quem
          estava anexando uma prova. */}
      {storage && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="download" size={18} /></span>
            <SectionLabel>{t.settings.storageTitle}</SectionLabel>
          </div>
          {storage.unlimited ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{fmtBytes(storage.used_bytes)} · {t.settings.storageNoLimit}</p>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
                <span>{fmtBytes(storage.used_bytes)} / {fmtBytes(storage.limit_bytes)}</span>
                <span>{pctOf(storage.used_bytes, storage.limit_bytes)}%</span>
              </div>
              <TokenBar pct={pctOf(storage.used_bytes, storage.limit_bytes)} />
              {pctOf(storage.used_bytes, storage.limit_bytes) >= 85 ? (
                <p style={{ color: pctOf(storage.used_bytes, storage.limit_bytes) >= 100 ? '#e11d48' : '#b45309', fontSize: 12.5, marginTop: 8, fontWeight: 600 }}>
                  {pctOf(storage.used_bytes, storage.limit_bytes) >= 100 ? t.settings.storageFull : t.settings.storageWarn}
                </p>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: 12.5, marginTop: 8 }}>{t.settings.storageHint}</p>
              )}
            </>
          )}
        </Card>
      )}

      {/* Admin: créditos de IA por usuário */}
      {canManageUsers && members && members.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="people" size={18} /></span>
            <SectionLabel>{t.settings.aiTeamTitle}</SectionLabel>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13.5, marginBottom: 14, lineHeight: 1.6 }}>{t.settings.aiTeamHint}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {members.map((m) => {
              const pct = m.limit > 0 ? pctOf(m.used, m.limit) : 0
              return (
                <div key={m.membership_id} style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', background: 'var(--surface-2)', borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ color: 'var(--heading)', fontWeight: 700, fontSize: 14 }}>{m.name} <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 12.5 }}>{m.email}</span></div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12.5, margin: '4px 0 6px' }}>
                      {fmtNum(m.used)} / {m.limit > 0 ? fmtNum(m.limit) : '∞'} {t.settings.aiTokens}
                      {m.limit > 0 && <> · {t.settings.aiRemaining} {fmtNum(m.remaining ?? 0)}</>}
                    </div>
                    {m.limit > 0 && <TokenBar pct={pct} />}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Input type="number" min={0} value={creditInputs[m.membership_id] ?? ''} onChange={(e) => setCreditInputs((s) => ({ ...s, [m.membership_id]: e.target.value }))} placeholder={t.settings.aiCreditsPh} style={{ width: 130 }} />
                    <Button variant="ghost" onClick={() => void addCredit(m.membership_id)} disabled={!creditInputs[m.membership_id]}>{t.settings.aiAddCredit}</Button>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Privacidade — self-service */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="shield" size={18} /></span>
          <SectionLabel>{t.settings.privacy}</SectionLabel>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>{t.settings.privacyIntro}</p>

        <Row label={t.settings.exportData} hint={t.settings.exportHint}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['pdf', 'xlsx', 'csv'] as const).map((f) => (
              <Button key={f} variant="ghost" leftIcon="download" onClick={() => void exportData(f)}>{f.toUpperCase()}</Button>
            ))}
          </div>
        </Row>

        <Row label={t.settings.comms} hint={t.settings.commsHint}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 600 }}>{consent ? t.settings.on : t.settings.off}</span>
            <Toggle on={consent} onChange={toggleConsent} />
          </div>
        </Row>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', paddingTop: 14 }}>
          <a href="#termos" style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 13.5, textDecoration: 'none' }}>{t.settings.terms}</a>
          <a href="#privacidade" style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 13.5, textDecoration: 'none' }}>{t.settings.privacyPolicy}</a>
        </div>
      </Card>

      {/* Zona de risco — excluir conta */}
      <Card style={{ borderColor: 'rgba(225,29,72,.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <p style={{ color: '#e11d48', fontWeight: 800, fontSize: 15 }}>{t.settings.dangerZone}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4, maxWidth: 420 }}>{t.settings.dangerHint}</p>
          </div>
          <button onClick={() => setConfirmDel(true)} className="app-btn" style={{ background: 'rgba(225,29,72,.12)', color: '#e11d48', border: '1px solid rgba(225,29,72,.4)', borderRadius: 100, padding: '11px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            {t.settings.deleteAccount}
          </button>
        </div>
      </Card>

      <Modal open={confirmDel} onClose={() => setConfirmDel(false)} title={t.settings.deleteConfirmTitle} maxWidth={440}>
        <p style={{ color: 'var(--text-muted)', fontSize: 14.5, lineHeight: 1.7, marginBottom: 22 }}>{t.settings.deleteConfirmBody}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={() => setConfirmDel(false)}>{t.common.cancel}</Button>
          <button onClick={() => void doDelete()} disabled={deleting} className="app-btn" style={{ background: '#e11d48', color: '#fff', border: 'none', borderRadius: 100, padding: '11px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: deleting ? 0.6 : 1 }}>
            {deleting ? '…' : t.settings.deleteYes}
          </button>
        </div>
      </Modal>

      {toast && createPortal(
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--heading)', color: 'var(--surface)', padding: '12px 22px', borderRadius: 100, fontWeight: 700, fontSize: 14, boxShadow: '0 12px 30px rgba(0,0,0,.3)', zIndex: 10002 }}>
          {toast}
        </div>,
        document.body,
      )}
    </div>
  )
}
