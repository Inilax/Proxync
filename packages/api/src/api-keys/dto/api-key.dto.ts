import { IsString, MinLength, IsArray, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const VALID_SCOPES = [
  'tunnels:read',
  'tunnels:write',
  'tunnels:delete',
  'requests:read',
  'workspace:read',
] as const;

export type ApiKeyScope = (typeof VALID_SCOPES)[number];

export class CreateApiKeyDto {
  @ApiProperty({ example: 'CI Pipeline Key' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({
    example: ['tunnels:write', 'tunnels:read'],
    description: `Valid scopes: ${VALID_SCOPES.join(', ')}`,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];
}
