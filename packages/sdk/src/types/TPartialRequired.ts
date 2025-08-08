export type TPartialRequired<T, K extends keyof T> = Partial<T> & { [P in K]-?: NonNullable<T[P]> };
