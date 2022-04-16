import {
  Injectable,
  Logger,
} from "@nestjs/common";
import {IpRepository} from "@/modules/rest/database/repository/ip.repository";
import {IpService} from "@/modules/rest/ip/ip.service";
import type {IpAddressModel} from "@/data/model/ip.address.model";

import {UserRepository} from "@/modules/rest/database/repository/user.repository";
import type {InvalidIpException} from "@/data/exceptions/invalid.ip.exception";

@Injectable()
export class IpCacheService {
  public constructor(
    private readonly ipService: IpService,
    private readonly ipRepository: IpRepository,
    private readonly logger: Logger,
  ) {
  }

  public async getIpString(ip: string): Promise<string> {
    const data = await this.getIpInfo(ip);
    if (!data) {
      return "Unknown";
    }
    return `${data.country} ${data.city} ${data.isp}`;
  }

  public async saveIp(userId: number, ip: string) {
    const ipModel = await this.getIpInfo(ip);
    if (ipModel) {
      await this.ipRepository.saveIpToUser(userId, ipModel.id);
    }
  }

  public async getIpInfo(ip: string): Promise<Partial<IpAddressModel>> {
    const response = await this.ipRepository.getIp(ip);
    if (response && !response.status) {
      return null;
    }
    try {
      const ipInfo = await this.ipService.getIpInfo(ip);
      const model: Partial<IpAddressModel> = {
        ip,
        status: true,
        isp: ipInfo.isp,
        country: ipInfo.country,
        region: ipInfo.region,
        city: ipInfo.city,
        lat: ipInfo.lat,
        lon: ipInfo.lon,
        zip: ipInfo.zip,
        timezone: ipInfo.timezone,
      };
      await this.ipRepository.saveIP(model);
      return model;
    } catch (e: any) {
      this.logger.error(`Unable to get Ip Address Info ${ip} ${e.error}`, e.stack, "ip.cache.service");
      if (!(e as InvalidIpException).networkError) {
        await this.ipRepository.saveIP({ip,
          status: false});
        return null;
      }
      return null;
    }
  }
}
