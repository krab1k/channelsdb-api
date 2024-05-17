/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Gianluca Tomasello <giagitom@gmail.com>
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */
import { ParamDefinition as PD } from '../../../mol-util/param-definition';
import { UnitsVisual } from '../units-visual';
export declare const NucleotideAtomicRingFillMeshParams: {
    sizeFactor: PD.Numeric;
    thicknessFactor: PD.Numeric;
};
export declare const DefaultNucleotideAtomicRingFillMeshProps: PD.Values<{
    sizeFactor: PD.Numeric;
    thicknessFactor: PD.Numeric;
}>;
export type NucleotideAtomicRingFillProps = typeof DefaultNucleotideAtomicRingFillMeshProps;
export declare const NucleotideAtomicRingFillParams: {
    sizeFactor: PD.Numeric;
    thicknessFactor: PD.Numeric;
    unitKinds: PD.MultiSelect<"spheres" | "atomic" | "gaussians">;
    includeParent: PD.BooleanParam;
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
export type NucleotideAtomicRingFillParams = typeof NucleotideAtomicRingFillParams;
export declare function NucleotideAtomicRingFillVisual(materialId: number): UnitsVisual<NucleotideAtomicRingFillParams>;