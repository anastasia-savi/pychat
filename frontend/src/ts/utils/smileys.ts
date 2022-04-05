// Do not edit this file manually. It was generated with "yarn generate-smileys"
import {PUBLIC_PATH} from "@/ts/utils/consts";
import {hexEncode} from "@/ts/utils/pureFunctions";
import type {DefaultStore} from "@/ts/classes/DefaultStore";

export interface SmileVariation {
  alt: string;
  src: string;
}

export interface Smile extends SmileVariation {
  skinVariations?: Record<string, SmileVariation>;
}

export type SmileysStructure = Record<string, Record<string, Smile>>;

export class SmileysApi {
  private loading: boolean = false;

  private smileyCache: SmileysStructure | undefined;

  private allSmileysKeysNoVariationsCache: Record<string, Smile> | undefined;

  private allSmileysKeysCache: Record<string, Smile> | undefined;

  private smileUnicodeRegex: RegExp | undefined;

  private readonly resolveInit: (() => void)[] = [];

  private readonly store: DefaultStore;

  constructor(store: DefaultStore) {
    this.store = store;
  }

  public async init() {
    if (!this.loading && !this.smileyCache) {
      this.loading = true;
      // This will be transformed to .js
      const smileysData: SmileysStructure = (await import("@/assets/smileys.json")).default;
      Object.values(smileysData).forEach((tabValue) => {
        Object.values(tabValue).forEach((smileyInTab) => {
          smileyInTab.src = `${PUBLIC_PATH ?? ""}/smileys/${smileyInTab.src}`;
          if (smileyInTab.skinVariations) {
            Object.values(smileyInTab.skinVariations).forEach((variation) => {
              variation.src = `${PUBLIC_PATH ?? ""}/smileys/${variation.src}`;
            });
          }
        });
      });
      this.smileyCache = smileysData;
      this.allSmileysKeysNoVariationsCache = {};
      Object.entries(smileysData).forEach(([tabName, tabSmileys]) => {
        Object.entries(tabSmileys).forEach(([smileyCode, smileyValue]) => {
          this.allSmileysKeysNoVariationsCache![smileyCode] = {
            alt: smileyValue.alt,
            src: smileyValue.src,
            skinVariations: smileyValue.skinVariations,
          };
        });
      });
      this.allSmileysKeysCache = {};
      Object.entries(smileysData).forEach(([tabName, tabSmileys]) => {
        Object.entries(tabSmileys).forEach(([smileyCode, smileyValue]) => {
          if (smileyValue.skinVariations) {
            Object.entries(smileyValue.skinVariations).forEach(([smileyCodeVar, smileyValueVasr]) => {
              if (smileyCode !== smileyCodeVar) {

                /*
                 * Order of properties of object is js matter,
                 * first object added will be first in Object.keys array
                 * skin variation should be set first, in order to smileyUniceRegex to be gready
                 * since we have smileys like \u01 = smiley white person, and \u01\u02 = smiley black person
                 * they both start with \u01 so, we should replace \u01\u02, otherwiose we leave \u02 symbol undecoded
                 */
                this.allSmileysKeysCache![smileyCodeVar] = {
                  alt: smileyValueVasr.alt,
                  src: smileyValueVasr.src,
                };
              }
            });
          }
          this.allSmileysKeysCache![smileyCode] = {
            alt: smileyValue.alt,
            src: smileyValue.src,
            skinVariations: smileyValue.skinVariations,
          };
        });
      });
      const allSmileyRegexarray = Object.keys(this.allSmileysKeysCache).map(hexEncode);
      this.smileUnicodeRegex = new RegExp(allSmileyRegexarray.join("|"), "g");
      this.loading = false;
      this.store.finishLoadingSmileys();
      this.resolveInit.forEach((r) => setTimeout(r));
    }
    if (!this.smileyCache) {
      await new Promise<void>((resolve) => {
        this.resolveInit.push(resolve);
      });
    }
  }

  public async getSmileyHtml(symbol: string) {
    await this.init();
    return this.getSmileyHtmlNotInited(symbol);
  }

  public async encodeSmileys(html: string): Promise<string> {
    await this.init();
    return html.replace(this.smileUnicodeRegex!, (symbol) => this.getSmileyHtmlNotInited(symbol));
  }

  public encodeSmileysSync(html: string) {
    if (!this.smileyCache) {
      throw Error("Not inited");
    }
    return html.replace(this.smileUnicodeRegex!, (symbol) => this.getSmileyHtmlNotInited(symbol));
  }

  public async smileys(): Promise<SmileysStructure> {
    await this.init();
    return this.smileyCache!;
  }

  public async allData() {
    await this.init();
    return {
      smileys: this.smileyCache!,
      allSmileysKeys: this.allSmileysKeysCache!,
      allSmileysKeysNoVariations: this.allSmileysKeysNoVariationsCache!,
    };
  }

  public async allSmileysKeys(): Promise<Record<string, Smile>> {
    await this.init();
    return this.allSmileysKeysCache!;
  }

  public async allSmileysKeysNoVariations(): Promise<Record<string, Smile>> {
    await this.init();
    return this.allSmileysKeysNoVariationsCache!;
  }

  private getSmileyHtmlNotInited(symbol: string) {
    const smile: Smile | undefined = this.allSmileysKeysCache![symbol];
    if (!smile) {
      throw Error(`Invalid smile ${symbol}`);
    }

    return `<img src="${smile.src}" symbol="${symbol}" class="emoji" alt="${smile.alt}">`;
  }
}

