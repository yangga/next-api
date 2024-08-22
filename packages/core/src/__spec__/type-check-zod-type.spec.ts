import { z, ZodType } from "zod"

describe("type check it is zod type or not", () => {
  test("z.object should be zod type", () => {
    expect(z.object({})).toBeInstanceOf(ZodType)
    expect(z.object({}) instanceof ZodType).toBeTruthy()
  })

  test("{} should not be zod type", () => {
    expect({}).not.toBeInstanceOf(ZodType)
    expect({} instanceof ZodType).toBeFalsy()
  })
})
