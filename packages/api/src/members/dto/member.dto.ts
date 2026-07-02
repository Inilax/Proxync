import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class InviteMemberDto {
  @ApiProperty({ example: 'bob@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ enum: Role, default: 'MEMBER' })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  role: Role;
}
