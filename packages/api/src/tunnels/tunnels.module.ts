import { Module } from '@nestjs/common';
import { TunnelsService } from './tunnels.service';
import { TunnelsController } from './tunnels.controller';
import { AuthModule } from '../auth/auth.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [AuthModule, WorkspacesModule],
  providers: [TunnelsService],
  controllers: [TunnelsController],
  exports: [TunnelsService],
})
export class TunnelsModule {}
