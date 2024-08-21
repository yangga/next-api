export class ApiError extends Error {
  public static create({
    code,
    message,
    status,
    redirect,
  }: {
    code?: string
    message: string
    status: number
    redirect?: string
  }) {
    return new ApiError(message, code, status, redirect)
  }

  constructor(
    public message: string,
    public code: string | undefined,
    public readonly status: number,
    public redirect: string | undefined = undefined,
  ) {
    super(message)
  }

  withMessage(message: typeof this["message"]): this {
    this.message = message
    return this
  }

  withCode(code: typeof this["code"]): this {
    this.code = code
    return this
  }

  withRedirect(redirect: typeof this["redirect"]): this {
    this.redirect = redirect
    return this
  }
}
