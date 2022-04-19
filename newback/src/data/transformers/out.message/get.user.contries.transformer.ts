import {UserJoinedInfoModel} from '@/data/model/user.joined.info.model';
import { GetCountryCodeWsInMessage } from '@/data/shared/ws.in.messages';
import { LocationDto } from '@/data/shared/dto';


export function transformUserCountries(userInfo: UserJoinedInfoModel[]): Omit<GetCountryCodeWsInMessage, "action" | "handler"> {
  const content: GetCountryCodeWsInMessage["content"] = userInfo.reduce((previousValue, currentValue) => {
    if (currentValue.ip) {
      const value: LocationDto = {
        country: currentValue.ip.country,
        region: currentValue.ip.region,
        city: currentValue.ip.city,
        countryCode: currentValue.ip.countryCode,
      };
      previousValue[currentValue.userId] = value;
    }
    return previousValue;
  }, {});
  return {content};
}