# syntax=docker/dockerfile:1

FROM emscripten/emsdk:3.1.35

ENV GRAPHVIZ_VERSION=8.0.1
ENV EXPAT_VERSION=2.5.0
ENV USE_CLOSURE=0

WORKDIR /home/build/deps

RUN EXPAT_SOURCE_URL="https://github.com/libexpat/libexpat/releases/download/R_$(echo ${EXPAT_VERSION} | tr . _)/expat-${EXPAT_VERSION}.tar.xz"; \
    curl --fail --location "$EXPAT_SOURCE_URL" | tar -xJ
RUN mv expat-${EXPAT_VERSION} expat
WORKDIR expat
RUN	grep -q ${EXPAT_VERSION} expat_config.h
RUN emconfigure ./configure \
    --disable-shared \
    --prefix=/home/build \
    --libdir=/home/build/lib \
    CFLAGS="-Oz -w -flto" LDFLAGS="-Oz -s -flto"
RUN emmake make -j -C lib all install
WORKDIR ..

RUN GRAPHVIZ_SOURCE_URL="https://gitlab.com/api/v4/projects/4207231/packages/generic/graphviz-releases/${GRAPHVIZ_VERSION}/graphviz-${GRAPHVIZ_VERSION}.tar.xz"; \
    curl --fail --location "$GRAPHVIZ_SOURCE_URL" | tar -xJ
RUN mv "graphviz-${GRAPHVIZ_VERSION}" graphviz
WORKDIR graphviz
RUN grep -q "${GRAPHVIZ_VERSION}" graphviz_version.h
RUN emconfigure ./configure \
    --without-sfdp \
    --disable-ltdl \
    --enable-static \
    --disable-shared \
    --prefix=/home/build \
    --libdir=/home/build/lib \
    CFLAGS="-Oz -w -flto" LDFLAGS="-Oz -s -flto"

RUN emmake make -j lib plugin
RUN emmake make -j -C lib install
RUN emmake make -j -C plugin install
WORKDIR ..

WORKDIR /home

COPY worker ./worker/

RUN	emcc \
    -I/home/build/include \
    -I/home/build/include/graphviz \
    -L/home/build/lib \
    -L/home/build/lib/graphviz \
    -lgvplugin_core \
    -lgvplugin_dot_layout \
    -lcgraph \
    -lgvc \
    -lgvpr \
    -lpathplan \
    -lexpat \
    -lxdot \
    -lcdt \
    -g1 -Oz -flto \
    --bind \
    --no-entry \
    --closure ${USE_CLOSURE} \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s DYNAMIC_EXECUTION=0 \
    -s SINGLE_FILE \
    -s WASM_ASYNC_COMPILATION=0 \
    -s ENVIRONMENT=worker \
    -s FILESYSTEM=0 \
    -s STRICT=1 \
    -s DEFAULT_TO_CXX \
    -s ALLOW_UNIMPLEMENTED_SYSCALLS \
    -s TEXTDECODER=2 \
    -s MODULARIZE=0 \
    -s INCOMING_MODULE_JS_API=[] \
    -o emscripten_worker.js \
    --post-js worker/post.js \
    worker/viz.cpp ;

CMD ["cat", "emscripten_worker.js"]
