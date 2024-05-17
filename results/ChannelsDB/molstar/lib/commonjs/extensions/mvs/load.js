"use strict";
/**
 * Copyright (c) 2023-2024 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadMVS = void 0;
const data_1 = require("../../mol-plugin-state/transforms/data");
const model_1 = require("../../mol-plugin-state/transforms/model");
const representation_1 = require("../../mol-plugin-state/transforms/representation");
const behavior_1 = require("./behavior");
const camera_1 = require("./camera");
const annotation_prop_1 = require("./components/annotation-prop");
const annotation_structure_component_1 = require("./components/annotation-structure-component");
const annotation_tooltips_prop_1 = require("./components/annotation-tooltips-prop");
const representation_2 = require("./components/custom-label/representation");
const custom_tooltips_prop_1 = require("./components/custom-tooltips-prop");
const is_mvs_model_prop_1 = require("./components/is-mvs-model-prop");
const load_helpers_1 = require("./load-helpers");
const tree_schema_1 = require("./tree/generic/tree-schema");
const conversion_1 = require("./tree/molstar/conversion");
const molstar_tree_1 = require("./tree/molstar/molstar-tree");
const mvs_tree_1 = require("./tree/mvs/mvs-tree");
/** Load a MolViewSpec (MVS) tree into the Mol* plugin.
 * If `options.replaceExisting`, remove all objects in the current Mol* state; otherwise add to the current state.
 * If `options.sanityChecks`, run some sanity checks and print potential issues to the console.
 * `options.sourceUrl` serves as the base for resolving relative URLs/URIs and may itself be relative to the window URL. */
async function loadMVS(plugin, data, options = {}) {
    try {
        // console.log(`MVS tree:\n${MVSData.toPrettyString(data)}`)
        (0, tree_schema_1.validateTree)(mvs_tree_1.MVSTreeSchema, data.root, 'MVS');
        if (options.sanityChecks)
            (0, conversion_1.mvsSanityCheck)(data.root);
        const molstarTree = (0, conversion_1.convertMvsToMolstar)(data.root, options.sourceUrl);
        // console.log(`Converted MolStar tree:\n${MVSData.toPrettyString({ root: molstarTree, metadata: { version: 'x', timestamp: 'x' } })}`)
        (0, tree_schema_1.validateTree)(molstar_tree_1.MolstarTreeSchema, molstarTree, 'Converted Molstar');
        await loadMolstarTree(plugin, molstarTree, options);
    }
    catch (err) {
        plugin.log.error(`${err}`);
        throw err;
    }
}
exports.loadMVS = loadMVS;
/** Load a `MolstarTree` into the Mol* plugin.
 * If `replaceExisting`, remove all objects in the current Mol* state; otherwise add to the current state. */
async function loadMolstarTree(plugin, tree, options) {
    var _a, _b;
    const mvsExtensionLoaded = plugin.state.hasBehavior(behavior_1.MolViewSpec);
    if (!mvsExtensionLoaded)
        throw new Error('MolViewSpec extension is not loaded.');
    const context = {};
    await (0, load_helpers_1.loadTree)(plugin, tree, MolstarLoadingActions, context, options);
    (0, camera_1.setCanvas)(plugin, context.canvas);
    if (((_a = context.focus) === null || _a === void 0 ? void 0 : _a.kind) === 'camera') {
        await (0, camera_1.setCamera)(plugin, context.focus.params);
    }
    else if (((_b = context.focus) === null || _b === void 0 ? void 0 : _b.kind) === 'focus') {
        await (0, camera_1.setFocus)(plugin, context.focus.focusTarget, context.focus.params);
    }
    else {
        await (0, camera_1.setFocus)(plugin, undefined, undefined);
    }
}
/** Loading actions for loading a `MolstarTree`, per node kind. */
const MolstarLoadingActions = {
    root(updateParent, node, context) {
        context.nearestReprMap = (0, load_helpers_1.makeNearestReprMap)(node);
        return updateParent;
    },
    download(updateParent, node) {
        return load_helpers_1.UpdateTarget.apply(updateParent, data_1.Download, {
            url: node.params.url,
            isBinary: node.params.is_binary,
        });
    },
    parse(updateParent, node) {
        const format = node.params.format;
        if (format === 'cif') {
            return load_helpers_1.UpdateTarget.apply(updateParent, data_1.ParseCif, {});
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
            return load_helpers_1.UpdateTarget.apply(updateParent, model_1.TrajectoryFromMmCif, {
                blockHeader: (_a = node.params.block_header) !== null && _a !== void 0 ? _a : '', // Must set to '' because just undefined would get overwritten by createDefaults
                blockIndex: (_b = node.params.block_index) !== null && _b !== void 0 ? _b : undefined,
            });
        }
        else if (format === 'pdb') {
            return load_helpers_1.UpdateTarget.apply(updateParent, model_1.TrajectoryFromPDB, {});
        }
        else {
            console.error(`Unknown format in "trajectory" node: "${format}"`);
            return undefined;
        }
    },
    model(updateParent, node, context) {
        const annotations = (0, load_helpers_1.collectAnnotationReferences)(node, context);
        const model = load_helpers_1.UpdateTarget.apply(updateParent, model_1.ModelFromTrajectory, {
            modelIndex: node.params.model_index,
        });
        load_helpers_1.UpdateTarget.apply(model, model_1.CustomModelProperties, {
            properties: {
                [is_mvs_model_prop_1.IsMVSModelProvider.descriptor.name]: { isMvs: true },
                [annotation_prop_1.MVSAnnotationsProvider.descriptor.name]: { annotations },
            },
            autoAttach: [
                is_mvs_model_prop_1.IsMVSModelProvider.descriptor.name,
                annotation_prop_1.MVSAnnotationsProvider.descriptor.name,
            ],
        });
        return model;
    },
    structure(updateParent, node, context) {
        var _a;
        const props = (0, load_helpers_1.structureProps)(node);
        const struct = load_helpers_1.UpdateTarget.apply(updateParent, model_1.StructureFromModel, props);
        let transformed = struct;
        for (const t of (0, load_helpers_1.transformProps)(node)) {
            transformed = load_helpers_1.UpdateTarget.apply(transformed, model_1.TransformStructureConformation, t); // applying to the result of previous transform, to get the correct transform order
        }
        const annotationTooltips = (0, load_helpers_1.collectAnnotationTooltips)(node, context);
        const inlineTooltips = (0, load_helpers_1.collectInlineTooltips)(node, context);
        if (annotationTooltips.length + inlineTooltips.length > 0) {
            load_helpers_1.UpdateTarget.apply(struct, model_1.CustomStructureProperties, {
                properties: {
                    [annotation_tooltips_prop_1.MVSAnnotationTooltipsProvider.descriptor.name]: { tooltips: annotationTooltips },
                    [custom_tooltips_prop_1.CustomTooltipsProvider.descriptor.name]: { tooltips: inlineTooltips },
                },
                autoAttach: [
                    annotation_tooltips_prop_1.MVSAnnotationTooltipsProvider.descriptor.name,
                    custom_tooltips_prop_1.CustomTooltipsProvider.descriptor.name,
                ],
            });
        }
        const inlineLabels = (0, load_helpers_1.collectInlineLabels)(node, context);
        if (inlineLabels.length > 0) {
            const nearestReprNode = (_a = context.nearestReprMap) === null || _a === void 0 ? void 0 : _a.get(node);
            load_helpers_1.UpdateTarget.apply(struct, representation_1.StructureRepresentation3D, {
                type: {
                    name: representation_2.CustomLabelRepresentationProvider.name,
                    params: { items: inlineLabels },
                },
                colorTheme: (0, load_helpers_1.colorThemeForNode)(nearestReprNode, context),
            });
        }
        return struct;
    },
    tooltip: undefined, // No action needed, already loaded in `structure`
    tooltip_from_uri: undefined, // No action needed, already loaded in `structure`
    tooltip_from_source: undefined, // No action needed, already loaded in `structure`
    component(updateParent, node) {
        if ((0, load_helpers_1.isPhantomComponent)(node)) {
            return updateParent;
        }
        const selector = node.params.selector;
        return load_helpers_1.UpdateTarget.apply(updateParent, model_1.StructureComponent, {
            type: (0, load_helpers_1.componentPropsFromSelector)(selector),
            label: (0, load_helpers_1.prettyNameFromSelector)(selector),
            nullIfEmpty: false,
        });
    },
    component_from_uri(updateParent, node, context) {
        if ((0, load_helpers_1.isPhantomComponent)(node))
            return undefined;
        const props = (0, load_helpers_1.componentFromXProps)(node, context);
        return load_helpers_1.UpdateTarget.apply(updateParent, annotation_structure_component_1.MVSAnnotationStructureComponent, props);
    },
    component_from_source(updateParent, node, context) {
        if ((0, load_helpers_1.isPhantomComponent)(node))
            return undefined;
        const props = (0, load_helpers_1.componentFromXProps)(node, context);
        return load_helpers_1.UpdateTarget.apply(updateParent, annotation_structure_component_1.MVSAnnotationStructureComponent, props);
    },
    representation(updateParent, node, context) {
        return load_helpers_1.UpdateTarget.apply(updateParent, representation_1.StructureRepresentation3D, {
            ...(0, load_helpers_1.representationProps)(node.params),
            colorTheme: (0, load_helpers_1.colorThemeForNode)(node, context),
        });
    },
    color: undefined, // No action needed, already loaded in `representation`
    color_from_uri: undefined, // No action needed, already loaded in `representation`
    color_from_source: undefined, // No action needed, already loaded in `representation`
    label: undefined, // No action needed, already loaded in `structure`
    label_from_uri(updateParent, node, context) {
        const props = (0, load_helpers_1.labelFromXProps)(node, context);
        return load_helpers_1.UpdateTarget.apply(updateParent, representation_1.StructureRepresentation3D, props);
    },
    label_from_source(updateParent, node, context) {
        const props = (0, load_helpers_1.labelFromXProps)(node, context);
        return load_helpers_1.UpdateTarget.apply(updateParent, representation_1.StructureRepresentation3D, props);
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