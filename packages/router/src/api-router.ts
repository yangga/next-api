/* eslint-disable class-methods-use-this */
/* eslint-disable no-nested-ternary */

import { StatusCodes } from "http-status-codes"
import stringify from "json-stable-stringify"
import { NextResponse } from "next/server"

import type {
  NextApiRouterDispatch,
  NextApiRouterEventEmitterIf,
  NextApiRouterEventListenerType,
  NextApiRouterOption,
} from "./api-router.type"
import { makeNextApiHandler } from "./api-router-handler"

const isNpmBuildMode = process.env.npm_lifecycle_event === "build"

export class NextApiRouter<RouterOption extends NextApiRouterOption, CustomField extends object = object>
  implements NextApiRouterEventEmitterIf<RouterOption, CustomField>
{
  _: {
    option: RouterOption
    customField: CustomField
  } = {} as any

  private emitter: NextApiRouterEventEmitterIf<RouterOption, CustomField> = this

  private eventListeners: {
    [Key in keyof NextApiRouterEventListenerType<RouterOption, CustomField>]?: ((...args: any[]) => Promise<void>)[]
  }

  constructor(options?: { emitter: NextApiRouterEventEmitterIf<RouterOption, CustomField> }) {
    const onLog: NextApiRouterEventListenerType<RouterOption, CustomField>["onLog"] = async (level, context) => {
      if (isNpmBuildMode) return

      process.nextTick(() => {
        const out = level === "info" ? console.log : level === "warn" ? console.warn : console.error

        let errorId: number | undefined

        if (context.error) {
          errorId = Date.now()
          out("[API] ERROR", errorId, context.error)
        }

        out(
          "[API] RESPONSE",
          stringify(
            {
              ...context,
              request: {
                method: context.request.method,
                ip: context.request.ip,
                url: context.request.url,
              },
              result: process.env.NODE_ENV === "development" ? context.result : undefined,
              errorId,
              error: undefined, // stringify가 Error를 처리하지 못함. 위에서 따로 out 처리함.
            },
            process.env.NODE_ENV === "development"
              ? {
                  space: " ",
                }
              : undefined,
          ),
        )
      })
    }

    this.eventListeners = {
      onLog: [onLog] as typeof this.eventListeners["onLog"],
    }

    if (options?.emitter) {
      this.emitter = options.emitter
    }
  }

  errorLevel: NextApiRouterEventEmitterIf<RouterOption, CustomField>["errorLevel"] = () => "error"

  setErrorLevel(dispatch: NextApiRouterEventEmitterIf<RouterOption, CustomField>["errorLevel"]) {
    this.errorLevel = dispatch
  }

  errorToResponse: NextApiRouterEventEmitterIf<RouterOption, CustomField>["errorToResponse"] = (error) => {
    if (error instanceof Error) {
      return new NextResponse(
        stringify({
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
        }),
        {
          status: StatusCodes.INTERNAL_SERVER_ERROR,
          headers: {
            "Content-Type": "application/json",
          },
        },
      )
    }

    return new NextResponse(
      stringify({
        error,
      }),
      {
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
  }

  setErrorToResponse(dispatch: NextApiRouterEventEmitterIf<RouterOption, CustomField>["errorToResponse"]) {
    this.errorToResponse = dispatch
  }

  requestUploadCustom: NextApiRouterEventEmitterIf<RouterOption, CustomField>["requestUploadCustom"] = () =>
    Promise.resolve(undefined)

  setRequestUploadCustom(dispatch: NextApiRouterEventEmitterIf<RouterOption, CustomField>["requestUploadCustom"]) {
    this.requestUploadCustom = dispatch
  }

  setEventListener<Event extends keyof NextApiRouterEventListenerType<RouterOption, CustomField>>(
    event: Event,
    listener: NextApiRouterEventListenerType<RouterOption, CustomField>[Event],
  ): void {
    this.eventListeners[event] = [listener]
  }

  addEventListener<Event extends keyof NextApiRouterEventListenerType<RouterOption, CustomField>>(
    event: Event,
    listener: NextApiRouterEventListenerType<RouterOption, CustomField>[Event],
  ): void {
    this.eventListeners[event] = [...(this.eventListeners[event] ?? []), listener]
  }

  removeEventListener<Event extends keyof NextApiRouterEventListenerType<RouterOption, CustomField>>(
    event: Event,
    listener: NextApiRouterEventListenerType<RouterOption, CustomField>[Event],
  ): void {
    this.eventListeners[event] = this.eventListeners[event]?.filter((item) => item !== listener)
  }

  removeEventAllListener<Event extends keyof NextApiRouterEventListenerType<RouterOption, CustomField>>(
    event: Event,
  ): void {
    this.eventListeners[event] = []
  }

  async emitEvent<Event extends keyof NextApiRouterEventListenerType<RouterOption, CustomField>>(
    event: Event,
    ...args: Parameters<NextApiRouterEventListenerType<RouterOption, CustomField>[Event]>
  ): Promise<void> {
    if (this.eventListeners[event]) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      for (const listener of this.eventListeners[event]!) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await listener(...args)
        } catch (error) {
          console.error(error)
          throw error
        }
      }
    }
  }

  apiRouter(dispatch: NextApiRouterDispatch<RouterOption, CustomField>, options: RouterOption) {
    this.emitEvent("onRouteAdded", options)

    return makeNextApiHandler<RouterOption, CustomField>({
      dispatch,
      options,
      emitter: this.emitter,
    })
  }
}

const nextApiRouterStatic = new NextApiRouter()

export default nextApiRouterStatic
