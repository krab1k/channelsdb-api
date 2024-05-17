"use strict";
/**
 * Copyright (c) 2018-2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContext = exports.readPixels = exports.glEnumToString = exports.checkError = exports.getErrorDescription = exports.getGLContext = void 0;
const compat_1 = require("./compat");
const framebuffer_1 = require("./framebuffer");
const mol_task_1 = require("../../mol-task");
const debug_1 = require("../../mol-util/debug");
const extensions_1 = require("./extensions");
const state_1 = require("./state");
const image_1 = require("../../mol-util/image");
const resources_1 = require("./resources");
const render_target_1 = require("./render-target");
const rxjs_1 = require("rxjs");
const now_1 = require("../../mol-util/now");
const timer_1 = require("./timer");
function getGLContext(canvas, attribs) {
    function get(id) {
        try {
            return canvas.getContext(id, attribs);
        }
        catch (e) {
            return null;
        }
    }
    const gl = ((attribs === null || attribs === void 0 ? void 0 : attribs.preferWebGl1) ? null : get('webgl2')) || get('webgl') || get('experimental-webgl');
    if (debug_1.isDebugMode)
        console.log(`isWebgl2: ${(0, compat_1.isWebGL2)(gl)}`);
    return gl;
}
exports.getGLContext = getGLContext;
function getErrorDescription(gl, error) {
    switch (error) {
        case gl.NO_ERROR: return 'no error';
        case gl.INVALID_ENUM: return 'invalid enum';
        case gl.INVALID_VALUE: return 'invalid value';
        case gl.INVALID_OPERATION: return 'invalid operation';
        case gl.INVALID_FRAMEBUFFER_OPERATION: return 'invalid framebuffer operation';
        case gl.OUT_OF_MEMORY: return 'out of memory';
        case gl.CONTEXT_LOST_WEBGL: return 'context lost';
    }
    return 'unknown error';
}
exports.getErrorDescription = getErrorDescription;
function checkError(gl) {
    const error = gl.getError();
    if (error !== gl.NO_ERROR) {
        throw new Error(`WebGL error: '${getErrorDescription(gl, error)}'`);
    }
}
exports.checkError = checkError;
function glEnumToString(gl, value) {
    const keys = [];
    for (const key in gl) {
        if (gl[key] === value) {
            keys.push(key);
        }
    }
    return keys.length ? keys.join(' | ') : `0x${value.toString(16)}`;
}
exports.glEnumToString = glEnumToString;
function unbindResources(gl) {
    // bind null to all texture units
    const maxTextureImageUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
    for (let i = 0; i < maxTextureImageUnits; ++i) {
        gl.activeTexture(gl.TEXTURE0 + i);
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
        if ((0, compat_1.isWebGL2)(gl)) {
            gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);
            gl.bindTexture(gl.TEXTURE_3D, null);
        }
    }
    // assign the smallest possible buffer to all attributes
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    const maxVertexAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
    for (let i = 0; i < maxVertexAttribs; ++i) {
        gl.vertexAttribPointer(i, 1, gl.FLOAT, false, 0, 0);
    }
    // bind null to all buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    unbindFramebuffer(gl);
}
function unbindFramebuffer(gl) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
const tmpPixel = new Uint8Array(1 * 4);
function checkSync(gl, sync, resolve) {
    if (gl.getSyncParameter(sync, gl.SYNC_STATUS) === gl.SIGNALED) {
        gl.deleteSync(sync);
        resolve();
    }
    else {
        mol_task_1.Scheduler.setImmediate(checkSync, gl, sync, resolve);
    }
}
function fence(gl, resolve) {
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    if (!sync) {
        console.warn('Could not create a WebGLSync object');
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, tmpPixel);
        resolve();
    }
    else {
        mol_task_1.Scheduler.setImmediate(checkSync, gl, sync, resolve);
    }
}
let SentWebglSyncObjectNotSupportedInWebglMessage = false;
function waitForGpuCommandsComplete(gl) {
    return new Promise(resolve => {
        if ((0, compat_1.isWebGL2)(gl)) {
            // TODO seems quite slow
            fence(gl, resolve);
        }
        else {
            if (!SentWebglSyncObjectNotSupportedInWebglMessage) {
                console.info('Sync object not supported in WebGL');
                SentWebglSyncObjectNotSupportedInWebglMessage = true;
            }
            waitForGpuCommandsCompleteSync(gl);
            resolve();
        }
    });
}
function waitForGpuCommandsCompleteSync(gl) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, tmpPixel);
}
function readPixels(gl, x, y, width, height, buffer) {
    if (debug_1.isDebugMode)
        (0, framebuffer_1.checkFramebufferStatus)(gl);
    if (buffer instanceof Uint8Array) {
        gl.readPixels(x, y, width, height, gl.RGBA, gl.UNSIGNED_BYTE, buffer);
    }
    else if (buffer instanceof Float32Array) {
        gl.readPixels(x, y, width, height, gl.RGBA, gl.FLOAT, buffer);
    }
    else if (buffer instanceof Int32Array && (0, compat_1.isWebGL2)(gl)) {
        gl.readPixels(x, y, width, height, gl.RGBA_INTEGER, gl.INT, buffer);
    }
    else {
        throw new Error('unsupported readPixels buffer type');
    }
    if (debug_1.isDebugMode)
        checkError(gl);
}
exports.readPixels = readPixels;
function getDrawingBufferPixelData(gl, state) {
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    const buffer = new Uint8Array(w * h * 4);
    unbindFramebuffer(gl);
    state.viewport(0, 0, w, h);
    readPixels(gl, 0, 0, w, h, buffer);
    return image_1.PixelData.flipY(image_1.PixelData.create(buffer, w, h));
}
//
function createStats() {
    const stats = {
        resourceCounts: {
            attribute: 0,
            elements: 0,
            framebuffer: 0,
            program: 0,
            renderbuffer: 0,
            shader: 0,
            texture: 0,
            cubeTexture: 0,
            vertexArray: 0,
        },
        drawCount: 0,
        instanceCount: 0,
        instancedDrawCount: 0,
        calls: {
            drawInstanced: 0,
            drawInstancedBase: 0,
            multiDrawInstancedBase: 0,
            counts: 0,
        },
        culled: {
            lod: 0,
            frustum: 0,
            occlusion: 0,
        },
    };
    return stats;
}
function createContext(gl, props = {}) {
    const extensions = (0, extensions_1.createExtensions)(gl);
    const state = (0, state_1.createState)(gl, extensions);
    const stats = createStats();
    const resources = (0, resources_1.createResources)(gl, state, stats, extensions);
    const timer = (0, timer_1.createTimer)(gl, extensions, stats);
    const parameters = {
        maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
        max3dTextureSize: (0, compat_1.isWebGL2)(gl) ? gl.getParameter(gl.MAX_3D_TEXTURE_SIZE) : 0,
        maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
        maxDrawBuffers: extensions.drawBuffers ? gl.getParameter(extensions.drawBuffers.MAX_DRAW_BUFFERS) : 0,
        maxTextureImageUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
        maxVertexTextureImageUnits: gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS),
    };
    if (parameters.maxVertexTextureImageUnits < 8) {
        throw new Error('Need "MAX_VERTEX_TEXTURE_IMAGE_UNITS" >= 8');
    }
    // optimize assuming flats first and last data are same or differences don't matter
    // extension is only available when `FIRST_VERTEX_CONVENTION` is more efficient
    const epv = extensions.provokingVertex;
    epv === null || epv === void 0 ? void 0 : epv.provokingVertex(epv.FIRST_VERTEX_CONVENTION);
    let isContextLost = false;
    const contextRestored = new rxjs_1.BehaviorSubject(0);
    let pixelScale = props.pixelScale || 1;
    let readPixelsAsync;
    if ((0, compat_1.isWebGL2)(gl)) {
        const pbo = gl.createBuffer();
        let _buffer = void 0;
        let _resolve = void 0;
        let _reading = false;
        const bindPBO = () => {
            gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);
            gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, _buffer);
            gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
            _reading = false;
            _resolve();
            _resolve = void 0;
            _buffer = void 0;
        };
        readPixelsAsync = (x, y, width, height, buffer) => new Promise((resolve, reject) => {
            if (_reading) {
                reject('Can not call multiple readPixelsAsync at the same time');
                return;
            }
            _reading = true;
            gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);
            gl.bufferData(gl.PIXEL_PACK_BUFFER, width * height * 4, gl.STREAM_READ);
            gl.readPixels(x, y, width, height, gl.RGBA, gl.UNSIGNED_BYTE, 0);
            gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
            // need to unbind/bind PBO before/after async awaiting the fence
            _resolve = resolve;
            _buffer = buffer;
            fence(gl, bindPBO);
        });
    }
    else {
        readPixelsAsync = async (x, y, width, height, buffer) => {
            readPixels(gl, x, y, width, height, buffer);
        };
    }
    const renderTargets = new Set();
    return {
        gl,
        isWebGL2: (0, compat_1.isWebGL2)(gl),
        get pixelRatio() {
            const dpr = (typeof window !== 'undefined') ? (window.devicePixelRatio || 1) : 1;
            return dpr * (pixelScale || 1);
        },
        extensions,
        state,
        stats,
        resources,
        timer,
        get maxTextureSize() { return parameters.maxTextureSize; },
        get max3dTextureSize() { return parameters.max3dTextureSize; },
        get maxRenderbufferSize() { return parameters.maxRenderbufferSize; },
        get maxDrawBuffers() { return parameters.maxDrawBuffers; },
        get maxTextureImageUnits() { return parameters.maxTextureImageUnits; },
        namedComputeRenderables: Object.create(null),
        namedFramebuffers: Object.create(null),
        namedTextures: Object.create(null),
        get isContextLost() {
            return isContextLost || gl.isContextLost();
        },
        contextRestored,
        setContextLost: () => {
            isContextLost = true;
        },
        handleContextRestored: (extraResets) => {
            Object.assign(extensions, (0, extensions_1.createExtensions)(gl));
            state.reset();
            state.currentMaterialId = -1;
            state.currentProgramId = -1;
            state.currentRenderItemId = -1;
            resources.reset();
            renderTargets.forEach(rt => rt.reset());
            extraResets === null || extraResets === void 0 ? void 0 : extraResets();
            isContextLost = false;
            contextRestored.next((0, now_1.now)());
        },
        setPixelScale: (value) => {
            pixelScale = value;
        },
        createRenderTarget: (width, height, depth, type, filter, format) => {
            const renderTarget = (0, render_target_1.createRenderTarget)(gl, resources, width, height, depth, type, filter, format);
            renderTargets.add(renderTarget);
            return {
                ...renderTarget,
                destroy: () => {
                    renderTarget.destroy();
                    renderTargets.delete(renderTarget);
                }
            };
        },
        unbindFramebuffer: () => unbindFramebuffer(gl),
        readPixels: (x, y, width, height, buffer) => {
            readPixels(gl, x, y, width, height, buffer);
        },
        readPixelsAsync,
        waitForGpuCommandsComplete: () => waitForGpuCommandsComplete(gl),
        waitForGpuCommandsCompleteSync: () => waitForGpuCommandsCompleteSync(gl),
        getDrawingBufferPixelData: () => getDrawingBufferPixelData(gl, state),
        clear: (red, green, blue, alpha) => {
            unbindFramebuffer(gl);
            state.enable(gl.SCISSOR_TEST);
            state.depthMask(true);
            state.colorMask(true, true, true, true);
            state.clearColor(red, green, blue, alpha);
            state.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            state.scissor(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        },
        destroy: (options) => {
            var _a, _b;
            resources.destroy();
            unbindResources(gl);
            // to aid GC
            if (!(options === null || options === void 0 ? void 0 : options.doNotForceWebGLContextLoss)) {
                (_a = gl.getExtension('WEBGL_lose_context')) === null || _a === void 0 ? void 0 : _a.loseContext();
                (_b = gl.getExtension('STACKGL_destroy_context')) === null || _b === void 0 ? void 0 : _b.destroy();
            }
        }
    };
}
exports.createContext = createContext;