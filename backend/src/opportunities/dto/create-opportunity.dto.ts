import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { opportunityStages, type OpportunityStage } from './opportunity-stage';

export class CreateOpportunityDto {
  @IsString()
  @MinLength(1)
  customerId!: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;

  @IsIn(opportunityStages)
  stage!: OpportunityStage;

  @IsOptional()
  @IsDateString()
  expectedCloseDate?: string;
}
