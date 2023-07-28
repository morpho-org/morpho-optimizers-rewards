export const now = () => Math.round(Date.now() / 1000);

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
