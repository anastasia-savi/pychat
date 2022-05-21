import type {DefaultInnerSystemMessage} from "@/ts/types/messages/helper";

export type DestroyPeerConnectionMessage = DefaultInnerSystemMessage<"destroy", "peerConnection:*", null>;
