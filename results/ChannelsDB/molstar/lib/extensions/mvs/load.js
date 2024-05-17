/**
 * Copyright (c) 2023-2024 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */
import { Download, ParseCif } from '../../mol-plugin-state/transforms/data';
import { CustomModelProperties, CustomStructureProperties, ModelFromTrajectory, StructureComponent, StructureFromModel, TrajectoryFromMmCif, TrajectoryFromPDB, TransformStructureConformation } from '../../mol-plugin-state/transforms/model';
import { StructureRepresentation3D } from '../../mol-plugin-state/transforms/representation';
import { MolViewSpec } from './behavior';
import { setCamera, setCanvas, setFocus } from './camera';
import { MVSAnnotationsProvider } from './components/annotation-prop';
import { MVSAnnotationStructureComponent } from './components/annotation-structure-component';
import { MVSAnnotationTooltipsProvider } from './components/annotation-tooltips-prop';
import { CustomLabelRepresentationProvider } from './components/custom-label/representation';
import { CustomTooltipsProvider } from './components/custom-tooltips-prop';
import { IsMVSModelProvider } from './components/is-mvs-model-prop';
import { UpdateTarget, collectAnnotationReferences, collectAnnotationTooltips, collectInlineLabels, collectInlineTooltips, colorThemeForNode, componentFromXProps, componentPropsFromSelector, isPhantomComponent, labelFromXProps, loadTree, makeNearestReprMap, prettyNameFromSelector, representationProps, structureProps, transformProps } from './load-helpers';
import { validateTree } from './tree/generic/tree-schema';
import { convertMvsToMolstar, mvsSanityCheck } from './tree/molstar/conversion';
import { MolstarTreeSchema } from './tree/molstar/molstar-tree';
import { MVSTreeSchema } from './tree/mvs/mvs-tree';
/** Load a MolViewSpec (MVS) tree into the Mol* plugin.
 * If `options.replaceExisting`, remove all objects in the current Mol* state; otherwise add to the current state.
 * If `options.sanityChecks`, run some sanity checks and print potential issues to the console.
 * `options.sourceUrl` serves as the base for resolving relative URLs/URIs and may itself be relative to the window URL. */
export async function loadMVS(plugin, data, options = {}) {
    try {
        // console.log(`MVS tree:\n${MVSData.toPrettyString(data)}`)
        validateTree(MVSTreeSchema, data.root, 'MVS');
        if (options.sanityChecks)
            mvsSanityCheck(data.root);
        const molstarTree = convertMvsToMolstar(data.root, options.sourceUrl);
        // console.log(`Converted MolStar tree:\n${MVSData.toPrettyString({ root: molstarTree, metadata: { version: 'x', timestamp: 'x' } })}`)
        validateTree(MolstarTreeSchema, molstarTree, 'Converted Molstar');
        await loadMolstarTree(plugin, molstarTree, options);
    }
    catch (err) {
        plugin.log.error(`${err}`);
        throw err;
    }
}
/** Load a `MolstarTree` into the Mol* plugin.
 * If `replaceExisting`, remove all objects in the current Mol* state; otherwise add to the current state. */
async function loadMolstarTree(plugin, tree, options) {
    var _a, _b;
    const mvsExtensionLoaded = plugin.state.hasBehavior(MolViewSpec);
    if (!mvsExtensionLoaded)
        throw new Error('MolViewSpec extension is not loaded.');
    const context = {};
    await loadTree(plugin, tree, MolstarLoadingActions, context, options);
    setCanvas(plugin, context.canvas);
    if (((_a = context.focus) === null || _a === void 0 ? void 0 : _a.kind) === 'camera') {
        await setCamera(plugin, context.focus.params);
    }
    else if (((_b = context.focus) === null || _b === void 0 ? void 0 : _b.kind) === 'focus') {
        await setFocus(plugin, context.focus.focusTarget, context.focus.params);
    }
    else {
        await setFocus(plugin, undefined, undefined);
    }
}
/** Loading actions for loading a `MolstarTree`, per node kind. */
const MolstarLoadingActions = {
    root(updateParent, node, context) {
        context.nearestReprMap = makeNearestReprMap(node);
        return updateParent;
    },
    download(updateParent, node) {
        return UpdateTarget.apply(updateParent, Download, {
            url: node.params.url,
            isBinary: node.params.is_binary,
        });
    },
    parse(updateParent, node) {
        const format = node.params.format;
        if (format === 'cif') {
            return UpdateTarget.apply(updateParent, ParseCif, {});
        }
        else if (format === 'pdb') {
            return updateParent;
        }
        else {
            console.error(`Unknown format in "parse" node: "${format}"`);
            return undefined;
        }
    },
    trajectory(updateParent, node) {
        var _a, _b;
        const format = node.params.format;
        if (format === 'cif') {
            return UpdateTarget.apply(updateParent, TrajectoryFromMmCif, {
                blockHeader: (_a = node.params.block_header) !== null && _a !== void 0 ? _a : '', // Must set to '' because just undefined would get overwritten by createDefaults
                blockIndex: (_b = node.params.block_index) !== null && _b !== void 0 ? _b : undefined,
            });
        }
        else if (format === 'pdb') {
            return UpdateTarget.apply(updateParent, TrajectoryFromPDB, {});
        }
        else {
            console.error(`Unknown format in "trajectory" node: "${format}"`);
            return undefined;
        }
    },
    model(updateParent, node, context) {
        const annotations = collectAnnotationReferences(node, context);
        const model = UpdateTarget.apply(updateParent, ModelFromTrajectory, {
            modelIndex: node.params.model_index,
        });
        UpdateTarget.apply(model, CustomModelProperties, {
            properties: {
                [IsMVSModelProvider.descriptor.name]: { isMvs: true },
                [MVSAnnotationsProvider.descriptor.name]: { annotations },
            },
            autoAttach: [
                IsMVSModelProvider.descriptor.name,
                MVSAnnotationsProvider.descriptor.name,
            ],
        });
        return model;
    },
    structure(updateParent, node, context) {
        var _a;
        const props = structureProps(node);
        const struct = UpdateTarget.apply(updateParent, StructureFromModel, props);
        let transformed = struct;
        for (const t of transformProps(node)) {
            transformed = UpdateTarget.apply(transformed, TransformStructureConformation, t); // applying to the result of previous transform, to get the correct transform order
        }
        const annotationTooltips = collectAnnotationTooltips(node, context);
        const inlineTooltips = collectInlineTooltips(node, context);
        if (annotationTooltips.length + inlineTooltips.length > 0) {
            UpdateTarget.apply(struct, CustomStructureProperties, {
                properties: {
                    [MVSAnnotationTooltipsProvider.descriptor.name]: { tooltips: annotationTooltips },
                    [CustomTooltipsProvider.descriptor.name]: { tooltips: inlineTooltips },
                },
                autoAttach: [
                    MVSAnnotationTooltipsProvider.descriptor.name,
                    CustomTooltipsProvider.descriptor.name,
                ],
            });
        }
        const inlineLabels = collectInlineLabels(node, context);
        if (inlineLabels.length > 0) {
            const nearestReprNode = (_a = context.nearestReprMap) === null || _a === void 0 ? void 0 : _a.get(node);
            UpdateTarget.apply(struct, StructureRepresentation3D, {
                type: {
                    name: CustomLabelRepresentationProvider.name,
                    params: { items: inlineLabels },
                },
                colorTheme: colorThemeForNode(nearestReprNode, context),
            });
        }
        return struct;
    },
    tooltip: undefined, // No action needed, already loaded in `structure`
    tooltip_from_uri: undefined, // No action needed, already loaded in `structure`
    tooltip_from_source: undefined, // No action needed, already loaded in `structure`
    component(updateParent, node) {
        if (isPhantomComponent(node)) {
            return updateParent;
        }
        const selector = node.params.selector;
        return UpdateTarget.apply(updateParent, StructureComponent, {
            type: componentPropsFromSelector(selector),
            label: prettyNameFromSelector(selector),
            nullIfEmpty: false,
        });
    },
    component_from_uri(updateParent, node, context) {
        if (isPhantomComponent(node))
            return undefined;
        const props = componentFromXProps(node, context);
        return UpdateTarget.apply(updateParent, MVSAnnotationStructureComponent, props);
    },
    component_from_source(updateParent, node, context) {
        if (isPhantomComponent(node))
            return undefined;
        const props = componentFromXProps(node, context);
        return UpdateTarget.apply(updateParent, MVSAnnotationStructureComponent, props);
    },
    representation(updateParent, node, context) {
        return UpdateTarget.apply(updateParent, StructureRepresentation3D, {
            ...representationProps(node.params),
            colorTheme: colorThemeForNode(node, context),
        });
    },
    color: undefined, // No action needed, already loaded in `representation`
    color_from_uri: undefined, // No action needed, already loaded in `representation`
    color_from_source: undefined, // No action needed, already loaded in `representation`
    label: undefined, // No action needed, already loaded in `structure`
    label_from_uri(updateParent, node, context) {
        const props = labelFromXProps(node, context);
        return UpdateTarget.apply(updateParent, StructureRepresentation3D, props);
    },
    label_from_source(updateParent, node, context) {
        const props = labelFromXProps(node, context);
        return UpdateTarget.apply(updateParent, StructureRepresentation3D, props);
    },
    focus(updateParent, node, context) {
        context.focus = { kind: 'focus', focusTarget: updateParent.selector, params: node.params };
        return updateParent;
    },
    camera(updateParent, node, context) {
        context.focus = { kind: 'camera', params: node.params };
        return updateParent;
    },
    canvas(updateParent, node, context) {
        context.canvas = node.params;
        return updateParent;
    },
};