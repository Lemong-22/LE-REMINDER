export type Brand<T, B extends string> = T & { readonly __brand: B };

export type RoutineId = Brand<string, "RoutineId">;
export type CompletionEventId = Brand<string, "CompletionEventId">;
