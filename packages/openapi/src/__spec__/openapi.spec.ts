import { z } from "zod"
import { nextApiStoreRouterOpenapiDocument } from "../openapi"

describe("openapi > nextApiStoreRouterOpenapiDocument", () => {
  test("should success method get", async () => {
    nextApiStoreRouterOpenapiDocument({
      __dirname,
      summary: "Get a user",
      tags: ["user"],
      method: "get",
      validation: {
        response: z.object({
          id: z.number().int().positive(),
        }),
      },
    })
  })
})
