import type {UploadedFileModel} from "@/data/model/uploaded.file.model";
import type {ImageModel} from "@/data/model/image.model";
import type {MessageMentionModel} from "@/data/model/message.mention.model";
import type {CreateModel} from "@/data/types/internal";
import { GiphyDto } from '@/data/shared/dto';
import { ImageType } from '@/data/shared/enums';
import { PrintMessageWsOutMessage } from '@/data/shared/ws.out.messages';


export function getUploadedGiphies(data: GiphyDto[], messageId: number): CreateModel<ImageModel>[] {
  return data.map((g) => ({
    messageId,
    symbol: g.symbol,
    img: g.symbol,
    preview: g.webp,
    type: ImageType.GIPHY,
  }));
}

export function getMentionsFromTags(data: PrintMessageWsOutMessage, messageId: number): CreateModel<MessageMentionModel>[] {
  return Object.entries(data.tags).map(([symbol, userId]) => ({
    messageId,
    userId,
    symbol,
  }));
}

export function groupUploadedFileToImages(files: UploadedFileModel[], messageId: number): CreateModel<ImageModel>[] {
  const grouped: Record<number, CreateModel<ImageModel>> = files.reduce<Record<number, CreateModel<ImageModel>>>((previousValue, currentValue) => {
    const existingElement = previousValue[currentValue.symbol];
    if (!existingElement) {
      previousValue[currentValue.symbol] = {
        messageId,
        symbol: currentValue.symbol,
      };
    }
    if (currentValue.type === ImageType.PREVIEW) {
      previousValue[currentValue.symbol].preview = currentValue.file;
    } else {
      previousValue[currentValue.symbol].type = currentValue.type;
      previousValue[currentValue.symbol].img = currentValue.file;
    }
    return previousValue;
  }, {});
  return Object.values(grouped);
}