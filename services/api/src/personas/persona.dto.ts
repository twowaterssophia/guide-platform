import { Transform, Type } from 'class-transformer'
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator'

export class PersonaCustomSkillInputDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @IsNotEmpty()
  skillId!: string

  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @IsNotEmpty()
  @MaxLength(2_000)
  instruction!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(2_000)
  example!: string
}

export class PersonaWriteDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string

  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  voice!: string

  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MaxLength(8_000)
  prompt!: string

  @IsBoolean()
  presetSkillsEnabled!: boolean

  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => PersonaCustomSkillInputDto)
  customSkills!: PersonaCustomSkillInputDto[]
}

export class PersonaUpdateDto extends PersonaWriteDto {
  @IsInt()
  @Min(1)
  expectedVersion!: number
}

export class ListPersonasQuery {
  @IsOptional()
  @IsString()
  cursor?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20
}
