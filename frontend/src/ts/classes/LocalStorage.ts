import loggerFactory from '@/ts/instances/loggerFactory';
import {
  IStorage,
  SetFileIdsForMessage,
  SetRoomsUsers,
} from '@/ts/types/types';
import {
  ChannelModel,
  CurrentUserInfoModel,
  CurrentUserSettingsModel,
  MessageModel,
  RoomSettingsModel,
  UserModel
} from '@/ts/types/model';
import { Logger } from 'lines-logger';
import { SetStateFromStorage } from '@/ts/types/dto';

interface LocalStorageMessage {
  f: number;
  h: number;
}
export default class LocalStorage implements IStorage {

  private readonly logger: Logger;
  private readonly STORAGE_NAME = 'wsHeaderIds';
  private cache: { [id: number]: LocalStorageMessage } = {};

  constructor() {
    this.logger = loggerFactory.getLoggerColor('ls', '#006263');
    const ms = localStorage.getItem(this.STORAGE_NAME);
    if (ms) {
      const loaded = JSON.parse(ms);
      for (const k in loaded) {
        this.cache[parseInt(k)] = {
          h: loaded[k],
          f: loaded[k]
        };
      }
    } else {
      localStorage.setItem(this.STORAGE_NAME, `{}`);
    }
  }

  // public getIds(cb: SingleParamCB<object>) {
  //   cb(this.cache);
  // }

  public saveMessage(message: MessageModel) {
    this.setRoomHeaderId(message.roomId, message.id);
  }

  public saveMessages(messages: MessageModel[]) {
    messages.forEach((message) => {
      this.applyCache(message.roomId, message.id);
    });
    const lm = JSON.parse(localStorage.getItem(this.STORAGE_NAME) || '{}');
    for (const k in this.cache) {
      if (!lm[k] || this.cache[k].h < lm[k]) {
        lm[k] = this.cache[k].h;
      }
    }
    localStorage.setItem(this.STORAGE_NAME, JSON.stringify(lm));
  }
  public updateFileIds(m: SetFileIdsForMessage) {}
  public deleteMessage(id: number) {}
  public deleteRoom(id: number) {}
  public deleteChannel(id: number) {}
  public updateRoom(m: RoomSettingsModel)  {}
  public setRooms(rooms: RoomSettingsModel[])  {}
  public setChannels(channels: ChannelModel[]) {}
  public saveRoom(room: RoomSettingsModel)  {}
  public saveChannel(room: ChannelModel)  {}
  public setUserProfile(user: CurrentUserInfoModel)  {}
  public setUserSettings(settings: CurrentUserSettingsModel)  {}
  public saveRoomUsers(ru: SetRoomsUsers)  {}
  public setUsers(users: UserModel[])  {}
  public saveUser(users: UserModel)  {}
  public markMessageAsSent(m: number[]) {}

  public async getAllTree(): Promise<SetStateFromStorage|null> {
    return null;
  }

  public clearMessages() {
    this.clearStorage();
  }

  public clearStorage() {
    localStorage.setItem(this.STORAGE_NAME, '{}');
    this.cache = {};
  }

  public setRoomHeaderId(roomId: number, value: number) {
    if (!this.applyCache(roomId, value)) {
      this.saveJson(roomId, value);
    }
  }

  public async connect(): Promise<boolean> {
    return false;
  }

  // public getRoomHeaderId(roomId: number, cb: SingleParamCB<number>) {
  //   cb(this.cache[roomId] ? this.cache[roomId].h : null);
  // }

  private applyCache(roomId: number, value: number): boolean {
    if (!this.cache[roomId]) {
      this.cache[roomId] = {
        h: value,
        f: value
      };
    } else if (value < this.cache[roomId].h) {
      this.cache[roomId].h = value;
    } else if (value > this.cache[roomId].f) {
      this.cache[roomId].f = value;
    } else {
      return true;
    }

    return false;
  }

  private saveJson(roomId: number, value: number) {
    const lm = JSON.parse(localStorage.getItem(this.STORAGE_NAME) || '{}');
    if (!lm[roomId] || value < lm[roomId]) {
      lm[roomId] = value;
      this.logger.debug('Updating headerId {} -> {} for room {}. LS: {}', lm[roomId], value, roomId, lm)();
      localStorage.setItem(this.STORAGE_NAME, JSON.stringify(lm));
    } else {
      this.logger.debug('Loaded header ids for room {} from local storage {} . Update is not needed since stored header {} is lower than current ', roomId, lm, lm[roomId], value)();
    }
  }

}