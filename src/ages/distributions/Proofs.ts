export interface Proof {
  amount: string;
  proof: string[];
}

export interface Proofs {
  epochId: string;
  root: string;
  total: string;
  proofs: { [address: string]: Proof | undefined };
}
