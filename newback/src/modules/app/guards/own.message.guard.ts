import type {
  CanActivate,
  ExecutionContext,
} from "@nestjs/common";
import {
  Injectable,
  mixin,
} from "@nestjs/common";
import {MessageRepository} from "@/modules/rest/database/repository/messages.repository";
import {PubsubService} from "@/modules/rest/pubsub/pubsub.service";
import type {DefaultWsOutMessage} from "@/data/types/frontend";


export const MessagesFromMyRoomGuard = (selector: (dto: DefaultWsOutMessage<any>) => number[]) => {
  @Injectable()
  class OwnMessageGuardMixin implements CanActivate {
    constructor(
      private readonly messageRepository: MessageRepository,
      private readonly pubsubService: PubsubService,
    ) {
    }

    public async canActivate(
      context: ExecutionContext,
    ): Promise<boolean> {
      const ws = context.getArgByIndex(0);
      const body = context.getArgByIndex(1);
      const messagesId: number[] = selector(body).filter((m) => m);
      if (!messagesId.length) {
        return true;
      }
      const channels = this.pubsubService.getMyChannels(ws.context);
      const messages = await this.messageRepository.getMessagesById(messagesId, "roomId");
      const roomIds: number[] = messages.map((m) => m.roomId);
      return roomIds.every((id) => channels.includes(String(id)));
    }
  }

  return mixin(OwnMessageGuardMixin);
};

