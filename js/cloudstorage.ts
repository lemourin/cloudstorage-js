import * as ReadableStream from "readable-stream";

function cloudstorageApi() {
  return {
    cloudFactoryCreate: Module.cwrap("cloudFactoryCreate", "number", ["string", "number", "number", "number", "number"]),
    cloudFactoryRelease: Module.cwrap("cloudFactoryRelease", null, ["number"]),
    cloudFactoryLoadConfig: Module.cwrap("cloudFactoryLoadConfig", "boolean", ["number", "string"]),
    cloudFactoryAvailableProvidersImpl: Module.cwrap("cloudFactoryAvailableProviders", "number", ["number"]),
    cloudFactoryCreateAccess: Module.cwrap("cloudFactoryCreateAccess", "number", ["number", "string", "string", "string", "string", "string"]),
    cloudFactoryRemoveAccess: Module.cwrap("cloudFactoryRemoveAccess", null, ["number", "number"]),
    cloudFactoryExchangeCode: Module.cwrap("cloudFactoryExchangeCode", null, ["number", "string", "string", "string", "string", "number"]),
    cloudFactoryAuthorizationUrl: Module.cwrap("cloudFactoryAuthorizationUrl", "number", ["number", "string", "string", "string"]),
    cloudFactorySetCurrentFileSize: Module.cwrap("cloudFactorySetCurrentFileSize", null, ["number"]),

    cloudAccessListDirectoryPage: Module.cwrap("cloudAccessListDirectoryPage", null, ["number", "number", "string", "number"]),
    cloudAccessGeneralData: Module.cwrap("cloudAccessGeneralData", null, ["number", "number"]),
    cloudAccessGetItem: Module.cwrap("cloudAccessGetItem", null, ["number", "string", "number"]),
    cloudAccessDownloadFile: Module.cwrap("cloudAccessDownloadFile", null, ["number", "number", "number", "number", "number"]),
    cloudAccessRoot: Module.cwrap("cloudAccessRoot", "number", ["number"]),
    cloudAccessName: Module.cwrap("cloudAccessName", "number", ["number"]),
    cloudAccessToken: Module.cwrap("cloudAccessToken", "number", ["number"]),

    vectorStringGet: Module.cwrap("vectorStringGet", "string", ["number", "number"]),
    vectorStringSize: Module.cwrap("vectorStringSize", "number", ["number"]),
    vectorStringRelease: Module.cwrap("vectorStringRelease", null, ["number"]),

    vectorItemGet: Module.cwrap("vectorItemGet", "number", ["number", "number"]),
    vectorItemSize: Module.cwrap("vectorItemSize", "number", ["number"]),

    stringStr: Module.cwrap("stringStr", "string", ["number"]),
    stringRelease: Module.cwrap("stringRelease", null, ["number"]),

    itemRelease: Module.cwrap("itemRelease", null, ["number"]),
    itemCopy: Module.cwrap("itemCopy", "number", ["number"]),
    itemFilename: Module.cwrap("itemFilename", "number", ["number"]),
    itemSize: Module.cwrap("itemSize", "number", ["number"]),
    itemType: Module.cwrap("itemType", "string", ["number"]),
    itemId: Module.cwrap("itemId", "number", ["number"]),

    pageDataItemList: Module.cwrap("pageDataItemList", "number", ["number"]),
    pageDataToken: Module.cwrap("pageDataToken", "string", ["number"]),

    exceptionCode: Module.cwrap("exceptionCode", "number", ["number"]),
    exceptionDescription: Module.cwrap("exceptionDescription", "string", ["number"]),

    tokenToken: Module.cwrap("tokenToken", "string", ["number"]),
    tokenAccessToken: Module.cwrap("tokenAccessToken", "string", ["number"]),

    generalDataUserName: Module.cwrap("generalDataUserName", "string", ["number"]),
    generalDataSpaceUsed: Module.cwrap("generalDataSpaceUsed", "number", ["number"]),
    generalDataSpaceTotal: Module.cwrap("generalDataSpaceTotal", "number", ["number"])
  };
}

var cloudApi: any;

const Cloud = {
  api: () => {
    if (!cloudApi) {
      cloudApi = cloudstorageApi();
    }
    return cloudApi;
  },
  string: (value: number) => {
    const api = cloudApi;
    const result = api.stringStr(value);
    api.stringRelease(value);
    return result;
  },
};

export class CloudItem {
  api: any
  pointer: number
  constructor(pointer: number) {
    this.api = Cloud.api();
    this.pointer = pointer;
  }

  destroy() {
    this.api.itemRelease(this.pointer);
  }

  filename() {
    return Cloud.string(this.api.itemFilename(this.pointer));
  }

  id() {
    return Cloud.string(this.api.itemId(this.pointer));
  }

  copy() {
    return new CloudItem(this.api.itemCopy(this.pointer));
  }

  size() {
    return this.api.itemSize(this.pointer);
  }

  type() {
    return this.api.itemType(this.pointer);
  }
};

export class CloudError {
  code: number
  description: string
  constructor(code: number, description: string) {
    this.code = code;
    this.description = description;
  }
}

export class CloudToken {
  token: string
  accessToken: string
  constructor(token: string, accessToken: string) {
    this.token = token;
    this.accessToken = accessToken;
  }
}

export class CloudPageData {
  items: CloudItem[]
  nextToken: string
  constructor(items: CloudItem[], nextToken: string) {
    this.items = items;
    this.nextToken = nextToken;
  }

  destroy() {
    for (const d of this.items) d.destroy();
  }
}

export class CloudGeneralData {
  userName: string
  spaceUsed: number
  spaceTotal: number

  constructor(userName: string, spaceUsed: number, spaceTotal: number) {
    this.userName = userName;
    this.spaceUsed = spaceUsed;
    this.spaceTotal = spaceTotal;
  }
}

export class CloudAccess {
  api: any
  pointer: number
  constructor(pointer: number) {
    this.api = Cloud.api();
    this.pointer = pointer;
  }

  root() {
    return new CloudItem(this.api.cloudAccessRoot(this.pointer));
  }

  name() {
    return Cloud.string(this.api.cloudAccessName(this.pointer));
  }

  token() {
    return Cloud.string(this.api.cloudAccessToken(this.pointer));
  }

  listDirectoryPage(item: CloudItem, token: string): Promise<CloudPageData> {
    const api = this.api;
    return new Promise((resolve, reject) => {
      const listDirectoryCallback = addFunction((error: number, pageData: number) => {
        if (pageData !== 0) {
          const itemList = api.pageDataItemList(pageData);
          const size = api.vectorItemSize(itemList);
          const items: CloudItem[] = [];
          for (let i = 0; i < size; i++) {
            const item = api.vectorItemGet(itemList, i);
            items.push(new CloudItem(item));
          }
          resolve(new CloudPageData(items, api.pageDataToken(pageData)));
        } else if (error !== 0) {
          reject(new CloudError(api.exceptionCode(error), api.exceptionDescription(error)));
        }
        removeFunction(listDirectoryCallback);
      }, "vii");
      api.cloudAccessListDirectoryPage(this.pointer, item.pointer, token, listDirectoryCallback);
    });
  }

  generalData(): Promise<CloudGeneralData> {
    const api = this.api;
    return new Promise((resolve, reject) => {
      const generalDataCallback = addFunction((error: number, generalData: number) => {
        if (generalData !== 0) {
          resolve(new CloudGeneralData(
            api.generalDataUserName(generalData),
            api.generalDataSpaceUsed(generalData),
            api.generalDataSpaceTotal(generalData))
          );
        } else if (error !== 0) {
          reject(new CloudError(api.exceptionCode(error), api.exceptionDescription(error)));
        }
        removeFunction(generalDataCallback);
      }, "vii");
      api.cloudAccessGeneralData(this.pointer, generalDataCallback);
    });
  }

  getItem(path: string): Promise<CloudItem> {
    const api = this.api;
    return new Promise((resolve, reject) => {
      const getItemCallback = addFunction((error: number, item: number) => {
        if (item !== 0) {
          resolve(new CloudItem(item).copy());
        } else if (error !== 0) {
          reject(new CloudError(api.exceptionCode(error), api.exceptionDescription(error)));
        }
        removeFunction(getItemCallback);
      }, "vii");
      api.cloudAccessGetItem(this.pointer, path, getItemCallback);
    });
  }

  downloadFileChunk(item: CloudItem, start = 0, end = -1): Promise<Uint8Array> {
    const api = this.api;
    return new Promise((resolve, reject) => {
      const downloadFileCallback = addFunction((error: number, array: number, size: number) => {
        if (error !== 0) {
          reject(new CloudError(api.exceptionCode(error), api.exceptionDescription(error)));
        } else {
          const result: number[] = [];
          for (let i = 0; i < size; i++) {
            result.push(Module.HEAPU8[array / Uint8Array.BYTES_PER_ELEMENT + i]);
          }
          resolve(new Uint8Array(result));
        }
        removeFunction(downloadFileCallback);
      }, "viii");
      api.cloudFactorySetCurrentFileSize(item.size());
      api.cloudAccessDownloadFile(this.pointer, item.pointer, start, end, downloadFileCallback);
    });
  }

  downloadFile(item: CloudItem, start = 0, end = -1): ReadableStream.Readable {
    const CHUNK_SIZE = 1 * 1024 * 1024;
    const e = end == -1 ? item.size() - 1 : end;
    const access = this;
    const i = item.copy();
    let currentPosition = start;
    return new ReadableStream.Readable({
      async read(size: number) {
        const currentRead = Math.min(CHUNK_SIZE, Math.max(e - currentPosition + 1, 0));
        if (currentRead == 0) {
          this.push(null);
        } else {
          const data = await access.downloadFileChunk(i, currentPosition, currentRead);
          this.push(data);
          currentPosition += currentRead;
        }
      },
      destroy() {
        // i.destroy();
      }
    });
  }
};

export interface CloudFactoryListener {
  onCloudCreated(access: CloudAccess): void;
  onCloudRemoved(access: CloudAccess): void;
  onCloudAuthenticationCodeExchangeFailed(provider: string, error: CloudError): void;
  onCloudAuthenticationCodeReceived(provider: string, code: string): void;
};

export class CloudFactory {
  api: any
  pointer: number
  cloudAuthenticationCodeExchangeFailedPointer: number
  cloudAuthenticationCodeReceivedPointer: number
  cloudCreatedPointer: number
  cloudRemovedPointer: number
  constructor(hostname: string, listener: CloudFactoryListener) {
    this.api = Cloud.api();
    this.cloudAuthenticationCodeExchangeFailedPointer = addFunction(
      (error: number, provider: number) => {
        const api = this.api;
        if (listener.onCloudAuthenticationCodeExchangeFailed)
          listener.onCloudAuthenticationCodeExchangeFailed(
            Cloud.string(provider),
            new CloudError(api.exceptionCode(error), api.exceptionDescription(error))
          );
      },
      "vii"
    );
    this.cloudAuthenticationCodeReceivedPointer = addFunction(
      (provider: number, code: number) => {
        if (listener.onCloudAuthenticationCodeReceived)
          listener.onCloudAuthenticationCodeReceived(Cloud.string(provider), Cloud.string(code));
      },
      "vii"
    );
    this.cloudCreatedPointer = addFunction(
      (access: number) => { if (listener.onCloudCreated) listener.onCloudCreated(new CloudAccess(access)); },
      "vi"
    );
    this.cloudRemovedPointer = addFunction(
      (access: number) => { if (listener.onCloudRemoved) listener.onCloudRemoved(new CloudAccess(access)); },
      "vi"
    );
    this.pointer = this.api.cloudFactoryCreate(
      hostname,
      this.cloudAuthenticationCodeExchangeFailedPointer,
      this.cloudAuthenticationCodeReceivedPointer,
      this.cloudCreatedPointer,
      this.cloudRemovedPointer
    );
  }

  destroy() {
    this.api.cloudFactoryRelease(this.pointer);
    removeFunction(this.cloudAuthenticationCodeExchangeFailedPointer);
    removeFunction(this.cloudAuthenticationCodeReceivedPointer);
    removeFunction(this.cloudCreatedPointer);
    removeFunction(this.cloudRemovedPointer);
  }

  availableProviders(): string[] {
    const api = this.api;
    const providers = api.cloudFactoryAvailableProvidersImpl(this.pointer);
    const count = api.vectorStringSize(providers);
    const result: string[] = [];
    for (let i = 0; i < count; i++) {
      result.push(api.vectorStringGet(providers, i));
    }
    api.vectorStringRelease(providers);
    return result;
  }

  createAccess(name: string, token: string, hints: any) {
    return new CloudAccess(this.api.cloudFactoryCreateAccess(
      this.pointer,
      name,
      token,
      hints.accessToken ? hints.accessToken : "",
      hints.redirectUri ? hints.redirectUri : "",
      hints.state ? hints.state : ""
    ));
  }

  removeAccess(access: CloudAccess) {
    this.api.cloudFactoryRemoveAccess(this.pointer, access.pointer);
  }

  authorizeUrl(name: string, hints: any) {
    return Cloud.string(this.api.cloudFactoryAuthorizationUrl(
      this.pointer,
      name,
      hints.redirectUri ? hints.redirectUri : "",
      hints.state ? hints.state : ""
    ));
  }


  exchangeAuthorizationCode(name: string, hints: any, code: string): Promise<CloudToken> {
    const api = this.api;
    return new Promise((resolve, reject) => {
      const exchangeCodeCallback = addFunction((error: number, tokenData: number) => {
        if (tokenData !== 0) {
          resolve(new CloudToken(api.tokenToken(tokenData), api.tokenAccessToken(tokenData)));
        } else if (error !== 0) {
          reject(new CloudError(api.exceptionCode(error), api.exceptionDescription(error)));
        }
        removeFunction(exchangeCodeCallback);
      }, "vi");
      api.cloudFactoryExchangeCode(
        this.pointer,
        name,
        hints.redirectUri ? hints.redirectUri : "",
        hints.state ? hints.state : "",
        code,
        exchangeCodeCallback
      );
    });
  }

  loadConfig(config: any): boolean {
    return this.api.cloudFactoryLoadConfig(this.pointer, JSON.stringify(config));
  }
};
