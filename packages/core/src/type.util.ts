type TheRecord = Record<string, unknown>

export type NullFieldToOptionalDeep<T> = T extends TheRecord
  ? {
      [P in keyof T as null extends T[P] ? P : never]?:
        | null
        | (NonNullable<T[P]> extends TheRecord
            ? NullFieldToOptionalDeep<NonNullable<T[P]>> | (undefined extends T[P] ? undefined : never)
            : T[P])
    } & {
      [P in keyof T as null extends T[P] ? never : P]: NonNullable<T[P]> extends TheRecord
        ? NullFieldToOptionalDeep<NonNullable<T[P]>> | (undefined extends T[P] ? undefined : never)
        : T[P]
    }
  : T

export type UndefinedFieldToOptionalDeep<T> = T extends TheRecord
  ? {
      [P in keyof T as undefined extends T[P] ? P : never]?:
        | undefined
        | (NonNullable<T[P]> extends TheRecord
            ? UndefinedFieldToOptionalDeep<NonNullable<T[P]>> | (null extends T[P] ? null : never)
            : T[P])
    } & {
      [P in keyof T as undefined extends T[P] ? never : P]: NonNullable<T[P]> extends TheRecord
        ? UndefinedFieldToOptionalDeep<NonNullable<T[P]>> | (null extends T[P] ? null : never)
        : T[P]
    }
  : T
