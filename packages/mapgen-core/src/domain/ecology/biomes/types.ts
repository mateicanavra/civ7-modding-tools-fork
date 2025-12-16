export interface BiomeConfig {
  tundra?: {
    latMin?: number;
    elevMin?: number;
    rainMax?: number;
  };
  tropicalCoast?: {
    latMax?: number;
    rainMin?: number;
  };
  riverValleyGrassland?: {
    latMax?: number;
    rainMin?: number;
  };
  riftShoulder?: {
    grasslandLatMax?: number;
    grasslandRainMin?: number;
    tropicalLatMax?: number;
    tropicalRainMin?: number;
  };
}

export interface CorridorPolicy {
  land?: {
    biomesBiasStrength?: number;
  };
  river?: {
    biomesBiasStrength?: number;
  };
}

export interface BiomeGlobals {
  tundra: number;
  tropical: number;
  grassland: number;
  plains: number;
  desert: number;
  snow: number;
}

