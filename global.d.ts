import { BigNumberish } from "ethers";

interface CustomMatchers<R = unknown> {
  toBnEq(b2: BigNumberish): R;
  toBnGt(b2: BigNumberish): R;
  toBnGte(b2: BigNumberish): R;
  toBnLt(b2: BigNumberish): R;
  toBnLte(b2: BigNumberish): R;
  toBnBeZero(): R;
  toBnBeNegative(): R;
  toBnBePositive(): R;
  toBnApproxEq(b2: BigNumberish, precision: BigNumberish): R;
}

declare global {
  namespace jest {
    interface Expect extends CustomMatchers {}
    interface Matchers<R> extends CustomMatchers<R> {}
    interface InverseAsymmetricMatchers extends CustomMatchers {}
  }
}
