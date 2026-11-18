/**
 * Pravila za lozinku, ista kao na backendu (Password::defaults u AppServiceProvider):
 * bar 10 znakova, veliko i malo slovo i broj. Na produkciji backend još odbija lozinke koje su procurele.
 */
export const PASSWORD_MIN = 10

/** Za HTML atribut pattern (pregledač ga proverava pre slanja). */
export const PASSWORD_PATTERN = '(?=.*[a-zčćđšž])(?=.*[A-ZČĆĐŠŽ])(?=.*\\d).{10,}'

export function isStrongPassword(password: string): boolean {
  return new RegExp(`^${PASSWORD_PATTERN}$`, 'v').test(password)
}
