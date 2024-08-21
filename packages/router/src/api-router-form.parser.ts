/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ZodType } from "zod"

import { isZodType } from "@nystudio/nextapi-core"

export const parseFormDataWithValidation = (formData: FormData, validator: ZodType) => {
  const isArrayField = (key: string) => {
    if (!isZodType(validator, "ZodObject")) {
      return false
    }

    if (!validator.shape[key]) {
      return false
    }

    if (isZodType(validator.shape[key], "ZodOptional")) {
      // eslint-disable-next-line no-underscore-dangle
      return isZodType(validator.shape[key]._def.innerType, "ZodArray")
    }

    return isZodType(validator.shape[key], "ZodArray")
  }

  const form: { [key: string]: any } = {}
  const formDataEntityIter = formData.entries()
  let next = formDataEntityIter.next()

  while (!next.done) {
    const [key, formValue] = next.value

    const value = (() => {
      if ((formValue as any)?.constructor?.name === "File") {
        return formValue
      }

      try {
        return JSON.parse(formValue as any)
      } catch (_error) {
        return formValue
      }
    })()

    if (isArrayField(key)) {
      if (form[key]) {
        form[key].push(value)
      } else {
        form[key] = [value]
      }
    } else {
      form[key] = value
    }

    next = formDataEntityIter.next()
  }

  return validator.parse(form)
}
