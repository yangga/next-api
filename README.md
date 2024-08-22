# next-api

next-api is a library that handles data validation of [Nextjs Api Routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) with the [Zod](https://zod.dev/) library.

## Requirement

- Nextjs >= 14

## Installation

```bash
npm i @nystudio/nextapi-core @nystudio/nextapi-router
```

## Features

- api router
- openapi
- circuit breaker

Basic usage

```typescript
import { NextApiRouter } from '@nystudio/nextapi-router';

// file: ApiRouter.ts
export const routerSingleton = new NextApiRouter()

// file: /src/app/api/users/route.ts
import { routerSingleton } from 'ApiRouter';

export const POST = routerSingleton.apiRouter(
  async ({ request }) => {
    console.log("requested", request.data.name)
    return Promise.resolve({
      id: 12345,
      name: request.data.name,
    })
  },
  {
    validation: {
      data: z.object({
        name: z.string(),
      }),
      response: z.object({
        id: z.number().int().positive(),
        name: z.string(),
      }),
    },
  },
);

// file: /src/app/api/users/[userId]/route.ts
import { routerSingleton } from 'ApiRouter';

export const GET = routerSingleton.apiRouter(async ({ request }) => {
  ...
});

```

## OpenApi

Here is how to use open api with next-api

##### Install the dependencies

```bash
npm i @nystudio/nextapi-openapi swagger-ui-react
```

##### Register a route

next-api registers routers in NextJS build time.

```typescript
import { NextApiRouterOpenapiOption, nextApiStoreRouterOpenapiDocument } from "@nystudio/nextapi-openapi"

// file: ApiRouter.ts
const routerSingleton = new NextApiRouter<NextApiRouterOpenapiOption>() // <-- use openapi router type

routerSingleton.addEventListener("onRouteAdded", async (options) => {
  try {
    nextApiStoreRouterOpenapiDocument(options)
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error("Unknown Error")

    console.error(
      // eslint-disable-next-line no-underscore-dangle
      `[ERROR] failed nextApiStoreRouterOpenapiDocument: path[${options.__dirname}] method:[${options.method}]`,
      err.message,
    )
    throw error
  }
})

// file: /src/app/api/users/[userId]/route.ts
import { routerSingleton } from "ApiRouter"

export const GET = routerSingleton.apiRouter(
  async ({ request }) => {
    console.log("requested", request.params.userId)
    return Promise.resolve({
      id: request.params.userId,
      name: "test user",
    })
  },
  {
    __dirname,
    method: "get",
    validation: {
      params: {
        userId: z.number().int().positive(),
      },
      response: z.object({
        id: z.number().int().positive(),
        name: z.string(),
      }),
    },
  },
)
```

##### Rendering open api with NextJS

```typescript
// src/app/openapi/react-swagger.tsx
import "swagger-ui-react/swagger-ui.css"

import SwaggerUI from "swagger-ui-react"

type Props = {
  spec: Record<string, any>
}

function ReactSwagger({ spec }: Readonly<Props>) {
  return <SwaggerUI spec={spec} />
}

export default ReactSwagger

// src/app/openapi/page.tsx
import ReactSwagger from "./react-swagger"

import { nextApiCreateNextApiSwaggerSpec } from "@nystudio/nextapi-openapi"

export default async function IndexPage() {
  const spec = nextApiCreateNextApiSwaggerSpec({
    openapi: "3.0.0",
    info: {
      title: "Hello API",
      version: "1.0",
    },
  })

  return (
    <section className="container">
      <ReactSwagger spec={spec} />
    </section>
  )
}
```
