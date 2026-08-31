// CPF no cliente: máscara e validação dos dígitos verificadores.
//
// É o MESMO algoritmo oficial que o backend roda em
// `app/services/signature/cpf.py` — e o backend continua sendo a garantia
// (recusa com 422). Aqui é cortesia de UX: apontar o dígito errado enquanto a
// pessoa ainda está com o cartão na mão, em vez de depois do clique.

export function maskCpf(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

export function cpfValido(v: string): boolean {
  const n = v.replace(/\D/g, '')
  if (n.length !== 11 || /^(\d)\1{10}$/.test(n)) return false
  for (const i of [9, 10]) {
    let s = 0
    for (let j = 0; j < i; j++) s += Number(n[j]) * (i + 1 - j)
    let d = (s * 10) % 11
    if (d === 10) d = 0
    if (d !== Number(n[i])) return false
  }
  return true
}
