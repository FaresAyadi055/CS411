export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message)
  }
}

export function jsonError(status: number, message: string, code?: string) {
  return { error: message, code: code ?? 'ERROR' }
}
