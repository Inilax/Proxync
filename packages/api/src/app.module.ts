import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { MembersModule } from './members/members.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { TunnelsModule } from './tunnels/tunnels.module';
import { HealthModule } from './health/health.module';
import { RelayModule } from './relay/relay.module';
import { RelayMiddleware } from './relay/relay.middleware';
import { RequestsModule } from './requests/requests.module';
import { ChannelsModule } from './channels/channels.module';
import { MessagesModule } from './messages/messages.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    WorkspacesModule,
    MembersModule,
    ApiKeysModule,
    TunnelsModule,
    RelayModule,
    RequestsModule,
    ChannelsModule,
    MessagesModule,
    HealthModule,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RelayMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
