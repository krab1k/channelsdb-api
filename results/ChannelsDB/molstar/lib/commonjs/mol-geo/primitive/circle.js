"use strict";
/**
 * Copyright (c) 2019 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Circle = exports.DefaultCircleProps = void 0;
exports.DefaultCircleProps = {
    radius: 1,
    segments: 36,
    thetaStart: 0,
    thetaLength: Math.PI * 2
};
function Circle(props) {
    const { radius, segments, thetaStart, thetaLength } = { ...exports.DefaultCircleProps, ...props };
    const isFull = thetaLength === Math.PI * 2;
    const count = isFull ? segments + 1 : segments + 2;
    const vertices = new Float32Array(count * 3);
    const normals = new Float32Array(count * 3);
    const indices = new Uint32Array(segments * 3);
    // center
    vertices[0] = 0;
    vertices[1] = 0;
    vertices[2] = 0;
    normals[0] = 0;
    normals[1] = 1;
    normals[2] = 0;
    // vertices & normals
    for (let s = 0, i = 3; s < segments; ++s, i += 3) {
        const segment = thetaStart + s / segments * thetaLength;
        vertices[i] = radius * Math.sin(segment);
        vertices[i + 1] = 0;
        vertices[i + 2] = radius * Math.cos(segment);
        normals[i] = 0;
        normals[i + 1] = 1;
        normals[i + 2] = 0;
    }
    // indices
    for (let s = 1, i = 0; s < segments; ++s, i += 3) {
        indices[i] = s;
        indices[i + 1] = s + 1;
        indices[i + 2] = 0;
    }
    if (isFull) {
        const j = (segments - 1) * 3;
        indices[j] = segments;
        indices[j + 1] = 1;
        indices[j + 2] = 0;
    }
    else {
        const segment = thetaStart + thetaLength;
        const i = (segments + 1) * 3;
        vertices[i] = radius * Math.sin(segment);
        vertices[i + 1] = 0;
        vertices[i + 2] = radius * Math.cos(segment);
        normals[i] = 0;
        normals[i + 1] = 1;
        normals[i + 2] = 0;
        const j = (segments - 1) * 3;
        indices[j] = segments;
        indices[j + 1] = segments + 1;
        indices[j + 2] = 0;
    }
    return { vertices, normals, indices };
}
exports.Circle = Circle;