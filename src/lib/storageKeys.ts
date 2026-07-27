// Chaves de localStorage compartilhadas entre as telas e o encerramento de sessão.
// Ficam aqui (e não dentro da tela) para que lib/api.ts consiga limpá-las no
// logout sem importar um componente de screens/.

/** Prefixo do perfil de assinatura salvo no aparelho. */
export const SIG_PROFILE_PREFIX = 'soluvia.sig.profile'

/** Uma chave POR USUÁRIO: numa máquina compartilhada (o caso normal de um comitê
 *  de ética) a chave global fazia a rubrica de uma pessoa aparecer para a
 *  seguinte. */
export const sigProfileKey = (userId: string) => `${SIG_PROFILE_PREFIX}.${userId}`
