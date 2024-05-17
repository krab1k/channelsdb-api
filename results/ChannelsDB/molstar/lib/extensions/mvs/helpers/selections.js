/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */
import { Column } from '../../../mol-data/db';
import { MolScriptBuilder as MS } from '../../../mol-script/language/builder';
import { arrayExtend, filterInPlace, range } from '../../../mol-util/array';
import { AtomRanges } from './atom-ranges';
import { Sorting } from './indexing';
import { isAnyDefined, isDefined } from './utils';
const EmptyArray = [];
/** Return atom ranges in `model` which satisfy criteria given by `row` */
export function getAtomRangesForRow(model, row, indices) {
    const h = model.atomicHierarchy;
    const nAtoms = h.atoms._rowCount;
    const hasAtomIds = isAnyDefined(row.atom_id, row.atom_index);
    const hasAtomFilter = isAnyDefined(row.label_atom_id, row.auth_atom_id, row.type_symbol);
    const hasResidueFilter = isAnyDefined(row.label_seq_id, row.auth_seq_id, row.pdbx_PDB_ins_code, row.beg_label_seq_id, row.end_label_seq_id, row.beg_auth_seq_id, row.end_auth_seq_id);
    const hasChainFilter = isAnyDefined(row.label_asym_id, row.auth_asym_id, row.label_entity_id);
    if (hasAtomIds) {
        const theAtom = getTheAtomForRow(model, row, indices);
        return theAtom !== undefined ? AtomRanges.single(theAtom, theAtom + 1) : AtomRanges.empty();
    }
    if (!hasChainFilter && !hasResidueFilter && !hasAtomFilter) {
        return AtomRanges.single(0, nAtoms);
    }
    const qualifyingChains = getQualifyingChains(model, row, indices);
    if (!hasResidueFilter && !hasAtomFilter) {
        const chainOffsets = h.chainAtomSegments.offsets;
        const ranges = AtomRanges.empty();
        for (const iChain of qualifyingChains) {
            AtomRanges.add(ranges, chainOffsets[iChain], chainOffsets[iChain + 1]);
        }
        return ranges;
    }
    const qualifyingResidues = getQualifyingResidues(model, row, indices, qualifyingChains);
    if (!hasAtomFilter) {
        const residueOffsets = h.residueAtomSegments.offsets;
        const ranges = AtomRanges.empty();
        for (const iRes of qualifyingResidues) {
            AtomRanges.add(ranges, residueOffsets[iRes], residueOffsets[iRes + 1]);
        }
        return ranges;
    }
    const qualifyingAtoms = getQualifyingAtoms(model, row, indices, qualifyingResidues);
    const ranges = AtomRanges.empty();
    for (const iAtom of qualifyingAtoms) {
        AtomRanges.add(ranges, iAtom, iAtom + 1);
    }
    return ranges;
}
/** Return atom ranges in `model` which satisfy criteria given by any of `rows` (atoms that satisfy more rows are still included only once) */
export function getAtomRangesForRows(model, rows, indices) {
    if (Array.isArray(rows)) {
        return AtomRanges.union(rows.map(row => getAtomRangesForRow(model, row, indices)));
    }
    else {
        return getAtomRangesForRow(model, rows, indices);
    }
}
/** Return an array of chain indexes which satisfy criteria given by `row` */
function getQualifyingChains(model, row, indices) {
    var _a, _b, _c;
    const { auth_asym_id, label_entity_id, _rowCount: nChains } = model.atomicHierarchy.chains;
    let result = undefined;
    if (isDefined(row.label_asym_id)) {
        result = (_a = indices.chainsByLabelAsymId.get(row.label_asym_id)) !== null && _a !== void 0 ? _a : EmptyArray;
    }
    if (isDefined(row.auth_asym_id)) {
        if (result) {
            result = result.filter(i => auth_asym_id.value(i) === row.auth_asym_id);
        }
        else {
            result = (_b = indices.chainsByAuthAsymId.get(row.auth_asym_id)) !== null && _b !== void 0 ? _b : EmptyArray;
        }
    }
    if (isDefined(row.label_entity_id)) {
        if (result) {
            result = result.filter(i => label_entity_id.value(i) === row.label_entity_id);
        }
        else {
            result = (_c = indices.chainsByLabelEntityId.get(row.label_entity_id)) !== null && _c !== void 0 ? _c : EmptyArray;
        }
    }
    result !== null && result !== void 0 ? result : (result = range(nChains));
    return result;
}
/** Return an array of residue indexes which satisfy criteria given by `row` */
function getQualifyingResidues(model, row, indices, fromChains) {
    var _a;
    const { label_seq_id, auth_seq_id, pdbx_PDB_ins_code } = model.atomicHierarchy.residues;
    const { Present } = Column.ValueKind;
    const result = [];
    for (const iChain of fromChains) {
        let residuesHere = undefined;
        if (isDefined(row.label_seq_id)) {
            const sorting = indices.residuesSortedByLabelSeqId.get(iChain);
            residuesHere = Sorting.getKeysWithValue(sorting, row.label_seq_id);
        }
        if (isDefined(row.auth_seq_id)) {
            if (residuesHere) {
                residuesHere = residuesHere.filter(i => auth_seq_id.valueKind(i) === Present && auth_seq_id.value(i) === row.auth_seq_id);
            }
            else {
                const sorting = indices.residuesSortedByAuthSeqId.get(iChain);
                residuesHere = Sorting.getKeysWithValue(sorting, row.auth_seq_id);
            }
        }
        if (isDefined(row.pdbx_PDB_ins_code)) {
            if (residuesHere) {
                residuesHere = residuesHere.filter(i => pdbx_PDB_ins_code.value(i) === row.pdbx_PDB_ins_code);
            }
            else {
                residuesHere = (_a = indices.residuesByInsCode.get(iChain).get(row.pdbx_PDB_ins_code)) !== null && _a !== void 0 ? _a : EmptyArray;
            }
        }
        if (isDefined(row.beg_label_seq_id) || isDefined(row.end_label_seq_id)) {
            if (residuesHere) {
                if (isDefined(row.beg_label_seq_id)) {
                    residuesHere = residuesHere.filter(i => label_seq_id.valueKind(i) === Present && label_seq_id.value(i) >= row.beg_label_seq_id);
                }
                if (isDefined(row.end_label_seq_id)) {
                    residuesHere = residuesHere.filter(i => label_seq_id.valueKind(i) === Present && label_seq_id.value(i) <= row.end_label_seq_id);
                }
            }
            else {
                const sorting = indices.residuesSortedByLabelSeqId.get(iChain);
                residuesHere = Sorting.getKeysWithValueInRange(sorting, row.beg_label_seq_id, row.end_label_seq_id);
            }
        }
        if (isDefined(row.beg_auth_seq_id) || isDefined(row.end_auth_seq_id)) {
            if (residuesHere) {
                if (isDefined(row.beg_auth_seq_id)) {
                    residuesHere = residuesHere.filter(i => auth_seq_id.valueKind(i) === Present && auth_seq_id.value(i) >= row.beg_auth_seq_id);
                }
                if (isDefined(row.end_auth_seq_id)) {
                    residuesHere = residuesHere.filter(i => auth_seq_id.valueKind(i) === Present && auth_seq_id.value(i) <= row.end_auth_seq_id);
                }
            }
            else {
                const sorting = indices.residuesSortedByAuthSeqId.get(iChain);
                residuesHere = Sorting.getKeysWithValueInRange(sorting, row.beg_auth_seq_id, row.end_auth_seq_id);
            }
        }
        if (!residuesHere) {
            const { residueAtomSegments, chainAtomSegments } = model.atomicHierarchy;
            const firstResidueForChain = residueAtomSegments.index[chainAtomSegments.offsets[iChain]];
            const firstResidueAfterChain = residueAtomSegments.index[chainAtomSegments.offsets[iChain + 1] - 1] + 1;
            residuesHere = range(firstResidueForChain, firstResidueAfterChain);
        }
        arrayExtend(result, residuesHere);
    }
    return result;
}
/** Return an array of atom indexes which satisfy criteria given by `row` */
function getQualifyingAtoms(model, row, indices, fromResidues) {
    const { label_atom_id, auth_atom_id, type_symbol } = model.atomicHierarchy.atoms;
    const residueAtomSegments_offsets = model.atomicHierarchy.residueAtomSegments.offsets;
    const result = [];
    for (const iRes of fromResidues) {
        const atomIdcs = range(residueAtomSegments_offsets[iRes], residueAtomSegments_offsets[iRes + 1]);
        if (isDefined(row.label_atom_id)) {
            filterInPlace(atomIdcs, iAtom => label_atom_id.value(iAtom) === row.label_atom_id);
        }
        if (isDefined(row.auth_atom_id)) {
            filterInPlace(atomIdcs, iAtom => auth_atom_id.value(iAtom) === row.auth_atom_id);
        }
        if (isDefined(row.type_symbol)) {
            filterInPlace(atomIdcs, iAtom => { var _a; return type_symbol.value(iAtom) === ((_a = row.type_symbol) === null || _a === void 0 ? void 0 : _a.toUpperCase()); });
        }
        arrayExtend(result, atomIdcs);
    }
    return result;
}
/** Return index of atom in `model` which satistfies criteria given by `row`, if any.
 * Only works when `row.atom_id` and/or `row.atom_index` is defined (otherwise use `getAtomRangesForRow`). */
function getTheAtomForRow(model, row, indices) {
    let iAtom = undefined;
    if (!isDefined(row.atom_id) && !isDefined(row.atom_index))
        throw new Error('ArgumentError: at least one of row.atom_id, row.atom_index must be defined.');
    if (isDefined(row.atom_id) && isDefined(row.atom_index)) {
        const a1 = indices.atomsById.get(row.atom_id);
        const a2 = indices.atomsByIndex.get(row.atom_index);
        if (a1 !== a2)
            return undefined;
        iAtom = a1;
    }
    if (isDefined(row.atom_id)) {
        iAtom = indices.atomsById.get(row.atom_id);
    }
    if (isDefined(row.atom_index)) {
        iAtom = indices.atomsByIndex.get(row.atom_index);
    }
    if (iAtom === undefined)
        return undefined;
    if (!atomQualifies(model, iAtom, row))
        return undefined;
    return iAtom;
}
/** Return true if `iAtom`-th atom in `model` satisfies all selection criteria given by `row`. */
export function atomQualifies(model, iAtom, row) {
    var _a;
    const h = model.atomicHierarchy;
    const iChain = h.chainAtomSegments.index[iAtom];
    const label_asym_id = h.chains.label_asym_id.value(iChain);
    const auth_asym_id = h.chains.auth_asym_id.value(iChain);
    const label_entity_id = h.chains.label_entity_id.value(iChain);
    if (!matches(row.label_asym_id, label_asym_id))
        return false;
    if (!matches(row.auth_asym_id, auth_asym_id))
        return false;
    if (!matches(row.label_entity_id, label_entity_id))
        return false;
    const iRes = h.residueAtomSegments.index[iAtom];
    const label_seq_id = (h.residues.label_seq_id.valueKind(iRes) === Column.ValueKind.Present) ? h.residues.label_seq_id.value(iRes) : undefined;
    const auth_seq_id = (h.residues.auth_seq_id.valueKind(iRes) === Column.ValueKind.Present) ? h.residues.auth_seq_id.value(iRes) : undefined;
    const pdbx_PDB_ins_code = h.residues.pdbx_PDB_ins_code.value(iRes);
    if (!matches(row.label_seq_id, label_seq_id))
        return false;
    if (!matches(row.auth_seq_id, auth_seq_id))
        return false;
    if (!matches(row.pdbx_PDB_ins_code, pdbx_PDB_ins_code))
        return false;
    if (!matchesRange(row.beg_label_seq_id, row.end_label_seq_id, label_seq_id))
        return false;
    if (!matchesRange(row.beg_auth_seq_id, row.end_auth_seq_id, auth_seq_id))
        return false;
    const label_atom_id = h.atoms.label_atom_id.value(iAtom);
    const auth_atom_id = h.atoms.auth_atom_id.value(iAtom);
    const type_symbol = h.atoms.type_symbol.value(iAtom);
    const atom_id = model.atomicConformation.atomId.value(iAtom);
    const atom_index = h.atomSourceIndex.value(iAtom);
    if (!matches(row.label_atom_id, label_atom_id))
        return false;
    if (!matches(row.auth_atom_id, auth_atom_id))
        return false;
    if (!matches((_a = row.type_symbol) === null || _a === void 0 ? void 0 : _a.toUpperCase(), type_symbol))
        return false;
    if (!matches(row.atom_id, atom_id))
        return false;
    if (!matches(row.atom_index, atom_index))
        return false;
    return true;
}
/** Return true if `value` equals `requiredValue` or if `requiredValue` if not defined.  */
function matches(requiredValue, value) {
    return !isDefined(requiredValue) || value === requiredValue;
}
/** Return true if `requiredMin <= value <= requiredMax`.
 * Undefined `requiredMin` behaves like negative infinity.
 * Undefined `requiredMax` behaves like positive infinity. */
function matchesRange(requiredMin, requiredMax, value) {
    if (isDefined(requiredMin) && (!isDefined(value) || value < requiredMin))
        return false;
    if (isDefined(requiredMax) && (!isDefined(value) || value > requiredMax))
        return false;
    return true;
}
/** Convert an annotation row into a MolScript expression */
export function rowToExpression(row) {
    const { and } = MS.core.logic;
    const { eq, gre: gte, lte } = MS.core.rel;
    const { macromolecular } = MS.struct.atomProperty;
    const propTests = {};
    if (isDefined(row.label_entity_id)) {
        propTests['entity-test'] = eq([macromolecular.label_entity_id(), row.label_entity_id]);
    }
    const chainTests = [];
    if (isDefined(row.label_asym_id))
        chainTests.push(eq([macromolecular.label_asym_id(), row.label_asym_id]));
    if (isDefined(row.auth_asym_id))
        chainTests.push(eq([macromolecular.auth_asym_id(), row.auth_asym_id]));
    if (chainTests.length === 1) {
        propTests['chain-test'] = chainTests[0];
    }
    else if (chainTests.length > 1) {
        propTests['chain-test'] = and(chainTests);
    }
    const residueTests = [];
    if (isDefined(row.label_seq_id))
        residueTests.push(eq([macromolecular.label_seq_id(), row.label_seq_id]));
    if (isDefined(row.auth_seq_id))
        residueTests.push(eq([macromolecular.auth_seq_id(), row.auth_seq_id]));
    if (isDefined(row.pdbx_PDB_ins_code))
        residueTests.push(eq([macromolecular.pdbx_PDB_ins_code(), row.pdbx_PDB_ins_code]));
    if (isDefined(row.beg_label_seq_id))
        residueTests.push(gte([macromolecular.label_seq_id(), row.beg_label_seq_id]));
    if (isDefined(row.end_label_seq_id))
        residueTests.push(lte([macromolecular.label_seq_id(), row.end_label_seq_id]));
    if (isDefined(row.beg_auth_seq_id))
        residueTests.push(gte([macromolecular.auth_seq_id(), row.beg_auth_seq_id]));
    if (isDefined(row.end_auth_seq_id))
        residueTests.push(lte([macromolecular.auth_seq_id(), row.end_auth_seq_id]));
    if (residueTests.length === 1) {
        propTests['residue-test'] = residueTests[0];
    }
    else if (residueTests.length > 1) {
        propTests['residue-test'] = and(residueTests);
    }
    const atomTests = [];
    if (isDefined(row.atom_id))
        atomTests.push(eq([macromolecular.id(), row.atom_id]));
    if (isDefined(row.atom_index))
        atomTests.push(eq([MS.struct.atomProperty.core.sourceIndex(), row.atom_index]));
    if (isDefined(row.label_atom_id))
        atomTests.push(eq([macromolecular.label_atom_id(), row.label_atom_id]));
    if (isDefined(row.auth_atom_id))
        atomTests.push(eq([macromolecular.auth_atom_id(), row.auth_atom_id]));
    if (isDefined(row.type_symbol))
        atomTests.push(eq([MS.struct.atomProperty.core.elementSymbol(), row.type_symbol.toUpperCase()]));
    if (atomTests.length === 1) {
        propTests['atom-test'] = atomTests[0];
    }
    else if (atomTests.length > 1) {
        propTests['atom-test'] = and(atomTests);
    }
    return MS.struct.generator.atomGroups(propTests);
}
/** Convert multiple annotation rows into a MolScript expression.
 * (with union semantics, i.e. an atom qualifies if it qualifies for at least one of the rows) */
export function rowsToExpression(rows) {
    return unionExpression(rows.map(rowToExpression));
}
/** Create MolScript expression covering the set union of the given expressions */
function unionExpression(expressions) {
    return MS.struct.combinator.merge(expressions.map(e => MS.struct.modifier.union([e])));
}
/** Return row indices grouped by `row.group_id`. Rows with `row.group_id===undefined` are treated as separate groups. */
export function groupRows(rows) {
    let counter = 0;
    const groupMap = new Map();
    const groups = [];
    for (let i = 0; i < rows.length; i++) {
        const group_id = rows[i].group_id;
        if (group_id === undefined) {
            groups.push(counter++);
        }
        else {
            const groupIndex = groupMap.get(group_id);
            if (groupIndex === undefined) {
                groupMap.set(group_id, counter);
                groups.push(counter);
                counter++;
            }
            else {
                groups.push(groupIndex);
            }
        }
    }
    const rowIndices = range(rows.length).sort((i, j) => groups[i] - groups[j]);
    const offsets = [];
    for (let i = 0; i < rows.length; i++) {
        if (i === 0 || groups[rowIndices[i]] !== groups[rowIndices[i - 1]])
            offsets.push(i);
    }
    offsets.push(rowIndices.length);
    return { count: offsets.length - 1, offsets, grouped: rowIndices };
}