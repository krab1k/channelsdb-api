"use strict";
/**
 * Copyright (c) 2017-2022 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author David Sehnal <david.sehnal@gmail.com>
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNormalizedAtomSite = exports.getModelGroupName = void 0;
const db_1 = require("../../../mol-data/db");
function getModelGroupName(model_id, data) {
    const { ihm_model_group, ihm_model_group_link } = data;
    const link = db_1.Table.pickRow(ihm_model_group_link, i => ihm_model_group_link.model_id.value(i) === model_id);
    if (link) {
        const group = db_1.Table.pickRow(ihm_model_group, i => ihm_model_group.id.value(i) === link.group_id);
        if (group)
            return group.name;
    }
    return '';
}
exports.getModelGroupName = getModelGroupName;
//
function hasPresentValues(column) {
    for (let i = 0, il = column.rowCount; i < il; i++) {
        if (column.valueKind(i) === 0 /* Column.ValueKinds.Present */)
            return true;
    }
    return false;
}
function substUndefinedColumn(table, a, b) {
    if (!table[a].isDefined || !hasPresentValues(table[a]))
        table[a] = table[b];
    if (!table[b].isDefined || !hasPresentValues(table[b]))
        table[b] = table[a];
}
/** Fix possibly missing auth_/label_ columns */
function getNormalizedAtomSite(atom_site) {
    const normalized = db_1.Table.ofColumns(atom_site._schema, atom_site);
    substUndefinedColumn(normalized, 'label_atom_id', 'auth_atom_id');
    substUndefinedColumn(normalized, 'label_comp_id', 'auth_comp_id');
    substUndefinedColumn(normalized, 'label_seq_id', 'auth_seq_id');
    substUndefinedColumn(normalized, 'label_asym_id', 'auth_asym_id');
    return normalized;
}
exports.getNormalizedAtomSite = getNormalizedAtomSite;