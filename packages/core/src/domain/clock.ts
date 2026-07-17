// Injected so status computation and completion logging are testable
// without depending on wall-clock time.
export interface Clock {
	now(): Date;
}
