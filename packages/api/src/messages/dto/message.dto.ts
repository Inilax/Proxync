import { IsString, IsOptional, IsIn } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  text: string;

  @IsOptional()
  @IsIn(['CHAT', 'FEEDBACK'])
  kind?: 'CHAT' | 'FEEDBACK';

  @IsOptional()
  @IsString()
  screenshotUrl?: string;
}

export class UpdateMessageDto {
  @IsOptional()
  resolved?: boolean;

  @IsOptional()
  @IsString()
  text?: string;
}
