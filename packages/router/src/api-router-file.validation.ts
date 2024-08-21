import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export const NextApiRouterFileValidation = z
  .instanceof(Buffer)
  .openapi('File', {
    type: 'string',
    format: 'binary',
  });

export function isNextApiRouterFileValidation(
  obj: any,
): obj is typeof NextApiRouterFileValidation {
  // eslint-disable-next-line no-underscore-dangle
  return obj?._def?.openapi?.metadata?.format === 'binary';
}
