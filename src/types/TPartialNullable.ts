export type TPartialNullable<T> = {
    [P in keyof T]?: T[P] | null;
};
