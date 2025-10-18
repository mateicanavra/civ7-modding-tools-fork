var RandomPCG32;
((RandomPCG322) => {
  class RandomState {
    state = 0x08f5dc87e5c07d8an;
    inc = 0x3n;
  }
  RandomPCG322.RandomState = RandomState;
  function seed(value) {
    RandomPCG322.randomPCG32State.state = 0n;
    RandomPCG322.randomPCG32State.inc = 0x3n;
    rand();
    RandomPCG322.randomPCG32State.state += BigInt(value);
    rand();
  }
  RandomPCG322.seed = seed;
  function rand() {
    const oldState = RandomPCG322.randomPCG32State.state;
    RandomPCG322.randomPCG32State.state = (oldState * 6364136223846793005n & 0xffffffffffffffffn) + RandomPCG322.randomPCG32State.inc & 0xffffffffffffffffn;
    const xorshifted = (oldState >> 18n ^ oldState) >> 27n & 0xffffffffn;
    const rot0 = oldState >> 59n & 0xffffffffn;
    const rot1 = ~rot0 + 1n & 31n;
    const output = (xorshifted >> rot0 | xorshifted << rot1) & 0xffffffffn;
    return Number(output);
  }
  RandomPCG322.rand = rand;
  function fRand(strLog) {
    return getRandomNumber(65535, strLog) / 65535;
  }
  RandomPCG322.fRand = fRand;
  function getRandomNumber(iRange, strLog) {
    if (typeof TerrainBuilder == "object" && typeof TerrainBuilder.getRandomNumber == "function") {
      return TerrainBuilder.getRandomNumber(iRange, strLog);
    } else {
      return Math.floor((rand() & 65535) * (iRange / 65536));
    }
  }
  RandomPCG322.getRandomNumber = getRandomNumber;
  function getState() {
    return { state: RandomPCG322.randomPCG32State.state, inc: RandomPCG322.randomPCG32State.inc };
  }
  RandomPCG322.getState = getState;
  function setState(state) {
    RandomPCG322.randomPCG32State.state = state.state;
    RandomPCG322.randomPCG32State.inc = state.inc;
  }
  RandomPCG322.setState = setState;
  RandomPCG322.randomPCG32State = new RandomState();
})(RandomPCG32 || (RandomPCG32 = {}));
var GameCoreRandom;
((GameCoreRandom2) => {
  const RANDOM_A = 1103515245n;
  const RANDOM_C = 12345n;
  const RANDOM_SHIFT = 16n;
  const LOG_OUTPUT = false;
  class RandomState {
    state = 0x08f5dc87e5c07d8an;
  }
  GameCoreRandom2.RandomState = RandomState;
  function seed(value) {
    GameCoreRandom2.randomState.state = BigInt(value);
    if (LOG_OUTPUT) {
      console.log("GameCoreRandom: setting seed to " + value);
    }
  }
  GameCoreRandom2.seed = seed;
  function rand() {
    GameCoreRandom2.randomState.state = RANDOM_A * GameCoreRandom2.randomState.state + RANDOM_C & 0xffffffffn;
    return GameCoreRandom2.randomState.state >> RANDOM_SHIFT & 0xffffn;
  }
  GameCoreRandom2.rand = rand;
  function fRand(strLog) {
    return getRandomNumber(65535, strLog) / 65535;
  }
  GameCoreRandom2.fRand = fRand;
  function getRandomNumber(iRange, strLog) {
    let num = 0;
    if (typeof TerrainBuilder == "object" && typeof TerrainBuilder.getRandomNumber == "function") {
      num = TerrainBuilder.getRandomNumber(iRange, strLog);
    } else {
      num = Math.floor(Number(rand()) * (iRange / 65536));
    }
    if (LOG_OUTPUT) {
      console.log("GameCoreRandom: getRandomNumber(" + iRange + ', "' + strLog + '") = ' + num);
    }
    return num;
  }
  GameCoreRandom2.getRandomNumber = getRandomNumber;
  function getState() {
    if (LOG_OUTPUT) {
      console.log("GameCoreRandom: getState() called with current state " + GameCoreRandom2.randomState.state);
    }
    return { state: GameCoreRandom2.randomState.state };
  }
  GameCoreRandom2.getState = getState;
  function setState(state) {
    if (LOG_OUTPUT) {
      console.log("GameCoreRandom: setState(" + state.state + ")");
    }
    GameCoreRandom2.randomState.state = state.state;
  }
  GameCoreRandom2.setState = setState;
  GameCoreRandom2.randomState = new RandomState();
})(GameCoreRandom || (GameCoreRandom = {}));
const RandomImpl = GameCoreRandom;

export { GameCoreRandom, RandomImpl, RandomPCG32 };
//# sourceMappingURL=random-pcg-32.js.map
