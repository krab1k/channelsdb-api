"use strict";
/**
 * Copyright (c) 2020 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 *
 * mostly adapted from https://gist.github.com/imbcmdth/6338194
 * which is ported from https://code.google.com/archive/p/fastapprox/ (BSD licensed)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.fastAtan2 = exports.fastAtan = exports.fasterTan = exports.fastTan = exports.fasterCos = exports.fastCos = exports.fasterSin = exports.fastSin = exports.fasterTanh = exports.fastTanh = exports.fasterCosh = exports.fastCosh = exports.fasterSinh = exports.fastSinh = exports.fasterLog10 = exports.fastLog10 = exports.fasterLog = exports.fastLog = exports.fasterLog2 = exports.fastLog2 = exports.fasterExp = exports.fastExp = exports.fasterPow2 = exports.fastPow2 = void 0;
const _a_fastPow2 = new ArrayBuffer(4);
const _i_fastPow2 = new Int32Array(_a_fastPow2);
const _f_fastPow2 = new Float32Array(_a_fastPow2);
function fastPow2(v) {
    const offset = (v < 0) ? 1 : 0;
    const clipNumber = (v < -126) ? -126 : v;
    const w = clipNumber | 0;
    const z = clipNumber - w + offset;
    _i_fastPow2[0] = ((1 << 23) * (clipNumber + 121.2740575 + 27.7280233 / (4.84252568 - z) - 1.49012907 * z));
    return _f_fastPow2[0];
}
exports.fastPow2 = fastPow2;
const _a_fasterPow2 = new ArrayBuffer(4);
const _i_fasterPow2 = new Int32Array(_a_fasterPow2);
const _f_fasterPow2 = new Float32Array(_a_fasterPow2);
function fasterPow2(v) {
    const clipNumber = (v < -126) ? -126 : v;
    _i_fasterPow2[0] = ((1 << 23) * (clipNumber + 126.94269504));
    return _f_fasterPow2[0];
}
exports.fasterPow2 = fasterPow2;
function fastExp(v) {
    return fastPow2(1.442695040 * v);
}
exports.fastExp = fastExp;
function fasterExp(v) {
    return fasterPow2(1.442695040 * v);
}
exports.fasterExp = fasterExp;
const _a_fastLog2 = new ArrayBuffer(8);
const _i_fastLog2 = new Int32Array(_a_fastLog2);
const _f_fastLog2 = new Float32Array(_a_fastLog2);
function fastLog2(v) {
    _f_fastLog2[0] = v;
    _i_fastLog2[1] = (_i_fastLog2[0] & 0x007FFFFF) | 0x3f000000;
    const t = _i_fastLog2[0] * 1.1920928955078125e-7;
    return t - 124.22551499 - 1.498030302 * _f_fastLog2[1] - 1.72587999 / (0.3520887068 + _f_fastLog2[1]);
}
exports.fastLog2 = fastLog2;
;
const _a_fasterLog2 = new ArrayBuffer(4);
const _i_fasterLog2 = new Int32Array(_a_fasterLog2);
const _f_fasterLog2 = new Float32Array(_a_fasterLog2);
function fasterLog2(v) {
    _f_fasterLog2[0] = v;
    const t = _i_fasterLog2[0] * 1.1920928955078125e-7;
    return t - 126.94269504;
}
exports.fasterLog2 = fasterLog2;
function fastLog(v) {
    return 0.6931471805599453 * fastLog2(v);
}
exports.fastLog = fastLog;
function fasterLog(v) {
    return 0.6931471805599453 * fasterLog2(v);
}
exports.fasterLog = fasterLog;
function fastLog10(v) {
    return 0.30102999566398114 * fastLog2(v);
}
exports.fastLog10 = fastLog10;
function fasterLog10(v) {
    return 0.30102999566398114 * fasterLog2(v);
}
exports.fasterLog10 = fasterLog10;
function fastSinh(v) {
    return 0.5 * (fastExp(v) - fastExp(-v));
}
exports.fastSinh = fastSinh;
function fasterSinh(v) {
    return 0.5 * (fasterExp(v) - fasterExp(-v));
}
exports.fasterSinh = fasterSinh;
function fastCosh(v) {
    return 0.5 * (fastExp(v) + fastExp(-v));
}
exports.fastCosh = fastCosh;
function fasterCosh(v) {
    return 0.5 * (fasterExp(v) + fasterExp(-v));
}
exports.fasterCosh = fasterCosh;
function fastTanh(v) {
    return -1.0 + 2.0 / (1.0 + fastExp(-2.0 * v));
}
exports.fastTanh = fastTanh;
function fasterTanh(v) {
    return -1.0 + 2.0 / (1.0 + fasterExp(-2.0 * v));
}
exports.fasterTanh = fasterTanh;
const halfPi = Math.PI / 2;
const twoPi = 2 * Math.PI;
const invTwoPi = 1 / (2 * Math.PI);
const twoOverPi = 2 / Math.PI;
const fourOverPi = 4 / Math.PI;
const fourOverPiSq = 4 / (Math.PI * Math.PI);
const halfPiMinusTwoPi = Math.PI / 2 - 2 * Math.PI;
const _q_fastHalfSin = 0.78444488374548933;
const _a_fastHalfSin = new ArrayBuffer(16);
const _i_fastHalfSin = new Int32Array(_a_fastHalfSin);
const _f_fastHalfSin = new Float32Array(_a_fastHalfSin);
function fastHalfSin(v) {
    _f_fastHalfSin[0] = 0.20363937680730309;
    _f_fastHalfSin[1] = 0.015124940802184233;
    _f_fastHalfSin[2] = -0.0032225901625579573;
    _f_fastHalfSin[3] = v;
    const sign = _i_fastHalfSin[3] & 0x80000000;
    _i_fastHalfSin[3] = _i_fastHalfSin[3] & 0x7FFFFFFF;
    const qpprox = fourOverPi * v - fourOverPiSq * v * _f_fastHalfSin[3];
    const qpproxsq = qpprox * qpprox;
    _i_fastHalfSin[0] |= sign;
    _i_fastHalfSin[1] |= sign;
    _i_fastHalfSin[2] ^= sign;
    return _q_fastHalfSin * qpprox + qpproxsq * (_f_fastHalfSin[0] + qpproxsq * (_f_fastHalfSin[1] + qpproxsq * _f_fastHalfSin[2]));
}
const _q_fasterHalfSin = 0.78444488374548933;
const _a_fasterHalfSin = new ArrayBuffer(8);
const _i_fasterHalfSin = new Int32Array(_a_fasterHalfSin);
const _f_fasterHalfSin = new Float32Array(_a_fasterHalfSin);
function fasterHalfSin(v) {
    _f_fasterHalfSin[0] = 0.22308510060189463;
    _f_fasterHalfSin[1] = v;
    const sign = _i_fasterHalfSin[1] & 0x80000000;
    _i_fasterHalfSin[1] &= 0x7FFFFFFF;
    const qpprox = fourOverPi * v - fourOverPiSq * v * _f_fasterHalfSin[1];
    _i_fasterHalfSin[0] |= sign;
    return qpprox * (_q_fasterHalfSin + _f_fasterHalfSin[0] * qpprox);
}
function fastSin(v) {
    const k = (v * invTwoPi) | 0;
    const half = (v < 0) ? -0.5 : 0.5;
    return fastHalfSin((half + k) * twoPi - v);
}
exports.fastSin = fastSin;
function fasterSin(v) {
    const k = (v * invTwoPi) | 0;
    const half = (v < 0) ? -0.5 : 0.5;
    return fasterHalfSin((half + k) * twoPi - v);
}
exports.fasterSin = fasterSin;
function fastCos(v) {
    return fastSin(v + halfPi);
}
exports.fastCos = fastCos;
function fasterCos(v) {
    return fasterSin(v + halfPi);
}
exports.fasterCos = fasterCos;
function fastHalfCos(v) {
    const offset = (v > halfPi) ? halfPiMinusTwoPi : halfPi;
    return fastHalfSin(v + offset);
}
const _p_fasterHalfCos = 0.54641335845679634;
const _a_fasterHalfCos = new ArrayBuffer(4);
const _i_fasterHalfCos = new Int32Array(_a_fasterHalfCos);
const _f_fasterHalfCos = new Float32Array(_a_fasterHalfCos);
function fasterHalfCos(v) {
    _f_fasterHalfCos[0] = v;
    _i_fasterHalfCos[0] &= 0x7FFFFFFF;
    const qpprox = 1.0 - twoOverPi * _f_fasterHalfCos[0];
    return qpprox + _p_fasterHalfCos * qpprox * (1.0 - qpprox * qpprox);
}
function fastTan(v) {
    const k = (v * invTwoPi) | 0;
    const half = (v < 0) ? -0.5 : 0.5;
    const x = v - (half + k) * twoPi;
    return fastHalfSin(x) / fastHalfCos(x);
}
exports.fastTan = fastTan;
function fasterTan(v) {
    const k = (v * invTwoPi) | 0;
    const half = (v < 0) ? -0.5 : 0.5;
    const x = v - (half + k) * twoPi;
    return fasterHalfSin(x) / fasterHalfCos(x);
}
exports.fasterTan = fasterTan;
const piOverFour = Math.PI / 4;
/**
 * Adapted from:
 * "Efficient approximations for the arctangent function"
 * Rajan, S. Sichun Wang Inkol, R. Joyal, A., May 2006
 */
function fastAtan(v) {
    return piOverFour * v - v * (Math.abs(v) - 1) * (0.2447 + 0.0663 * Math.abs(v));
}
exports.fastAtan = fastAtan;
function fastAtan2(y, x) {
    // reduce range to [-1, 1] by flipping y/x so the larger is up
    let t = Math.abs(x); // used to undo flipping
    let opposite = Math.abs(y);
    const adjacent = Math.max(t, opposite);
    opposite = Math.min(t, opposite);
    t = fastAtan(opposite / adjacent);
    // undo flipping
    t = Math.abs(y) > Math.abs(x) ? halfPi - t : t;
    t = x < 0.0 ? Math.PI - t : t;
    t = y < 0.0 ? -t : t;
    return t;
}
exports.fastAtan2 = fastAtan2;