"use strict";
/**
 * Copyright (c) 2018 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author David Sehnal <david.sehnal@gmail.com>
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearLine = exports.showProgress = void 0;
const mol_task_1 = require("../../../mol-task");
function showProgress(p) {
    process.stdout.write(`\r${new Array(80).join(' ')}`);
    process.stdout.write(`\r${mol_task_1.Progress.format(p)}`);
}
exports.showProgress = showProgress;
function clearLine() {
    process.stdout.write(`\r${new Array(80).join(' ')}`);
    process.stdout.write(`\r`);
}
exports.clearLine = clearLine;