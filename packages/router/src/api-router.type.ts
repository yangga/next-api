/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextRequest, NextResponse } from "next/server"
import type { ZodEffects, ZodObject, ZodRawShape, ZodTypeAny, ZodUnion, ZodUnionOptions } from "zod"

import type { ExportTypeFromValidation } from "@nystudio/nextapi-core"

export type NextApiRouterValidationType =
  | ZodRawShape
  | ZodObject<ZodRawShape>
  | ZodEffects<ZodObject<ZodRawShape>>
  | ZodUnion<ZodUnionOptions>
  | ZodTypeAny

export type NextApiRouterOption = {
  validation?: {
    query?: NextApiRouterValidationType
    params?: NextApiRouterValidationType
    data?: NextApiRouterValidationType
    form?: NextApiRouterValidationType
    response?: NextApiRouterValidationType
  }
}

export type NextApiLogLevel = "info" | "warn" | "error"

export type NextApiRouterDispatch<
  Options extends NextApiRouterOption = NextApiRouterOption,
  CustomField extends object = object,
  Query = ExportTypeFromValidation<NonNullable<Options["validation"]>["query"]>,
  Param = ExportTypeFromValidation<NonNullable<Options["validation"]>["params"]>,
  Data = ExportTypeFromValidation<NonNullable<Options["validation"]>["data"]>,
  Form = ExportTypeFromValidation<NonNullable<Options["validation"]>["form"]>,
  Response = ExportTypeFromValidation<NonNullable<Options["validation"]>["response"], void>,
> = (
  params: {
    request: Omit<NextRequest, "body" | "formData"> & {
      readonly data: Data
      readonly form: Form
      readonly query: Query
      readonly params: Param
    }
    response: NextResponse<Response>
  } & CustomField,
) => Promise<NextResponse<Response> | Response>

export type NextApiRouterEventListenerType<RouterOption extends NextApiRouterOption, CustomField extends object> = {
  onRouteAdded: (options: RouterOption) => Promise<void>

  onLog: (
    level: NextApiLogLevel,
    params: {
      elapsed: number // milliseconds
      request: NextRequest
      result?: NextResponse<unknown> | unknown
      params: Record<string, string>
      query: Record<string, string>
      data: object | undefined
      form: { [key: string]: any } | undefined
      custom?: CustomField
      error?: unknown
    },
  ) => Promise<void>
}

export type NextApiRouterEvent<
  RouterOption extends NextApiRouterOption,
  CustomField extends object,
> = keyof NextApiRouterEventListenerType<RouterOption, CustomField>

export interface NextApiRouterEventEmitterIf<RouterOption extends NextApiRouterOption, CustomField extends object> {
  addEventListener<Event extends NextApiRouterEvent<RouterOption, CustomField>>(
    event: Event,
    listener: NextApiRouterEventListenerType<RouterOption, CustomField>[Event],
  ): void

  removeEventListener<Event extends NextApiRouterEvent<RouterOption, CustomField>>(
    event: Event,
    listener: NextApiRouterEventListenerType<RouterOption, CustomField>[Event],
  ): void

  emitEvent<Event extends NextApiRouterEvent<RouterOption, CustomField>>(
    event: Event,
    ...args: Parameters<NextApiRouterEventListenerType<RouterOption, CustomField>[Event]>
  ): Promise<void>

  errorToResponse(error: unknown): NextResponse<unknown>

  errorLevel(error: unknown): NextApiLogLevel

  requestUploadCustom(params: {
    request: NextRequest
    response: NextResponse
    options: RouterOption
  }): Promise<CustomField | undefined>
}
