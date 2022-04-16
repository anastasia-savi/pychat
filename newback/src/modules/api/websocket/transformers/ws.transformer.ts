import type {
  AddOnlineUserMessage,
  ChannelDto,
  RoomDto,
  SetWsIdMessage,
  UserDto,
  UserProfileDto,
  UserSettingsDto,
  RemoveOnlineUserMessage,
  MessageModelDto,
  FileModelDto,
} from "@/data/types/frontend";
import type {UserModel} from "@/data/model/user.model";
import type {
  UserOnlineData,
  WebSocketContextData,
} from "@/data/types/internal";
import type {ChannelModel} from "@/data/model/channel.model";
import type {RoomUsersModel} from "@/data/model/room.users.model";
import type {GetRoomsForUser} from "@/modules/rest/database/repository/room.repository";
import type {MessageModel} from "@/data/model/message.model";
import type {MessageMentionModel} from "@/data/model/message.mention.model";
import type {ImageModel} from "@/data/model/image.model";

export interface TransformSetWsIdDataParams {
  myRooms: GetRoomsForUser[];
  allUsersInTheseRooms: Pick<RoomUsersModel, "roomId" | "userId">[];
  channels: ChannelModel[];
  users: UserModel[];
  online: UserOnlineData;
  id: string;
  time: number;
  user: UserModel;
}

/*
 * Function transformUserSettings(db: UserSettingsModel): UserSettingsDto {
 *   return Object.keys(convert<UserSettingsDto>()).reduce((previousValue, currentValue) => {
 *     previousValue[currentValue] = db[currentValue];
 *     return previousValue;
 *   }, {} as UserSettingsDto)
 * }
 */

function transformProfile(user: UserModel): UserProfileDto {
  return {
    username: user.username,
    name: user.userProfile.name,
    sex: user.sex,
    id: user.id,
    city: user.userProfile.city,
    email: user.userAuth.email,
    birthday: user.userProfile.birthday,
    contacts: user.userProfile.contacts,
    surname: user.userProfile.surname,
    thumbnail: user.thumbnail,
  };
}

function transformSettings(user: UserModel): UserSettingsDto {
  return {
    embeddedYoutube: Boolean(user.userSettings.embeddedYoutube),
    highlightCode: Boolean(user.userSettings.highlightCode),
    incomingFileCallSound: Boolean(user.userSettings.incomingFileCallSound),
    messageSound: Boolean(user.userSettings.messageSound),
    onlineChangeSound: Boolean(user.userSettings.onlineChangeSound),
    showWhenITyping: Boolean(user.userSettings.showWhenITyping),
    suggestions: Boolean(user.userSettings.suggestions),
    theme: user.userSettings.theme,
    logs: user.userSettings.logs,
  };
}

function transformUserDto(u: UserModel): UserDto {
  return {
    username: u.username,
    id: u.id,
    thumbnail: u.thumbnail,
    sex: u.sex,
    lastTimeOnline: u.lastTimeOnline,
  };
}

function transformChannelsDto(c: ChannelModel): ChannelDto {
  return {
    name: c.name,
    id: c.id,
    creatorId: c.creatorId,
  };
}

function getTransformRoomFn(allUsersInTheseRooms: Pick<RoomUsersModel, "roomId" | "userId">[]): (r: GetRoomsForUser) => RoomDto {
  const roomUsersIdInfoDict: Record<string, number[]> = allUsersInTheseRooms.reduce<Record<string, number[]>>((previousValue, currentValue) => {
    if (!previousValue[currentValue.roomId]) {
      previousValue[currentValue.roomId] = [];
    }
    previousValue[currentValue.roomId].push(currentValue.userId);
    return previousValue;
  }, {});
  return (room: GetRoomsForUser) => ({
    name: room.name,
    id: room.id,
    channelId: room.channelId,
    p2p: Boolean(room.p2p),
    notifications: Boolean(room.roomUsers.notifications),
    users: roomUsersIdInfoDict[room.id],
    isMainInChannel: Boolean(room.isMainInChannel),
    creatorId: room.creatorId,
    volume: room.roomUsers.volume,
  });
}


export function transformSetWsId(
  {
    myRooms,
    allUsersInTheseRooms,
    channels,
    users,
    online,
    id,
    user,
    time,
  }: TransformSetWsIdDataParams
): SetWsIdMessage {
  return {
    action: "setWsId",
    channels: channels.map(transformChannelsDto),
    rooms: myRooms.map(getTransformRoomFn(allUsersInTheseRooms)),
    handler: "ws",
    time,
    users: users.map(transformUserDto),
    online,
    opponentWsId: id,
    profile: transformProfile(user),
    settings: transformSettings(user),
  };
}

export function transformAddUserOnline(online: Record<number, string[]>, user: UserModel, opponentWsId: string): AddOnlineUserMessage {
  return {
    action: "addOnlineUser",
    handler: "room",
    online,
    userId: user.id,
    lastTimeOnline: user.lastTimeOnline,
    time: Date.now(),
    opponentWsId,
  };
}


export function getLogoutMessage(online: UserOnlineData, lastTimeOnline: number, context: WebSocketContextData, time: number): RemoveOnlineUserMessage {
  return {
    online,
    action: "removeOnlineUser",
    lastTimeOnline,
    time,
    handler: "room",
    userId: context.userId,
  };
}


function getTags(mentions: MessageMentionModel[], m: MessageModel) {
  return mentions.filter((mention) => mention.messageId == m.id).reduce((mentions, mention) => {
    mentions[mention.symbol] = mention.userId;
    return mentions;
  }, {});
}

function getFiles(images: ImageModel[], m: MessageModel): Record<number, FileModelDto> {
  return Object.fromEntries(images.filter((i) => i.messageId === m.id).map((i) => [
    i.symbol, {
      url: i.img,
      type: i.type,
      preview: i.preview,
      id: i.id,
    },
  ]));
}

function getMessage(m: MessageModel, mentions: MessageMentionModel[], images: ImageModel[]): MessageModelDto {
  return {
    id: m.id,
    content: m.content,
    tags: getTags(mentions, m),
    roomId: m.roomId,
    userId: m.senderId,
    parentMessage: m.parentMessageId,
    deleted: Boolean(m.deletedAt),
    threadMessagesCount: m.threadMessageCount,
    symbol: m.symbol,
    status: m.messageStatus,
    time: m.time,
    edited: m.updatedAt,
    files: getFiles(images, m),
  };
}
