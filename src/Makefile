all: ${PWD}/../dist/cloudstorage-wasm.js

LIBS := \
		${PWD}/../contrib/emscripten/lib/libcloudstorage.a \
		${PWD}/../contrib/emscripten/lib/libmega.a \
		${PWD}/../contrib/emscripten/lib/libcryptopp.a \
		${PWD}/../contrib/emscripten/lib/libcrypto.a \
		${PWD}/../contrib/emscripten/lib/libssl.a \
		${PWD}/../contrib/emscripten/lib/libjsoncpp.a \
		${PWD}/../contrib/emscripten/lib/libtinyxml2.a

${PWD}/../dist/cloudstorage-wasm.js: cloudstorage.cpp ${LIBS} Makefile
	em++ cloudstorage.cpp -o ${PWD}/../dist/cloudstorage-wasm.js \
		-std=c++14 \
		-Oz \
		-s EXTRA_EXPORTED_RUNTIME_METHODS='["cwrap", "UTF8ToString", "addFunction", "removeFunction"]' \
		-s DISABLE_EXCEPTION_CATCHING=0 \
		-s RESERVED_FUNCTION_POINTERS=20 \
		-s FETCH=1 \
		-I${PWD}/../contrib/emscripten/include \
		${LIBS}
