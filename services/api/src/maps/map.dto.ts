import { Transform, Type } from 'class-transformer'
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'

export class ListMapsQuery {
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

export class RenameMapDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string

  @IsInt()
  @Min(1)
  expectedVersion!: number
}

export interface MapUploadFile {
  fileName: string
  mediaType: string
  value: Buffer
}

export interface MapUploadInput {
  name: string
  pcd: MapUploadFile
  preview: MapUploadFile
  metadata: MapUploadFile
}
