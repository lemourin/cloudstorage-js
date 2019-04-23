"use-strict"

function cloudstorageApi() {
  return {
    cloudFactoryCreate: Module.cwrap("cloudFactoryCreate", "number", []),
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

var cloudApi;

const Cloud = {
  api: () => {
    if (!cloudApi) {
      cloudApi = cloudstorageApi();
    }
    return cloudApi;
  },
  string: (value) => {
    const api = cloudApi;
    const result = api.stringStr(value);
    api.stringRelease(value);
    return result;
  },
};

export const CloudItem = class {
  constructor(pointer) {
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

export const CloudAccess = class {
  constructor(pointer) {
    this.api = Cloud.api();
    this.pointer = pointer;
  }

  destroy() {
    this.api.cloudAccessRelease(this.pointer);
  }

  root() {
    return new CloudItem(this.api.cloudAccessRoot(this.pointer));
  }

  listDirectoryPage(item, token) {
    const api = this.api;
    return new Promise((resolve, reject) => {
      const listDirectoryCallback = addFunction((error, pageData) => {
        if (pageData !== 0) {
          const itemList = api.pageDataItemList(pageData);
          const size = api.vectorItemSize(itemList);
          const items = [];
          for (let i = 0; i < size; i++) {
            const item = api.vectorItemGet(itemList, i);
            items.push(new CloudItem(item));
          }
          resolve({ 
            items, 
            nextToken: api.pageDataToken(pageData), 
            destroy: () => { for (const d of items) d.destroy(); } 
          });
        } else if (error !== 0) {
          reject({ code: api.exceptionCode(error), description: api.exceptionDescription(error) });
        }
        removeFunction(listDirectoryCallback);
      }, "vii");
      api.cloudAccessListDirectoryPage(this.pointer, item.pointer, token, listDirectoryCallback);
    });
  }
};

export const CloudFactory = class {
  constructor() {
    this.api = Cloud.api();
    this.pointer = this.api.cloudFactoryCreate();
  }

  destroy() {
    this.api.cloudFactoryRelease(this.pointer);
  }

  availableProviders() {
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

  createAccess(name, token, accessToken = "") {
    return new CloudAccess(this.api.cloudFactoryCreateAccess(this.pointer, name, token, accessToken));
  }

  authorizeUrl(name) {
    return Cloud.string(this.api.cloudFactoryAuthorizationUrl(this.pointer, name));
  }
};
