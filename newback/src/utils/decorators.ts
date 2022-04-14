import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException
} from '@nestjs/common';
import {WebSocket} from "ws";
import {WebSocketContextData} from '@/data/types/internal';
import {OnGatewayConnection} from '@nestjs/websockets';
import {WS_SESSION_EXPIRED_CODE} from '@/data/types/frontend';


export const WebsocketContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    let handler =  ctx.getArgs().find(a => a instanceof WebSocket)
    if (!handler.context) {
      handler.context = {userId: Date.now()} as WebSocketContextData;
    }
    return handler.context;
  },
);

export const UserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    let handler =  ctx.getArgs().find(a => a instanceof WebSocket)
    return (handler.context as WebSocketContextData);
  },
);


export function CatchWsErrors(target: OnGatewayConnection, memberName: 'handleConnection', propertyDescriptor: PropertyDescriptor) {
  return {
    get() {
      const wrapperFn = async function (socket, ...args) {
        try {
          let result = await propertyDescriptor.value.apply(this, [socket, ...args]);
          return result;
        } catch (e) { // need to catch , otherwise node process crashes
          if (e instanceof UnauthorizedException) {
            socket.close(WS_SESSION_EXPIRED_CODE, e.message || 'Invalid session')
          } else if (e?.status >= 400 && e?.status < 500) {  // Invalid frame payload data
            socket.close(1007, `Error during creating a connection ${e.message}`);
          } else { // Internal Error
            socket.close(1011, `Error during opening a socket ${e.message}`);
          }
        }
      }

      Object.defineProperty(this, memberName, {
        value: wrapperFn,
        configurable: true,
        writable: true
      });
      return wrapperFn;
    }
  }
}