/**
 * Created by ngtmuzi on 2018/2/10.
 */

const lodash = require('lodash');

/**
 * 展平对象
 * {a:1, b:{c:1,d:{e:[2]}}} -> {a:1,'b.c':1,'b.d.e':[2]}
 * @param obj
 * @param pre
 * @param split
 * @returns {*}
 */
function pave(obj, pre = '', split = '.') {
  if (!lodash.isPlainObject(obj)) throw new TypeError(`pave() need a Object but got a ` + typeof obj);

  return Object.assign({}, ...lodash.flatMap(obj, (value, key) => {
    if (lodash.isPlainObject(value)) return pave(value, `${pre && (pre + split)}${key}`, split);
    else return {[`${pre && (pre + split)}${key}`]: value};
  }));
}

module.exports = pave;