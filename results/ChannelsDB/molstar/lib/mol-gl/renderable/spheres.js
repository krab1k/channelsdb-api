/**
 * Copyright (c) 2019-2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */
import { createRenderable } from '../renderable';
import { createGraphicsRenderItem } from '../webgl/render-item';
import { GlobalUniformSchema, BaseSchema, InternalSchema, SizeSchema, ValueSpec, DefineSpec, GlobalTextureSchema, UniformSpec, TextureSpec } from './schema';
import { SpheresShaderCode } from '../shader-code';
import { ValueCell } from '../../mol-util';
export const SpheresSchema = {
    ...BaseSchema,
    ...SizeSchema,
    uTexDim: UniformSpec('v2'),
    tPositionGroup: TextureSpec('image-float32', 'rgba', 'float', 'nearest'),
    padding: ValueSpec('number'),
    uDoubleSided: UniformSpec('b', 'material'),
    dIgnoreLight: DefineSpec('boolean'),
    dXrayShaded: DefineSpec('string', ['off', 'on', 'inverted']),
    dTransparentBackfaces: DefineSpec('string', ['off', 'on', 'opaque']),
    dSolidInterior: DefineSpec('boolean'),
    dClipPrimitive: DefineSpec('boolean'),
    dApproximate: DefineSpec('boolean'),
    uAlphaThickness: UniformSpec('f'),
    uBumpFrequency: UniformSpec('f', 'material'),
    uBumpAmplitude: UniformSpec('f', 'material'),
    lodLevels: ValueSpec('unknown'),
    centerBuffer: ValueSpec('float32'),
    groupBuffer: ValueSpec('float32'),
};
export function SpheresRenderable(ctx, id, values, state, materialId, transparency) {
    const schema = { ...GlobalUniformSchema, ...GlobalTextureSchema, ...InternalSchema, ...SpheresSchema };
    const internalValues = {
        uObjectId: ValueCell.create(id),
    };
    const shaderCode = SpheresShaderCode;
    const renderItem = createGraphicsRenderItem(ctx, 'triangles', shaderCode, schema, { ...values, ...internalValues }, materialId, transparency);
    return createRenderable(renderItem, values, state);
}