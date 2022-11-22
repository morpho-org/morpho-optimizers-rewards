import { BigNumber, BigNumberish } from "ethers";

expect.extend({
  toBnEquals: (b1: BigNumberish, b2: BigNumberish) => {
    b1 = BigNumber.from(b1);
    b2 = BigNumber.from(b2);
    const message = () => `Expect ${b1.toString()} to equals ${b2}`;
    if (b1.eq(b2))
      return {
        message,
        pass: true,
      };
    return {
      message,
      pass: false,
    };
  },
  toBnBeGreaterThan: (b1: BigNumberish, b2: BigNumberish) => {
    b1 = BigNumber.from(b1);
    b2 = BigNumber.from(b2);
    const message = () => `Expect ${b1.toString()} to be greater than ${b2}`;
    if (b1.gt(b2))
      return {
        message,
        pass: true,
      };
    return {
      message,
      pass: false,
    };
  },
  toBnBeGreaterThanOrEq: (b1: BigNumberish, b2: BigNumberish) => {
    b1 = BigNumber.from(b1);
    b2 = BigNumber.from(b2);
    const message = () => `Expect ${b1.toString()} to be greater or equal than ${b2}`;
    if (b1.gte(b2))
      return {
        message,
        pass: true,
      };
    return {
      message,
      pass: false,
    };
  },
  toBnBeLessThan: (b1: BigNumberish, b2: BigNumberish) => {
    b1 = BigNumber.from(b1);
    b2 = BigNumber.from(b2);
    const message = () => `Expect ${b1.toString()} to be less than ${b2}`;
    if (b1.lt(b2))
      return {
        message,
        pass: true,
      };
    return {
      message,
      pass: false,
    };
  },
  toBnBeLessThanOrEq: (b1: BigNumberish, b2: BigNumberish) => {
    b1 = BigNumber.from(b1);
    b2 = BigNumber.from(b2);
    const message = () => `Expect ${b1.toString()} to be less or equal of ${b2}`;
    if (b1.lte(b2))
      return {
        message,
        pass: true,
      };
    return {
      message,
      pass: false,
    };
  },
  toBnBeZero: (b1: BigNumberish) => {
    b1 = BigNumber.from(b1);
    const message = () => `Expect ${b1.toString()} to be equal to zero`;
    if (b1.isZero())
      return {
        message,
        pass: true,
      };
    return {
      message,
      pass: false,
    };
  },
  toBnBeNegative: (b1: BigNumberish) => {
    b1 = BigNumber.from(b1);
    const message = () => `Expect ${b1.toString()} to be less than zero`;
    if (b1.lte(0))
      return {
        message,
        pass: true,
      };
    return {
      message,
      pass: false,
    };
  },
  toBnBePositive: (b1: BigNumberish) => {
    b1 = BigNumber.from(b1);
    const message = () => `Expect ${b1.toString()} to be greater than zero`;
    if (b1.gte(0))
      return {
        message,
        pass: true,
      };
    return {
      message,
      pass: false,
    };
  },
  toBnBeApproxEquals: (b1: BigNumberish, b2: BigNumberish, precision: BigNumberish) => {
    b1 = BigNumber.from(b1);
    b2 = BigNumber.from(b2);
    const diff = b1.gt(b2) ? b1.sub(b2) : b2.sub(b1);

    const message = () =>
      `Expect ${b1.toString()} to be approx equals to ${b2.toString()} with a precision of ${precision}. diff: ${diff.toString()}`;
    if (diff.lte(precision))
      return {
        message,
        pass: true,
      };
    return {
      message,
      pass: false,
    };
  },
});
