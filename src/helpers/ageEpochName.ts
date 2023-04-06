export const epochNumberToAgeEpoch = (epochNumber: number) => {
  // age1 - age3: 3 epochs per age
  // after the end of age3, there is one epoch per age. So we start at epoch 10, with age4 epoch1
  if (epochNumber > 9) return { age: epochNumber - 6, epoch: 1 };
  const age = Math.floor((epochNumber - 1) / 3) + 1;
  const epoch = ((epochNumber - 1) % 3) + 1;
  return { age, epoch };
};

export const epochNumberToAgeEpochString = (epochNumber: number) => {
  const { epoch, age } = epochNumberToAgeEpoch(epochNumber);
  return { age: `age${age}`, epoch: `epoch${epoch}` };
};
