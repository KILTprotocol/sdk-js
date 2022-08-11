/* eslint-disable license-header/header */
// Taken from https://github.com/ShivrajRath/jsonabc/blob/2ccf15f967f0e44e48fb7b163aebef43c0047166/index.js
// Copied here, because the package defines a browser compatible script, but doesn't create it,
// which leads to it failing in react-native. See https://github.com/ShivrajRath/jsonabc/issues/18
/* eslint-disable */

/*!
  JSON ABC | License: MIT.
*/

export default {
  sortObj,
  sort,
  cleanJSON,
}

// Is a value an array?
function isArray(val: unknown): val is Array<any> {
  return Object.prototype.toString.call(val) === '[object Array]'
}

// Is a value an Object?
function isPlainObject(val: unknown): val is Object {
  return Object.prototype.toString.call(val) === '[object Object]'
}

/**
 * Sort the JSON (clean, parse, sort, stringify).
 * @param noArray Sort or don't sort arrays
 */
export function sortObj<T extends object>(un: T, noArray?: boolean): T {
  noArray = noArray || false

  var or = {}

  if (isArray(un)) {
    // Sort or don't sort arrays
    if (noArray) {
      or = un
    } else {
      or = un.sort()
    }

    ;(or as Array<any>).forEach(function (v, i) {
      or[i] = sortObj(v, noArray)
    })

    if (!noArray) {
      or = (or as Array<any>).sort(function (a, b) {
        a = JSON.stringify(a)
        b = JSON.stringify(b)
        return a < b ? -1 : a > b ? 1 : 0
      })
    }
  } else if (isPlainObject(un)) {
    or = {}
    Object.keys(un)
      .sort(function (a, b) {
        if (a.toLowerCase() < b.toLowerCase()) return -1
        if (a.toLowerCase() > b.toLowerCase()) return 1
        return 0
      })
      .forEach(function (key) {
        or[key] = sortObj(un[key], noArray)
      })
  } else {
    or = un
  }

  return or as T
}

/** Remove trailing commas */
export function cleanJSON(input: string): string {
  input = input.replace(/,[ \t\r\n]+}/g, '}')
  input = input.replace(/,[ \t\r\n]+\]/g, ']')
  return input
}

/**
 * Sort the JSON (clean, parse, sort, stringify).
 * @param noArray Sort or don't sort arrays
 */
export function sort(inputStr: string, noArray?: boolean): string | undefined {
  var output: string | undefined, obj: any, r: {}

  if (inputStr) {
    try {
      inputStr = cleanJSON(inputStr)
      obj = JSON.parse(inputStr)
      r = sortObj(obj, noArray)
      output = JSON.stringify(r, null, 4)
    } catch (ex) {
      console.error('jsonabc: Incorrect JSON object.', [], ex)
      throw ex
    }
  }
  return output
}

// End.
