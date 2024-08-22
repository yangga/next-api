import { NextApiRouter } from "@nystudio/nextapi-router"
import { nextApiRouterStatic } from "@nystudio/nextapi-router"
import { ApiError } from "@nystudio/nextapi-core"
import { NextResponse } from "next/server"

enum CircuitBreakerState {
  OPENED = "O",
  CLOSED = "C",
  HALF = "H",
}

type CircuitBreakerContext = {
  state: CircuitBreakerState
  failureCount: number
  resetAfter: number
}

type CircuitBreakerValidator = (res: NextResponse<unknown>) => boolean

const defaultValidator: CircuitBreakerValidator = (res) => Math.floor(res.status / 100) === 5

const onCircuitBreakerOpenDefault = (method: string, pathname: string) => {
  console.error("circuitBreaker is opened", { method, pathname }, "CircuitBreaker")
}

const CircuitBreakerMap: Record<string, CircuitBreakerContext> = {}

export function nextApiCircuitBreaker(options: {
  router: ReturnType<typeof NextApiRouter["prototype"]["apiRouter"]>
  validator?: CircuitBreakerValidator
  failureCount?: number
  resetAfterMs?: number
  onCircuitBreakerOpen?: (method: string, pathname: string) => void
}) {
  const validator = options.validator ?? defaultValidator
  const failureCount = options.failureCount ?? 5
  const resetAfterMs = options.resetAfterMs ?? 5000
  const onCircuitBreakerOpen = options.onCircuitBreakerOpen ?? onCircuitBreakerOpenDefault

  const wrapper: typeof options.router = async (...args) => {
    const {
      method,
      nextUrl: { pathname },
    } = args[0]
    const key = `${method}:${pathname}`

    if (!CircuitBreakerMap[key]) {
      CircuitBreakerMap[key] = {
        state: CircuitBreakerState.CLOSED,
        failureCount: 0,
        resetAfter: Date.now(),
      }
    }

    const ctx = CircuitBreakerMap[key]

    if (ctx.state === CircuitBreakerState.OPENED) {
      if (ctx.resetAfter <= Date.now()) {
        ctx.state = CircuitBreakerState.HALF
      } else {
        return nextApiRouterStatic.errorToResponse(
          ApiError.create({
            status: 500,
            message: "Retry after few minutes",
          }),
        )
      }
    }

    const res = await options.router(...args)

    if (validator(res)) {
      ctx.failureCount = ctx.failureCount + 1

      if (ctx.state === CircuitBreakerState.HALF || ctx.failureCount >= failureCount) {
        if (ctx.state === CircuitBreakerState.CLOSED) {
          onCircuitBreakerOpen(method, pathname)
        }

        ctx.state = CircuitBreakerState.OPENED
        ctx.resetAfter = Date.now() + resetAfterMs
      }
    } else if (ctx.state === CircuitBreakerState.HALF) {
      CircuitBreakerMap[key] = {
        state: CircuitBreakerState.CLOSED,
        failureCount: 0,
        resetAfter: Date.now(),
      }
    }

    return res
  }

  return wrapper
}
