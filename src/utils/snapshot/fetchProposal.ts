import axios from "axios";

const SNAPSHOT_ENDPOINT = "https://hub.snapshot.org/graphql";

const query = `query Proposal($id: String!) {
  proposal(id: $id) {
    id
    choices
    start
    end
    state
    scores 
    scores_total
  }
}`;
export interface SnapshotProposal {
  id: string;
  choices: string[];
  start: number;
  end: number;
  state: string;
  scores: number[];
  scores_total: string;
}
const fetchProposal = (proposalId: string) =>
  axios
    .post(SNAPSHOT_ENDPOINT, { query, variables: { id: proposalId } })
    .then((r) => r.data.data.proposal as SnapshotProposal);

export default fetchProposal;
