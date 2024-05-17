/**
 * Copyright (c) 2018-2024 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author David Sehnal <david.sehnal@gmail.com>
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */
import { loadMVS } from '../../extensions/mvs/load';
import { MVSData } from '../../extensions/mvs/mvs-data';
import { SaccharideCompIdMapType } from '../../mol-model/structure/structure/carbohydrates/constants';
import { PresetTrajectoryHierarchy } from '../../mol-plugin-state/builder/structure/hierarchy-preset';
import { StructureRepresentationPresetProvider } from '../../mol-plugin-state/builder/structure/representation-preset';
import { BuiltInCoordinatesFormat } from '../../mol-plugin-state/formats/coordinates';
import { DataFormatProvider } from '../../mol-plugin-state/formats/provider';
import { BuiltInTopologyFormat } from '../../mol-plugin-state/formats/topology';
import { BuiltInTrajectoryFormat } from '../../mol-plugin-state/formats/trajectory';
import { BuildInVolumeFormat } from '../../mol-plugin-state/formats/volume';
import { PluginStateObject } from '../../mol-plugin-state/objects';
import { PluginUIContext } from '../../mol-plugin-ui/context';
import { PluginLayoutControlsDisplay } from '../../mol-plugin/layout';
import { PluginSpec } from '../../mol-plugin/spec';
import { PluginState } from '../../mol-plugin/state';
import { StateObjectSelector } from '../../mol-state';
import { Color } from '../../mol-util/color';
import '../../mol-util/polyfill';
export { PLUGIN_VERSION as version } from '../../mol-plugin/version';
export { consoleStats, setDebugMode, setProductionMode, setTimingMode } from '../../mol-util/debug';
export declare const ExtensionMap: {
    volseg: PluginSpec.Behavior;
    backgrounds: PluginSpec.Behavior;
    'dnatco-ntcs': PluginSpec.Behavior;
    'pdbe-structure-quality-report': PluginSpec.Behavior;
    'assembly-symmetry': PluginSpec.Behavior;
    'rcsb-validation-report': PluginSpec.Behavior;
    'anvil-membrane-orientation': PluginSpec.Behavior;
    g3d: PluginSpec.Behavior;
    'model-export': PluginSpec.Behavior;
    'mp4-export': PluginSpec.Behavior;
    'geo-export': PluginSpec.Behavior;
    'ma-quality-assessment': PluginSpec.Behavior;
    'zenodo-import': PluginSpec.Behavior;
    'sb-ncbr-partial-charges': PluginSpec.Behavior;
    'wwpdb-chemical-component-dictionary': PluginSpec.Behavior;
    mvs: PluginSpec.Behavior;
};
declare const DefaultViewerOptions: {
    customFormats: [string, DataFormatProvider<any, any, any>][];
    extensions: ("backgrounds" | "mp4-export" | "g3d" | "volseg" | "dnatco-ntcs" | "sb-ncbr-partial-charges" | "wwpdb-chemical-component-dictionary" | "pdbe-structure-quality-report" | "assembly-symmetry" | "rcsb-validation-report" | "anvil-membrane-orientation" | "model-export" | "geo-export" | "ma-quality-assessment" | "zenodo-import" | "mvs")[];
    disabledExtensions: string[];
    layoutIsExpanded: boolean;
    layoutShowControls: boolean;
    layoutShowRemoteState: boolean;
    layoutControlsDisplay: PluginLayoutControlsDisplay;
    layoutShowSequence: boolean;
    layoutShowLog: boolean;
    layoutShowLeftPanel: boolean;
    collapseLeftPanel: boolean;
    collapseRightPanel: boolean;
    disableAntialiasing: boolean | undefined;
    pixelScale: number | undefined;
    pickScale: number | undefined;
    transparency: "blended" | "wboit" | "dpoit" | undefined;
    preferWebgl1: boolean | undefined;
    allowMajorPerformanceCaveat: boolean | undefined;
    powerPreference: WebGLPowerPreference | undefined;
    viewportShowExpand: boolean | undefined;
    viewportShowControls: boolean | undefined;
    viewportShowSettings: boolean | undefined;
    viewportShowSelectionMode: boolean | undefined;
    viewportShowAnimation: boolean | undefined;
    viewportShowTrajectoryControls: boolean | undefined;
    pluginStateServer: string | undefined;
    volumeStreamingServer: string | undefined;
    volumeStreamingDisabled: boolean;
    pdbProvider: "rcsb" | "pdbe" | "pdbj" | undefined;
    emdbProvider: import("../../mol-plugin-state/actions/volume").EmdbDownloadProvider | undefined;
    saccharideCompIdMapType: SaccharideCompIdMapType;
    volumesAndSegmentationsDefaultServer: string | undefined;
    rcsbAssemblySymmetryDefaultServerType: "rcsb" | "pdbe" | undefined;
    rcsbAssemblySymmetryDefaultServerUrl: string | undefined;
    rcsbAssemblySymmetryApplyColors: boolean | undefined;
};
type ViewerOptions = typeof DefaultViewerOptions;
export declare class Viewer {
    plugin: PluginUIContext;
    constructor(plugin: PluginUIContext);
    static create(elementOrId: string | HTMLElement, options?: Partial<ViewerOptions>): Promise<Viewer>;
    setRemoteSnapshot(id: string): Promise<void>;
    loadSnapshotFromUrl(url: string, type: PluginState.SnapshotType): Promise<void>;
    loadStructureFromUrl(url: string, format?: BuiltInTrajectoryFormat, isBinary?: boolean, options?: LoadStructureOptions & {
        label?: string;
    }): Promise<void>;
    loadAllModelsOrAssemblyFromUrl(url: string, format?: BuiltInTrajectoryFormat, isBinary?: boolean, options?: LoadStructureOptions): Promise<void>;
    loadStructureFromData(data: string | number[], format: BuiltInTrajectoryFormat, options?: {
        dataLabel?: string;
    }): Promise<void>;
    loadPdb(pdb: string, options?: LoadStructureOptions): Promise<void>;
    loadPdbDev(pdbDev: string): Promise<void>;
    loadEmdb(emdb: string, options?: {
        detail?: number;
    }): Promise<void>;
    loadAlphaFoldDb(afdb: string): Promise<void>;
    loadModelArchive(id: string): Promise<void>;
    /**
     * @example Load X-ray density from volume server
        viewer.loadVolumeFromUrl({
            url: 'https://www.ebi.ac.uk/pdbe/densities/x-ray/1tqn/cell?detail=3',
            format: 'dscif',
            isBinary: true
        }, [{
            type: 'relative',
            value: 1.5,
            color: 0x3362B2
        }, {
            type: 'relative',
            value: 3,
            color: 0x33BB33,
            volumeIndex: 1
        }, {
            type: 'relative',
            value: -3,
            color: 0xBB3333,
            volumeIndex: 1
        }], {
            entryId: ['2FO-FC', 'FO-FC'],
            isLazy: true
        });
     * *********************
     * @example Load EM density from volume server
        viewer.loadVolumeFromUrl({
            url: 'https://maps.rcsb.org/em/emd-30210/cell?detail=6',
            format: 'dscif',
            isBinary: true
        }, [{
            type: 'relative',
            value: 1,
            color: 0x3377aa
        }], {
            entryId: 'EMD-30210',
            isLazy: true
        });
     */
    loadVolumeFromUrl({ url, format, isBinary }: {
        url: string;
        format: BuildInVolumeFormat;
        isBinary: boolean;
    }, isovalues: VolumeIsovalueInfo[], options?: {
        entryId?: string | string[];
        isLazy?: boolean;
    }): Promise<void>;
    /**
     * @example
     *  viewer.loadTrajectory({
     *      model: { kind: 'model-url', url: 'villin.gro', format: 'gro' },
     *      coordinates: { kind: 'coordinates-url', url: 'villin.xtc', format: 'xtc', isBinary: true },
     *      preset: 'all-models' // or 'default'
     *  });
     */
    loadTrajectory(params: LoadTrajectoryParams): Promise<{
        model: StateObjectSelector<import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, import("../../mol-state").StateTransformer<import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, any>>;
        coords: any;
        preset: {
            model: StateObjectSelector<PluginStateObject.Molecule.Model, import("../../mol-state").StateTransformer<import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, any>>;
            modelProperties: StateObjectSelector<PluginStateObject.Molecule.Model, import("../../mol-state").StateTransformer<import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, any>>;
            unitcell: StateObjectSelector<PluginStateObject.Shape.Representation3D, import("../../mol-state").StateTransformer<import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, any>> | undefined;
            structure: StateObjectSelector<PluginStateObject.Molecule.Structure, import("../../mol-state").StateTransformer<import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, any>>;
            structureProperties: StateObjectSelector<PluginStateObject.Molecule.Structure, import("../../mol-state").StateTransformer<import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, any>>;
            representation: any;
        } | {
            models?: undefined;
            structures?: undefined;
        } | {
            models: StateObjectSelector<PluginStateObject.Molecule.Model, import("../../mol-state").StateTransformer<import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, any>>[];
            structures: StateObjectSelector<PluginStateObject.Molecule.Structure, import("../../mol-state").StateTransformer<import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, any>>[];
        } | {
            model: StateObjectSelector<PluginStateObject.Molecule.Model, import("../../mol-state").StateTransformer<import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, any>>;
            modelProperties: StateObjectSelector<PluginStateObject.Molecule.Model, import("../../mol-state").StateTransformer<import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, any>>;
            unitcell: StateObjectSelector<PluginStateObject.Shape.Representation3D, import("../../mol-state").StateTransformer<import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, any>> | undefined;
            structure: StateObjectSelector<PluginStateObject.Molecule.Structure, import("../../mol-state").StateTransformer<import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, any>>;
            structureProperties: StateObjectSelector<PluginStateObject.Molecule.Structure, import("../../mol-state").StateTransformer<import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, any>>;
            representation: any;
        } | {
            model: StateObjectSelector<PluginStateObject.Molecule.Model, import("../../mol-state").StateTransformer<import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, any>>;
            modelProperties: StateObjectSelector<PluginStateObject.Molecule.Model, import("../../mol-state").StateTransformer<import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, any>>;
            unitcell: StateObjectSelector<PluginStateObject.Shape.Representation3D, import("../../mol-state").StateTransformer<import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, any>> | undefined;
            structure: StateObjectSelector<PluginStateObject.Molecule.Structure, import("../../mol-state").StateTransformer<import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, any>>;
            structureProperties: StateObjectSelector<PluginStateObject.Molecule.Structure, import("../../mol-state").StateTransformer<import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, any>>;
            representation: any;
        } | undefined;
    }>;
    loadMvsFromUrl(url: string, format: 'mvsj' | 'mvsx'): Promise<void>;
    /** Load MolViewSpec from `data`.
     * If `format` is 'mvsj', `data` must be a string or a Uint8Array containing a UTF8-encoded string.
     * If `format` is 'mvsx', `data` must be a Uint8Array or a string containing base64-encoded binary data prefixed with 'base64,'. */
    loadMvsData(data: string | Uint8Array, format: 'mvsj' | 'mvsx'): Promise<void>;
    handleResize(): void;
    dispose(): void;
}
export interface LoadStructureOptions {
    representationParams?: StructureRepresentationPresetProvider.CommonParams;
}
export interface VolumeIsovalueInfo {
    type: 'absolute' | 'relative';
    value: number;
    color: Color;
    alpha?: number;
    volumeIndex?: number;
}
export interface LoadTrajectoryParams {
    model: {
        kind: 'model-url';
        url: string;
        format?: BuiltInTrajectoryFormat;
        isBinary?: boolean;
    } | {
        kind: 'model-data';
        data: string | number[] | ArrayBuffer | Uint8Array;
        format?: BuiltInTrajectoryFormat;
    } | {
        kind: 'topology-url';
        url: string;
        format: BuiltInTopologyFormat;
        isBinary?: boolean;
    } | {
        kind: 'topology-data';
        data: string | number[] | ArrayBuffer | Uint8Array;
        format: BuiltInTopologyFormat;
    };
    modelLabel?: string;
    coordinates: {
        kind: 'coordinates-url';
        url: string;
        format: BuiltInCoordinatesFormat;
        isBinary?: boolean;
    } | {
        kind: 'coordinates-data';
        data: string | number[] | ArrayBuffer | Uint8Array;
        format: BuiltInCoordinatesFormat;
    };
    coordinatesLabel?: string;
    preset?: keyof PresetTrajectoryHierarchy;
}
export declare const ViewerAutoPreset: StructureRepresentationPresetProvider<{
    ignoreHydrogens: boolean | undefined;
    ignoreHydrogensVariant: "all" | "non-polar" | undefined;
    ignoreLight: boolean | undefined;
    quality: "custom" | "auto" | "highest" | "higher" | "high" | "medium" | "low" | "lower" | "lowest" | undefined;
    theme: import("../../mol-util/param-definition").ParamDefinition.Normalize<{
        globalName: any;
        globalColorParams: any;
        carbonColor: any;
        symmetryColor: any;
        symmetryColorParams: any;
        focus: any;
    }> | undefined;
}, {
    components?: undefined;
    representations?: undefined;
} | {
    components: {
        polymer: StateObjectSelector<PluginStateObject.Molecule.Structure, import("../../mol-state").StateTransformer<import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, any>> | undefined;
    };
    representations: {
        polymer: StateObjectSelector<PluginStateObject.Molecule.Structure.Representation3D, import("../../mol-state").StateTransformer<import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, any>>;
    };
} | {
    components: {
        all: StateObjectSelector<PluginStateObject.Molecule.Structure, import("../../mol-state").StateTransformer<import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, any>> | undefined;
        branched: undefined;
    };
    representations: {
        all: StateObjectSelector<PluginStateObject.Molecule.Structure.Representation3D, import("../../mol-state").StateTransformer<import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, import("../../mol-state").StateObject<any, import("../../mol-state").StateObject.Type<any>>, any>>;
    };
}>;
export declare const PluginExtensions: {
    wwPDBStructConn: {
        getStructConns(plugin: import("../../mol-plugin/context").PluginContext, entry: string | undefined): {
            [id: string]: import("../../extensions/wwpdb/struct-conn").StructConnRecord;
        };
        inspectStructConn(plugin: import("../../mol-plugin/context").PluginContext, entry: string | undefined, structConnId: string, keepExisting?: boolean): Promise<number>;
        clearStructConnInspections(plugin: import("../../mol-plugin/context").PluginContext, entry: string | undefined): Promise<void>;
    };
    mvs: {
        MVSData: {
            SupportedVersion: number;
            fromMVSJ(mvsjString: string): MVSData;
            toMVSJ(mvsData: MVSData, space?: string | number | undefined): string;
            isValid(mvsData: MVSData, options?: {
                noExtra?: boolean | undefined;
            }): boolean;
            validationIssues(mvsData: MVSData, options?: {
                noExtra?: boolean | undefined;
            }): string[] | undefined;
            toPrettyString(mvsData: MVSData): string;
            createBuilder(): import("../../extensions/mvs/tree/mvs/mvs-builder").Root;
        };
        loadMVS: typeof loadMVS;
    };
};