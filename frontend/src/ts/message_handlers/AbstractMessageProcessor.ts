import type {
  DefaultWsInMessage,
  DefaultWsOutMessage,
  HandlerName,
  RequestWsOutMessage,
  ResponseWsInMessage,
} from "@common/ws/common";
import type {Logger} from "lines-logger";
import loggerFactory from "@/ts/instances/loggerFactory";
import type {MessageSupplier} from "@/ts/types/types";
import type {DefaultStore} from "@/ts/classes/DefaultStore";


export default class AbstractMessageProcessor {
  protected readonly callBacks: Record<number, {resolve: Function; reject: Function}> = {};

  protected readonly logger: Logger;

  /*
   * Also uniqueMessageId is used on sendingMessage, in storage.getUniqueMessageId.
   * the difference is that this is positive integers
   * and another one uses negatives
   */
  protected uniquePositiveMessageId: number = 0;

  protected readonly target: MessageSupplier;

  protected readonly store: DefaultStore;

  private readonly loggerIn: Logger;

  private readonly loggerOut: Logger;

  public constructor(target: MessageSupplier, store: DefaultStore, label: string) {
    this.target = target;
    this.store = store;
    this.loggerIn = loggerFactory.getLoggerColor(`${label}:in`, "#4c002b");
    this.loggerOut = loggerFactory.getLoggerColor(`${label}:out`, "#4c002b");
    this.logger = loggerFactory.getLoggerColor("mes-proc", "#4c002b");
  }

  public setMessageCbId<D>(message: RequestWsOutMessage<string, D>) {
    if (message.cbId) {
      throw Error("Cb id should ge generated by this");
    }
    // Should be ++, so uniqueId won't be 0, if it's 0 then checks like !0 are false, but should be true
    message.cbId = ++this.uniquePositiveMessageId;
  }

  public parseMessage<D>(jsonData: string): DefaultWsInMessage<string, HandlerName, D> | ResponseWsInMessage<D> | null {
    let data: DefaultWsInMessage<string, HandlerName, any> | null = null;
    try {
      data = JSON.parse(jsonData);
      this.logData(this.loggerIn, jsonData, data!)();
    } catch (e) {
      this.logger.error("Unable to parse incomming message {}", jsonData)();

      return null;
    }
    return data;
  }

  public async sendToServerAndAwait<D, RES>(message: RequestWsOutMessage<string, D>): Promise<ResponseWsInMessage<RES>> {
    return new Promise((resolve, reject) => {
      this.setMessageCbId<D>(message);
      const jsonMessage = this.getJsonMessage(message);
      this.callBacks[message.cbId!] = {
        resolve,
        reject,
      };
      const isSent = this.target.sendRawTextToServer(jsonMessage);
      if (isSent) {
        this.logData(this.loggerOut, jsonMessage, message)();
      }
    });
  }

  sendToServer<D>(message: DefaultWsOutMessage<string, D>): boolean {
    const jsonMessage = this.getJsonMessage(message);
    const isSent = this.target.sendRawTextToServer(jsonMessage);
    if (isSent) {
      this.logData(this.loggerOut, jsonMessage, message)();
    }
    return isSent;
  }

  public getJsonMessage<D>(message: DefaultWsOutMessage<string, D>) {
    return JSON.stringify(message);
  }

  public onDropConnection(reasong: string) {
    for (const cb in this.callBacks) {
      try {
        this.logger.debug("Resolving cb {}", cb)();
        const cbFn = this.callBacks[cb];
        delete this.callBacks[cb];
        cbFn.reject(reasong);
        this.logger.debug("Cb {} has been resolved", cb)();
      } catch (e) {
        this.logger.debug("Error {} during resolving cb {}", e, cb)();
      }
    }
  }

  private logData<D>(logger: Logger, jsonData: string, message: DefaultWsInMessage<string, HandlerName, D> | DefaultWsOutMessage<string, D>): () => void {
    let raw = jsonData;
    if (raw.length > 1000) {
      raw = "";
    }
    if (message.action === "ping" || message.action === "pong") {
      return logger.debug("{} {}", raw, message);
    }
    return logger.log("{} {}", raw, message);
  }
}
