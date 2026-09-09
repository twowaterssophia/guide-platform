import { IsBooleanString, IsIn, IsOptional } from 'class-validator'
import type { SkillSource } from '@guide/contracts'

export class ListSkillsQuery {
  @IsOptional()
  @IsIn(['official', 'cloud'])
  source?: SkillSource

  @IsOptional()
  @IsBooleanString()
  compatible?: string
}
