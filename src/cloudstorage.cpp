#include <cloudstorage/ICloudFactory.h>
#include <cloudstorage/IThreadPool.h>
#include <emscripten.h>
#include <emscripten/fetch.h>
#include <cstring>
#include <iostream>
#include <regex>
#include <sstream>

using namespace cloudstorage;

namespace {

namespace priv {

uint32_t gCurrentFileSize;

template <class... Ts>
struct dump;

template <class First, class... Rest>
struct dump<First, Rest...> {
  static void run(std::ostream& stream, const First& f, const Rest&... ts) {
    stream << f << " ";
    dump<Rest...>::run(stream, ts...);
  }
};

template <>
struct dump<> {
  static void run(std::ostream&) {}
};

}  // namespace priv

template <class... Ts>
void print(Ts... args) {
  std::stringstream stream;
  priv::dump<Ts...>::run(stream, args...);
  EM_ASM({ console.log(Module.UTF8ToString($0)); }, stream.str().c_str());
}

ICloudFactory* gCloudFactory;
bool gExecPending;

void processEvents() {
  if (gCloudFactory) {
    if (!gExecPending) {
      gExecPending = true;
      gCloudFactory->processEvents();
      gExecPending = false;
    }
  }
}

struct DummyThreadPool : public IThreadPool {
  void schedule(const Task& f,
                const std::chrono::system_clock::time_point& when) override {
    auto timeout = std::chrono::duration_cast<std::chrono::milliseconds>(
                       when - std::chrono::system_clock::now())
                       .count();
    if (timeout > 0) {
      emscripten_async_call(
          [](void* d) {
            auto task = reinterpret_cast<Task*>(d);
            (*task)();
            delete task;
            processEvents();
          },
          new Task(f), timeout);
    } else {
      f();
      processEvents();
    }
  }
};

struct DummyThreadPoolFactory : public IThreadPoolFactory {
  IThreadPool::Pointer create(uint32_t) override {
    return std::make_unique<DummyThreadPool>();
  }
};

struct JSHttp : public IHttp {
  struct HttpRequest : public IHttpRequest {
    struct UserData {
      CompleteCallback mOnCompleted;
      IHttpRequest::HeaderParameters mRequestHeaders;
      uint32_t mCurrentFileSize;
      std::string mData;
      std::shared_ptr<std::ostream> mResponse;
      std::shared_ptr<std::ostream> mErrorStream;
      IHttpRequest::ICallback::Pointer mCallback;
    };

    HttpRequest(const std::string& url, const std::string& method,
                bool followRedirect)
        : mUrl(url), mMethod(method), mFollowRedirect(followRedirect) {}
    void setParameter(const std::string& parameter,
                      const std::string& value) override {
      mGetParameters[parameter] = value;
    }

    void setHeaderParameter(const std::string& parameter,
                            const std::string& value) override {
      mHeaderParameters.insert({parameter, value});
    }

    const GetParameters& parameters() const override { return mGetParameters; }

    const HeaderParameters& headerParameters() const override {
      return mHeaderParameters;
    }

    const std::string& url() const override { return mUrl; }

    const std::string& method() const override { return mMethod; }

    bool follow_redirect() const override { return mFollowRedirect; }

    void send(CompleteCallback onCompleted, std::shared_ptr<std::istream> data,
              std::shared_ptr<std::ostream> response,
              std::shared_ptr<std::ostream> errorStream,
              IHttpRequest::ICallback::Pointer callback) const override {
      emscripten_fetch_attr_t attr;
      emscripten_fetch_attr_init(&attr);
      strcpy(attr.requestMethod, mMethod.c_str());
      attr.attributes = EMSCRIPTEN_FETCH_LOAD_TO_MEMORY;
      std::vector<const char*> headerData;
      bool contentType = false;
      for (const auto& h : mHeaderParameters) {
        headerData.push_back(strdup(h.first.c_str()));
        headerData.push_back(strdup(h.second.c_str()));
        std::string lowercased;
        for (char c : h.first) lowercased += std::tolower(c);
        if (lowercased == "content-type") contentType = true;
      }
      if (!contentType) {
        headerData.push_back(strdup("content-type"));
        headerData.push_back(strdup("application/x-www-form-urlencoded"));
      }
      headerData.push_back(nullptr);
      attr.requestHeaders = headerData.data();
      std::stringstream storage;
      storage << data->rdbuf();
      attr.userData =
          new UserData{onCompleted,   mHeaderParameters, priv::gCurrentFileSize,
                       storage.str(), response,          errorStream,
                       callback};
      attr.onsuccess = onExecuted;
      attr.onerror = onExecuted;
      attr.requestData = static_cast<UserData*>(attr.userData)->mData.c_str();
      attr.requestDataSize =
          static_cast<UserData*>(attr.userData)->mData.size();
      std::string parameters;
      bool empty = true;
      for (const auto& p : mGetParameters) {
        if (!empty) parameters += "&";
        parameters += p.first + "=" + p.second;
        empty = false;
      }
      auto url = mUrl + (empty ? "" : ("?" + parameters));
      emscripten_fetch(&attr, url.c_str());
      for (const char* d : headerData) {
        free(const_cast<char*>(d));
      }
    }

    static void onExecuted(emscripten_fetch_t* f) {
      auto userdata = static_cast<UserData*>(f->userData);
      IHttpRequest::Response response;
      response.http_code_ = f->status;
      response.output_stream_ = userdata->mResponse;
      response.error_stream_ = userdata->mErrorStream;
      if (f->numBytes > 0) {
        response.headers_.insert(
            {"content-length", std::to_string(f->numBytes)});
        for (const auto& d : userdata->mRequestHeaders) {
          if (d.first == "Range") {
            std::regex regex(R"(bytes=(\d*)-(\d*))");
            std::smatch match;
            if (std::regex_match(d.second, match, regex)) {
              response.headers_.insert(
                  {"content-range",
                   "bytes " + match[1].str() + "-" + match[2].str() + "/" +
                       std::to_string(userdata->mCurrentFileSize)});
            };
          }
        }
        if (userdata->mCallback->isSuccess(f->status, {})) {
          *response.output_stream_ << std::string(f->data, f->numBytes);
        } else {
          *response.error_stream_ << std::string(f->data, f->numBytes);
        }
      }
      userdata->mOnCompleted(response);
      delete userdata;
      emscripten_fetch_close(f);
      processEvents();
    }

    std::string mUrl;
    std::string mMethod;
    bool mFollowRedirect;
    GetParameters mGetParameters;
    HeaderParameters mHeaderParameters;
  };

  IHttpRequest::Pointer create(const std::string& url,
                               const std::string& method,
                               bool follow_redirect) const override {
    return std::unique_ptr<HttpRequest>(
        new HttpRequest(url, method, follow_redirect));
  }
};  // namespace

struct DummyHttpServerFactory : public IHttpServerFactory {
  IHttpServer::Pointer create(IHttpServer::ICallback::Pointer,
                              const std::string& session_id,
                              IHttpServer::Type) override {
    return nullptr;
  }
};

struct CloudFactoryCallback : public ICloudFactory::ICallback {
  CloudFactoryCallback(
      void (*onCloudAuthenticationCodeExchangeFailed)(
          const IException*, const std::string* provider),
      void (*onCloudAuthenticationCodeReceived)(const std::string* provider,
                                                const std::string* code),
      void (*onCloudCreated)(ICloudAccess*),
      void (*onCloudRemoved)(ICloudAccess*))
      : mOnCloudAuthenticationCodeExchangeFailed(
            onCloudAuthenticationCodeExchangeFailed),
        mOnCloudAuthenticationCodeReceived(onCloudAuthenticationCodeReceived),
        mOnCloudCreated(onCloudCreated),
        mOnCloudRemoved(onCloudRemoved) {}

  void onCloudAuthenticationCodeExchangeFailed(const std::string& provider,
                                               const IException& e) override {
    mOnCloudAuthenticationCodeExchangeFailed(&e, new std::string(provider));
  }
  void onCloudAuthenticationCodeReceived(const std::string& provider,
                                         const std::string& code) override {
    mOnCloudAuthenticationCodeReceived(new std::string(provider),
                                       new std::string(code));
  }
  void onCloudCreated(const std::shared_ptr<ICloudAccess>& p) override {
    mOnCloudCreated(p.get());
  }
  void onCloudRemoved(const std::shared_ptr<ICloudAccess>& p) override {
    mOnCloudRemoved(p.get());
  }
  void onEventsAdded() override {}

  void (*mOnCloudAuthenticationCodeExchangeFailed)(const IException*,
                                                   const std::string* provider);
  void (*mOnCloudAuthenticationCodeReceived)(const std::string* provider,
                                             const std::string* code);
  void (*mOnCloudCreated)(ICloudAccess*);
  void (*mOnCloudRemoved)(ICloudAccess*);
};

}  // namespace

extern "C" {
EMSCRIPTEN_KEEPALIVE
void cloudFactorySetCurrentFileSize(uint32_t size) {
  priv::gCurrentFileSize = size;
}

EMSCRIPTEN_KEEPALIVE
ICloudFactory* cloudFactoryCreate(
    const char* hostname,
    void (*onCloudAuthenticationCodeExchangeFailed)(
        const IException*, const std::string* provider),
    void (*onCloudAuthenticationCodeReceived)(const std::string* provider,
                                              const std::string* code),
    void (*onCloudCreated)(ICloudAccess*),
    void (*onCloudRemoved)(ICloudAccess*)) {
  static bool initialized;
  if (!initialized) {
    gCloudFactory = ICloudFactory::create(
                        ICloudFactory::InitData{
                            hostname, std::make_unique<JSHttp>(),
                            std::make_unique<DummyHttpServerFactory>(), nullptr,
                            std::make_unique<DummyThreadPoolFactory>(),
                            std::make_unique<CloudFactoryCallback>(
                                onCloudAuthenticationCodeExchangeFailed,
                                onCloudAuthenticationCodeReceived,
                                onCloudCreated, onCloudRemoved)})
                        .release();
    initialized = true;
  }
  return gCloudFactory;
}

EMSCRIPTEN_KEEPALIVE
void cloudFactoryRelease(const ICloudFactory* d) {
  delete d;
  gCloudFactory = nullptr;
}

EMSCRIPTEN_KEEPALIVE
bool cloudFactoryLoadConfig(ICloudFactory* d, const char* config) {
  return d->loadConfig(std::istringstream(config));
}

EMSCRIPTEN_KEEPALIVE
std::vector<std::string>* cloudFactoryAvailableProviders(
    const ICloudFactory* d) {
  return new std::vector<std::string>(d->availableProviders());
}

EMSCRIPTEN_KEEPALIVE
ICloudAccess* cloudFactoryCreateAccess(ICloudFactory* d, const char* name,
                                       const char* token,
                                       const char* accessToken,
                                       const char* redirectUri,
                                       const char* state) {
  ICloudFactory::ProviderInitData data;
  data.token_ = token;
  data.permission_ = ICloudProvider::Permission::ReadWrite;
  if (accessToken && strlen(accessToken) > 0)
    data.hints_["access_token"] = accessToken;
  if (redirectUri && strlen(redirectUri) > 0)
    data.hints_["redirect_uri"] = redirectUri;
  if (state && strlen(state) > 0) data.hints_["state"] = state;
  return d->create(name, std::move(data)).get();
}

EMSCRIPTEN_KEEPALIVE
void cloudFactoryRemoveAccess(ICloudFactory* d, ICloudAccess* access) {
  d->remove(*access);
}

EMSCRIPTEN_KEEPALIVE
std::string* cloudFactoryAuthorizationUrl(const ICloudFactory* d,
                                          const char* name,
                                          const char* redirectUri,
                                          const char* state) {
  ICloudFactory::ProviderInitData data;
  data.permission_ = ICloudProvider::Permission::ReadWrite;
  if (redirectUri && strlen(redirectUri) > 0)
    data.hints_["redirect_uri"] = redirectUri;
  if (state && strlen(state) > 0) data.hints_["state"] = state;
  return new std::string(d->authorizationUrl(name, data));
}

EMSCRIPTEN_KEEPALIVE
void cloudFactoryExchangeCode(ICloudFactory* p, const char* name,
                              const char* redirectUri, const char* state,
                              const char* code,
                              void (*callback)(const IException*,
                                               const Token*)) {
  ICloudFactory::ProviderInitData data;
  data.permission_ = ICloudProvider::Permission::ReadWrite;
  if (redirectUri && strlen(redirectUri) > 0)
    data.hints_["redirect_uri"] = redirectUri;
  if (state && strlen(state) > 0) data.hints_["state"] = state;
  p->exchangeAuthorizationCode(name, data, code)
      .then([callback](const Token& token) { callback(0, &token); })
      .error<IException>([callback](const auto& e) { callback(&e, 0); });
  processEvents();
}

EMSCRIPTEN_KEEPALIVE
const char* stringStr(const std::string* d) { return d->c_str(); }

EMSCRIPTEN_KEEPALIVE
void stringRelease(const std::string* d) { delete d; }

EMSCRIPTEN_KEEPALIVE
const char* vectorStringGet(const std::vector<std::string>* d, int index) {
  return (*d)[index].c_str();
}

EMSCRIPTEN_KEEPALIVE
int vectorStringSize(const std::vector<std::string>* d) { return d->size(); }

EMSCRIPTEN_KEEPALIVE
void vectorStringRelease(const std::vector<std::string>* d) { delete d; }

EMSCRIPTEN_KEEPALIVE
std::string* cloudAccessToken(ICloudAccess* p) {
  return new std::string(p->token());
}

EMSCRIPTEN_KEEPALIVE
void cloudAccessListDirectoryPage(ICloudAccess* p, IItem::Pointer* item,
                                  const char* pageToken,
                                  void (*callback)(const IException*,
                                                   const PageData*)) {
  p->listDirectoryPage(*item, pageToken)
      .then([callback](const PageData& e) { callback(0, &e); })
      .error<IException>([callback](const auto& e) { callback(&e, 0); });
  processEvents();
}

EMSCRIPTEN_KEEPALIVE
void cloudAccessGetItem(ICloudAccess* p, const char* path,
                        void (*callback)(const IException*,
                                         const IItem::Pointer*)) {
  p->getItem(path)
      .then([callback](const IItem::Pointer& e) { callback(0, &e); })
      .error<IException>([callback](const auto& e) { callback(&e, 0); });
  processEvents();
};

EMSCRIPTEN_KEEPALIVE
void cloudAccessGeneralData(ICloudAccess* p,
                            void (*callback)(const IException*,
                                             const GeneralData*)) {
  p->generalData()
      .then([callback](const GeneralData& d) { callback(0, &d); })
      .error<IException>([callback](const auto& e) { callback(&e, 0); });
  processEvents();
}

EMSCRIPTEN_KEEPALIVE
void cloudAccessDownloadFile(
    ICloudAccess* p, IItem::Pointer* item, uint32_t start, uint32_t end,
    void (*callback)(const IException*, const uint8_t* data, uint32_t size)) {
  struct DownloadCallback : public ICloudDownloadCallback {
    void receivedData(const char* data, uint32_t length) {
      mData += std::string(data, length);
    }
    void progress(uint64_t, uint64_t) {}

    std::string mData;
  };
  auto cb = std::make_shared<DownloadCallback>();
  p->downloadFile(*item, Range{start, end == UINT32_MAX ? Range::Full : end},
                  cb)
      .then([callback, cb]() {
        callback(nullptr, reinterpret_cast<const uint8_t*>(cb->mData.data()),
                 cb->mData.size());
      })
      .error<IException>([callback](const auto& e) { callback(&e, 0, 0); });
  processEvents();
}

EMSCRIPTEN_KEEPALIVE std::string* cloudAccessName(ICloudAccess* p) {
  return new std::string(p->name());
}

EMSCRIPTEN_KEEPALIVE IItem::Pointer* cloudAccessRoot(ICloudAccess* p) {
  return new std::shared_ptr<IItem>(p->root());
}

EMSCRIPTEN_KEEPALIVE
IItem::Pointer* itemCopy(IItem::Pointer* d) {
  return new std::shared_ptr<IItem>(*d);
}

EMSCRIPTEN_KEEPALIVE void itemRelease(IItem::Pointer* d) { delete d; }

EMSCRIPTEN_KEEPALIVE
std::string* itemFilename(IItem::Pointer* d) {
  return new std::string((*d)->filename());
}

EMSCRIPTEN_KEEPALIVE
std::string* itemId(IItem::Pointer* d) { return new std::string((*d)->id()); }

EMSCRIPTEN_KEEPALIVE
uint32_t itemSize(IItem::Pointer* d) { return (*d)->size(); }

EMSCRIPTEN_KEEPALIVE
const char* itemType(IItem::Pointer* d) {
  switch ((*d)->type()) {
    case IItem::FileType::Audio:
      return "audio";
    case IItem::FileType::Video:
      return "video";
    case IItem::FileType::Directory:
      return "directory";
    case IItem::FileType::Image:
      return "image";
    default:
      return "unknown";
  }
}

EMSCRIPTEN_KEEPALIVE
int vectorItemSize(const std::vector<IItem::Pointer>* d) { return d->size(); }

EMSCRIPTEN_KEEPALIVE
IItem::Pointer* vectorItemGet(const std::vector<IItem::Pointer>* d, int i) {
  return new std::shared_ptr<IItem>((*d)[i]);
}

EMSCRIPTEN_KEEPALIVE
IItem::List* pageDataItemList(PageData* d) { return &d->items_; }

EMSCRIPTEN_KEEPALIVE
const char* pageDataToken(PageData* d) { return d->next_token_.c_str(); }

EMSCRIPTEN_KEEPALIVE
int exceptionCode(IException* e) { return e->code(); }

EMSCRIPTEN_KEEPALIVE
const char* exceptionDescription(IException* e) { return e->what(); }

EMSCRIPTEN_KEEPALIVE
const char* tokenToken(const Token* d) { return d->token_.c_str(); }

EMSCRIPTEN_KEEPALIVE
const char* tokenAccessToken(const Token* d) {
  return d->access_token_.c_str();
}

EMSCRIPTEN_KEEPALIVE
const char* generalDataUserName(const GeneralData* d) {
  return d->username_.c_str();
}

EMSCRIPTEN_KEEPALIVE
uint64_t generalDataSpaceTotal(const GeneralData* d) { return d->space_total_; }

EMSCRIPTEN_KEEPALIVE
uint64_t generalDataSpaceUsed(const GeneralData* d) { return d->space_used_; }
}
