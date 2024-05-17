/**
 * Copyright (c) 2023-2024 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */
import { PluginContext } from '../../mol-plugin/context';
import { StateObjectSelector } from '../../mol-state';
import { AnnotationFromSourceKind, AnnotationFromUriKind } from './load-helpers';
import { MVSData } from './mvs-data';
import { ParamsOfKind } from './tree/generic/tree-schema';
import { MolstarNode, MolstarTree } from './tree/molstar/molstar-tree';
/** Load a MolViewSpec (MVS) tree into the Mol* plugin.
 * If `options.replaceExisting`, remove all objects in the current Mol* state; otherwise add to the current state.
 * If `options.sanityChecks`, run some sanity checks and print potential issues to the console.
 * `options.sourceUrl` serves as the base for resolving relative URLs/URIs and may itself be relative to the window URL. */
export declare function loadMVS(plugin: PluginContext, data: MVSData, options?: {
    replaceExisting?: boolean;
    sanityChecks?: boolean;
    sourceUrl?: string;
}): Promise<void>;
/** Mutable context for loading a `MolstarTree`, available throughout the loading. */
export interface MolstarLoadingContext {
    /** Maps `*_from_[uri|source]` nodes to annotationId they should reference */
    annotationMap?: Map<MolstarNode<AnnotationFromUriKind | AnnotationFromSourceKind>, string>;
    /** Maps each node (on 'structure' or lower level) to its nearest 'representation' node */
    nearestReprMap?: Map<MolstarNode, MolstarNode<'representation'>>;
    focus?: {
        kind: 'camera';
        params: ParamsOfKind<MolstarTree, 'camera'>;
    } | {
        kind: 'focus';
        focusTarget: StateObjectSelector;
        params: ParamsOfKind<MolstarTree, 'focus'>;
    };
    canvas?: ParamsOfKind<MolstarTree, 'canvas'>;
}