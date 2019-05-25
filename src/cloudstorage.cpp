#include <cloudstorage/ICloudFactory.h>
#include <cloudstorage/IThreadPool.h>
#include <emscripten.h>
#include <emscripten/fetch.h>
#include <iostream>
#include <sstream>

using namespace cloudstorage;

namespace {

namespace priv {

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

struct DummyThreadPool : public IThreadPool {
  void schedule(const Task& f) override { f(); }
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
      attr.userData = new UserData{onCompleted, storage.str(), response,
                                   errorStream, callback};
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
        if (userdata->mCallback->isSuccess(f->status, {})) {
          *response.output_stream_ << std::string(f->data, f->numBytes);
        } else {
          *response.error_stream_ << std::string(f->data, f->numBytes);
        }
      }
      userdata->mOnCompleted(response);
      delete userdata;
      emscripten_fetch_close(f);
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
  void onCloudAuthenticationCodeExchangeFailed(
      const std::string& /* provider */, const IException&) override {}
  void onCloudAuthenticationCodeReceived(const std::string& /* provider */,
                                         const std::string&) override {}
  void onCloudCreated(const std::shared_ptr<ICloudAccess>&) override {}
  void onCloudRemoved(const std::shared_ptr<ICloudAccess>&) override {}
  void onEventsAdded() override {}
};

ICloudFactory* gCloudFactory;

}  // namespace

extern "C" {
EMSCRIPTEN_KEEPALIVE
ICloudFactory* cloudFactoryCreate() {
  static bool initialized;
  if (!initialized) {
    gCloudFactory = ICloudFactory::create(
                        ICloudFactory::InitData{
                            "http://localhost:8080", std::make_unique<JSHttp>(),
                            std::make_unique<DummyHttpServerFactory>(), nullptr,
                            std::make_unique<DummyThreadPoolFactory>(),
                            std::make_unique<CloudFactoryCallback>()})

                        .release();
    emscripten_set_main_loop(
        [] {
          if (gCloudFactory) gCloudFactory->processEvents();
        },
        0, 0);
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
std::vector<std::string>* cloudFactoryAvailableProviders(
    const ICloudFactory* d) {
  return new std::vector<std::string>(d->availableProviders());
}

EMSCRIPTEN_KEEPALIVE
std::shared_ptr<ICloudAccess>* cloudFactoryCreateAccess(
    ICloudFactory* d, const char* name, const char* token,
    const char* accessToken) {
  ICloudFactory::ProviderInitData data;
  data.token_ = token;
  data.permission_ = ICloudProvider::Permission::ReadWrite;
  data.hints_["access_token"] = accessToken;
  return new std::shared_ptr<ICloudAccess>(d->create(name, std::move(data)));
}

EMSCRIPTEN_KEEPALIVE
std::string* cloudFactoryAuthorizationUrl(const ICloudFactory* d,
                                          const char* name) {
  return new std::string(d->authorizationUrl(name));
}

EMSCRIPTEN_KEEPALIVE
const char* stringStr(const std::string* d) { return d->c_str(); }

EMSCRIPTEN_KEEPALIVE
void stringRelease(const std::string* d) { delete d; }

EMSCRIPTEN_KEEPALIVE
void cloudAccessRelease(std::shared_ptr<ICloudAccess>* d) { delete d; }

EMSCRIPTEN_KEEPALIVE
const char* vectorStringGet(const std::vector<std::string>* d, int index) {
  return (*d)[index].c_str();
}

EMSCRIPTEN_KEEPALIVE
int vectorStringSize(const std::vector<std::string>* d) { return d->size(); }

EMSCRIPTEN_KEEPALIVE
void vectorStringRelease(const std::vector<std::string>* d) { delete d; }

EMSCRIPTEN_KEEPALIVE
void cloudAccessListDirectoryPage(std::shared_ptr<ICloudAccess>* p,
                                  IItem::Pointer* item, const char* pageToken,
                                  void (*callback)(const IException*,
                                                   const PageData*)) {
  (*p)->listDirectoryPage(*item, pageToken)
      .then([callback](const PageData& e) { callback(0, &e); })
      .error<IException>([callback](const auto& e) { callback(&e, 0); });
}

EMSCRIPTEN_KEEPALIVE
IItem::Pointer* cloudAccessRoot(const std::shared_ptr<ICloudAccess>* p) {
  return new std::shared_ptr<IItem>((*p)->root());
}

EMSCRIPTEN_KEEPALIVE
void itemRelease(IItem::Pointer* d) { delete d; }

EMSCRIPTEN_KEEPALIVE
std::string* itemFilename(IItem::Pointer* d) {
  return new std::string((*d)->filename());
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
}
