/* eslint-disable no-underscore-dangle */
import type { RouteConfig } from "@asteasolutions/zod-to-openapi"
import { OpenApiGeneratorV3, OpenAPIRegistry } from "@asteasolutions/zod-to-openapi"
import { isZodType } from "@nystudio/nextapi-core"
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs"
import _ from "lodash"
import type { ZodAny, ZodEffects, ZodObject, ZodRawShape, ZodType, ZodTypeAny, ZodUnion, ZodUnionOptions } from "zod"
import { z } from "zod"

const ContentTypeJson = "application/json"
const ContentTypeMultipartFormdata = "multipart/form-data"

const OPENAPI_PREBUILT_DIR = `${process.cwd()}/.openapi/cache/prebuilt`

type ValidationType =
  | ZodRawShape
  | ZodObject<ZodRawShape>
  | ZodEffects<ZodObject<ZodRawShape>>
  | ZodUnion<ZodUnionOptions>
  | ZodTypeAny

export type NextApiRouterOpenapiOption = {
  __dirname: string
  validation?: {
    query?: ValidationType
    params?: ValidationType
    data?: ValidationType
    form?: ValidationType
    response?: ValidationType
  }
} & Omit<RouteConfig, "path" | "request" | "responses">

export const nextApiStoreRouterOpenapiDocument = (options: NextApiRouterOpenapiOption) => {
  const validators = {
    params: options.validation?.params ? toValidatorObjectForOpenApi(options.validation.params) : undefined,
    query: options.validation?.query
      ? toValidatorObjectForOpenApi(options.validation.query, {
          unionUseOneOf: true,
        })
      : undefined,
    data: options.validation?.data ? toValidatorObjectForOpenApi(options.validation.data) : undefined,
    form: options.validation?.form ? toValidatorObjectForOpenApi(options.validation.form) : undefined,
    response: options.validation?.response
      ? toValidatorObjectForOpenApi(options.validation.response, {
          unionUseOneOf: true,
        })
      : undefined,
  }

  const dir = OPENAPI_PREBUILT_DIR
  mkdirSync(dir, { recursive: true })

  const dirnameToPath = (dirname: string) => {
    const apiFolder = "/api/"
    return `/api/${dirname
      .replace(process.cwd(), "")
      .replace(new RegExp(`.*${apiFolder}`), "")
      .replace(/\[/g, "{")
      .replace(/\]/g, "}")}`
  }

  const path = dirnameToPath(options.__dirname)

  const registry = new OpenAPIRegistry()

  registry.registerPath({
    ...options,
    path,
    request: {
      body:
        !!validators.data || !!validators.form
          ? {
              content: {
                ...(validators.data
                  ? {
                      [ContentTypeJson]: {
                        schema: validators.data,
                      },
                    }
                  : {}),
                ...(validators.form
                  ? {
                      [ContentTypeMultipartFormdata]: {
                        schema: validators.form,
                      },
                    }
                  : {}),
              },
              required: !!validators.data || !!validators.form,
            }
          : undefined,
      query: validators.query,
      params: validators.params,
    },
    responses: {
      "200": validators.response
        ? {
            description: "OK",
            content: {
              [ContentTypeJson]: {
                schema: validators.response,
              },
            },
          }
        : {
            description: "OK",
          },
    },
  })

  const generator = new OpenApiGeneratorV3(registry.definitions)

  const filename = `${dir}/${path.replace(/\//g, "$").replace(/\{/g, "[").replace(/\}/g, "]")}@${options.method}.json`
  writeFileSync(
    filename,
    JSON.stringify(
      generator.generateDocument({
        openapi: "3.0.0",
        info: {
          title: "temp",
          version: "1.0",
        },
      }),
    ),
    "utf8",
  )
  console.log("[NextZodOpenapi] stored spec", `path:${filename}`)
}

export function nextApiCreateNextApiSwaggerSpec(
  options: Parameters<OpenApiGeneratorV3["generateDocument"]>[0],
): Record<string, any> {
  const files = readdirSync(OPENAPI_PREBUILT_DIR).sort((a, b) => a.localeCompare(b))

  const merged = _.merge(
    files.reduce(
      (prev, filename) => {
        const json = JSON.parse(readFileSync(`${OPENAPI_PREBUILT_DIR}/${filename}`, "utf8"))

        return _.merge(prev, json)
      },
      {
        components: {
          schemas: {},
          parameters: {},
        },
        paths: {},
      },
    ),
    options,
  )

  merged.components.parameters = _(merged.components.parameters).toPairs().sortBy(0).fromPairs().value()

  merged.components.schemas = _(merged.components.schemas).toPairs().sortBy(0).fromPairs().value()

  return merged
}

// eslint-disable-next-line @typescript-eslint/ban-types
const toValidatorObjectForOpenApi = (validation: ValidationType, options?: {}): ZodObject<any> => {
  return toValidatorForOpenApi(validation, options) as ZodObject<any>
}

// eslint-disable-next-line @typescript-eslint/ban-types
const toValidatorForOpenApi = (validation: ValidationType | ZodAny, options?: {}): ZodType => {
  if (isZodType(validation, "ZodEffects")) {
    const v = toValidatorForOpenApi(validation.sourceType(), options)
    v._def.openapi = validation._def.openapi
    return v
  }
  if (isZodType(validation, "ZodOptional")) {
    const v = toValidatorForOpenApi(validation._def.innerType, options).optional()

    v._def.openapi = validation._def.openapi
    return v
  }
  if (isZodType(validation, "ZodArray")) {
    return z.array(toValidatorForOpenApi(validation.element, options))
  }
  if (isZodType(validation, "ZodUnion")) {
    if (Array.isArray(validation._def.options) && validation._def.options[0]) {
      const v = toValidatorForOpenApi(validation._def.options[0], options)
      v._def.openapi = validation._def.openapi
      return v
    }

    return validation
  }
  if (isZodType(validation, "ZodObject")) {
    const entries = Object.entries(omitPrivate(validation).shape)
    const v = z
      .object(
        entries.reduce((prev, [key, value]) => {
          const childV = toValidatorForOpenApi(value, options)
          childV._def.openapi = value._def.openapi
          return {
            ...prev,
            [key]: childV,
          }
        }, {}),
      )
      .strip()

    v._def.openapi = validation._def.openapi
    return v
  }
  if (isZodType(validation, "ZodLazy")) {
    const v = toValidatorForOpenApi(validation.schema, options)
    v._def.openapi = validation._def.openapi
    return v
  }
  if (validation instanceof z.ZodType) {
    return validation
  }

  // 여긴 일반 object 타입인 경우
  return toValidatorForOpenApi(z.object(validation), options)
}

const omitPrivate = (schema: z.ZodObject<any>) =>
  schema.omit(
    Object.keys(schema.shape)
      .filter((key) => key.startsWith("_"))
      .reduce((prev, key) => ({ ...prev, [key]: true }), {}),
  )
