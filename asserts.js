/**
 * @license
 * Copyright The Closure Library Authors.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Utilities to check the preconditions, postconditions and
 * invariants runtime.
 */

goog.provide('jspb.asserts');

/**
 * Throws an exception with the given message and "Assertion failed" prefixed
 * onto it.
 * @param {string} defaultMessage The message to use if givenMessage is empty.
 * @param {?Array<*>} defaultArgs The substitution arguments for defaultMessage.
 * @param {string|undefined} givenMessage Message supplied by the caller.
 * @param {!Array<*>} givenArgs The substitution arguments for givenMessage.
 * @throws {Error} When the value is not a number.
 */
jspb.asserts.doAssertFailure = function(defaultMessage, defaultArgs, givenMessage, givenArgs) {
  let message = 'Assertion failed';
  let args;
  if (givenMessage) {
    message += ': ' + givenMessage;
    args = givenArgs;
  } else if (defaultMessage) {
    message += ': ' + defaultMessage;
    args = defaultArgs;
  }
  // The '' + works around an Opera 10 bug in the unit tests. Without it,
  // a stack trace is added to var message above. With this, a stack trace is
  // not added until this line (it causes the extra garbage to be added after
  // the assertion message instead of in the middle of it).
  throw new Error('' + message, args || []);
}

/**
 * Checks if the condition evaluates to true.
 * @template T
 * @param {T} condition The condition to check.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} args The items to substitute into the failure message.
 * @return {T} The value of the condition.
 * @throws {Error} When the condition evaluates to false.
 */

jspb.asserts.assert = function(condition, opt_message, ...args) {
  if (!condition) {
    jspb.asserts.doAssertFailure('', null, opt_message, args);
  }
  return condition;
};


/**
 * Checks if the value is a string.
 * @param {*} value The value to check.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} args The items to substitute into the failure message.
 * @return {string} The value, guaranteed to be a string when asserts enabled.
 * @throws {Error} When the value is not a string.
 */
jspb.asserts.assertString = function(value, opt_message, ...args) {
  if (typeof value !== 'string') {
    jspb.asserts.doAssertFailure(
        'Expected string but got %s: %s.', [goog.typeOf(value), value],
        opt_message, args);
  }
  return /** @type {string} */ (value);
};


/**
 * Checks if the value is an Array.
 * @param {*} value The value to check.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} args The items to substitute into the failure message.
 * @return {!Array<?>} The value, guaranteed to be a non-null array.
 * @throws {Error} When the value is not an array.
 */
jspb.asserts.assertArray = function(value, opt_message, ...args) {
  if (!Array.isArray(value)) {
    jspb.asserts.doAssertFailure(
        'Expected array but got %s: %s.', [goog.typeOf(value), value],
        opt_message, args);
  }
  return /** @type {!Array<?>} */ (value);
};

/**
 * Triggers a failure. This function is useful in case when we want to add a
 * check in the unreachable area like switch-case statement:
 *
 * <pre>
 *  switch(type) {
 *    case FOO: doSomething(); break;
 *    case BAR: doSomethingElse(); break;
 *    default: jspb.asserts.JspbFail('Unrecognized type: ' + type);
 *      // We have only 2 types - "default:" section is unreachable code.
 *  }
 * </pre>
 *
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} args The items to substitute into the failure message.
 * @return {void}
 * @throws {Error} Failure.
 */
jspb.asserts.fail = function(opt_message, ...args) {
  throw new Error(
      'Failure' + (opt_message ? ': ' + opt_message : ''),
      args);
};

/**
 * Checks if the value is an instance of the user-defined type.
 *
 * Do not use this to ensure a value is an HTMLElement or a subclass! Cross-
 * document DOM inherits from separate - though identical - browser classes, and
 * such a check will unexpectedly fail.
 *
 * @param {?} value The value to check.
 * @param {function(new: T, ...)} type A user-defined constructor.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} args The items to substitute into the failure message.
 * @throws {Error} When the value is not an instance of
 *     type.
 * @return {T}
 * @template T
 */
jspb.asserts.assertInstanceof = function(value, type, opt_message, ...args) {
  if (!(value instanceof type)) {
    jspb.assert.doAssertFailure(
        'Expected instanceof %s but got %s.', [getType(type), getType(value)],
        opt_message, args);
  }
  return value;
};

/**
 * Returns the type of a value. If a constructor is passed, and a suitable
 * string cannot be found, 'unknown type name' will be returned.
 * @param {*} value A constructor, object, or primitive.
 * @return {string} The best display name for the value, or 'unknown type name'.
 */
function getType(value) {
  if (value instanceof Function) {
    return value.displayName || value.name || 'unknown type name';
  } else if (value instanceof Object) {
    return /** @type {string} */ (value.constructor.displayName) ||
        value.constructor.name || Object.prototype.toString.call(value);
  } else {
    return value === null ? 'null' : typeof value;
  }
}
