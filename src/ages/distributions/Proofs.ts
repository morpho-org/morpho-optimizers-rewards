export interface Proof {
  amount: string;
  proof: string[];
}

export interface Proofs {
  epochNumber: number;
  root: string;
  total: string;
  proofs: { [address: string]: Proof | undefined };
}
