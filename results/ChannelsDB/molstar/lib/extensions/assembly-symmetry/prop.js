/**
 * Copyright (c) 2018-2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */
import { ParamDefinition as PD } from '../../mol-util/param-definition';
import { Model, StructureSelection, QueryContext } from '../../mol-model/structure';
import { Column } from '../../mol-data/db';
import { GraphQLClient } from '../../mol-util/graphql-client';
import { CustomStructureProperty } from '../../mol-model-props/common/custom-structure-property';
import { MmcifFormat } from '../../mol-model-formats/structure/mmcif';
import { SetUtils } from '../../mol-util/set';
import { MolScriptBuilder as MS } from '../../mol-script/language/builder';
import { compile } from '../../mol-script/runtime/query/compiler';
import { CustomPropertyDescriptor } from '../../mol-model/custom-property';
import { Asset } from '../../mol-util/assets';
const rcsb_symmetry_gql = /* GraphQL */ `
query AssemblySymmetry($assembly_id: String!, $entry_id: String!) {
    assembly(assembly_id: $assembly_id, entry_id: $entry_id) {
        rcsb_struct_symmetry {
            clusters {
                avg_rmsd
                members {
                    asym_id
                    pdbx_struct_oper_list_ids
                }
            }
            kind
            oligomeric_state
            rotation_axes {
                order
                start
                end
            }
            stoichiometry
            symbol
            type
        }
    }
}
`;
const BiologicalAssemblyNames = new Set([
    'author_and_software_defined_assembly',
    'author_defined_assembly',
    'complete icosahedral assembly',
    'complete point assembly',
    'representative helical assembly',
    'software_defined_assembly'
]);
export function isBiologicalAssembly(structure) {
    var _a;
    if (!MmcifFormat.is(structure.models[0].sourceData))
        return false;
    const mmcif = structure.models[0].sourceData.data.db;
    if (!mmcif.pdbx_struct_assembly.details.isDefined)
        return false;
    const id = ((_a = structure.units[0].conformation.operator.assembly) === null || _a === void 0 ? void 0 : _a.id) || '';
    if (id === '')
        return true;
    const indices = Column.indicesOf(mmcif.pdbx_struct_assembly.id, e => e === id);
    if (indices.length !== 1)
        return false;
    const details = mmcif.pdbx_struct_assembly.details.value(indices[0]);
    return BiologicalAssemblyNames.has(details);
}
export var AssemblySymmetryData;
(function (AssemblySymmetryData) {
    let Tag;
    (function (Tag) {
        Tag["Cluster"] = "assembly-symmetry-cluster";
        Tag["Representation"] = "assembly-symmetry-3d";
    })(Tag = AssemblySymmetryData.Tag || (AssemblySymmetryData.Tag = {}));
    AssemblySymmetryData.DefaultServerUrl = 'https://data.rcsb.org/graphql'; // Alternative: 'https://www.ebi.ac.uk/pdbe/aggregated-api/pdb/symmetry' (if serverType is 'pdbe')
    function isApplicable(structure) {
        return (!!structure && structure.models.length === 1 &&
            Model.hasPdbId(structure.models[0]) &&
            isBiologicalAssembly(structure));
    }
    AssemblySymmetryData.isApplicable = isApplicable;
    async function fetch(ctx, structure, props) {
        if (!isApplicable(structure))
            return { value: [] };
        if (props.serverType === 'pdbe')
            return fetchPDBe(ctx, structure, props);
        else
            return fetchRCSB(ctx, structure, props);
    }
    AssemblySymmetryData.fetch = fetch;
    async function fetchRCSB(ctx, structure, props) {
        var _a, _b;
        const client = new GraphQLClient(props.serverUrl, ctx.assetManager);
        const variables = {
            assembly_id: ((_a = structure.units[0].conformation.operator.assembly) === null || _a === void 0 ? void 0 : _a.id) || '',
            entry_id: structure.units[0].model.entryId
        };
        const result = await client.request(ctx.runtime, rcsb_symmetry_gql, variables);
        let value = [];
        if (!((_b = result.data.assembly) === null || _b === void 0 ? void 0 : _b.rcsb_struct_symmetry)) {
            console.error('expected `rcsb_struct_symmetry` field');
        }
        else {
            value = result.data.assembly.rcsb_struct_symmetry;
        }
        return { value, assets: [result] };
    }
    AssemblySymmetryData.fetchRCSB = fetchRCSB;
    async function fetchPDBe(ctx, structure, props) {
        var _a, _b;
        const assembly_id = ((_a = structure.units[0].conformation.operator.assembly) === null || _a === void 0 ? void 0 : _a.id) || '-1'; // should use '' instead of '-1' but the API does not support non-number assembly_id
        const entry_id = structure.units[0].model.entryId.toLowerCase();
        const url = `${props.serverUrl}/${entry_id}?assembly_id=${assembly_id}`;
        const asset = Asset.getUrlAsset(ctx.assetManager, url);
        let dataWrapper;
        try {
            dataWrapper = await ctx.assetManager.resolve(asset, 'json').runInContext(ctx.runtime);
        }
        catch (err) {
            // PDBe API returns 404 when there are no symmetries -> treat as success with empty json in body
            if (`${err}`.includes('404')) { // dirrrty
                dataWrapper = Asset.Wrapper({}, asset, ctx.assetManager);
            }
            else {
                throw err;
            }
        }
        const data = dataWrapper.data;
        const value = ((_b = data[entry_id]) !== null && _b !== void 0 ? _b : []).map((v) => ({
            kind: 'Global Symmetry',
            oligomeric_state: v.oligomeric_state,
            stoichiometry: [v.stoichiometry],
            symbol: v.symbol,
            type: v.type,
            clusters: [],
            rotation_axes: v.rotation_axes,
        }));
        return { value, assets: [dataWrapper] };
    }
    /** Returns the index of the first non C1 symmetry or -1 */
    function firstNonC1(assemblySymmetryData) {
        for (let i = 0, il = assemblySymmetryData.length; i < il; ++i) {
            if (assemblySymmetryData[i].symbol !== 'C1')
                return i;
        }
        return -1;
    }
    AssemblySymmetryData.firstNonC1 = firstNonC1;
    function isRotationAxes(x) {
        return !!x && x.length > 0;
    }
    AssemblySymmetryData.isRotationAxes = isRotationAxes;
    function getAsymIds(assemblySymmetry) {
        const asymIds = new Set();
        for (const c of assemblySymmetry.clusters) {
            if (!(c === null || c === void 0 ? void 0 : c.members))
                continue;
            for (const m of c.members) {
                if (m === null || m === void 0 ? void 0 : m.asym_id)
                    asymIds.add(m.asym_id);
            }
        }
        return SetUtils.toArray(asymIds);
    }
    AssemblySymmetryData.getAsymIds = getAsymIds;
    function getAsymIdsStructure(structure, asymIds) {
        const query = MS.struct.modifier.union([
            MS.struct.generator.atomGroups({
                'chain-test': MS.core.set.has([MS.set(...asymIds), MS.ammp('label_asym_id')])
            })
        ]);
        const compiled = compile(query);
        const result = compiled(new QueryContext(structure));
        return StructureSelection.unionStructure(result);
    }
    /** Returns structure limited to all cluster member chains */
    function getStructure(structure, assemblySymmetry) {
        const asymIds = AssemblySymmetryData.getAsymIds(assemblySymmetry);
        return asymIds.length > 0 ? getAsymIdsStructure(structure, asymIds) : structure;
    }
    AssemblySymmetryData.getStructure = getStructure;
})(AssemblySymmetryData || (AssemblySymmetryData = {}));
export function getSymmetrySelectParam(structure) {
    const param = PD.Select(0, [[0, 'First Symmetry']]);
    if (structure) {
        const assemblySymmetryData = AssemblySymmetryDataProvider.get(structure).value;
        if (assemblySymmetryData) {
            const options = [
                [-1, 'Off']
            ];
            for (let i = 0, il = assemblySymmetryData.length; i < il; ++i) {
                const { symbol, kind } = assemblySymmetryData[i];
                if (symbol !== 'C1') {
                    options.push([i, `${i + 1}: ${symbol} ${kind}`]);
                }
            }
            if (options.length > 1) {
                param.options = options;
                param.defaultValue = options[1][0];
            }
            else {
                options.length = 0;
            }
        }
    }
    return param;
}
//
export const AssemblySymmetryDataParams = {
    serverType: PD.Select('rcsb', [['rcsb', 'RCSB'], ['pdbe', 'PDBe']]),
    serverUrl: PD.Text(AssemblySymmetryData.DefaultServerUrl, { description: 'GraphQL endpoint URL (if server type is RCSB) or PDBe API endpoint URL (if server type is PDBe)' })
};
export const AssemblySymmetryDataProvider = CustomStructureProperty.createProvider({
    label: 'Assembly Symmetry Data',
    descriptor: CustomPropertyDescriptor({
        name: 'molstar_struct_symmetry_data',
        // TODO `cifExport` and `symbol`
    }),
    type: 'root',
    defaultParams: AssemblySymmetryDataParams,
    getParams: (data) => AssemblySymmetryDataParams,
    isApplicable: (data) => AssemblySymmetryData.isApplicable(data),
    obtain: async (ctx, data, props) => {
        const p = { ...PD.getDefaultValues(AssemblySymmetryDataParams), ...props };
        return await AssemblySymmetryData.fetch(ctx, data, p);
    }
});
//
function getAssemblySymmetryParams(data) {
    return {
        ...AssemblySymmetryDataParams,
        symmetryIndex: getSymmetrySelectParam(data)
    };
}
export const AssemblySymmetryParams = getAssemblySymmetryParams();
export const AssemblySymmetryProvider = CustomStructureProperty.createProvider({
    label: 'Assembly Symmetry',
    descriptor: CustomPropertyDescriptor({
        name: 'molstar_struct_symmetry',
        // TODO `cifExport` and `symbol`
    }),
    type: 'root',
    defaultParams: AssemblySymmetryParams,
    getParams: getAssemblySymmetryParams,
    isApplicable: (data) => AssemblySymmetryData.isApplicable(data),
    obtain: async (ctx, data, props) => {
        const p = { ...PD.getDefaultValues(getAssemblySymmetryParams(data)), ...props };
        await AssemblySymmetryDataProvider.attach(ctx, data, p);
        const assemblySymmetryData = AssemblySymmetryDataProvider.get(data).value;
        const assemblySymmetry = assemblySymmetryData === null || assemblySymmetryData === void 0 ? void 0 : assemblySymmetryData[p.symmetryIndex];
        if (!assemblySymmetry)
            new Error(`No assembly symmetry found for index ${p.symmetryIndex}`);
        return { value: assemblySymmetry };
    }
});