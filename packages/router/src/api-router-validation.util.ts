/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ZodType } from "zod"
import { z } from "zod"

import type { NextApiRouterValidationType } from "./api-router.type"
import { isNextApiRouterFileValidation } from "./api-router-file.validation"
import { isZodType } from "@nystudio/nextapi-core"

export const toNextApiRouterValidation = (validation: NextApiRouterValidationType) => {
  const toZodObj = validation instanceof z.ZodType ? validation : z.object(validation)

  return convert(toZodObj)
}

const convert = (obj: ZodType<any, any, any>, myPath = ""): ZodType<any, any, any> => {
  if (isZodType(obj, "ZodObject")) {
    return z
      .object(
        Object.entries(obj.shape).reduce((prev, [key, value]) => {
          return {
            ...prev,
            [key]: convert(value as any, `${myPath}/${key}`),
          }
        }, {}),
      )
      .strip()
  }

  if (isZodType(obj, "ZodOptional")) {
    // eslint-disable-next-line no-underscore-dangle
    return convert(obj._def.innerType, myPath).optional()
  }

  if (isZodType(obj, "ZodUnion")) {
    return z.union(
      // eslint-disable-next-line no-underscore-dangle
      obj._def.options.map((option: ZodType<any, any, any>) => convert(option, myPath)),
    )
  }

  if (isZodType(obj, "ZodArray")) {
    return z.array(convert(obj.element, `${myPath}/[number]`))
  }

  if (isNextApiRouterFileValidation(obj)) {
    // eslint-disable-next-line no-underscore-dangle
    const properties = obj._def.openapi?.metadata?.properties ?? {}

    return z.any().superRefine((value: File | undefined, ctx) => {
      if (!value?.size) {
        return ctx.addIssue({
          code: "custom",
          message: "File is required",
          path: [myPath],
        })
      }

      if (properties.size) {
        const { size } = properties as any
        if (size.maxLength) {
          if (value.size > size.maxLength) {
            return ctx.addIssue({
              code: "custom",
              message: "File is too large",
              path: [myPath],
            })
          }
        }
      }

      return undefined
    })
  }

  return obj
}
