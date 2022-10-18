import { ages } from "../ages";

export const getNumberOfEpochs = () => ages.flatMap((age) => age.epochs).length;
