"use-strict"

function cloudstorageApi() {
  return {
    cloudFactoryCreate: Module.cwrap("cloudFactoryCreate", "number", ["string"]),
    cloudFactoryRelease: Module.cwrap("cloudFactoryRelease", null, ["number"]),
    cloudFactoryAvailableProvidersImpl: Module.cwrap("cloudFactoryAvailableProviders", "number", ["number"]),
    cloudFactoryCreateAccess: Module.cwrap("cloudFactoryCreateAccess", "number", ["number", "string", "string", "string"]),
    cloudFactoryAuthorizationUrl: Module.cwrap("cloudFactoryAuthorizationUrl", "number", ["number", "string"]),

    cloudAccessListDirectoryPage: Module.cwrap("cloudAccessListDirectoryPage", null, ["number", "number", "string", "number"]),
    cloudAccessRelease: Module.cwrap("cloudAccessRelease", null, ["number"]),
    cloudAccessRoot: Module.cwrap("cloudAccessRoot", "number", ["number"]),

    vectorStringGet: Module.cwrap("vectorStringGet", "string", ["number", "number"]),
    vectorStringSize: Module.cwrap("vectorStringSize", "number", ["number"]),
    vectorStringRelease: Module.cwrap("vectorStringRelease", null, ["number"]),

    vectorItemGet: Module.cwrap("vectorItemGet", "number", ["number", "number"]),
    vectorItemSize: Module.cwrap("vectorItemSize", "number", ["number"]),

    stringStr: Module.cwrap("stringStr", "string", ["number"]),
    stringRelease: Module.cwrap("stringRelease", null, ["number"]),

    itemRelease: Module.cwrap("itemRelease", null, ["number"]),
    itemFilename: Module.cwrap("itemFilename", "number", ["number"]),

    pageDataItemList: Module.cwrap("pageDataItemList", "number", ["number"]),
    pageDataToken: Module.cwrap("pageDataToken", "string", ["number"]),

    exceptionCode: Module.cwrap("exceptionCode", "number", ["number"]),
    exceptionDescription: Module.cwrap("exceptionDescription", "string", ["number"]),
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
};

export class CloudError {
  code: number
  description: string
  constructor(code: number, description: string) {
    this.code = code;
    this.description = description;
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

export class CloudAccess {
  api: any
  pointer: number
  constructor(pointer: number) {
    this.api = Cloud.api();
    this.pointer = pointer;
  }

  destroy() {
    this.api.cloudAccessRelease(this.pointer);
  }

  root() {
    return new CloudItem(this.api.cloudAccessRoot(this.pointer));
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
};

export class CloudFactory {
  api: any
  pointer: number
  constructor(hostname: string) {
    this.api = Cloud.api();
    this.pointer = this.api.cloudFactoryCreate(hostname);
  }

  destroy() {
    this.api.cloudFactoryRelease(this.pointer);
  }

  availableProviders(): string[] {
    const api = this.api;
    const providers = api.cloudFactoryAvailableProvidersImpl(this.pointer);
    const count = api.vectorStringSize(providers);
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(api.vectorStringGet(providers, i));
    }
    api.vectorStringRelease(providers);
    return result;
  }

  createAccess(name: string, token: string, accessToken = "") {
    return new CloudAccess(this.api.cloudFactoryCreateAccess(this.pointer, name, token, accessToken));
  }

  authorizeUrl(name: string) {
    return Cloud.string(this.api.cloudFactoryAuthorizationUrl(this.pointer, name));
  }
};
