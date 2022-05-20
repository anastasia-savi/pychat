import type {DefaultWsInMessage} from "@common/ws/common";
import {
  BrowserBase,
  OpponentWsId,
  WebRtcDefaultMessage
} from "@common/model/webrtc.base";


export interface OfferCallBody extends OpponentWsId, WebRtcDefaultMessage {
  content: BrowserBase;
  roomId: number;
  userId: number;
  time: number;
}

export type OfferCallMessage = DefaultWsInMessage<"offerCall", "webrtc", OfferCallBody>;