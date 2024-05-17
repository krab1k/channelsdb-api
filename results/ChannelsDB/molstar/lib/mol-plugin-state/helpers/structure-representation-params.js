/**
 * Copyright (c) 2020 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author David Sehnal <david.sehnal@gmail.com>
 */
import { Structure } from '../../mol-model/structure';
import { ParamDefinition as PD } from '../../mol-util/param-definition';
export function createStructureRepresentationParams(ctx, structure, props = {}) {
    const p = props;
    if (typeof p.type === 'string' || typeof p.color === 'string' || typeof p.size === 'string')
        return createParamsByName(ctx, structure || Structure.Empty, props);
    return createParamsProvider(ctx, structure || Structure.Empty, props);
}
export function getStructureThemeTypes(ctx, structure) {
    const { themes: themeCtx } = ctx.representation.structure;
    if (!structure)
        return themeCtx.colorThemeRegistry.types;
    return themeCtx.colorThemeRegistry.getApplicableTypes({ structure });
}
export function createStructureColorThemeParams(ctx, structure, typeName, themeName, params) {
    const { registry, themes } = ctx.representation.structure;
    const repr = registry.get(typeName || registry.default.name);
    const color = themes.colorThemeRegistry.get(themeName || repr.defaultColorTheme.name);
    const colorDefaultParams = PD.getDefaultValues(color.getParams({ structure: structure || Structure.Empty }));
    if (color.name === repr.defaultColorTheme.name)
        Object.assign(colorDefaultParams, repr.defaultColorTheme.props);
    return { name: color.name, params: Object.assign(colorDefaultParams, params) };
}
export function createStructureSizeThemeParams(ctx, structure, typeName, themeName, params) {
    const { registry, themes } = ctx.representation.structure;
    const repr = registry.get(typeName || registry.default.name);
    const size = themes.sizeThemeRegistry.get(themeName || repr.defaultSizeTheme.name);
    const sizeDefaultParams = PD.getDefaultValues(size.getParams({ structure: structure || Structure.Empty }));
    if (size.name === repr.defaultSizeTheme.name)
        Object.assign(sizeDefaultParams, repr.defaultSizeTheme.props);
    return { name: size.name, params: Object.assign(sizeDefaultParams, params) };
}
function createParamsByName(ctx, structure, props) {
    const typeProvider = (props.type && ctx.representation.structure.registry.get(props.type))
        || ctx.representation.structure.registry.default.provider;
    const colorProvider = (props.color && ctx.representation.structure.themes.colorThemeRegistry.get(props.color))
        || ctx.representation.structure.themes.colorThemeRegistry.get(typeProvider.defaultColorTheme.name);
    const sizeProvider = (props.size && ctx.representation.structure.themes.sizeThemeRegistry.get(props.size))
        || ctx.representation.structure.themes.sizeThemeRegistry.get(typeProvider.defaultSizeTheme.name);
    return createParamsProvider(ctx, structure, {
        type: typeProvider,
        typeParams: props.typeParams,
        color: colorProvider,
        colorParams: props.colorParams,
        size: sizeProvider,
        sizeParams: props.sizeParams
    });
}
function createParamsProvider(ctx, structure, props = {}) {
    const { themes: themeCtx } = ctx.representation.structure;
    const themeDataCtx = { structure };
    const repr = props.type || ctx.representation.structure.registry.default.provider;
    const reprDefaultParams = PD.getDefaultValues(repr.getParams(themeCtx, structure));
    const reprParams = Object.assign(reprDefaultParams, props.typeParams);
    const color = props.color || themeCtx.colorThemeRegistry.get(repr.defaultColorTheme.name);
    const colorDefaultParams = PD.getDefaultValues(color.getParams(themeDataCtx));
    if (color.name === repr.defaultColorTheme.name)
        Object.assign(colorDefaultParams, repr.defaultColorTheme.props);
    const colorParams = Object.assign(colorDefaultParams, props.colorParams);
    const size = props.size || themeCtx.sizeThemeRegistry.get(repr.defaultSizeTheme.name);
    const sizeDefaultParams = PD.getDefaultValues(size.getParams(themeDataCtx));
    if (size.name === repr.defaultSizeTheme.name)
        Object.assign(sizeDefaultParams, repr.defaultSizeTheme.props);
    const sizeParams = Object.assign(sizeDefaultParams, props.sizeParams);
    return ({
        type: { name: repr.name, params: reprParams },
        colorTheme: { name: color.name, params: colorParams },
        sizeTheme: { name: size.name, params: sizeParams }
    });
}