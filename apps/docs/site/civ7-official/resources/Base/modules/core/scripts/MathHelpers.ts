
export function op2(a: float2, b: float2, op: (a: number, b: number) => number): float2 { return { x: op(a.x, b.x), y: op(a.y, b.y) }; }
export function op3(a: float3, b: float3, op: (a: number, b: number) => number): float3 { return { x: op(a.x, b.x), y: op(a.y, b.y), z: op(a.z, b.z) }; }
export function op4(a: float4, b: float4, op: (a: number, b: number) => number): float4 { return { x: op(a.x, b.x), y: op(a.y, b.y), z: op(a.z, b.z), w: op(a.w, b.w) }; }
export function op2s(a: float2, b: number, op: (a: number, b: number) => number): float2 { return { x: op(a.x, b), y: op(a.y, b) }; }
export function op3s(a: float3, b: number, op: (a: number, b: number) => number): float3 { return { x: op(a.x, b), y: op(a.y, b), z: op(a.z, b) }; }
export function op4s(a: float4, b: number, op: (a: number, b: number) => number): float4 { return { x: op(a.x, b), y: op(a.y, b), z: op(a.z, b), w: op(a.w, b) }; }

export function neg2(a: float2) { return { x: -a.x, y: -a.y }; }
export function neg3(a: float3) { return { x: -a.x, y: -a.y, z: -a.z }; }
export function neg4(a: float4) { return { x: -a.x, y: -a.y, z: -a.z, w: -a.w }; }

export function add1(a: number, b: number): number { return a + b }
export function add2(a: float2, b: float2) { return op2(a, b, add1); }
export function add3(a: float3, b: float3) { return op3(a, b, add1); }
export function add4(a: float4, b: float4) { return op4(a, b, add1); }

export function sub1(a: number, b: number): number { return a - b }
export function sub2(a: float2, b: float2) { return op2(a, b, sub1); }
export function sub3(a: float3, b: float3) { return op3(a, b, sub1); }
export function sub4(a: float4, b: float4) { return op4(a, b, sub1); }

export function mul1(a: number, b: number): number { return a * b }
export function mul2(a: float2, b: float2) { return op2(a, b, mul1); }
export function mul3(a: float3, b: float3) { return op3(a, b, mul1); }
export function mul4(a: float4, b: float4) { return op4(a, b, mul1); }
export function mul2s(a: float2, b: number) { return op2s(a, b, mul1); }
export function mul3s(a: float3, b: number) { return op3s(a, b, mul1); }
export function mul4s(a: float4, b: number) { return op4s(a, b, mul1); }

export function div1(a: number, b: number): number { return a / b }
export function div2(a: float2, b: float2) { return op2(a, b, div1); }
export function div3(a: float3, b: float3) { return op3(a, b, div1); }
export function div4(a: float4, b: float4) { return op4(a, b, div1); }
export function div2s(a: float2, b: number) { return op2s(a, b, div1); }
export function div3s(a: float3, b: number) { return op3s(a, b, div1); }
export function div4s(a: float4, b: number) { return op4s(a, b, div1); }

export function length2(a: float2): number { return Math.sqrt(dot2(a, a)); }
export function length3(a: float3): number { return Math.sqrt(dot3(a, a)); }
export function length4(a: float4): number { return Math.sqrt(dot4(a, a)); }

export function norm2(a: float2): float2 { return div2s(a, length2(a)); }
export function norm3(a: float3): float3 { return div3s(a, length3(a)); }
export function norm4(a: float4): float4 { return div4s(a, length4(a)); }

export function dot2(a: float2, b: float2) {
	const mul: float2 = mul2(a, b);
	return mul.x + mul.y
};
// dot product of a and b with b rotated 90 degrees
export function dot2_90(a: float2, b: float2) {
	return a.y * b.x - a.x * b.y;
};
export function dot3(a: float3, b: float3) {
	const mul: float3 = mul3(a, b);
	return mul.x + mul.y + mul.z;
};
export function dot4(a: float4, b: float4) {
	const mul: float4 = mul4(a, b);
	return mul.x + mul.y + mul.z + mul.w;
};

export function rotate2(a: float2, radians: number) {
	const sincos: float2 = { x: Math.cos(radians), y: Math.sin(radians) };
	return { x: sincos.x * a.x - sincos.y * a.y, y: sincos.y * a.x + sincos.x * a.y };
}