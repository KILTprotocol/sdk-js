/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

// Taken from https://github.com/ShivrajRath/jsonabc/blob/2ccf15f967f0e44e48fb7b163aebef43c0047166/index.js
// Copied here, because the package defines a browser compatible script, but doesn't create it,
// which leads to it failing in react-native. See https://github.com/ShivrajRath/jsonabc/issues/18
/* eslint-disable */

/*!
  JSON ABC | License: MIT.
*/

module.exports = {
  sort: sort,
  sortObj: sortObj,
  cleanJSON: cleanJSON,
}

// Is a value an array?
function isArray(val) {
  return Object.prototype.toString.call(val) === '[object Array]'
}

// Is a value an Object?
function isPlainObject(val) {
  return Object.prototype.toString.call(val) === '[object Object]'
}

// Sorting Logic
function sortObj(un, noarray) {
  noarray = noarray || false

  var or = {}

  if (isArray(un)) {
    // Sort or don't sort arrays
    if (noarray) {
      or = un
    } else {
      or = un.sort()
    }

    or.forEach(function (v, i) {
      or[i] = sortObj(v, noarray)
    })

    if (!noarray) {
      or = or.sort(function (a, b) {
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
        or[key] = sortObj(un[key], noarray)
      })
  } else {
    or = un
  }

  return or
}

// Remove trailing commas
function cleanJSON(input) {
  input = input.replace(/,[ \t\r\n]+}/g, '}')
  input = input.replace(/,[ \t\r\n]+\]/g, ']')
  return input
}

// Sort the JSON (clean, parse, sort, stringify).
function sort(inputStr, noarray) {
  var output, obj, r

  if (inputStr) {
    try {
      inputStr = cleanJSON(inputStr)
      obj = JSON.parse(inputStr)
      r = sortObj(obj, noarray)
      output = JSON.stringify(r, null, 4)
    } catch (ex) {
      console.error('jsonabc: Incorrect JSON object.', [], ex)
      throw ex
    }
  }
  return output
}

// End.
