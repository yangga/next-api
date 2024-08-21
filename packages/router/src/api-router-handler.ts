/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-nested-ternary */
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

import type { NextApiRouterDispatch, NextApiRouterEventEmitterIf, NextApiRouterOption } from "./api-router.type"
import { parseFormDataWithValidation } from "./api-router-form.parser"
import { nextApiRouterReader } from "./api-router-reader"
import { toNextApiRouterValidation } from "./api-router-validation.util"

export const makeNextApiHandler = <RouterOption extends NextApiRouterOption, CustomField extends object = object>({
  dispatch,
  options,
  emitter,
}: {
  dispatch: NextApiRouterDispatch<RouterOption, CustomField>
  options: RouterOption
  emitter: NextApiRouterEventEmitterIf<RouterOption, CustomField>
}) => {
  const { validation = {} } = options

  const validators = {
    response: validation.response ? toNextApiRouterValidation(validation.response) : undefined,
  }

  const parseParams = ParserBuilder.params(validation.params ? toNextApiRouterValidation(validation.params) : undefined)
  const parseQueries = ParserBuilder.query(validation.query ? toNextApiRouterValidation(validation.query) : undefined)
  const parseData = ParserBuilder.data(validation.data ? toNextApiRouterValidation(validation.data) : undefined)
  const parseFormData = ParserBuilder.formData(validation.form ? toNextApiRouterValidation(validation.form) : undefined)
  const parseResponse = validators.response
    ? (data: unknown) => {
        if (data === undefined) {
          return data
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return validators.response!.parse(data)
      }
    : (data: unknown) => data

  return async (request: NextRequest, response: NextResponse) => {
    const startedAt = Date.now()

    let params: Record<string, string> = {}
    let query: Record<string, string> = {}
    let data: object | undefined
    let form: { [key: string]: any } | undefined
    let custom: CustomField | undefined

    try {
      const temp = await Promise.all([
        parseParams(response),
        parseQueries(request),
        parseData(request),
        parseFormData(request),
        emitter.requestUploadCustom({
          request,
          response,
          options,
        }),
      ])

      params = temp[0]
      query = temp[1]
      data = temp[2]
      form = temp[3]
      custom = temp[4]

      // 반드시 기존 객체를 그대로 넘겨야 함. formData()등 stream method가 오동작 할 수 있음
      ;(request as any).query = query
      ;(request as any).params = params
      ;(request as any).data = data
      ;(request as any).form = form

      const dispatchParams = {
        request,
        response,
        ...(custom ?? {}),
      } as unknown as Parameters<typeof dispatch>[0]

      const res = await dispatch(dispatchParams)

      const result = parseResponse(res instanceof NextResponse ? undefined : res)

      const elapsed = Date.now() - startedAt
      const isWarn = elapsed > 1000

      await emitter.emitEvent("onLog", isWarn ? "warn" : "info", {
        elapsed,
        request,
        result,
        params,
        query,
        data,
        form,
        custom,
      })

      return res ? (res instanceof NextResponse ? res : NextResponse.json(res)) : new NextResponse()
    } catch (error: unknown) {
      const elapsed = Date.now() - startedAt
      await emitter.emitEvent("onLog", emitter.errorLevel(error), {
        elapsed,
        request,
        params,
        query,
        data,
        form,
        custom,
        error,
      })

      const result = emitter.errorToResponse(error)
      return result
    }
  }
}

const ParserBuilder = {
  params: (validator?: ReturnType<typeof toNextApiRouterValidation>) => {
    return validator
      ? async (response: NextResponse) => {
          const params = nextApiRouterReader.readParams(response)
          return params ? validator.parse(params) : params
        }
      : async () => ({})
  },
  query: (validator?: ReturnType<typeof toNextApiRouterValidation>) => {
    return validator
      ? async (request: NextRequest) => {
          const params = nextApiRouterReader.readQueries(request)
          return params ? validator.parse(params) : params
        }
      : async () => ({})
  },
  data: (validator?: ReturnType<typeof toNextApiRouterValidation>) => {
    return validator
      ? async (request: NextRequest) => {
          const data = await nextApiRouterReader.readBody(request)
          return data ? validator.parse(data) : data
        }
      : async () => ({})
  },
  formData: (validator?: ReturnType<typeof toNextApiRouterValidation>) => {
    return validator
      ? async (request: NextRequest) => {
          const loadedFormData = await nextApiRouterReader.readForm(request)
          return loadedFormData ? parseFormDataWithValidation(loadedFormData, validator) : loadedFormData
        }
      : async () => ({})
  },
}
