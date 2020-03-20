"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash = require("lodash");
exports.default = pave;
function pave(obj, pre = '', split = '.') {
    if (!lodash.isPlainObject(obj))
        throw new TypeError(`pave() need a Object but got a ` + typeof obj);
    return Object.assign({}, ...lodash.flatMap(obj, (value, key) => {
        if (lodash.isPlainObject(value))
            return pave(value, `${pre && (pre + split)}${key}`, split);
        else
            return { [`${pre && (pre + split)}${key}`]: value };
    }));
}
