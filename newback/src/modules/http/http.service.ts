import {
  Injectable,
  Logger
} from '@nestjs/common';

import type fetch from 'node-fetch';

@Injectable()
export class HttpService {
  private requestId: number = 0;

  constructor(
    private readonly logger: Logger,
    private readonly nodeFetch: typeof fetch,
  ) {
  }

  private async post<T = Record<string, any>>(url, body: any, headers: Record<string, string>): Promise<T> {
    let requestId = ++this.requestId;
    this.logger.debug(`POST[${requestId}]: url='${url}'; data=${body}; headers=${JSON.stringify(headers)} `)
    const response = await this.nodeFetch(url, {
      method: 'post',
      body,
      headers
    });
    const responseBody = await response.json();
    this.logger.debug(`POST[${requestId}]: url='${url}'; status='${response.status}' data=${JSON.stringify(responseBody)};`)
    return responseBody;
  }

  public async postUrlEncoded<T = Record<string, any>>(url: string, data: Record<string, any>): Promise<T> {
    const body = new URLSearchParams();
    Object.entries(data).forEach(([k,v]) => {
      body.append(k, v);
    })
    return this.post<T>(url, body, {})
  }

  public async postData<T = Record<string, any>>(url: string, data: Record<string, any>): Promise<T> {
    let body = JSON.stringify(data);
    let headers = {'Content-Type': 'application/json'};
    return this.post<T>(url, body, headers);
  }

}
