export const opportunityStages = [
  'NEW',
  'QUALIFIED',
  'PROPOSAL',
  'NEGOTIATION',
  'WON',
  'LOST',
] as const;

export type OpportunityStage = (typeof opportunityStages)[number];
