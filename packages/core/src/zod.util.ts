/* eslint-disable @typescript-eslint/no-explicit-any */
import { NullFieldToOptionalDeep, UndefinedFieldToOptionalDeep } from "./type.util"

import type { TypeOf, z, ZodArray, ZodObject, ZodRawShape, ZodType } from "zod"

type ZodTypes = {
  ZodAny: z.ZodAny
  ZodArray: z.ZodArray<any>
  ZodBigInt: z.ZodBigInt
  ZodBoolean: z.ZodBoolean
  ZodBranded: z.ZodBranded<any, any>
  ZodDefault: z.ZodDefault<any>
  ZodEffects: z.ZodEffects<any>
  ZodEnum: z.ZodEnum<any>
  ZodIntersection: z.ZodIntersection<any, any>
  ZodLazy: z.ZodLazy<any>
  ZodLiteral: z.ZodLiteral<any>
  ZodNativeEnum: z.ZodNativeEnum<any>
  ZodNever: z.ZodNever
  ZodNull: z.ZodNull
  ZodNullable: z.ZodNullable<any>
  ZodNumber: z.ZodNumber
  ZodObject: z.AnyZodObject
  ZodOptional: z.ZodOptional<any>
  ZodPipeline: z.ZodPipeline<any, any>
  ZodReadonly: z.ZodReadonly<any>
  ZodRecord: z.ZodRecord
  ZodSchema: z.ZodSchema
  ZodString: z.ZodString
  ZodTuple: z.ZodTuple
  ZodType: z.ZodType
  ZodTypeAny: z.ZodTypeAny
  ZodUnion: z.ZodUnion<any>
  ZodDiscriminatedUnion: z.ZodDiscriminatedUnion<any, any>
  ZodUnknown: z.ZodUnknown
  ZodVoid: z.ZodVoid
  ZodDate: z.ZodDate
}

export function isZodType<TypeName extends keyof ZodTypes>(
  schema: object,
  typeName: TypeName,
): schema is ZodTypes[TypeName] {
  // eslint-disable-next-line no-underscore-dangle
  return (schema as any)?._def?.typeName === typeName
}

type ExportFromZod<T extends ZodType<any, any, any>> = T["_output"] extends InstanceType<typeof Buffer>
  ? File
  : T["_output"] extends InstanceType<typeof Buffer>[]
  ? File[]
  : T extends z.ZodOptional<infer U>
  ? ExportFromZod<U> | undefined
  : TypeOf<T>

export type ExportTypeFromValidation<
  T extends ZodRawShape | ZodType<any, any, any> | undefined,
  DEFAULT = never,
> = T extends ZodRawShape
  ? UndefinedFieldToOptionalDeep<
      NullFieldToOptionalDeep<{
        [Key in keyof T]: ExportTypeFromValidation<T[Key]>
      }>
    >
  : T extends ZodObject<infer U>
  ? ExportTypeFromValidation<U>
  : T extends ZodArray<infer U>
  ? ExportTypeFromValidation<U>[]
  : T extends ZodType<any, any, any>
  ? ExportFromZod<T>
  : DEFAULT
