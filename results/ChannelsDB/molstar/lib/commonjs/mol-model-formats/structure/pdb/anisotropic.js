"use strict";
/**
 * Copyright (c) 2019 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.addAnisotropic = exports.getAnisotropic = exports.getAnisotropicTemplate = void 0;
const cif_1 = require("../../../mol-io/reader/cif");
const tokenizer_1 = require("../../../mol-io/reader/common/text/tokenizer");
const util_1 = require("../util");
const number_parser_1 = require("../../../mol-io/reader/common/text/number-parser");
function getAnisotropicTemplate(data, count) {
    const str = () => [];
    const float = () => new Float32Array(count);
    const ts = () => tokenizer_1.TokenBuilder.create(data, 2 * count);
    return {
        index: 0,
        count,
        id: str(),
        type_symbol: ts(),
        pdbx_label_atom_id: ts(),
        pdbx_label_alt_id: ts(),
        pdbx_label_comp_id: ts(),
        pdbx_label_asym_id: ts(),
        pdbx_label_seq_id: ts(),
        pdbx_PDB_ins_code: ts(),
        'U[1][1]': float(),
        'U[2][2]': float(),
        'U[3][3]': float(),
        'U[1][2]': float(),
        'U[1][3]': float(),
        'U[2][3]': float(),
        pdbx_auth_seq_id: ts(),
        pdbx_auth_comp_id: ts(),
        pdbx_auth_asym_id: ts(),
        pdbx_auth_atom_id: ts(),
    };
}
exports.getAnisotropicTemplate = getAnisotropicTemplate;
function getAnisotropic(sites) {
    const pdbx_auth_seq_id = cif_1.CifField.ofTokens(sites.pdbx_auth_seq_id);
    const pdbx_auth_comp_id = cif_1.CifField.ofTokens(sites.pdbx_auth_comp_id);
    const pdbx_auth_asym_id = cif_1.CifField.ofTokens(sites.pdbx_auth_asym_id);
    const pdbx_auth_atom_id = cif_1.CifField.ofTokens(sites.pdbx_auth_atom_id);
    const fields = {
        id: cif_1.CifField.ofStrings(sites.id),
        type_symbol: cif_1.CifField.ofTokens(sites.type_symbol),
        pdbx_label_atom_id: pdbx_auth_atom_id,
        pdbx_label_alt_id: cif_1.CifField.ofTokens(sites.pdbx_label_alt_id),
        pdbx_label_comp_id: pdbx_auth_comp_id,
        pdbx_label_asym_id: pdbx_auth_asym_id,
        pdbx_label_seq_id: pdbx_auth_seq_id,
        pdbx_PDB_ins_code: cif_1.CifField.ofTokens(sites.pdbx_PDB_ins_code),
        pdbx_auth_seq_id,
        pdbx_auth_comp_id,
        pdbx_auth_asym_id,
        pdbx_auth_atom_id,
    };
    fields['U[1][1]'] = cif_1.CifField.ofNumbers(sites['U[1][1]']);
    fields['U[2][2]'] = cif_1.CifField.ofNumbers(sites['U[2][2]']);
    fields['U[3][3]'] = cif_1.CifField.ofNumbers(sites['U[3][3]']);
    fields['U[1][2]'] = cif_1.CifField.ofNumbers(sites['U[1][2]']);
    fields['U[1][3]'] = cif_1.CifField.ofNumbers(sites['U[1][3]']);
    fields['U[2][3]'] = cif_1.CifField.ofNumbers(sites['U[2][3]']);
    return fields;
}
exports.getAnisotropic = getAnisotropic;
function addAnisotropic(sites, model, data, s, e) {
    const { data: str } = data;
    const length = e - s;
    // COLUMNS       DATA  TYPE    FIELD          DEFINITION
    // -----------------------------------------------------------------
    // 1 - 6        Record name   "ANISOU"
    // 7 - 11       Integer       serial         Atom serial number.
    tokenizer_1.Tokenizer.trim(data, s + 6, s + 11);
    sites.id[sites.index] = str.substring(data.tokenStart, data.tokenEnd);
    // 13 - 16       Atom          name           Atom name.
    tokenizer_1.TokenBuilder.addToken(sites.pdbx_auth_atom_id, tokenizer_1.Tokenizer.trim(data, s + 12, s + 16));
    // 17            Character     altLoc         Alternate location indicator
    if (str.charCodeAt(s + 16) === 32) { // ' '
        tokenizer_1.TokenBuilder.add(sites.pdbx_label_alt_id, 0, 0);
    }
    else {
        tokenizer_1.TokenBuilder.add(sites.pdbx_label_alt_id, s + 16, s + 17);
    }
    // 18 - 20       Residue name  resName        Residue name.
    tokenizer_1.TokenBuilder.addToken(sites.pdbx_auth_comp_id, tokenizer_1.Tokenizer.trim(data, s + 17, s + 20));
    // 22            Character     chainID        Chain identifier.
    tokenizer_1.TokenBuilder.add(sites.pdbx_auth_asym_id, s + 21, s + 22);
    // 23 - 26       Integer       resSeq         Residue sequence number.
    tokenizer_1.TokenBuilder.addToken(sites.pdbx_auth_seq_id, tokenizer_1.Tokenizer.trim(data, s + 22, s + 26));
    // 27            AChar         iCode          Insertion code.
    if (str.charCodeAt(s + 26) === 32) { // ' '
        tokenizer_1.TokenBuilder.add(sites.pdbx_PDB_ins_code, 0, 0);
    }
    else {
        tokenizer_1.TokenBuilder.add(sites.pdbx_PDB_ins_code, s + 26, s + 27);
    }
    // 29 - 35       Integer       u[0][0]        U(1,1)
    sites['U[1][1]'][sites.index] = (0, number_parser_1.parseIntSkipLeadingWhitespace)(str, s + 28, s + 35) / 10000;
    // 36 - 42       Integer       u[1][1]        U(2,2)
    sites['U[2][2]'][sites.index] = (0, number_parser_1.parseIntSkipLeadingWhitespace)(str, s + 35, s + 42) / 10000;
    // 43 - 49       Integer       u[2][2]        U(3,3)
    sites['U[3][3]'][sites.index] = (0, number_parser_1.parseIntSkipLeadingWhitespace)(str, s + 42, s + 49) / 10000;
    // 50 - 56       Integer       u[0][1]        U(1,2)
    sites['U[1][2]'][sites.index] = (0, number_parser_1.parseIntSkipLeadingWhitespace)(str, s + 49, s + 56) / 10000;
    // 57 - 63       Integer       u[0][2]        U(1,3)
    sites['U[1][3]'][sites.index] = (0, number_parser_1.parseIntSkipLeadingWhitespace)(str, s + 56, s + 63) / 10000;
    // 64 - 70       Integer       u[1][2]        U(2,3)
    sites['U[2][3]'][sites.index] = (0, number_parser_1.parseIntSkipLeadingWhitespace)(str, s + 63, s + 70) / 10000;
    // 77 - 78       LString(2)    element        Element symbol, right-justified.
    if (length >= 78) {
        tokenizer_1.Tokenizer.trim(data, s + 76, s + 78);
        if (data.tokenStart < data.tokenEnd) {
            tokenizer_1.TokenBuilder.addToken(sites.type_symbol, data);
        }
        else {
            (0, util_1.guessElementSymbolTokens)(sites.type_symbol, str, s + 12, s + 16);
        }
    }
    else {
        (0, util_1.guessElementSymbolTokens)(sites.type_symbol, str, s + 12, s + 16);
    }
    // 79 - 80       LString(2)    charge         Charge on the atom.
    // TODO
    sites.index++;
}
exports.addAnisotropic = addAnisotropic;