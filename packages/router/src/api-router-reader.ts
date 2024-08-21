/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextRequest, NextResponse } from "next/server"

import { ContentTypeJson, ContentTypeMultipartFormdata } from "./api-router.const"

export const nextApiRouterReader = {
  readParams: (response: NextResponse): Record<string, string> => {
    const params = (response as any).params ?? {}

    const decoded = Object.entries(params).reduce((prev, [key, value]) => {
      return {
        ...prev,
        [key]: value,
      }
    }, {})

    return decoded
  },

  readQueries: (request: NextRequest): Record<string, string | number | string[] | number[]> => {
    const query: ReturnType<typeof nextApiRouterReader.readQueries> = {}
    const queryEntities = request.nextUrl.searchParams.entries()
    let queryIter = queryEntities.next()
    while (!queryIter.done) {
      const [key, value] = queryIter.value
      let deserializedValue: string | number
      try {
        deserializedValue = JSON.parse(value)
      } catch (error) {
        deserializedValue = value
      }

      if (query[key] !== undefined) {
        const old = query[key] as any
        query[key] = [...(Array.isArray(old) ? old : [old]), deserializedValue]
      } else {
        query[key] = deserializedValue
      }

      queryIter = queryEntities.next()
    }

    return query
  },

  readBody: async (request: NextRequest): Promise<object | undefined> => {
    if (request.method === "GET") {
      return undefined
    }

    if (request.headers.get("Content-Type") !== ContentTypeJson) {
      return undefined
    }

    const contentLength = +(request.headers.get("Content-Length") ?? "0")
    if (contentLength === 0) {
      return undefined
    }

    return request.json()
  },

  readForm: async (request: NextRequest): Promise<FormData | undefined> => {
    if (request.method === "GET") {
      return undefined
    }

    if (!request.headers.get("Content-Type")?.includes(ContentTypeMultipartFormdata)) {
      return undefined
    }

    const contentLength = +(request.headers.get("Content-Length") ?? "0")
    if (contentLength === 0) {
      return undefined
    }

    return request.formData()
  },
}
