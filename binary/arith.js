/**
 * @fileoverview This file contains helper code used by jspb.utils to
 * handle 64-bit integer conversion to/from strings.
 *
 * @author cfallin@google.com (Chris Fallin)
 *
 * TODO(haberman): move this to javascript/closure/math?
 */
goog.module('jspb.arith');
goog.module.declareLegacyNamespace();

const {getSplit64High, getSplit64Low, joinSignedDecimalString, joinUnsignedDecimalString, splitDecimalString} = goog.require('jspb.utils');

/**
 * UInt64 implements some 64-bit arithmetic routines necessary for properly
 * handling 64-bit integer fields from protobuf fields with decimal string
 * conversions.
 * @final
 */
class UInt64 {
  /**
   * @param {number} lo The low 32 bits.
   * @param {number} hi The high 32 bits.
   */
  constructor(lo, hi) {
    /**
     * The low 32 bits, always stored as uint32.
     * @public @const {number}
     */
    this.lo = lo >>> 0;

    /**
     * The high 32 bits, always stored as uint32.
     * @public @const {number}
     */
    this.hi = hi >>> 0;
  }

  /**
   * Convert a 64-bit number to a string.
   * @return {string}
   */
  toDecimalString() {
    return joinUnsignedDecimalString(this.lo, this.hi);
  }

  /**
   * Negates this uint64 in twos-complement.
   *
   * @return {!UInt64}
   */
  negateInTwosComplement() {
    if (this.lo === 0) {
      return new UInt64(0, 1 + ~this.hi);
    }
    return new UInt64(~this.lo + 1, ~this.hi);
  }

  /**
   *  Construct a Uint64 from a bigint
   *
   * @param {bigint} n
   * @return {!UInt64}
   */
  static fromBigInt(n) {
    const asU64 = BigInt.asUintN(64, n);
    return new UInt64(
        /* lowBits = */ Number((asU64 & BigInt(0xFFFFFFFF))),
        /* highBits = */ Number(asU64 >> BigInt(32)));
  }

  /**
   * Parse a string into a 64-bit number. Returns `null` on a parse error.
   *
   * @param {string} s
   * @return {?UInt64}
   */
  static fromString(s) {
    if (!s) return UInt64.getZero();
    if (!/^\d+$/.test(s)) {
      // TODO(web-protos-team): Throw an error rather than returning null.
      return null;
    }
    splitDecimalString(s);
    return new UInt64(getSplit64Low(), getSplit64High());
  }

  /**
   * Construct a Uint64 from a JavaScript number.
   * @param {number} n
   * @return {!UInt64}
   */
  static fromNumber(n) {
    return new UInt64(n & ALL_32_BITS, n / TWO_PWR_32_DBL);
  }

  static getZero() {
    return uint64Zero || (uint64Zero = new UInt64(0, 0));
  }
}

let /** !UInt64|undefined */ uint64Zero;

/**
 * Int64 is like UInt64, but modifies string conversions to interpret the stored
 * 64-bit value as a twos-complement-signed integer with decimal string
 * conversions.
 * @final
 */
class Int64 {
  /**
   * @param {number} lo The low 32 bits.
   * @param {number} hi The high 32 bits.
   */
  constructor(lo, hi) {
    /**
     * The low 32 bits, always stored as uint32.
     * @public @const {number}
     */
    this.lo = lo >>> 0;

    /**
     * The high 32 bits, always stored as uint32.
     * @public @const {number}
     */
    this.hi = hi >>> 0;
  }

  /**
   * Convert a 64-bit number to a string.
   * @return {string}
   */
  toDecimalString() {
    return joinSignedDecimalString(this.lo, this.hi);
  }

  /**
   *  Construct a Int64 from a bigint
   *
   * @param {bigint} n
   * @return {!Int64}
   */
  static fromBigInt(n) {
    const asUint64 = BigInt.asUintN(64, n);
    return new Int64(
        /* lowBits = */ Number((asUint64 & BigInt(0xFFFFFFFF))),
        /* highBits = */ Number(asUint64 >> BigInt(32)));
  }

  /**
   * Parse a string into a 64-bit number. Returns `null` on a parse error.
   * @param {string} s
   * @return {?Int64}
   */
  static fromString(s) {
    if (!s) return Int64.getZero();
    if (!/^-?\d+$/.test(s)) {
      // TODO: Throw an error rather than returning null.
      return null;
    }
    splitDecimalString(s);
    return new Int64(getSplit64Low(), getSplit64High());
  }

  /**
   * Construct a Uint64 from a JavaScript number.
   * @param {number} n
   * @return {!Int64}
   */
  static fromNumber(n) {
    return new Int64(n & ALL_32_BITS, n / TWO_PWR_32_DBL);
  }

  static getZero() {
    return int64Zero || (int64Zero = new Int64(0, 0));
  }
}

let /** !Int64|undefined */ int64Zero;

/** @const {number} */
const ALL_32_BITS = 0xFFFFFFFF;

/** @const {number} */
const TWO_PWR_32_DBL = 0x100000000;

exports = {
  UInt64,
  Int64,
};
