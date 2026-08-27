import { CredentialsSignin } from "next-auth"

export class EmailNotVerifiedError extends CredentialsSignin {
  code = "EMAIL_NOT_VERIFIED"
}

export class UserNotFoundError extends CredentialsSignin {
  code = "USER_NOT_FOUND"
}

export class IncorrectPasswordError extends CredentialsSignin {
  code = "INCORRECT_PASSWORD"
}

export class AccountInactiveError extends CredentialsSignin {
  code = "ACCOUNT_INACTIVE"
}

export class InvalidCredentialsError extends CredentialsSignin {
  code = "INVALID_CREDENTIALS"
}

export type LoginErrorCode =
  | "EMAIL_NOT_VERIFIED"
  | "USER_NOT_FOUND"
  | "INCORRECT_PASSWORD"
  | "ACCOUNT_INACTIVE"
  | "INVALID_CREDENTIALS"

export const LOGIN_ERROR_LOCALE_KEY: Record<LoginErrorCode, string> = {
  EMAIL_NOT_VERIFIED: "auth.emailNotVerified",
  USER_NOT_FOUND: "auth.userNotFound",
  INCORRECT_PASSWORD: "auth.incorrectPassword",
  ACCOUNT_INACTIVE: "auth.accountInactive",
  INVALID_CREDENTIALS: "auth.invalidCredentials",
}

function includesCode(raw: string, code: string): boolean {
  return raw.includes(code)
}

/** Map NextAuth signIn() result or ?error= query into a stable app code. */
export function resolveLoginErrorCode(input: {
  error?: string | null
  code?: string | null
}): LoginErrorCode {
  const raw = `${input.code || ""} ${input.error || ""}`.toUpperCase()

  if (includesCode(raw, "EMAIL_NOT_VERIFIED")) return "EMAIL_NOT_VERIFIED"
  if (includesCode(raw, "USER_NOT_FOUND")) return "USER_NOT_FOUND"
  if (includesCode(raw, "INCORRECT_PASSWORD")) return "INCORRECT_PASSWORD"
  if (includesCode(raw, "ACCOUNT_INACTIVE")) return "ACCOUNT_INACTIVE"

  // Auth.js maps unexpected authorize() throws to Configuration
  return "INVALID_CREDENTIALS"
}
