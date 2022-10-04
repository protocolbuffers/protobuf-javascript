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
 * Error object for failed assertions.
 *
 * @extends {Error}
 * @final
 */

class JspbAssertionError extends Error {
  /**
   * @param {string} messagePattern The pattern that was used to form message.
   * @param {!Array<*>} messageArgs The items to substitute into the pattern.
   */
  constructor(messagePattern, messageArgs) {
    super(subs(messagePattern, messageArgs));

    /**
     * The message pattern used to format the error message. Error handlers can
     * use this to uniquely identify the assertion.
     * @type {string}
     */
    this.messagePattern = messagePattern;
  }
}

jspb.asserts.JspbAssertionError = JspbAssertionError;

/**
 * The default error handler.
 * @param {!JspbAssertionError} e The exception to be handled.
 * @return {void}
 */
jspb.asserts.JSPB_DEFAULT_ERROR_HANDLER = function(e) {
  throw e;
}



/**
 * The handler responsible for throwing or logging assertion errors.
 * @type {function(!JspbAssertionError)}
 */
let errorHandler_ = jspb.asserts.JSPB_DEFAULT_ERROR_HANDLER;


/**
 * Does simple python-style string substitution.
 * subs("foo%s hot%s", "bar", "dog") becomes "foobar hotdog".
 * @param {string} pattern The string containing the pattern.
 * @param {!Array<*>} subs The items to substitute into the pattern.
 * @return {string} A copy of `str` in which each occurrence of
 *     `%s` has been replaced an argument from `var_args`.
 */
function subs(pattern, subs) {
  const splitParts = pattern.split('%s');
  let returnString = '';

  // Replace up to the last split part. We are inserting in the
  // positions between split parts.
  const subLast = splitParts.length - 1;
  for (let i = 0; i < subLast; i++) {
    // keep unsupplied as '%s'
    const sub = (i < subs.length) ? subs[i] : '%s';
    returnString += splitParts[i] + sub;
  }
  return returnString + splitParts[subLast];
}

/**
 * Throws an exception with the given message and "Assertion failed" prefixed
 * onto it.
 * @param {string} defaultMessage The message to use if givenMessage is empty.
 * @param {?Array<*>} defaultArgs The substitution arguments for defaultMessage.
 * @param {string|undefined} givenMessage Message supplied by the caller.
 * @param {!Array<*>} givenArgs The substitution arguments for givenMessage.
 * @throws {JspbAssertionError} When the value is not a number.
 */
function doAssertFailure(defaultMessage, defaultArgs, givenMessage, givenArgs) {
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
  const e = new JspbAssertionError('' + message, args || []);
  errorHandler_(e);
}

/**
 * Sets a custom error handler that can be used to customize the behavior of
 * assertion failures, for example by turning all assertion failures into log
 * messages.
 * @param {function(!JspbAssertionError)} errorHandler
 * @return {void}
 */
jspb.asserts.setJspbErrorHandler = function(errorHandler) {
  errorHandler_ = errorHandler;
};


/**
 * Checks if the condition evaluates to true.
 * @template T
 * @param {T} condition The condition to check.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @return {T} The value of the condition.
 * @throws {JspbAssertionError} When the condition evaluates to false.
 */

jspb.asserts.jspbAssert = function(condition, opt_message, var_args) {
  if (!condition) {
    doAssertFailure(
        '', null, opt_message, Array.prototype.slice.call(arguments, 2));
  }
  return condition;
};


/**
 * Checks if the value is a string.
 * @param {*} value The value to check.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @return {string} The value, guaranteed to be a string when asserts enabled.
 * @throws {JspbAssertionError} When the value is not a string.
 */
jspb.asserts.jspbAssertString = function(value, opt_message, var_args) {
  if (typeof value !== 'string') {
    doAssertFailure(
        'Expected string but got %s: %s.', [goog.typeOf(value), value],
        opt_message, Array.prototype.slice.call(arguments, 2));
  }
  return /** @type {string} */ (value);
};


/**
 * Checks if the value is an Array.
 * @param {*} value The value to check.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @return {!Array<?>} The value, guaranteed to be a non-null array.
 * @throws {JspbAssertionError} When the value is not an array.
 */
jspb.asserts.jspbAssertArray = function(value, opt_message, var_args) {
  if (!Array.isArray(value)) {
    doAssertFailure(
        'Expected array but got %s: %s.', [goog.typeOf(value), value],
        opt_message, Array.prototype.slice.call(arguments, 2));
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
 * @param {...*} var_args The items to substitute into the failure message.
 * @return {void}
 * @throws {JspbAssertionError} Failure.
 */
jspb.asserts.jspbFail = function(opt_message, var_args) {
  errorHandler_(new JspbAssertionError(
      'Failure' + (opt_message ? ': ' + opt_message : ''),
      Array.prototype.slice.call(arguments, 1)));
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
 * @param {...*} var_args The items to substitute into the failure message.
 * @throws {JspbAssertionError} When the value is not an instance of
 *     type.
 * @return {T}
 * @template T
 */
jspb.asserts.jspbAssertInstanceof = function(value, type, opt_message, var_args) {
  if (!(value instanceof type)) {
    doAssertFailure(
        'Expected instanceof %s but got %s.', [getType(type), getType(value)],
        opt_message, Array.prototype.slice.call(arguments, 3));
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
