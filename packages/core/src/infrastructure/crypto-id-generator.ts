import type { IdGenerator } from "../domain/id-generator";
import type { CompletionEventId, RoutineId } from "../domain/identity";

// Web Crypto API's randomUUID() is a global available natively in Bun (and
// modern Node) — no external UUID/nanoid dependency needed.
export class CryptoIdGenerator implements IdGenerator {
	newRoutineId(): RoutineId {
		return crypto.randomUUID() as RoutineId;
	}

	newCompletionEventId(): CompletionEventId {
		return crypto.randomUUID() as CompletionEventId;
	}
}
