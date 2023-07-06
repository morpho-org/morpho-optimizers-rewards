export const parseDate = (date: string) => {
  const timestamp = Math.floor(new Date(date).getTime() / 1000);
  if (!timestamp || isNaN(timestamp)) throw new Error(`Invalid date: ${date}`);
  return timestamp;
};

export const isDefined = <T>(value: T | undefined | null): value is T => value !== undefined && value !== null;
