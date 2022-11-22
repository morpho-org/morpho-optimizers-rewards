import { BigNumberish } from "ethers";

interface CustomMatchers<R = unknown> {
  toBnEquals(b2: BigNumberish): R;
  toBnBeGreaterThan(b2: BigNumberish): R;
  toBnBeGreaterThanOrEq(b2: BigNumberish): R;
  toBnBeLessThan(b2: BigNumberish): R;
  toBnBeLessThanOrEq(b2: BigNumberish): R;
  toBnBeZero(): R;
  toBnBeNegative(): R;
  toBnBePositive(): R;
  toBnBeApproxEquals(b2: BigNumberish, precision: BigNumberish): R;
}

declare global {
  namespace jest {
    interface Expect extends CustomMatchers {}
    interface Matchers<R> extends CustomMatchers<R> {}
    interface InverseAsymmetricMatchers extends CustomMatchers {}
  }
}
