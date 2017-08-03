/*
 * Copyright (c) 2017 David Sehnal, licensed under Apache 2.0, See LICENSE file for more info.
 */

namespace ChannelsDB {

    const SUBMIT_URL = 'https://webchem.ncbr.muni.cz/API/ChannelsDB/Upload/';

    interface ChannelEntry {
        id: string,
        name: string,
        description: string,
        reference: string
    }

    interface ResidueEntry {
        id: string,
        annotation: string,
        reference: string
    }

    type Entry<T> = {[K in keyof T]: T[K]}

    interface TableSpec<T> {
        entries: Entry<T>[],
        spec: {[K in keyof T]: { header: string, width: string, placeholder: string } }
    }

    class EditableRow extends React.Component<TableSpec<any> & { add: (e: Entry<any>) => void }, { value: { [name: string]: string } }> {
        state = { value: Object.create(null) };

        add() {
            this.props.add({ ...this.state.value });
            this.setState({ value: Object.create(null) });
        }

        private update(e: HTMLInputElement) {
            this.setState({ value: { ...this.state.value, [e.name]: e.value } });
        }

        render() {
            const spec = this.props.spec;
            const cols = Object.keys(spec);
            const curr = this.state.value;
            const canAdd = Object.keys(curr).every(k => typeof curr[k] === 'string' && curr[k].trim().length > 0) && Object.keys(curr).length === cols.length;
            return <tr>
                {cols.map(c => <td key={c} style={{ width: spec[c].width }} className='form-group'>
                    <input name={c} className='form-control' type='text' placeholder={spec[c].placeholder} onChange={e => this.update(e.target)} value={curr[c] || ''} />
                </td>)}
                <td key='actions'>
                    <button className='btn btn-success' disabled={!canAdd} onClick={() => {
                        if (canAdd) this.add();
                    }}><span className='glyphicon glyphicon-plus' aria-hidden='true'></span></button>
                </td>
            </tr>;
        }
    }

    class EditableTable<T> extends React.Component<TableSpec<T> & { updated: () => void }, { entries: Entry<T>[] }> {
        state = { entries: [] }

        id = 0;

        private add(e: any) {
            this.props.entries.push(e);
            e._id = this.id++;
            this.setState({ entries: [...this.props.entries] });
            this.props.updated();
        }

        private remove(e: any) {
            const entries = this.props.entries;
            const idx = entries.indexOf(e);
            if (idx < 0) return;
            for (let i = idx; i < entries.length - 1; i++) {
                entries[i] = entries[i + 1];
            }
            entries.pop();
            this.setState({ entries: [...this.props.entries] });
            this.props.updated();
        }

        componentWillReceiveProps(nextProps: TableSpec<T>) {
            this.setState({ entries: nextProps.entries })
        }

        componentDidMount() {
            this.setState({ entries: this.props.entries });
        }

        render() {
            const spec = this.props.spec;
            const cols = Object.keys(spec);
            return <table className='table table-striped table-bordered'>
                <thead>
                    <tr>
                        {cols.map(c => <th key={c} style={{ width: spec[c].width }}>{spec[c].header}</th>)}
                        <th style={{ width: '50px' }}></th>
                    </tr>
                </thead>
                <tbody>
                    <EditableRow {...this.props} add={e => this.add(e)} />
                    {
                        this.state.entries.map(e => <tr key={(e as any)._id}>
                            {cols.map(c => <td key={c} style={{ width: spec[c].width, verticalAlign: 'middle', padding: '0 15px' }}>{(e as any)[c]}</td>)}
                            <td key='actions'>
                                <button className='btn btn-danger' onClick={() => this.remove(e)}><span className='glyphicon glyphicon-remove' aria-hidden='true'></span></button>
                            </td>
                        </tr>)
                    }
                </tbody>
            </table>
        }
    }

    interface FormState {
        pdbId: string,
        reference: string,
        email?: string,
        channels: ChannelEntry[],
        residues: ResidueEntry[],
        files: File[]
    }

    function FormState(): FormState {
        return { pdbId: '', reference: '', email: '', channels: [], residues: [], files: [] };
    }

    interface SubmitState {
        progress: Rx.Subject<number>;
    }

    function formatEntries(xs: any[]) {
        const ret: any[] = [];
        for (const x of xs) {
            const e = {...x};
            delete e._id;
            ret.push(e);
        }
        return JSON.stringify(ret);
    }

    function makeFormData(data: FormState) {
        const fd = new FormData();
        fd.append('pdbId', data.pdbId);
        fd.append('reference', data.reference);
        fd.append('email', data.email || '');
        fd.append('channels', formatEntries(data.channels));
        fd.append('residues', formatEntries(data.residues));
        let index = 0;
        fd.append('fileCount', '' + data.files.length);
        for (const file of data.files) {
            fd.append(`file[${index++}]`, file);
        }
        return fd;
    }

    function uploadAjaxFormData(formData: FormData, actionUrl: string, options: { onProgress: (current?: number, total?: number) => void, onComplete: (resp: any) => void, onFailed: () => void }) {
        options = options || {};

        const onProgress = options['onProgress'] || function () { };

        function uploadFile() {
            const xhr = new XMLHttpRequest();
            xhr.upload.addEventListener('progress', uploadProgress, false);
            xhr.addEventListener('load', uploadComplete, false);
            xhr.addEventListener('error', uploadFailed, false);
            xhr.open('POST', actionUrl);
            xhr.send(formData);
            return xhr;
        }

        function uploadProgress(evt: any) {
            if (evt.lengthComputable) {
                onProgress(evt.loaded, evt.total);
            }
            else {
                onProgress();
            }
        }

        function uploadComplete(evt: any) {
            const response = JSON.parse(evt.target.responseText);
            if (options['onComplete'] !== undefined) options.onComplete(response);
        }

        function uploadFailed(evt: any) {
            if (options['onFailed'] !== undefined) options.onFailed();
        }
        return uploadFile();
    }

    function submit(data: FormState): Rx.Subject<string> {
        const subj = new Rx.Subject<string>();
        let progress = 0;

        uploadAjaxFormData(makeFormData(data), SUBMIT_URL, {
            onComplete(response) {
                if (response.Status && response.Status === 'OK') {
                    subj.onCompleted();
                } else {
                    subj.onError(response.Msg || 'Unknown error.');
                }
            },
            onProgress(current, total) {
                if (current !== undefined && total !== undefined) {
                    const percentComplete = Math.round(current * 1000 / total) / 10;
                    subj.onNext(`${percentComplete}%`);
                } else {
                    subj.onNext(``);
                }
            },
            onFailed() {
                subj.onError('Unknown error.');
            }
        });

        return subj;
    }

    export class Contribute extends React.Component<{}, { state: 'editing' | 'submitting' | 'thank-you' | 'error', submitProgress: string, formState: FormState }> {
        state = { state: 'editing' as 'editing' | 'submitting' | 'thank-you' | 'error', formState: FormState(), submitProgress: '' }

        private errorMsg = '';
        private submitProgress: Rx.Observable<string> | undefined = void 0;

        private channelsSpec = {
            id: { header: 'Channel Id', width: '200px', placeholder: '30.5A' },
            name: { header: 'Name', width: '200px', placeholder: 'bla' },
            description: { header: 'Description', width: 'auto', placeholder: 'this is something' },
            reference: { header: 'Reference', width: '300px', placeholder: 'doi' }
        };

        private residuesSpec = {
            id: { header: 'Residue Id', width: '200px', placeholder: 'ALA 10 A' },
            annotation: { header: 'Annotation', width: 'auto', placeholder: 'this is something' },
            reference: { header: 'Reference', width: '300px', placeholder: 'doi' }
        };

        updatedAnnotations() {
            const state = { ...this.state.formState };
            this.setState({ formState: state });
        }

        update(input: HTMLInputElement) {
            const state = { ...this.state.formState, [input.name]: input.value };
            this.setState({ formState: state });
        }

        setFiles(input: HTMLInputElement) {
            const files: File[] = [];
            const len = (input.files && input.files.length) || 0
            for (let i = 0; i < len; i++) files.push(input.files![i]);
            const state = { ...this.state.formState, files };
            this.setState({ formState: state });
        }

        getIssues() {
            const fs = this.state.formState;
            const issues: string[] = [];
            if (fs.pdbId.trim().length < 4) issues.push('PDB id must be at least 4 characters.');
            if (fs.reference.trim().length === 0) issues.push('Enter reference.');
            if (!fs.residues.length && !fs.channels.length) issues.push('Enter at least one residue or channel annotation.');
            if (!fs.files.length) issues.push('Add at least one file with annotations.');
            return issues;
        }

        private _submit: Rx.IDisposable | undefined = void 0;
        submitStart() {
            this.setState({ state: 'submitting' });

            if (this._submit) {
                this._submit.dispose();
                this._submit = void 0;
            }
            this.submitProgress = submit(this.state.formState);
            this._submit = this.submitProgress.subscribe(p => this.setState({ submitProgress: p }), (e) => this.submitDone(e), () => this.submitDone());
        }

        submitDone(err?: any) {
            if (this._submit) {
                this._submit.dispose();
                this._submit = void 0;
            }

            if (err) {
                this.errorMsg = '' + err;
                this.setState({ state: 'error' });
            } else {
                this.setState({ state: 'thank-you', formState: FormState() });
            }
        }

        thankYou() {
            return <div>
                <h2 style={{ textAlign: 'center' }}>Thank you for submitting your data.</h2>
                 <button
                    className='btn btn-primary btn-block' onClick={() => this.setState({ state: 'editing' })}>
                    Submit another...
                </button>
            </div>;
        }

        submitting() {
            return <h3>Your data is being submitted... {this.state.submitProgress}</h3>;
        }

        error() {
            return <div>
                <h3>Error submitting your data</h3>
                <div style={{ color: 'red'}}>{this.errorMsg }</div>
                <button className='btn' onClick={() => this.submitStart()}>
                    Try submit again
                </button>
                <button className='btn' onClick={() => this.setState({ state: 'editing' })}>
                    Edit data
                </button>
            </div>;
        }

        edit() {
            const fs = this.state.formState;
            const issues = this.getIssues();
            return <div>
                <p>If you would like to contribute to the ChannelsDB or point out not yet annotated systems with known channels, please use the form below, until the online annotation tool is ready by the end of 2017:</p>
                <div className='form-horizontal'>
                    <div>
                        <div className='form-group'>
                            <label className='control-label col-sm-2' htmlFor='pdbId'>PDB identifier</label>
                            <div className='col-sm-10'>
                                <input type='text' className='form-control' placeholder='1tqn' name='pdbId' value={fs.pdbId} onChange={e => this.update(e.target)} />
                            </div>
                        </div>
                        <div className='form-group'>
                            <label className='control-label col-sm-2' htmlFor='litReference'>Literature reference</label>
                            <div className='col-sm-10'>
                                <input type='text' className='form-control' placeholder='Doi or Pubmed ID (e.g. 10.1021/acs.jctc.6b00075 or  PMID: 26967371)' name='reference' onChange={e => this.update(e.target)} value={fs.reference}  />
                            </div>
                        </div>
                        <div className='form-group'>
                            <label className='control-label col-sm-2' htmlFor='email'>E-mail</label>
                            <div className='col-sm-10'>
                                <input type='text' className='form-control' name='email' placeholder='(optional) jon.snow@uni.ac.uk' onChange={e => this.update(e.target)} value={fs.email} />
                            </div>
                        </div>
                        <h2>Channel Annotations</h2>
                        <EditableTable key={'channels-annotations'} entries={fs.channels} spec={this.channelsSpec} updated={() => this.updatedAnnotations()} />

                        <h2>Residue Annotations</h2>
                        <EditableTable key={'residue-annotations'} entries={fs.residues} spec={this.residuesSpec} updated={() => this.updatedAnnotations()} />

                        <hr className='featurette-divider' style={{ margin: '20px 0' }} />

                        <div className='input-group'>
                            <label className='input-group-btn'>
                                <span className='btn btn-default'>Select channels&hellip; <input type='file' style={{ display: 'none' }} multiple onChange={e => this.setFiles(e.target)} /></span>
                            </label>
                            <input type='text' className='form-control' readOnly value={fs.files.map(f => f.name).join(', ')} />
                        </div><br />
                    </div>
                     {issues.length > 0
                        ? <div>
                            <ul style={{ color: 'red' }}>
                                {issues.map(i => <li key={i}>{i}</li>)}
                            </ul>
                        </div>
                        : <button className='btn btn-block btn-primary' onClick={() => this.submitStart()}>
                            Submit
                        </button>}
                </div>
            </div>;
        }

        render() {
            const fs = this.state.formState;
            const issues = this.getIssues();
            let ui: any;
            switch (this.state.state) {
                case 'editing': ui = () => this.edit(); break;
                case 'error': ui = () => this.error(); break;
                case 'thank-you': ui = () => this.thankYou(); break;
                case 'submitting': ui = () => this.submitting(); break;
            }
            return <div style={{ margin: '60px 0 0 20px' }}>
                <h1 className='text-center'>Contribute</h1>
                
                {ui()}

                <hr className='featurette-divider' style={{ margin: '50px 0' }} />

                <h1 className='text-center'>References</h1>
                <div className='tab-pane'>
                    <p>The ChannelsDB is build a over the top of the following services. Data annotations are taken from scientific literature, which is properly linked with the given entry.</p>
                    <dl className='publications-list'>
                        <dt>MOLE</dt>
                        <dd>
                            <p>Sehnal,D., Svobodová Vařeková,R., Berka,K., Pravda,L., Navrátilová,V., Banáš,P., Ionescu,C.-M., Otyepka,M. and Koča,J. (2013) <a href='https://dx.doi.org/10.1186/1758-2946-5-39' target='_blank'>MOLE 2.0: advanced approach for analysis of biomacromolecular channels</a>.
                                      J. Cheminform., 5, 39.</p>
                        </dd>
                        <dt>LiteMol suite</dt>
                        <dd>
                            <p><a href='https:/litemol.org' target='_blank'>LiteMol suite</a></p>
                        </dd>
                        <dt>UniProt API</dt>
                        <dd>
                            <p>Nightingale,A., Antunes,R., Alpi,E., Bursteinas,B., Gonzales,L., Liu,W., Luo,J., Qi,G., Turner,E. and Martin,M. (2017) <a href='https://dx.doi.org/10.1093/nar/gkx237' target='_blank'>The Proteins API: accessing key integrated protein and genome information</a>.
                                      Nucleic Acids Res., 45, W539–W544.</p>
                        </dd>
                        <dt>Protein Data Bank in Europe</dt>
                        <dd>
                            <p>Velankar,S., van Ginkel,G., Alhroub,Y., Battle,G.M., Berrisford,J.M., Conroy,M.J., Dana,J.M., Gore,S.P., Gutmanas,A., Haslam,P., et al. (2016) <a href='https://dx.doi.org/10.1093/nar/gkv1047' target='_blank'>PDBe: improved accessibility of macromolecular structure data from PDB and EMDB</a>.
                                      Nucleic Acids Res., 44, D385–D395.</p>
                        </dd>
                    </dl>
                </div>

            </div>;
        }
    }
}