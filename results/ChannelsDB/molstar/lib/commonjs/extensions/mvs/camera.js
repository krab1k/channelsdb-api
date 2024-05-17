"use strict";
/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.setCanvas = exports.setFocus = exports.setCamera = void 0;
const boundary_helper_1 = require("../../mol-math/geometry/boundary-helper");
const linear_algebra_1 = require("../../mol-math/linear-algebra");
const loci_1 = require("../../mol-model/loci");
const structure_1 = require("../../mol-model/structure");
const objects_1 = require("../../mol-plugin-state/objects");
const commands_1 = require("../../mol-plugin/commands");
const names_1 = require("../../mol-util/color/names");
const utils_1 = require("./helpers/utils");
const mvs_defaults_1 = require("./tree/mvs/mvs-defaults");
const DefaultFocusOptions = {
    minRadius: 5,
    extraRadiusForFocus: 0,
    extraRadiusForZoomAll: 0,
};
const DefaultCanvasBackgroundColor = names_1.ColorNames.white;
const _tmpVec = (0, linear_algebra_1.Vec3)();
/** Set the camera based on a camera node params. */
async function setCamera(plugin, params) {
    const target = linear_algebra_1.Vec3.create(...params.target);
    let position = linear_algebra_1.Vec3.create(...params.position);
    if (plugin.canvas3d)
        position = fovAdjustedPosition(target, position, plugin.canvas3d.camera.state.mode, plugin.canvas3d.camera.state.fov);
    const up = linear_algebra_1.Vec3.create(...params.up);
    linear_algebra_1.Vec3.orthogonalize(up, linear_algebra_1.Vec3.sub(_tmpVec, target, position), up);
    const snapshot = { target, position, up, radius: 10000, 'radiusMax': 10000 };
    await commands_1.PluginCommands.Camera.SetSnapshot(plugin, { snapshot });
}
exports.setCamera = setCamera;
/** Focus the camera on the bounding sphere of a (sub)structure (or on the whole scene if `structureNodeSelector` is null).
 * Orient the camera based on a focus node params. */
async function setFocus(plugin, structureNodeSelector, params = mvs_defaults_1.MVSDefaults.focus) {
    var _a;
    let structure = undefined;
    if (structureNodeSelector) {
        const cell = plugin.state.data.cells.get(structureNodeSelector.ref);
        structure = (_a = cell === null || cell === void 0 ? void 0 : cell.obj) === null || _a === void 0 ? void 0 : _a.data;
        if (!structure)
            console.warn('Focus: no structure');
        if (!(structure instanceof structure_1.Structure)) {
            console.warn('Focus: cannot apply to a non-structure node');
            structure = undefined;
        }
    }
    const boundingSphere = structure ? loci_1.Loci.getBoundingSphere(structure_1.Structure.Loci(structure)) : getPluginBoundingSphere(plugin);
    if (boundingSphere && plugin.canvas3d) {
        const extraRadius = structure ? DefaultFocusOptions.extraRadiusForFocus : DefaultFocusOptions.extraRadiusForZoomAll;
        const direction = linear_algebra_1.Vec3.create(...params.direction);
        const up = linear_algebra_1.Vec3.create(...params.up);
        linear_algebra_1.Vec3.orthogonalize(up, direction, up);
        const snapshot = snapshotFromSphereAndDirections(plugin.canvas3d.camera, {
            center: boundingSphere.center,
            radius: boundingSphere.radius + extraRadius,
            up,
            direction,
        });
        await commands_1.PluginCommands.Camera.SetSnapshot(plugin, { snapshot });
    }
}
exports.setFocus = setFocus;
/** Return camera snapshot for focusing a sphere with given `center` and `radius`,
 * while ensuring given view `direction` (aligns with vector position->target)
 * and `up` (aligns with screen Y axis). */
function snapshotFromSphereAndDirections(camera, options) {
    // This might seem to repeat `plugin.canvas3d.camera.getFocus` but avoid flipping
    const { center, direction, up } = options;
    const radius = Math.max(options.radius, DefaultFocusOptions.minRadius);
    const distance = camera.getTargetDistance(radius);
    const deltaDirection = linear_algebra_1.Vec3.setMagnitude(_tmpVec, direction, distance);
    const position = linear_algebra_1.Vec3.sub((0, linear_algebra_1.Vec3)(), center, deltaDirection);
    return { target: center, position, up, radius };
}
/** Return the distance adjustment ratio for conversion from the "reference camera"
 * to a camera with an arbitrary field of view `fov`. */
function distanceAdjustment(mode, fov) {
    if (mode === 'orthographic')
        return 1 / (2 * Math.tan(fov / 2));
    else
        return 1 / (2 * Math.sin(fov / 2));
}
/** Return the position for a camera with an arbitrary field of view `fov`
 * necessary to just fit into view the same sphere (with center at `target`)
 * as the "reference camera" placed at `refPosition` would fit, while keeping the camera orientation.
 * The "reference camera" is a camera which can just fit into view a sphere of radius R with center at distance 2R
 * (this corresponds to FOV = 2 * asin(1/2) in perspective mode or FOV = 2 * atan(1/2) in orthographic mode). */
function fovAdjustedPosition(target, refPosition, mode, fov) {
    const delta = linear_algebra_1.Vec3.sub((0, linear_algebra_1.Vec3)(), refPosition, target);
    const adjustment = distanceAdjustment(mode, fov);
    return linear_algebra_1.Vec3.scaleAndAdd(delta, target, delta, adjustment); // return target + delta * adjustment
}
/** Compute the bounding sphere of the whole scene. */
function getPluginBoundingSphere(plugin) {
    const renderObjects = getRenderObjects(plugin, false);
    const spheres = renderObjects.map(r => r.values.boundingSphere.ref.value).filter(sphere => sphere.radius > 0);
    return boundingSphereOfSpheres(spheres);
}
function getRenderObjects(plugin, includeHidden) {
    let reprCells = Array.from(plugin.state.data.cells.values()).filter(cell => cell.obj && objects_1.PluginStateObject.isRepresentation3D(cell.obj));
    if (!includeHidden)
        reprCells = reprCells.filter(cell => !cell.state.isHidden);
    const renderables = reprCells.flatMap(cell => cell.obj.data.repr.renderObjects);
    return renderables;
}
let boundaryHelper = undefined;
function boundingSphereOfSpheres(spheres) {
    boundaryHelper !== null && boundaryHelper !== void 0 ? boundaryHelper : (boundaryHelper = new boundary_helper_1.BoundaryHelper('98'));
    boundaryHelper.reset();
    for (const s of spheres)
        boundaryHelper.includeSphere(s);
    boundaryHelper.finishedIncludeStep();
    for (const s of spheres)
        boundaryHelper.radiusSphere(s);
    return boundaryHelper.getSphere();
}
/** Set canvas properties based on a canvas node params. */
function setCanvas(plugin, params) {
    var _a, _b, _c;
    const backgroundColor = (_a = (0, utils_1.decodeColor)(params === null || params === void 0 ? void 0 : params.background_color)) !== null && _a !== void 0 ? _a : DefaultCanvasBackgroundColor;
    if (backgroundColor !== ((_b = plugin.canvas3d) === null || _b === void 0 ? void 0 : _b.props.renderer.backgroundColor)) {
        (_c = plugin.canvas3d) === null || _c === void 0 ? void 0 : _c.setProps(old => ({
            ...old,
            renderer: {
                ...old.renderer,
                backgroundColor: backgroundColor,
            }
        }));
    }
}
exports.setCanvas = setCanvas;