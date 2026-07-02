import { IsString, IsOptional, IsIn } from 'class-validator';

export class CreateChannelDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsIn(['TEXT', 'VOICE'])
  type?: 'TEXT' | 'VOICE';
}
