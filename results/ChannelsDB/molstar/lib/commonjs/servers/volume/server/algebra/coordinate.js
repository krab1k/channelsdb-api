"use strict";
/*
 * Copyright (c) 2016 - now, David Sehnal, licensed under Apache 2.0, See LICENSE file for more info.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.round = exports.sampleCounts = exports.gridMetrics = exports.linearGridIndex = exports.invert = exports.sub = exports.add = exports.clampGridToSamples = exports.gridToFractional = exports.fractionalToGrid = exports.cartesianToFractional = exports.clone = exports.withCoord = exports.grid = exports.fractional = exports.cartesian = exports.domain = void 0;
const linear_algebra_1 = require("../../../../mol-math/linear-algebra");
// CONSTRUCTORS
function domain(kind, info) {
    const sc = info.sampleCount;
    return {
        kind,
        delta: info.delta,
        dimensions: info.dimensions,
        origin: info.origin,
        sampleCount: info.sampleCount,
        sampleVolume: sc[0] * sc[1] * sc[2]
    };
}
exports.domain = domain;
function cartesian(x, y, z) {
    return { 0: x, 1: y, 2: z, kind: 0 /* Space.Cartesian */ };
}
exports.cartesian = cartesian;
function fractional(x, y, z) {
    return { 0: x, 1: y, 2: z, kind: 1 /* Space.Fractional */ };
}
exports.fractional = fractional;
function grid(domain, x, y, z) {
    return { 0: x, 1: y, 2: z, kind: 2 /* Space.Grid */, domain };
}
exports.grid = grid;
function withCoord(a, x, y, z) {
    switch (a.kind) {
        case 0 /* Space.Cartesian */: return cartesian(x, y, z);
        case 1 /* Space.Fractional */: return fractional(x, y, z);
        case 2 /* Space.Grid */: return grid(a.domain, x, y, z);
    }
}
exports.withCoord = withCoord;
function clone(a) {
    return withCoord(a, a[0], a[1], a[2]);
}
exports.clone = clone;
// CONVERSIONS
function cartesianToFractional(a, spacegroup) {
    const coord = Helpers.transform(a, spacegroup.toFractional);
    return fractional(coord[0], coord[1], coord[2]);
}
exports.cartesianToFractional = cartesianToFractional;
function fractionalToGrid(a, domain, snap) {
    const { origin, delta } = domain;
    const coord = grid(domain, 0.1, 0.1, 0.1);
    for (let i = 0; i < 3; i++) {
        coord[i] = Helpers.snap((a[i] - origin[i]) / delta[i], snap);
    }
    return coord;
}
exports.fractionalToGrid = fractionalToGrid;
function gridToFractional(a) {
    const { origin, delta } = a.domain;
    const coord = fractional(0.1, 0.1, 0.1);
    for (let i = 0; i < 3; i++) {
        coord[i] = a[i] * delta[i] + origin[i];
    }
    return coord;
}
exports.gridToFractional = gridToFractional;
// MISC
function clampGridToSamples(a) {
    const { sampleCount } = a.domain;
    const coord = withCoord(a, 0, 0, 0);
    for (let i = 0; i < 3; i++) {
        if (a[i] < 0)
            coord[i] = 0;
        else if (a[i] > sampleCount[i])
            coord[i] = sampleCount[i];
        else
            coord[i] = a[i];
    }
    return coord;
}
exports.clampGridToSamples = clampGridToSamples;
function add(a, b) {
    return withCoord(a, a[0] + b[0], a[1] + b[1], a[2] + b[2]);
}
exports.add = add;
function sub(a, b) {
    return withCoord(a, a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}
exports.sub = sub;
function invert(a) {
    return withCoord(a, -a[0], -a[1], -a[2]);
}
exports.invert = invert;
/** Maps each grid point to a unique integer */
function linearGridIndex(a) {
    const samples = a.domain.sampleCount;
    return a[0] + samples[0] * (a[1] + a[2] * samples[1]);
}
exports.linearGridIndex = linearGridIndex;
function gridMetrics(dimensions) {
    return {
        sizeX: dimensions[0],
        sizeXY: dimensions[0] * dimensions[1],
        sizeXYZ: dimensions[0] * dimensions[1] * dimensions[2]
    };
}
exports.gridMetrics = gridMetrics;
function sampleCounts(dimensions, delta) {
    return [
        Helpers.snap(dimensions[0] / delta[0], 'top'),
        Helpers.snap(dimensions[1] / delta[1], 'top'),
        Helpers.snap(dimensions[2] / delta[2], 'top')
    ];
}
exports.sampleCounts = sampleCounts;
// to prevent floating point rounding errors
function round(v) {
    return Math.round(10000000 * v) / 10000000;
}
exports.round = round;
var Helpers;
(function (Helpers) {
    function transform(x, matrix) {
        return linear_algebra_1.Vec3.transformMat4(linear_algebra_1.Vec3.zero(), x, matrix);
    }
    Helpers.transform = transform;
    function snap(v, to) {
        switch (to) {
            case 'bottom': return Math.floor(round(v)) | 0;
            case 'top': return Math.ceil(round(v)) | 0;
        }
    }
    Helpers.snap = snap;
})(Helpers || (Helpers = {}));