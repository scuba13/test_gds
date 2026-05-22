import { IsIn } from 'class-validator';
import { opportunityStages, type OpportunityStage } from './opportunity-stage';

export class MoveOpportunityDto {
  @IsIn(opportunityStages)
  toStage!: OpportunityStage;
}
