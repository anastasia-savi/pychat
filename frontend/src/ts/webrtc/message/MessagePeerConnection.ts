import AbstractPeerConnection from '@/ts/webrtc/AbstractPeerConnection';
import WsHandler from '@/ts/message_handlers/WsHandler';
import { DefaultStore } from '@/ts/classes/DefaultStore';
import { sub } from '@/ts/instances/subInstance';
import { MessageSupplier } from '@/ts/types/types';
import { P2PMessageProcessor } from '@/ts/message_handlers/P2PMessageProcessor';
import Subscription from '@/ts/classes/Subscription';

import {
  HandlerName,
  HandlerType,
  HandlerTypes
} from '@/ts/types/messages/baseMessagesInterfaces';
import {
  DefaultP2pMessage,
  ExchangeMessageInfoRequest,
  ExchangeMessageInfoResponse,
  ExchangeMessageInfoResponseToResponse,
  P2PHandlerType,
  P2PHandlerTypes,
  ResponseToSendNewP2pMessage,
  SendNewP2PMessage,
} from '@/ts/types/messages/p2pMessages';
import { DefaultWsInMessage } from '@/ts/types/messages/wsInMessages';
import {
  MessageModel,
  RoomModel
} from '@/ts/types/model';
import {
  MessageP2pDto,
  MessagesInfo
} from '@/ts/types/messages/p2pDto';
import {
  messageModelToP2p,
  p2pMessageToModel
} from '@/ts/types/converters';
import { SyncP2PMessage } from '@/ts/types/messages/innerMessages';
import { MessageHelper } from '@/ts/message_handlers/MessageHelper';

export default abstract class MessagePeerConnection extends AbstractPeerConnection implements MessageSupplier {


  protected readonly handlers: HandlerTypes<keyof MessagePeerConnection, 'peerConnection:*'> = {
    sendRtcData:  <HandlerType<'sendRtcData', 'peerConnection:*'>>this.sendRtcData,
    checkDestroy:  <HandlerType<'checkDestroy', 'peerConnection:*'>>this.checkDestroy,
    syncP2pMessage:  <HandlerType<'syncP2pMessage', 'peerConnection:*'>>this.syncP2pMessage
  };

  protected status: 'inited' | 'not_inited' = 'not_inited';

  private readonly p2pHandlers: P2PHandlerTypes<keyof MessagePeerConnection> = {
    exchangeMessageInfoRequest:  <P2PHandlerType<'exchangeMessageInfoRequest'>>this.exchangeMessageInfoRequest,
    sendNewP2PMessage:  <P2PHandlerType<'sendNewP2PMessage'>>this.sendNewP2PMessage
  };

  private readonly messageProc: P2PMessageProcessor;
  private readonly opponentUserId: number;
  private readonly messageHelper: MessageHelper;
  private syncMessageLock: boolean = false;

  constructor(
      roomId: number,
      connId: string,
      opponentWsId: string,
      wsHandler: WsHandler,
      store: DefaultStore,
      userId: number,
      messageHelper: MessageHelper
  ) {
    super(roomId, connId, opponentWsId, wsHandler, store);
    this.opponentUserId = userId;
    sub.subscribe(Subscription.allPeerConnectionsForTransfer(connId), this);

    this.messageProc = new P2PMessageProcessor(this, store, `p2p-${opponentWsId}`);
    this.messageHelper = messageHelper;
  }

  public getOpponentUserId() {
    return this.opponentUserId;
  }

  public unsubscribeAndRemoveFromParent(reason?: string) {
    super.unsubscribeAndRemoveFromParent(reason);
    sub.unsubscribe(Subscription.allPeerConnectionsForTransfer(this.connectionId), this);
  }

  abstract makeConnection(): void;

  public oniceconnectionstatechange() {
    this.logger.log(`iceconnectionstate has been changed to ${this.pc!.iceConnectionState}`)
    if (this.pc!.iceConnectionState === 'disconnected' ||
        this.pc!.iceConnectionState === 'failed' ||
        this.pc!.iceConnectionState === 'closed') {
      this.closeEvents('Connection has been lost');
    }
  }

  public async sendNewP2PMessage(payload: SendNewP2PMessage) {
    this.messageHelper.onNewMessage(p2pMessageToModel(payload.message, this.roomId))
    let response: ResponseToSendNewP2pMessage = {
      action: 'responseToSendNewP2pMessage',
      resolveCbId: payload.cbId
    };
    this.messageProc.sendToServer(response);
  }

  public async syncP2pMessage(payload: SyncP2PMessage) {
    if (this.isChannelOpened) {
      this.logger.debug("Syncing message {}", payload.id)()
      let message: SendNewP2PMessage = {
        message: messageModelToP2p(this.room.messages[payload.id]),
        action: 'sendNewP2PMessage',
      }
      await this.messageProc.sendToServerAndAwait(message);
      if (!this.isConnectedToMyAnotherDevices) {
        this.store.markMessageAsSent({messageId: payload.id, roomId: this.roomId})
      }
    }
  }

  get isConnectedToMyAnotherDevices(): boolean {
    return this.opponentUserId === this.store.myId;
  }

  checkDestroy() {
    //destroy only if user has left this room, if he's offline but connections is stil in progress,
    // maybe he has jost connection to server but not to us
    if (this.store.roomsDict[this.roomId].users.indexOf(this.opponentUserId) < 0) {
      this.unsubscribeAndRemoveFromParent('User has left this room')
    }
  }

  // public appendQueue(message: AppendQueue) {
  //   if (this.isChannelOpened) {
  //     message.messages.forEach(message => {
  //       this.messageProc.sendToServer(message);
  //     })
  //   } else {
  //     this.sendingQueue.push(...message.messages);
  //   }
  // }

  get isChannelOpened(): boolean {
    return this.sendChannel?.readyState === 'open';
  }

  protected onChannelMessage(event: MessageEvent) {
    let data: DefaultP2pMessage<keyof MessagePeerConnection> = this.messageProc.parseMessage(event.data) as unknown as DefaultP2pMessage<keyof MessagePeerConnection>;
    if (data) {
      let cb = this.messageProc.resolveCBifItsThere(data);
      if (!cb) {
        const handler: P2PHandlerType<keyof MessagePeerConnection> = this.p2pHandlers[data.action] as P2PHandlerType<keyof MessagePeerConnection>;
        if (handler) {
          handler.bind(this)(data);
        } else {
          this.logger.error(`{} can't find handler for {}, available handlers {}. Message: {}`, this.constructor.name, data.action, Object.keys(this.p2pHandlers), data)();
        }
      }
    }
  }

  public async exchangeMessageInfoRequest(payload: ExchangeMessageInfoRequest) {
    if (this.syncMessageLock) {
      this.logger.error("oops we already acquired lock, going to syncanyway")
    }

    try {
      this.syncMessageLock = true;

      let missingIdsFromRemote: number[] = [];
      let responseMessages: MessageP2pDto[] = []

      this.messages.forEach(message => {
        let opponentEditedCount: number = payload.messagesInfo[message.id] ?? 0;
        if (payload.hasOwnProperty(message.id)) {
          let myEditedCount: number = message.edited ?? 0;
          if (myEditedCount > opponentEditedCount) {
            responseMessages.push(messageModelToP2p(message))
          } else if (myEditedCount < opponentEditedCount) {
            missingIdsFromRemote.push(message.id)
          } // else message are synced
        } else {
          responseMessages.push(messageModelToP2p(message))
        }
      })
      Object.keys(payload.messagesInfo).forEach(remoteMId => {
        if (!this.room.messages[remoteMId as unknown as number]) { // convertion is automatic for js
          missingIdsFromRemote.push(parseInt(remoteMId))
        }
      })
      let response: ExchangeMessageInfoResponse = {
        action: 'exchangeMessageInfoRequest',
        resolveCbId: payload.cbId,
        messages: responseMessages,
        requestMessages: missingIdsFromRemote,
      }
      if (missingIdsFromRemote.length > 0) {
        let a = await this.messageProc.sendToServerAndAwait(response);
      } else {
        this.messageProc.sendToServer(response);
      }
    } finally {
      this.syncMessageLock = false;
    }

  }

  private async exchangeMessageInfo() {
    if (this.isChannelOpened) {
      let mI: MessagesInfo = this.messages.reduce((p, c) => {
        p[c.id!] = c.edited ?? 0; // (undefied|null) ?? 0 === 0
        return p;
      }, {} as MessagesInfo);
      let message: ExchangeMessageInfoRequest = {
        action: 'exchangeMessageInfoRequest',
        messagesInfo: mI
      };
      let response: ExchangeMessageInfoResponse = await this.messageProc.sendToServerAndAwait(message);
      let messageModels: MessageModel[] = response.messages.map(rp => p2pMessageToModel(rp, this.roomId));
      if (messageModels.length > 0) {
        this.store.addMessages({
          messages: messageModels,
          roomId: this.roomId
        });
      }
      if (response.requestMessages.length > 0 ) {
        let responseMessages: MessageP2pDto[] = response.requestMessages.map(
            id => messageModelToP2p(this.room.messages[id])
        );
        let responseToRequest: ExchangeMessageInfoResponseToResponse = {
          resolveCbId: response.cbId,
          messages: responseMessages,
          action: 'exchangeMessageInfoResponseToResponse',
        }
        this.messageProc.sendToServer(responseToRequest)
      }
    } else {
      throw Error("No connection");
    }
  }

  public async syncMessages() {
    if (this.syncMessageLock) {
      this.logger.warn('Exiting from sync message because, the lock is already acquired')();
      return;
    }
    try {
      this.syncMessageLock = true;
      await this.exchangeMessageInfo();
    } catch (e) {
      this.logger.error('Can\'t send messages because {}', e)();
    } finally {
      this.syncMessageLock = false;
    }
  }

  private get messages(): MessageModel[] {
    return Object.values(this.room.messages);
  }

  private get room(): RoomModel {
    return this.store.roomsDict[this.roomId];
  }

  public setupEvents() {

    this.sendChannel!.onmessage = this.onChannelMessage.bind(this);
    this.sendChannel!.onopen = () => {
      this.logger.debug('Channel opened')();
      if (this.getWsConnectionId() > this.opponentWsId) {
        this.syncMessages();
      }
    };
    this.sendChannel!.onclose = () => {
      this.logger.log('Closed channel ')();
      //this.syncMessageLock = false; // just for the case, not nessesary
      this.messageProc.onDropConnection('Data channel closed')
    }
  }

  public closeEvents (text?: string|DefaultWsInMessage<string, HandlerName>) {
    this.messageProc.onDropConnection('data channel lost')
    if (text) {
      this.ondatachannelclose(<string>text); // TODO
    }
    this.logger.error('Closing event from {}', text)();
    this.closePeerConnection();
    if (this.sendChannel && this.sendChannel.readyState !== 'closed') {
      this.logger.log('Closing chanel')();
      this.sendChannel.close();
    } else {
      this.logger.log('No channels to close')();
    }
  }

  printSuccess() {

  }


  getWsConnectionId(): string {
    return this.wsHandler.getWsConnectionId();
  }

  sendRawTextToServer(message: string): boolean {
    if (this.isChannelOpened) {
      this.sendChannel!.send(message);
      return true;
    } else {
      return false;
    }
  }
}
