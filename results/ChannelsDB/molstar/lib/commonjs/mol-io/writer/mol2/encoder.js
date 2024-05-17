"use strict";
/**
 * Copyright (c) 2020-2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Sebastian Bittrich <sebastian.bittrich@rcsb.org>
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mol2Encoder = void 0;
const ligand_encoder_1 = require("../ligand-encoder");
const mol_util_1 = require("../../../mol-util");
const util_1 = require("../cif/encoder/util");
const types_1 = require("../../../mol-model/structure/model/types");
// type MOL_TYPE = 'SMALL' | 'BIOPOLYMER' | 'PROTEIN' | 'NUCLEIC_ACID' | 'SACCHARIDE';
// type CHARGE_TYPE = 'NO_CHARGES' | 'DEL_RE' | 'GASTEIGER' | 'GAST_HUCK' | 'HUCKEL' | 'PULLMAN' | 'GAUSS80_CHARGES' | 'AMPAC_CHARGES' | 'MULLIKEN_CHARGES' | 'DICT_ CHARGES' | 'MMFF94_CHARGES' | 'USER_CHARGES';
const NON_METAL_ATOMS = 'H D B C N O F Si P S Cl As Se Br Te I At He Ne Ar Kr Xe Rn'.split(' ');
// specification: http://chemyang.ccnu.edu.cn/ccb/server/AIMMS/mol2.pdf
class Mol2Encoder extends ligand_encoder_1.LigandEncoder {
    _writeCategory(category, context) {
        const a = mol_util_1.StringBuilder.create();
        const b = mol_util_1.StringBuilder.create();
        const { instance, source } = (0, util_1.getCategoryInstanceData)(category, context);
        // write header
        const name = this.getName(instance, source);
        mol_util_1.StringBuilder.writeSafe(this.builder, `# Name: ${name}\n# Created by ${this.encoder}\n\n`);
        const atomMap = this.componentAtomData.entries.get(name);
        const bondMap = this.componentBondData.entries.get(name);
        // happens for the unknown ligands (UNL)
        if (!atomMap)
            throw Error(`The Chemical Component Dictionary doesn't hold any atom data for ${name}`);
        let atomCount = 0;
        let bondCount = 0;
        const atoms = this.getAtoms(instance, source, atomMap.map);
        mol_util_1.StringBuilder.writeSafe(a, '@<TRIPOS>ATOM\n');
        mol_util_1.StringBuilder.writeSafe(b, '@<TRIPOS>BOND\n');
        atoms.forEach((atom1, label_atom_id1) => {
            const { index: i1, type_symbol: type_symbol1 } = atom1;
            const atomMapData1 = atomMap.map.get(label_atom_id1);
            if (!atomMapData1) {
                if (this.isHydrogen(type_symbol1)) {
                    return;
                }
                else {
                    throw Error(`Unknown atom ${label_atom_id1} for component ${name}`);
                }
            }
            if (bondMap === null || bondMap === void 0 ? void 0 : bondMap.map) {
                bondMap.map.get(label_atom_id1).forEach((bond, label_atom_id2) => {
                    const atom2 = atoms.get(label_atom_id2);
                    if (!atom2)
                        return;
                    const { index: i2 } = atom2;
                    if (i1 < i2) {
                        const { order, flags } = bond;
                        const ar = types_1.BondType.is(16 /* BondType.Flag.Aromatic */, flags);
                        mol_util_1.StringBuilder.writeSafe(b, `${++bondCount} ${i1 + 1} ${i2 + 1} ${ar ? 'ar' : order}`);
                        mol_util_1.StringBuilder.newline(b);
                    }
                });
            }
            const sybyl = (bondMap === null || bondMap === void 0 ? void 0 : bondMap.map) ? this.mapToSybyl(label_atom_id1, type_symbol1, bondMap) : type_symbol1;
            mol_util_1.StringBuilder.writeSafe(a, `${i1 + 1} ${label_atom_id1} ${atom1.Cartn_x.toFixed(3)} ${atom1.Cartn_y.toFixed(3)} ${atom1.Cartn_z.toFixed(3)} ${sybyl} 1 ${name} 0.000\n`);
            atomCount++;
        });
        // could write something like 'SMALL\nNO_CHARGES', for now let's write **** indicating non-optional, yet missing, string values
        mol_util_1.StringBuilder.writeSafe(this.out, `@<TRIPOS>MOLECULE\n${name}\n${atomCount} ${bondCount} 1\n****\n****\n\n`);
        mol_util_1.StringBuilder.writeSafe(this.out, mol_util_1.StringBuilder.getString(a));
        mol_util_1.StringBuilder.writeSafe(this.out, mol_util_1.StringBuilder.getString(b));
        mol_util_1.StringBuilder.writeSafe(this.out, `@<TRIPOS>SUBSTRUCTURE\n1 ${name} 1\n`);
    }
    count(map, ctx, predicate) {
        let count = 0;
        const iter = map.entries();
        let result = iter.next();
        while (!result.done) {
            if (predicate(result.value[0], result.value[1], ctx)) {
                count++;
            }
            result = iter.next();
        }
        return count;
    }
    orderSum(map) {
        let sum = 0;
        const iter = map.values();
        let result = iter.next();
        while (!result.done) {
            sum += result.value.order;
            result = iter.next();
        }
        return sum;
    }
    isNonMetalBond(label_atom_id) {
        for (const a of NON_METAL_ATOMS) {
            if (label_atom_id.startsWith(a))
                return true;
        }
        return false;
    }
    extractNonmets(map) {
        const ret = new Map();
        const iter = map.entries();
        let result = iter.next();
        while (!result.done) {
            const [k, v] = result.value;
            if (this.isNonMetalBond(k)) {
                ret.set(k, v);
            }
            result = iter.next();
        }
        return ret;
    }
    // see https://www.sdsc.edu/CCMS/Packages/cambridge/pluto/atom_types.html
    // cannot account for covalently bound amino acids etc
    mapToSybyl(label_atom_id1, type_symbol1, bondMap) {
        // TODO if altLoc: 'Du' // 1.1
        // TODO if end of polymeric bond: 'Du' // 1.2
        if (type_symbol1 === 'D')
            return 'H'; // 1.3
        if (type_symbol1 === 'P')
            return 'P.3'; // 1.4, 4mpo/ligand?encoding=mol2&auth_seq_id=203 (PO4)
        if (type_symbol1 === 'Co' || type_symbol1 === 'Ru')
            return type_symbol1 + '.oh'; // 1.5
        const bonds = bondMap.map.get(label_atom_id1);
        const numBonds = bonds.size;
        if (type_symbol1 === 'Ti' || type_symbol1 === 'Cr') { // 1.10
            return type_symbol1 + (numBonds <= 4 ? '.th' : '.oh'); // 1.10.1 & 1.10.2
        }
        if (type_symbol1 === 'C') { // 1.6
            if (numBonds >= 4 && this.count(bonds, this, (_k, v) => v.order === 1) >= 4)
                return 'C.3'; // 1.6.1, 3rga/ligand?encoding=mol2&auth_seq_id=307 (MOH)
            if (numBonds === 3 && this.isCat(bonds, bondMap))
                return 'C.cat'; // 1.6.2, 1acj/ligand?encoding=mol2&auth_seq_id=44 (ARG), 5vjb/ligand?encoding=mol2&auth_seq_id=101 (GAI)
            if (numBonds >= 2 && this.count(bonds, this, (_k, v) => types_1.BondType.is(16 /* BondType.Flag.Aromatic */, v.flags)) >= 2)
                return 'C.ar'; // 1.6.3, 1acj/ligand?encoding=mol2&auth_seq_id=30 (PHE), 1acj/ligand?encoding=mol2&auth_seq_id=63 (TYR), 1acj/ligand?encoding=mol2&auth_seq_id=84 (TRP), 1acj/ligand?encoding=mol2&auth_seq_id=999 (THA)
            if ((numBonds === 1 || numBonds === 2) && this.count(bonds, this, (_k, v) => v.order === 3))
                return 'C.1'; // 1.6.4, 3i04/ligand?encoding=mol2&auth_asym_id=C&auth_seq_id=900 (CYN)
            return 'C.2'; // 1.6.5
        }
        // most of the time, bonds will equal non-metal bonds
        const nonmets = this.count(bonds, this, (k, _v, ctx) => ctx.isNonMetalBond(k)) === bonds.size ? bonds : this.extractNonmets(bonds);
        const numNonmets = nonmets.size;
        if (type_symbol1 === 'O') { // 1.7
            if (numNonmets === 1) { // 1.7.1
                if (this.isOC(nonmets, bondMap))
                    return 'O.co2'; // 1.7.1.1, 4h2v/ligand?encoding=mol2&auth_seq_id=403 (ACT)
                if (this.isOP(nonmets, bondMap))
                    return 'O.co2'; // 1.7.1.2, 4mpo/ligand?encoding=mol2&auth_seq_id=203 (PO4)
            }
            if (numNonmets >= 2 && this.count(bonds, this, (_k, v) => v.order === 1) === bonds.size)
                return 'O.3'; // 1.7.2, 1acj/ligand?encoding=mol2&auth_seq_id=601 (HOH), 3rga/ligand?encoding=mol2&auth_seq_id=307 (MOH)
            return 'O.2'; // 1.7.3, 1acj/ligand?encoding=mol2&auth_seq_id=4 (SER)
        }
        if (type_symbol1 === 'N') { // 1.8
            if (numNonmets === 4 && this.count(nonmets, this, (_k, v) => v.order === 1) === 4)
                return 'N.4'; // 1.8.1, 4ikf/ligand?encoding=mol2&auth_seq_id=403 (NH4)
            if (numBonds >= 2 && this.count(bonds, this, (_k, v) => types_1.BondType.is(16 /* BondType.Flag.Aromatic */, v.flags)) >= 2)
                return 'N.ar'; // 1.8.2, 1acj/ligand?encoding=mol2&auth_seq_id=84 (TRP), 1acj/ligand?encoding=mol2&auth_seq_id=999 (THA)
            if (numNonmets === 1 && this.count(nonmets, this, (_k, v) => v.order === 3))
                return 'N.1'; // 1.8.3, 3i04/ligand?encoding=mol2&auth_asym_id=C&auth_seq_id=900 (CYN)
            if (numNonmets === 2 && this.orderSum(nonmets) === 4)
                return 'N.1'; // 1.8.4, 3sbr/ligand?encoding=mol2&auth_seq_id=640&auth_asym_id=D (N2O)
            if (numNonmets === 3 && this.hasCOCS(nonmets, bondMap))
                return 'N.am'; // 1.8.5, 3zfz/ligand?encoding=mol2&auth_seq_id=1669 (1W8)
            if (numNonmets === 3) { // 1.8.6
                if (this.count(nonmets, this, (_k, v) => v.order > 1) === 1)
                    return 'N.pl3'; // 1.8.6.1, 4hon/ligand?encoding=mol2&auth_seq_id=407 (NO3)
                if (this.count(nonmets, this, (_k, v) => v.order === 1) === 3) {
                    if (this.isNpl3(nonmets, bondMap))
                        return 'N.pl3'; // 1.8.6.1.1 & 1.8.6.1.2, 1acj/ligand?encoding=mol2&auth_seq_id=44 (ARG), 5vjb/ligand?encoding=mol2&auth_seq_id=101 (GAI)
                }
                return 'N.3';
            }
            return 'N.2'; // 1.8.7, 1acj/ligand?encoding=mol2&auth_seq_id=4 (SER)
        }
        if (type_symbol1 === 'S') { // 1.9
            if (numNonmets === 3 && this.countOfOxygenWithSingleNonmet(nonmets, bondMap) === 1)
                return 'S.o'; // 1.9.1, 4i03/ligand?encoding=mol2&auth_seq_id=312 (DMS)
            if (numNonmets === 4 && this.countOfOxygenWithSingleNonmet(nonmets, bondMap) === 2)
                return 'S.o2'; // 1.9.2, 1udt/ligand?encoding=mol2&auth_seq_id=1000 (VIA)
            if (numNonmets >= 2 && this.count(bonds, this, (_k, v) => v.order === 1) >= 2)
                return 'S.3'; // 1.9.3, 3zfz/ligand?encoding=mol2&auth_seq_id=1669 (1W8), 4gpc/ligand?encoding=mol2&auth_seq_id=902 (SO4)
            return 'S.2'; // 1.9.4
        }
        return type_symbol1; // 1.11
    }
    // 1.8.6.2.1: If one single bond is to an atom that forms a bond of type double, triple, aromatic or
    // delocalised .AND. one other single bond is to H then atom_type is N.pl3
    // 1.8.6.2.2: If one single bond is to an atom that forms a bond of type double, triple, aromatic or
    // delocalised .AND. neither of the other single bonds are to H .AND. sum_of_angles around N .ge. 350 deg then atom_type is N.pl3
    // TODO cannot check accurately for delocalized bonds
    isNpl3(nonmets, bondMap) {
        const iter = nonmets.keys();
        let result = iter.next();
        while (!result.done) {
            const label_atom_id = result.value;
            const adjacentBonds = bondMap.map.get(label_atom_id);
            if (this.count(adjacentBonds, this, (_k, v) => v.order > 1 || types_1.BondType.is(16 /* BondType.Flag.Aromatic */, v.flags))) {
                // TODO check accurately for 2nd criterion with coordinates
                return true;
            }
            result = iter.next();
        }
        return false;
    }
    // If bond is to carbon .AND. carbon forms a total of 3 bonds, 2 of which are to an oxygen
    // forming only 1 non-metal bond then atom_type is O.co2
    isOC(nonmets, bondMap) {
        const nonmet = nonmets.entries().next().value;
        if (!nonmet[0].startsWith('C'))
            return false;
        const carbonBonds = bondMap.map.get(nonmet[0]);
        if (carbonBonds.size !== 3)
            return false;
        let count = 0;
        const iter = carbonBonds.keys();
        let result = iter.next();
        while (!result.done) {
            const label_atom_id = result.value;
            if (label_atom_id.startsWith('O')) {
                const adjacentBonds = bondMap.map.get(label_atom_id);
                if (this.count(adjacentBonds, this, (k, _v, ctx) => ctx.isNonMetalBond(k)) === 1)
                    count++;
            }
            result = iter.next();
        }
        return count === 2;
    }
    // If bond is to phosphorus .AND. phosphorus forms at least 2 bonds to an oxygen forming
    // only 1 non-metal bond then atom_type is O.co2
    isOP(nonmets, bondMap) {
        const nonmet = nonmets.entries().next().value;
        if (!nonmet[0].startsWith('P'))
            return false;
        const phosphorusBonds = bondMap.map.get(nonmet[0]);
        if (phosphorusBonds.size < 2)
            return false;
        let count = 0;
        const iter = phosphorusBonds.keys();
        let result = iter.next();
        while (!result.done) {
            const label_atom_id = result.value;
            if (label_atom_id.startsWith('O')) {
                const adjacentBonds = bondMap.map.get(label_atom_id);
                if (this.count(adjacentBonds, this, (k, _v, ctx) => ctx.isNonMetalBond(k)) === 1)
                    count++;
            }
            result = iter.next();
        }
        return count >= 2;
    }
    // If num_bond .eq. 3 .AND. all bonds are acyclic .AND. all bonds are to nitrogen .AND. each
    // nitrogen forms bonds to 2 other atoms both of which are not oxygen then atom_type is C.cat.
    isCat(currentBondMap, bondMap) {
        const iter1 = currentBondMap.keys();
        let result1 = iter1.next();
        while (!result1.done) {
            const label_atom_id = result1.value;
            if (!label_atom_id.startsWith('N'))
                return false;
            const adjacentBonds = bondMap.map.get(label_atom_id);
            if (adjacentBonds.size < 2)
                return false;
            const iter2 = adjacentBonds.keys();
            let result2 = iter2.next();
            while (!result2.done) {
                if (result2.value.startsWith('O'))
                    return false;
                result2 = iter2.next();
            }
            result1 = iter1.next();
        }
        // TODO ensure no cycles
        return true;
    }
    countOfOxygenWithSingleNonmet(nonmets, bondMap) {
        let count = 0;
        const iter = nonmets.keys();
        let result = iter.next();
        while (!result.done) {
            const label_atom_id = result.value;
            if (label_atom_id.startsWith('O')) {
                const adjacentBonds = bondMap.map.get(label_atom_id);
                if (this.count(adjacentBonds, this, (k, _v, ctx) => ctx.isNonMetalBond(k)))
                    count++;
            }
            result = iter.next();
        }
        return count;
    }
    // If num_nonmet .eq. 3 .AND. one bond is to C=O or C=S then atom_type is N.am
    hasCOCS(nonmets, bondMap) {
        const iter = nonmets.keys();
        let result = iter.next();
        while (!result.done) {
            const label_atom_id = result.value;
            if (label_atom_id.startsWith('C')) {
                const adjacentBonds = bondMap.map.get(label_atom_id);
                if (this.count(adjacentBonds, this, (k, v) => k.startsWith('O') || k.startsWith('S') && v.order === 2))
                    return true;
            }
            result = iter.next();
        }
        return false;
    }
    writeFullCategory(sb, category, context) {
        const { instance, source } = (0, util_1.getCategoryInstanceData)(category, context);
        const fields = instance.fields;
        const src = source[0];
        if (!src)
            return;
        const data = src.data;
        const it = src.keys();
        const key = it.move();
        for (let _f = 0; _f < fields.length; _f++) {
            const f = fields[_f];
            mol_util_1.StringBuilder.writeSafe(sb, `# ${category.name}.${f.name}: `);
            const val = f.value(key, data, 0);
            mol_util_1.StringBuilder.writeSafe(sb, val);
            mol_util_1.StringBuilder.newline(sb);
        }
        mol_util_1.StringBuilder.newline(sb);
    }
    encode() {
        // write meta-information, do so after ctab
        if (this.error || this.metaInformation) {
            mol_util_1.StringBuilder.writeSafe(this.builder, mol_util_1.StringBuilder.getString(this.meta));
        }
        mol_util_1.StringBuilder.writeSafe(this.builder, mol_util_1.StringBuilder.getString(this.out));
        this.encoded = true;
    }
    constructor(encoder, metaInformation, hydrogens) {
        super(encoder, metaInformation, hydrogens);
        this.out = mol_util_1.StringBuilder.create();
    }
}
exports.Mol2Encoder = Mol2Encoder;