/**
 * Copyright (c) 2019-2022 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */
import { ParamDefinition as PD } from '../../../mol-util/param-definition';
import { UnitsVisual } from '../units-visual';
import { ComplexVisual } from '../complex-visual';
export declare const MolecularSurfaceMeshParams: {
    smoothColors: PD.Mapped<PD.NamedParams<PD.Normalize<unknown>, "off"> | PD.NamedParams<PD.Normalize<unknown>, "auto"> | PD.NamedParams<PD.Normalize<{
        resolutionFactor: number;
        sampleStride: number;
    }>, "on">>;
    ignoreHydrogens: PD.BooleanParam;
    ignoreHydrogensVariant: PD.Select<"all" | "non-polar">;
    traceOnly: PD.BooleanParam;
    includeParent: PD.BooleanParam;
    probeRadius: PD.Numeric;
    resolution: PD.Numeric;
    probePositions: PD.Numeric;
    unitKinds: PD.MultiSelect<"spheres" | "atomic" | "gaussians">;
    doubleSided: PD.BooleanParam;
    flipSided: PD.BooleanParam;
    flatShaded: PD.BooleanParam;
    ignoreLight: PD.BooleanParam;
    xrayShaded: PD.Select<boolean | "inverted">;
    transparentBackfaces: PD.Select<"off" | "on" | "opaque">;
    bumpFrequency: PD.Numeric;
    bumpAmplitude: PD.Numeric;
    alpha: PD.Numeric;
    quality: PD.Select<"custom" | "auto" | "highest" | "higher" | "high" | "medium" | "low" | "lower" | "lowest">;
    material: PD.Group<PD.Normalize<{
        metalness: number;
        roughness: number;
        bumpiness: number;
    }>>;
    clip: PD.Group<PD.Normalize<{
        variant: import("../../../mol-util/clip").Clip.Variant;
        objects: PD.Normalize<{
            type: any;
            invert: any;
            position: any;
            rotation: any;
            scale: any;
        }>[];
    }>>;
    instanceGranularity: PD.BooleanParam;
    lod: PD.Vec3;
    cellSize: PD.Numeric;
    batchSize: PD.Numeric;
};
export type MolecularSurfaceMeshParams = typeof MolecularSurfaceMeshParams;
export type MolecularSurfaceMeshProps = PD.Values<MolecularSurfaceMeshParams>;
export declare function MolecularSurfaceMeshVisual(materialId: number): UnitsVisual<MolecularSurfaceMeshParams>;
export declare function StructureMolecularSurfaceMeshVisual(materialId: number): ComplexVisual<MolecularSurfaceMeshParams>;