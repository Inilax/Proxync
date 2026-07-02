import { Module, forwardRef } from '@nestjs/common';
import { RelayGateway } from './relay.gateway';
import { TunnelsModule } from '../tunnels/tunnels.module';
import { AuthModule } from '../auth/auth.module';
import { RequestsModule } from '../requests/requests.module';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [TunnelsModule, AuthModule, forwardRef(() => RequestsModule), MessagesModule],
  providers: [RelayGateway],
  exports: [RelayGateway],
})
export class RelayModule {}
