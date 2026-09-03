// Página PÚBLICA de relato (sem login). Aberta pelo link do canal:
//   /c/{tenant_slug}/{token}
// Renderiza o formulário publicado no Form Builder, deixa o denunciante
// escolher identificar-se ou não, e no fim mostra o protocolo + hash (UMA vez).
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { BASE_URL } from '../lib/api'
import type { SigGeo } from '../lib/types'
import { useTranslation } from '../i18n/LanguageProvider'
import { EvidenceUploader } from './EvidenceUploader'
import { carregarTiposAceitos, megabytes, paraAccept, type TiposAceitos } from '../lib/uploads'
import PrefSwitcher from './PrefSwitcher'
import ParecerSignModal from '../app/screens/signature/ParecerSignModal'
import { mascaraPara } from '../lib/mascaras'

interface FF { key: string; type: string; label: string; help: string; required: boolean; options: string[]; sensitive: boolean }
interface PublicForm { tenant_slug: string; tenant_name: string; channel_name: string; module?: string; title: string; intro: string; identification: string; fields: FF[]; published: boolean; lang?: string; available_langs?: string[] }
interface Receipt { protocol: string; access_hash: string }

const L = {
  pt: { loading: 'Carregando…', unavailable: 'Canal indisponível', unavailableBody: 'Este canal ainda não tem um formulário publicado, ou o link é inválido.', identifyLegend: 'Como você quer relatar?', anon: 'Anônimo', anonHint: 'Não pediremos nada que te identifique.', identify: 'Identificar-me', email: 'Seu e-mail', emailHint: 'Usaremos só para dar retorno do seu relato.', anonForced: 'Este canal é 100% anônimo.', idRequired: 'Este canal exige identificação.', send: 'Enviar relato', sending: 'Enviando…', waitUpload: 'Aguardando o anexo…', required: 'Preencha os campos obrigatórios.', doneTitle: 'Relato registrado', doneBody: 'Guarde o protocolo e o código abaixo — é a única forma de acompanhar (inclusive de forma anônima).', protocol: 'Protocolo', code: 'Código de acesso', copy: 'Copiar', copied: 'Copiado!', track: 'Acompanhar depois em', another: 'Enviar outro relato', secure: 'Ambiente seguro e confidencial', yes: 'Sim', no: 'Não', choose: 'Selecione', signTitle: 'Assine seu relato', signKicker: 'Identificação', signCta: 'Assinar e enviar', verifTitle: 'Confirme seu e-mail', verifBody: 'Enviamos um código de 8 dígitos para', verifConfirm: 'Confirmar e assinar', verifResend: 'Reenviar código', verifFail: 'Não foi possível enviar o código. Tente de novo.', verifBad: 'Código inválido ou expirado.', signNote: 'Ao se identificar, você assina digitalmente o relato (rubrica + localização opcional).', evidenceTitle: 'Provas (opcional)', evidenceHelp: 'Fotos, vídeos, áudios ou documentos que ajudem a comprovar o que você está relatando.', evidenceChoose: 'Escolher arquivos', evidenceDrop: 'ou arraste e solte aqui', evidenceRemove: 'Remover', evidenceSending: 'Enviando…', evidenceFailed: 'Não foi possível enviar este arquivo.', evidenceLimit: 'Limite de arquivos atingido.', evidenceAccepted: 'Formatos aceitos', fmtImage: 'Imagens', fmtVideo: 'Vídeos', fmtAudio: 'Áudios', fmtDocument: 'Documentos', evidenceLimits: 'Até {n} arquivos, {mb} MB cada.' },
  en: { loading: 'Loading…', unavailable: 'Channel unavailable', unavailableBody: 'This channel has no published form yet, or the link is invalid.', identifyLegend: 'How do you want to report?', anon: 'Anonymous', anonHint: 'We will not ask anything that identifies you.', identify: 'Identify myself', email: 'Your email', emailHint: 'Only used to get back to you about your report.', anonForced: 'This channel is 100% anonymous.', idRequired: 'This channel requires identification.', send: 'Send report', sending: 'Sending…', waitUpload: 'Waiting for the upload…', required: 'Please fill the required fields.', doneTitle: 'Report received', doneBody: 'Keep the protocol and code below — it is the only way to follow up (even anonymously).', protocol: 'Protocol', code: 'Access code', copy: 'Copy', copied: 'Copied!', track: 'Follow up later at', another: 'Send another report', secure: 'Secure & confidential', yes: 'Yes', no: 'No', choose: 'Select', signTitle: 'Sign your report', signKicker: 'Identification', signCta: 'Sign & send', verifTitle: 'Confirm your e-mail', verifBody: 'We sent an 8-digit code to', verifConfirm: 'Confirm & sign', verifResend: 'Resend code', verifFail: 'We could not send the code. Try again.', verifBad: 'Invalid or expired code.', signNote: 'By identifying yourself, you digitally sign the report (signature + optional location).', evidenceTitle: 'Evidence (optional)', evidenceHelp: 'Photos, videos, audio or documents that support what you are reporting.', evidenceChoose: 'Choose files', evidenceDrop: 'or drag and drop here', evidenceRemove: 'Remove', evidenceSending: 'Uploading…', evidenceFailed: 'This file could not be uploaded.', evidenceLimit: 'File limit reached.', evidenceAccepted: 'Accepted formats', fmtImage: 'Images', fmtVideo: 'Videos', fmtAudio: 'Audio', fmtDocument: 'Documents', evidenceLimits: 'Up to {n} files, {mb} MB each.' },
  es: { loading: 'Cargando…', unavailable: 'Canal no disponible', unavailableBody: 'Este canal aún no tiene un formulario publicado, o el enlace no es válido.', identifyLegend: '¿Cómo quieres denunciar?', anon: 'Anónimo', anonHint: 'No pediremos nada que te identifique.', identify: 'Identificarme', email: 'Tu correo', emailHint: 'Solo para darte seguimiento de tu denuncia.', anonForced: 'Este canal es 100% anónimo.', idRequired: 'Este canal exige identificación.', send: 'Enviar denuncia', sending: 'Enviando…', waitUpload: 'Esperando el archivo…', required: 'Completa los campos obligatorios.', doneTitle: 'Denuncia registrada', doneBody: 'Guarda el protocolo y el código — es la única forma de dar seguimiento (incluso anónimo).', protocol: 'Protocolo', code: 'Código de acceso', copy: 'Copiar', copied: '¡Copiado!', track: 'Da seguimiento luego en', another: 'Enviar otra denuncia', secure: 'Entorno seguro y confidencial', yes: 'Sí', no: 'No', choose: 'Selecciona', signTitle: 'Firma tu denuncia', signKicker: 'Identificación', signCta: 'Firmar y enviar', verifTitle: 'Confirma tu correo', verifBody: 'Enviamos un código de 8 dígitos a', verifConfirm: 'Confirmar y firmar', verifResend: 'Reenviar código', verifFail: 'No pudimos enviar el código. Intenta de nuevo.', verifBad: 'Código inválido o vencido.', signNote: 'Al identificarte, firmas digitalmente la denuncia (firma + ubicación opcional).', evidenceTitle: 'Pruebas (opcional)', evidenceHelp: 'Fotos, videos, audios o documentos que respalden lo que estás relatando.', evidenceChoose: 'Elegir archivos', evidenceDrop: 'o arrastra y suelta aquí', evidenceRemove: 'Quitar', evidenceSending: 'Enviando…', evidenceFailed: 'No fue posible enviar este archivo.', evidenceLimit: 'Límite de archivos alcanzado.', evidenceAccepted: 'Formatos aceptados', fmtImage: 'Imágenes', fmtVideo: 'Videos', fmtAudio: 'Audios', fmtDocument: 'Documentos', evidenceLimits: 'Hasta {n} archivos, {mb} MB cada uno.' },
}


// No SAC quem escreve é CONSUMIDOR: "relato"/"denúncia" não cabe. Só as palavras
// que mudam — o resto do dicionário acima é reaproveitado.
const SAC_WORDS = {
  pt: { identifyLegend: 'Seus dados de contato', send: 'Enviar demanda', doneTitle: 'Demanda registrada',
        another: 'Enviar outra demanda', signTitle: 'Assine sua demanda',
        emailHint: 'Usaremos só para responder sua demanda.',
        idRequired: 'Este canal exige identificação para podermos responder.',
        signNote: 'Para garantir o retorno e o registro do seu SAC, assine digitalmente: rubrica, CPF e localização opcional.' },
  en: { identifyLegend: 'Your contact details', send: 'Send request', doneTitle: 'Request received',
        another: 'Send another request', signTitle: 'Sign your request',
        emailHint: 'Only used to reply to your request.',
        idRequired: 'This channel requires identification so we can reply.',
        signNote: 'To guarantee the reply and the record of your request, sign digitally: signature, CPF and optional location.' },
  es: { identifyLegend: 'Tus datos de contacto', send: 'Enviar demanda', doneTitle: 'Demanda registrada',
        another: 'Enviar otra demanda', signTitle: 'Firma tu demanda',
        emailHint: 'Solo para responder tu demanda.',
        idRequired: 'Este canal exige identificación para poder responderte.',
        signNote: 'Para garantizar la respuesta y el registro de tu solicitud, firma digitalmente: firma, CPF y ubicación opcional.' },
} as const

export function isPublicReportPath(): boolean {
  return /^\/c\/[^/]+\/[^/]+/.test(window.location.pathname)
}

export default function PublicReport() {
  const { lang } = useTranslation()
  const base = L[lang] ?? L.pt
  const [slug, token] = useMemo(() => {
    const m = window.location.pathname.match(/^\/c\/([^/]+)\/([^/]+)/)
    return m ? [m[1], m[2]] : ['', '']
  }, [])

  const [form, setForm] = useState<PublicForm | null | 'error'>(null)
  // Vocabulário do módulo: no SAC troca "relato/denúncia" por "demanda".
  const tr = (form && form !== 'error' && form.module === 'sac')
    ? { ...base, ...(SAC_WORDS[lang] ?? SAC_WORDS.pt) }
    : base
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [identifyMode, setIdentifyMode] = useState<'anon' | 'id'>('anon')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  // Há anexo subindo AGORA. O uploader só entrega os ids dos que terminaram,
  // então enviar no meio do upload registrava o relato sem a prova — e a
  // pessoa lia "relato registrado" achando que o arquivo tinha ido junto.
  const [subindoAnexo, setSubindoAnexo] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [signOpen, setSignOpen] = useState(false)
  // Ids das provas JÁ enviadas e confirmadas no storage. O relato só as adota
  // no envio — antes disso elas existem soltas, sem dono.
  const [attachmentIds, setAttachmentIds] = useState<string[]>([])
  // A lista de tipos aceitos vem do servidor — é a mesma regra que recusa.
  const [tipos, setTipos] = useState<TiposAceitos | null>(null)
  useEffect(() => { carregarTiposAceitos().then(setTipos).catch(() => setTipos(null)) }, [])

  useEffect(() => {
    // Busca o form no idioma escolhido; ao trocar de idioma, recarrega os rótulos.
    // As respostas (answers) são por chave de campo, então sobrevivem à troca.
    fetch(`${BASE_URL}/public/${slug}/channel/${token}/form?lang=${lang}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((f: PublicForm) => {
        setForm(f)
        if (f.identification === 'required') setIdentifyMode('id')
        else if (f.identification === 'forbidden') setIdentifyMode('anon')
      })
      .catch(() => setForm('error'))
  }, [slug, token, lang])

  const setAns = (k: string, v: unknown) => setAnswers((a) => ({ ...a, [k]: v }))

  // Denunciante será identificado? (política do canal manda; senão a escolha dele)
  const willIdentify = form !== null && form !== 'error'
    && (form.identification === 'forbidden' ? false
      : form.identification === 'required' ? true
      : identifyMode === 'id')

  function submit() {
    if (form === null || form === 'error') return
    setErr(null)
    for (const f of form.fields) {
      if (f.required && f.type !== 'section' && f.type !== 'info') {
        const v = answers[f.key]
        if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) { setErr(tr.required); return }
      }
    }
    if (willIdentify && !email.trim()) { setErr(tr.email); return }
    // Identificado → abre o mesmo modal de assinatura (rubrica + geo + CPF) e só
    // envia após assinar. Anônimo → envia direto.
    if (willIdentify) {
      // Só abre a assinatura com o e-mail JÁ provado; trocar o e-mail depois
      // de verificar invalida o passo (o voucher é daquele endereço).
      if (voucher && emailVerificado === email.trim().toLowerCase()) { setSignOpen(true); return }
      void pedirCodigo()
      return
    }
    void doSubmit()
  }

  // O passo que faltava: provar que o e-mail é de quem está relatando. Sem
  // isso a assinatura ficava amarrada a um endereço que ninguém confirmou.
  const [verifAberta, setVerifAberta] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [voucher, setVoucher] = useState<string | null>(null)
  const [emailVerificado, setEmailVerificado] = useState<string | null>(null)
  const [verifBusy, setVerifBusy] = useState(false)
  const [verifErro, setVerifErro] = useState<string | null>(null)

  async function pedirCodigo() {
    setVerifBusy(true); setVerifErro(null)
    try {
      const r = await fetch(`${BASE_URL}/public/verify-email/request`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      if (!r.ok) throw new Error()
      setVerifAberta(true)
    } catch { setVerifErro(tr.verifFail) } finally { setVerifBusy(false) }
  }

  async function confirmarCodigo() {
    setVerifBusy(true); setVerifErro(null)
    try {
      const r = await fetch(`${BASE_URL}/public/verify-email/confirm`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: codigo.trim() }),
      })
      if (!r.ok) throw new Error()
      const d = await r.json()
      setVoucher(d.voucher)
      setEmailVerificado(email.trim().toLowerCase())
      setVerifAberta(false)
      setCodigo('')
      // Verificado: segue direto para a assinatura.
      setSignOpen(true)
    } catch { setVerifErro(tr.verifBad) } finally { setVerifBusy(false) }
  }

  async function doSubmit(sig?: { signature_image: string; geo: SigGeo; cpf: string | null }) {
    if (form === null || form === 'error') return
    setBusy(true)
    try {
      const res = await fetch(`${BASE_URL}/public/${slug}/cases?token=${token}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_anonymous: !willIdentify,
          reporter_email: willIdentify ? email.trim() : null,
          answers,
          signature_image: sig?.signature_image ?? null,
          geo: sig?.geo ?? null,
          cpf: sig?.cpf ?? null,
          email_voucher: voucher,
          attachment_ids: attachmentIds,
        }),
      })
      if (!res.ok) throw new Error()
      setSignOpen(false)
      setReceipt(await res.json())
    } catch { setErr('Falha ao enviar. Tente novamente.') } finally { setBusy(false) }
  }

  const copy = (val: string, key: string) => { void navigator.clipboard?.writeText(val); setCopied(key); setTimeout(() => setCopied(null), 1500) }

  const wrap: CSSProperties = { minHeight: '100vh', background: 'var(--surface-2)', color: 'var(--text)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 16px 64px' }
  const card: CSSProperties = { width: '100%', maxWidth: 640, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 22, padding: 'clamp(22px,4vw,38px)', boxShadow: 'var(--card-shadow)' }
  const input: CSSProperties = { width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', color: 'var(--heading)', fontSize: 15, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }
  const labelS: CSSProperties = { display: 'block', color: 'var(--heading)', fontWeight: 600, fontSize: 14.5, marginBottom: 6 }

  const Header = (
    <div style={{ width: '100%', maxWidth: 640, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
      <img src="/soluvia.png" alt="Soluvia" className="brand-logo" style={{ height: 34, width: 'auto' }} />
      <PrefSwitcher compact />
    </div>
  )

  if (form === null) return <div style={wrap}>{Header}<div style={card}>{tr.loading}</div></div>
  if (form === 'error') return <div style={wrap}>{Header}<div style={card}><h1 style={{ color: 'var(--heading)', fontSize: 22, fontWeight: 800 }}>{tr.unavailable}</h1><p style={{ color: 'var(--text-muted)', marginTop: 8 }}>{tr.unavailableBody}</p></div></div>

  if (receipt) {
    const trackUrl = `${window.location.origin}/#acompanhar`
    return (
      <div style={wrap}>{Header}
        <div style={{ ...card, textAlign: 'center' }} className="app-modal">
          <div style={{ width: 72, height: 72, borderRadius: '50%', margin: '0 auto 18px', background: 'linear-gradient(135deg,var(--accent),var(--accent-2))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 14px 40px var(--accent-shadow)' }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none"><path d="M8 18l7 7 13-13" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <h1 style={{ color: 'var(--heading)', fontSize: 26, fontWeight: 800 }}>{tr.doneTitle}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14.5, marginTop: 10, lineHeight: 1.6 }}>{tr.doneBody}</p>
          <div style={{ display: 'grid', gap: 12, marginTop: 22, textAlign: 'left' }}>
            {[[tr.protocol, receipt.protocol, 'p'], [tr.code, receipt.access_hash, 'c']].map(([lbl, val, k]) => (
              <div key={k} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{lbl}</div>
                  <code style={{ color: 'var(--heading)', fontWeight: 800, fontSize: 16, wordBreak: 'break-all' }}>{val}</code>
                </div>
                <button onClick={() => copy(val as string, k as string)} className="app-btn" style={{ ...input, width: 'auto', padding: '8px 14px', cursor: 'pointer', fontWeight: 700, background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>{copied === k ? tr.copied : tr.copy}</button>
              </div>
            ))}
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 12.5, marginTop: 16 }}>{tr.track} <strong>{trackUrl}</strong></p>
          <button onClick={() => { setReceipt(null); setAnswers({}); setEmail('') }} className="app-btn" style={{ marginTop: 20, background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 700, cursor: 'pointer' }}>{tr.another}</button>
        </div>
      </div>
    )
  }

  return (
    <div style={wrap}>{Header}
      <div style={card}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--accent)' }}>{form.tenant_name} · {form.channel_name}</div>
        <h1 style={{ color: 'var(--heading)', fontSize: 'clamp(24px,4vw,32px)', fontWeight: 800, marginTop: 6, letterSpacing: '-0.5px' }}>{form.title}</h1>
        {form.intro && <p style={{ color: 'var(--text-muted)', fontSize: 15, marginTop: 8, lineHeight: 1.6 }}>{form.intro}</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 24 }}>
          {form.fields.map((f) => {
            if (f.type === 'section') return <h3 key={f.key} style={{ color: 'var(--heading)', fontWeight: 800, fontSize: 17, borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>{f.label}</h3>
            if (f.type === 'info') return <p key={f.key} style={{ color: 'var(--text-muted)', fontSize: 14 }}>{f.label}</p>
            const v = answers[f.key]
            return (
              <div key={f.key}>
                <label style={labelS}>{f.label} {f.required && <span style={{ color: 'var(--accent)' }}>*</span>}</label>
                {f.help && <p style={{ color: 'var(--text-muted)', fontSize: 12.5, marginTop: -3, marginBottom: 6 }}>{f.help}</p>}
                {f.type === 'long_text' ? <textarea className="app-input" style={{ ...input, minHeight: 96, resize: 'vertical' }} value={(v as string) ?? ''} onChange={(e) => setAns(f.key, e.target.value)} />
                  : f.type === 'date' ? <input className="app-input" type="date" style={input} value={(v as string) ?? ''} onChange={(e) => setAns(f.key, e.target.value)} />
                  : f.type === 'dropdown' ? (
                    <select className="app-input" style={input} value={(v as string) ?? ''} onChange={(e) => setAns(f.key, e.target.value)}>
                      <option value="">{tr.choose}</option>
                      {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  )
                  : f.type === 'single_choice' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {f.options.map((o) => (
                        <label key={o} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', color: 'var(--text)' }}>
                          <input type="radio" name={f.key} checked={v === o} onChange={() => setAns(f.key, o)} />{o}
                        </label>
                      ))}
                    </div>
                  )
                  : f.type === 'multi_choice' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {f.options.map((o) => {
                        const arr = Array.isArray(v) ? (v as string[]) : []
                        return (
                          <label key={o} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', color: 'var(--text)' }}>
                            <input type="checkbox" checked={arr.includes(o)} onChange={(e) => setAns(f.key, e.target.checked ? [...arr, o] : arr.filter((x) => x !== o))} />{o}
                          </label>
                        )
                      })}
                    </div>
                  )
                  : f.type === 'yes_no' ? (
                    <div style={{ display: 'flex', gap: 10 }}>
                      {[tr.yes, tr.no].map((o) => (
                        <button key={o} type="button" onClick={() => setAns(f.key, o)} className="app-btn" style={{ ...input, width: 'auto', flex: 1, cursor: 'pointer', fontWeight: 700, background: v === o ? 'var(--accent)' : 'var(--surface-2)', color: v === o ? '#fff' : 'var(--text)' }}>{o}</button>
                      ))}
                    </div>
                  )
                  : (() => {
                      // Telefone, CPF, CNPJ e CEP ganham máscara SOZINHOS,
                      // pelo rótulo do campo — o formulário é dinâmico (até o
                      // agente de IA monta), então não há onde configurar isso.
                      const m = mascaraPara(f.label, f.key)
                      return (
                        <input
                          className="app-input"
                          style={input}
                          value={(v as string) ?? ''}
                          inputMode={m?.inputMode}
                          onChange={(e) => setAns(f.key, m ? m.aplicar(e.target.value) : e.target.value)}
                        />
                      )
                    })()}
              </div>
            )
          })}

          {/* Provas — área fixa de todo formulário, e não um campo do Form
              Builder: uma denúncia sem como anexar a foto é uma denúncia pela
              metade, e isso não pode depender de quem montou o formulário ter
              lembrado de incluir o campo. */}
          <EvidenceUploader
            onSubindo={setSubindoAnexo}
            maxArquivos={tipos?.max_files ?? 20}
            accept={paraAccept(tipos)}
            formatos={tipos?.groups}
            verFormatos={tr.evidenceAccepted}
            rotulosFormato={{ image: tr.fmtImage, video: tr.fmtVideo, audio: tr.fmtAudio, document: tr.fmtDocument }}
            pedirAutorizacao={async (file) => {
              const r = await fetch(`${BASE_URL}/public/${slug}/uploads/presign?token=${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: file.name, content_type: file.type }),
              })
              if (!r.ok) {
                const corpo = await r.json().catch(() => null)
                throw new Error(corpo?.detail ?? tr.evidenceFailed)
              }
              return r.json()
            }}
            confirmar={async (id) => {
              const r = await fetch(
                `${BASE_URL}/public/${slug}/uploads/${id}/confirm?token=${token}`,
                { method: 'POST' },
              )
              if (!r.ok) throw new Error(tr.evidenceFailed)
              const d = await r.json()
              return { id: d.attachment_id, filename: d.filename, kind: d.kind, size: d.size_bytes }
            }}
            textos={{
              titulo: tr.evidenceTitle,
              ajuda: tipos
                ? `${tr.evidenceHelp} ${tr.evidenceLimits.replace('{n}', String(tipos.max_files)).replace('{mb}', String(megabytes(tipos.max_bytes)))}`
                : tr.evidenceHelp,
              escolher: tr.evidenceChoose,
              solte: tr.evidenceDrop,
              remover: tr.evidenceRemove,
              enviando: tr.evidenceSending,
              falhou: tr.evidenceFailed,
              limite: tr.evidenceLimit,
            }}
            onChange={setAttachmentIds}
          />

          {/* Identificação */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 18 }}>
            <label style={labelS}>{tr.identifyLegend}</label>
            {form.identification === 'forbidden' ? <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>🔒 {tr.anonForced}</p>
              : form.identification === 'required' ? (
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>{tr.idRequired}</p>
                  <input className="app-input" type="email" style={input} placeholder={tr.email} value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(['anon', 'id'] as const).map((m) => (
                    <label key={m} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', padding: 12, borderRadius: 12, border: `1px solid ${identifyMode === m ? 'var(--accent)' : 'var(--border)'}`, background: identifyMode === m ? 'var(--accent-soft)' : 'transparent' }}>
                      <input type="radio" name="idmode" checked={identifyMode === m} onChange={() => setIdentifyMode(m)} style={{ marginTop: 3 }} />
                      <span>
                        <span style={{ color: 'var(--heading)', fontWeight: 700 }}>{m === 'anon' ? tr.anon : tr.identify}</span>
                        <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12.5 }}>{m === 'anon' ? tr.anonHint : tr.emailHint}</span>
                      </span>
                    </label>
                  ))}
                  {identifyMode === 'id' && <input className="app-input" type="email" style={input} placeholder={tr.email} value={email} onChange={(e) => setEmail(e.target.value)} />}
                </div>
              )}
          </div>

          {willIdentify && <p style={{ color: 'var(--text-muted)', fontSize: 12.5, display: 'flex', gap: 6, alignItems: 'flex-start', lineHeight: 1.5 }}>✍️ {tr.signNote}</p>}

          {err && <div style={{ background: 'rgba(217,83,79,.12)', border: '1px solid rgba(217,83,79,.4)', color: '#e08585', borderRadius: 12, padding: '11px 14px', fontSize: 13.5 }}>{err}</div>}

          <button onClick={() => submit()} disabled={busy || subindoAnexo} className="app-btn cta-sheen" style={{ background: 'linear-gradient(135deg,var(--accent),var(--accent-2))', color: '#fff', border: 'none', borderRadius: 100, padding: '15px 28px', fontSize: 16, fontWeight: 800, cursor: (busy || subindoAnexo) ? 'not-allowed' : 'pointer', boxShadow: '0 12px 30px var(--accent-shadow)', opacity: (busy || subindoAnexo) ? 0.6 : 1 }}>{busy ? tr.sending : subindoAnexo ? tr.waitUpload : tr.send}</button>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5 }}>🔒 {tr.secure}</p>
        </div>
      </div>

      {/* O passo da verificação: código no e-mail antes de assinar. */}
      {verifAberta && (
        <div onClick={() => setVerifAberta(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 12000, background: 'rgba(6,10,18,.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 400, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 22, padding: 26 }}>
            <h3 style={{ color: 'var(--heading)', fontSize: 19, fontWeight: 800, margin: '0 0 6px' }}>{tr.verifTitle}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13.5, lineHeight: 1.6, margin: '0 0 16px' }}>
              {tr.verifBody} <b style={{ color: 'var(--heading)' }}>{email.trim()}</b>
            </p>
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 8))}
              inputMode="numeric" autoFocus placeholder="00000000"
              style={{ width: '100%', boxSizing: 'border-box', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '13px 15px', color: 'var(--heading)', fontSize: 22, letterSpacing: '.35em', textAlign: 'center', fontFamily: 'monospace' }}
            />
            {verifErro && <p style={{ color: '#d9534f', fontSize: 13, margin: '10px 0 0' }}>{verifErro}</p>}
            <button
              type="button" disabled={verifBusy || codigo.trim().length < 4}
              onClick={() => void confirmarCodigo()}
              style={{ width: '100%', marginTop: 14, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 100, padding: '13px 22px', fontWeight: 800, fontSize: 15, cursor: 'pointer', opacity: verifBusy || codigo.trim().length < 4 ? 0.6 : 1 }}
            >
              {verifBusy ? tr.sending : tr.verifConfirm}
            </button>
            <button
              type="button" disabled={verifBusy} onClick={() => void pedirCodigo()}
              style={{ width: '100%', marginTop: 8, background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}
            >
              {tr.verifResend}
            </button>
          </div>
        </div>
      )}

      <ParecerSignModal
        open={signOpen}
        busy={busy}
        onClose={() => setSignOpen(false)}
        onConfirm={(d) => void doSubmit(d)}
        title={tr.signTitle}
        kicker={tr.signKicker}
        cta={tr.signCta}
        // Quem se identifica ASSINA, e assinatura sem CPF o servidor recusa
        // (422): o modal cobra na frente, com o botão travado até validar.
        requireCpf
      />
    </div>
  )
}
