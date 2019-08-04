You need a `.env` file in the source directory with content similiar to this:

```
EMSDK_HOME=/home/lemourin/Projects/emsdk
HOSTNAME=http://localhost:8000
```

* `EMSDK_HOME` points to the directory with `emsdk` checked out and installed from here: https://github.com/emscripten-core/emsdk
  - `emsdk` installation boils down to running `./emsdk install latest && ./emsdk activate latest` in repos' directory
* `HOSTNAME` is the url at which the `cloudstorage-js` repo is exposed.

To test the app, run `npm install && npm run build:all` and serve the repository with any http server, e.g. with
`python3 -m http.server`.
