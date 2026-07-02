import { Module, forwardRef } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { RequestsController } from './requests.controller';
import { TunnelsModule } from '../tunnels/tunnels.module';
import { RelayModule } from '../relay/relay.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TunnelsModule, forwardRef(() => RelayModule), AuthModule],
  providers: [RequestsService],
  controllers: [RequestsController],
  exports: [RequestsService],
})
export class RequestsModule {}
