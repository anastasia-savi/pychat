import WsHandler from '@/ts/message_handlers/WsHandler';
import Api from '@/ts/message_handlers/Api';
import { Logger } from 'lines-logger';
import { DefaultStore } from '@/ts/classes/DefaultStore';
import {
  GoogleCaptcha,
  PlatformUtil
} from '@/ts/types/model';
import WsMessageHandler from '@/ts/message_handlers/WsMessageHandler';
import {
  IStorage,
  JsAudioAnalyzer
} from '@/ts/types/types';
import WebRtcApi from '@/ts/webrtc/WebRtcApi';
import Subscription from '@/ts/classes/Subscription';
import Http from '@/ts/classes/Http';
import type {Router} from 'vue-router';
import { MessageSenderProxy } from '@/ts/message_handlers/MessageSenderProxy';
import { RoomHandler } from '@/ts/message_handlers/RomHandler';
import type {App as VueApp} from '@vue/runtime-core'
import { Emitter } from 'mitt';
declare global {
  interface Window {
    GIT_VERSION: string|undefined;
    vue: VueApp;
    router: Router;
    api: Api;
    deferredPrompt: BeforeInstallPromptEvent;
    wsMessageHandler: WsMessageHandler;
    roomHandler: RoomHandler;
    xhr: Http;
    ws: WsHandler;
    storage: IStorage;
    store: DefaultStore;
    webrtcApi: WebRtcApi;
    grecaptcha: GoogleCaptcha;
    audioProcesssors: JsAudioAnalyzer[];
    savedFiles: { [id: string]: Blob };
    sub: Subscription;
    consts: {};
    runtimeConsts: {};
  }
}

declare module 'vue/types/options' {

  interface ComponentOptions<V extends Vue,
      Data = DefaultData<V>,
      Methods = DefaultMethods<V>,
      Computed = DefaultComputed,
      PropsDef = PropsDefinition<DefaultProps>,
      Props = DefaultProps> {
    _componentTag?: string;
  }

}

declare module 'vue/types/vue' {

  interface VueConstructor<V extends Vue = Vue> {
    component<Data, Methods, Computed, Props>(
        id: string,
        definition: Component<Data, Methods, Computed, Props>
    ): ExtendedVue<V, Data, Methods, Computed, Props>;
  }

declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $ws: WsHandler;
    $api: Api;
    $store: DefaultStore; // if $store conflicts with node_modules/vuex/types/vue.d.ts if
    $logger: Logger;
    $platformUtil: PlatformUtil;
    $messageSenderProxy: MessageSenderProxy;
    $messageBus: Emitter<any>;
    $webrtcApi: WebRtcApi;
  }
}
