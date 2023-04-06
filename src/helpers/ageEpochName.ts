export const epochNumberToAgeEpochString = (epochNumber: number) => {
  // age1 - age3: 3 epochs per age
  // after the end of age3, there is one epoch per age. So we start at epoch 10, with age4 epoch1
  if (epochNumber > 9) return { age: `age${epochNumber - 6}`, epoch: "epoch1" };

  return {
    age: `age${Math.floor((epochNumber - 1) / 3) + 1}`,
    epoch: `epoch${((epochNumber - 1) % 3) + 1}`,
  };
};
