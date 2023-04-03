export const epochNumberToAgeEpochString = (epochNumber: number) => {
  // age1 - age3: 3 epochs per age
  // after the end of age3, there is one epoch per age
  if (epochNumber > 9) return { age: `age${epochNumber - 9}`, epoch: `epoch${epochNumber - 9}` };

  return {
    age: `age${Math.floor((epochNumber - 1) / 3) + 1}`,
    epoch: `epoch${((epochNumber - 1) % 3) + 1}`,
  };
};
