import { Transform } from 'class-transformer'
import { IsNotEmpty, IsString, MaxLength } from 'class-validator'

export class AgentDeviceQueryDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  deviceId!: string
}

export class AgentDeviceInputDto extends AgentDeviceQueryDto {}
