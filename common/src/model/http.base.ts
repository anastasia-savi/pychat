export interface CaptchaRequest {
  captcha?: string;
}

interface TypeGeneratorForOauth1 extends SessionResponse {
  isNewAccount: true;
  username: string;
}

interface TypeGeneratorForOauth2 extends SessionResponse {
  isNewAccount: false;
}

export type OauthSessionResponse =
  TypeGeneratorForOauth1
  | TypeGeneratorForOauth2;

export interface SessionResponse {
  session: string;
}

export interface OkResponse {
  ok: true;
}