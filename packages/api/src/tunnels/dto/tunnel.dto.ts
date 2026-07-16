import { IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTunnelDto {
  @ApiProperty({ example: 5173, description: 'Local port to tunnel' })
  @IsInt()
  @Min(1)
  @Max(65535)
  localPort: number;

  @ApiPropertyOptional({ example: 'http', default: 'http' })
  @IsOptional()
  @IsString()
  protocol?: string;

  @ApiPropertyOptional({ example: 'us-east', default: 'auto' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ description: 'Optional password to restrict visitor access to the tunnel' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ example: 'apex.clueliq.com', description: 'Optional custom domain to bind to this tunnel' })
  @IsOptional()
  @IsString()
  customDomain?: string;
}
