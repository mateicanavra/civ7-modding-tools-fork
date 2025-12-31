// Civ7’s embedded V8 rejects Unicode property escapes in regexes (e.g., \p{ID_Start}).
// TypeBox's guard emitter uses such a regex to decide between dot vs bracket member access.
// This shim replaces it with an ASCII-only identifier check.

// ------------------------------------------------------------------
// Identifier
// ------------------------------------------------------------------
const identifierRegExp = /^[$A-Z_][0-9A-Z_$]*$/i;
/** Returns true if this value is a valid JavaScript identifier (ASCII subset). */
function isIdentifier(value: string) {
  return identifierRegExp.test(value);
}

// ------------------------------------------------------------------
// Logical
// ------------------------------------------------------------------
export function And(left: string, right: string) {
  return `(${left} && ${right})`;
}
export function Or(left: string, right: string) {
  return `(${left} || ${right})`;
}
export function Not(expr: string) {
  return `!(${expr})`;
}

// --------------------------------------------------------------------------
// Guards
// --------------------------------------------------------------------------
/** Returns true if this value is an array */
export function IsArray(value: string) {
  return `Array.isArray(${value})`;
}
/** Returns true if this value is an async iterator */
export function IsAsyncIterator(value: string) {
  return `Guard.IsAsyncIterator(${value})`;
}
/** Returns true if this value is bigint */
export function IsBigInt(value: string) {
  return `typeof ${value} === "bigint"`;
}
/** Returns true if this value is a boolean */
export function IsBoolean(value: string) {
  return `typeof ${value} === "boolean"`;
}
/** Returns true if this value is integer */
export function IsInteger(value: string) {
  return `Number.isInteger(${value})`;
}
/** Returns true if this value is an iterator */
export function IsIterator(value: string) {
  return `Guard.IsIterator(${value})`;
}
/** Returns true if this value is null */
export function IsNull(value: string) {
  return `${value} === null`;
}
/** Returns true if this value is number */
export function IsNumber(value: string) {
  return `Number.isFinite(${value})`;
}
/** Returns true if this value is an object but not an array */
export function IsObjectNotArray(value: string) {
  return And(IsObject(value), Not(IsArray(value)));
}
/** Returns true if this value is an object */
export function IsObject(value: string) {
  return `typeof ${value} === "object" && ${value} !== null`;
}
/** Returns true if this value is string */
export function IsString(value: string) {
  return `typeof ${value} === "string"`;
}
/** Returns true if this value is symbol */
export function IsSymbol(value: string) {
  return `typeof ${value} === "symbol"`;
}
/** Returns true if this value is undefined */
export function IsUndefined(value: string) {
  return `${value} === undefined`;
}

// ------------------------------------------------------------------
// Functions and Constructors
// ------------------------------------------------------------------
export function IsFunction(value: string) {
  return `typeof ${value} === "function"`;
}
export function IsConstructor(value: string) {
  return `Guard.IsConstructor(${value})`;
}

// ------------------------------------------------------------------
// Relational
// ------------------------------------------------------------------
export function IsEqual(left: string, right: string) {
  return `${left} === ${right}`;
}
export function IsGreaterThan(left: string, right: string) {
  return `${left} > ${right}`;
}
export function IsLessThan(left: string, right: string) {
  return `${left} < ${right}`;
}
export function IsLessEqualThan(left: string, right: string) {
  return `${left} <= ${right}`;
}
export function IsGreaterEqualThan(left: string, right: string) {
  return `${left} >= ${right}`;
}

// --------------------------------------------------------------------------
// String
// --------------------------------------------------------------------------
export function StringGraphemeCount(value: string) {
  return `Guard.StringGraphemeCount(${value})`;
}

// --------------------------------------------------------------------------
// Array
// --------------------------------------------------------------------------
export function Every(value: string, offset: string, params: [string, string], expression: string) {
  return offset === "0"
    ? `${value}.every((${params[0]}, ${params[1]}) => ${expression})`
    : `((value, callback) => { for(let index = ${offset}; index < value.length; index++) if (!callback(value[index], index)) return false; return true })(${value}, (${params[0]}, ${params[1]}) => ${expression})`;
}

// --------------------------------------------------------------------------
// Objects
// --------------------------------------------------------------------------
export function Entries(value: string) {
  return `Object.entries(${value})`;
}
export function Keys(value: string) {
  return `Object.getOwnPropertyNames(${value})`;
}
export function HasPropertyKey(value: string, key: string) {
  const isProtoField =
    key === '"__proto__"' || key === '"toString"' || key === '"constructor"';
  return isProtoField ? `Object.prototype.hasOwnProperty.call(${value}, ${key})` : `${key} in ${value}`;
}
export function IsDeepEqual(left: string, right: string) {
  return `Guard.IsDeepEqual(${left}, ${right})`;
}

// ------------------------------------------------------------------
// Expressions
// ------------------------------------------------------------------
export function ArrayLiteral(elements: string[]) {
  return `[${elements.join(", ")}]`;
}
export function ArrowFunction(parameters: string[], body: string) {
  return `((${parameters.join(", ")}) => ${body})`;
}
export function Call(value: string, arguments_: string[]) {
  return `${value}(${arguments_.join(", ")})`;
}
export function New(value: string, arguments_: string[]) {
  return `new ${value}(${arguments_.join(", ")})`;
}
export function Member(left: string, right: string) {
  return `${left}${isIdentifier(right) ? `.${right}` : `[${Constant(right)}]`}`;
}
export function Constant(value: unknown) {
  return typeof value === "string" ? JSON.stringify(value) : `${value}`;
}
export function Ternary(condition: string, true_: string, false_: string) {
  return `(${condition} ? ${true_} : ${false_})`;
}

// ------------------------------------------------------------------
// Statements
// ------------------------------------------------------------------
export function Statements(statements: string[]) {
  return `{ ${statements.join("; ")}; }`;
}
export function ConstDeclaration(identifier: string, expression: string) {
  return `const ${identifier} = ${expression}`;
}
export function If(condition: string, then: string) {
  return `if(${condition}) { ${then} }`;
}
export function Return(expression: string) {
  return `return ${expression}`;
}

// ------------------------------------------------------------------
// Logical
// ------------------------------------------------------------------
export function ReduceAnd(operands: string[]) {
  return operands.length === 0 ? "true" : operands.reduce((left, right) => And(left, right));
}
export function ReduceOr(operands: string[]) {
  return operands.length === 0 ? "false" : operands.reduce((left, right) => Or(left, right));
}

// --------------------------------------------------------------------------
// Arithmatic
// --------------------------------------------------------------------------
export function PrefixIncrement(expression: string) {
  return `++${expression}`;
}
export function MultipleOf(dividend: string, divisor: string) {
  return `Guard.IsMultipleOf(${dividend}, ${divisor})`;
}

