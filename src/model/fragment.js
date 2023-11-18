const { randomUUID } = require('crypto');
// Use https://www.npmjs.com/package/content-type to create/parse Content-Type headers
const contentType = require('content-type');

// Functions for working with fragment metadata/data using our DB(aws(s3 and DynamoDB) or memoryDB)
const {
  readFragment,
  writeFragment,
  readFragmentData,
  writeFragmentData,
  listFragments,
  deleteFragment,
  deleteFragmentData,
} = require('./data/index');
const logger = require('../../src/logger');

/**
 * List of supported formats accepted and supported.
 */
const supportedFormats = [
  'text/plain',
  'text/plain; charset=utf-8',
  'text/markdown',
  'text/html',
  'application/json',
  'image/png',
  'image/jpeg	',
  'image/webp',
  'image/gif',
];

/**
 * List of conversion extensions allowed for each mimeType.
 * Each element in the array contains an object of
 * @type {string} - describes the mimetype
 * @conversionExtensions - an array of strings with the extensions allowed to be converted into.
 * NOTE: The first conversion extension is the extension for the specific mimetype
 */
const conversions = [
  {
    type: 'text/plain',
    conversionExtensions: ['.txt'],
  },
  {
    type: 'text/markdown',
    conversionExtensions: ['.md', '.html', '.txt'],
  },
  {
    type: 'text/html',
    conversionExtensions: ['.html', '.txt'],
  },
  {
    type: 'application/json',
    conversionExtensions: ['.json', '.txt'],
  },
  {
    type: 'image/png',
    conversionExtensions: ['.png', '.jpg', '.webp', '.gif'],
  },
  {
    type: 'image/jpg',
    conversionExtensions: ['.jpg', '.png', '.webp', '.gif'],
  },
  {
    type: 'image/webp',
    conversionExtensions: ['.webp', '.jpg', '.png', '.gif'],
  },
  {
    type: 'image/gif',
    conversionExtensions: ['.gif', '.jpg', '.webp', '.png'],
  },
];

class Fragment {
  constructor({ id = randomUUID(), ownerId, created, updated, type, size = 0 }) {
    if (Math.sign(size) < 0 || !Number.isInteger(size)) {
      throw new Error(`Size must be a positive number, got size=${size}`);
    }

    if (!supportedFormats.includes(type)) {
      throw new Error(
        `Type is not supported, must be one of
        ${supportedFormats}
        but got ${type}`
      );
    }

    if (!ownerId) {
      throw new Error(`Missing parameter: ownerId, received ${ownerId}`);
    }

    this.id = id;
    this.ownerId = ownerId;
    // If we don't receive a date(created = null), then we set the date.
    this.created = created || new Date().toISOString();
    this.updated = updated || new Date().toISOString();
    this.type = type;
    this.size = size;
    logger.debug(`Fragment.js - Constructor - type:  ${this.type}`);
  }

  /**
   * Get all fragments (id or full) for the given user
   * @param {string} ownerId user's hashed email
   * @param {boolean} expand whether to expand ids to full fragments
   * @returns Promise<Array<Fragment>>
   */
  static byUser(ownerId, expand = false) {
    return listFragments(ownerId, expand);
  }

  /**
   * Gets a fragment for the user by the given id.
   * @param {string} ownerId user's hashed email
   * @param {string} id fragment's id
   * @returns Promise<Fragment>
   */
  static byId(ownerId, id) {
    return readFragment(ownerId, id);
  }

  /**
   * Delete the user's fragment data and metadata for the given id
   * @param {string} ownerId user's hashed email
   * @param {string} id fragment's id
   * @returns Promise
   */
  static async delete(ownerId, id) {
    return deleteFragment(ownerId, id) && deleteFragmentData(ownerId, id);
  }

  /**
   * Saves the current fragment to the database
   * @returns Promise
   */
  async save() {
    logger.debug(`Fragment.js - Save() - Time before update: ${this.updated}`);
    this.updated = new Date().toISOString();
    logger.debug(
      `Fragment.js - Save() - Time after update: ${this.updated} time now: ${new Date()}`
    );
    let fragment = {
      id: this.id,
      ownerId: this.ownerId,
      created: this.created,
      updated: this.updated,
      type: this.type,
      size: this.size,
    };
    try {
      const f = await writeFragment(fragment);
      logger.debug(
        `Fragment.js - Constructor - saved new fragment:  ${fragment.id} for owner: ${this.ownerId} at ${this.updated}`
      );
      return f;
    } catch (e) {
      logger.error(`Fragment.js - Constructor - Could not create new fragment`);
      throw e;
    }
  }

  /**
   * Gets the fragment's data from the database
   * @returns Promise<Buffer>
   */
  async getData() {
    try {
      const f = await readFragmentData(this.ownerId, this.id);
      return f;
    } catch (e) {
      logger.error(
        `Fragment.js - getData() - Could not fetch data for the fragment with id: ${this.id}`
      );
    }
  }

  /**
   * Set's the fragment's data in the database
   * @param {Buffer} data
   * @returns Promise
   */
  async setData(data) {
    if (!Buffer.isBuffer(data)) {
      throw new Error(`Data must be of buffer type`);
    }
    this.updated = new Date().toISOString();
    this.size = Buffer.byteLength(data);

    try {
      this.save();
      const f = await writeFragmentData(this.ownerId, this.id, data);
      return f;
    } catch (e) {
      logger.error(`There was an error setting data: ${e}`);
    }
  }

  /**
   * Returns the mime type (e.g., without encoding) for the fragment's type:
   * "text/html; charset=utf-8" -> "text/html"
   * @returns {string} fragment's mime type (without encoding)
   */
  get mimeType() {
    const { type } = contentType.parse(this.type);
    return type;
  }

  /**
   * Returns the mime type (e.g., without encoding) for the fragment's extension provided:
   * ".txt" -> "text/html"
   * @param {string} ext: the extension you wish to find the type for. Must be supported mimeType.
   * @returns {string} fragment's mime type (without encoding)
   */
  mimeTypeByExtension(ext) {
    let conversion = conversions.find((conversion) => conversion.conversionExtensions[0] === ext);

    return conversion.type;
  }

  /**
   * @returns {boolean} true if type is text/plain
   */
  get isText() {
    const isText = this.type.includes('text/plain');
    logger.info(`Fragment.js - isText - type:  ${isText}`);

    return isText;
  }

  /**
   * Returns the formats into which this fragment type can be converted
   * @returns {Array<string>} list of supported mime types
   */
  get formats() {
    const conversionObject = conversions.find(({ type }) => type === this.mimeType);
    return conversionObject.conversionExtensions;
  }

  /**
   * Returns true if we know how to work with this content type
   * @param {string} value a Content-Type value (e.g., 'text/plain' or 'text/plain: charset=utf-8')
   * @returns {boolean} true if we support this Content-Type (i.e., type/subtype)
   */
  static isSupportedType(value) {
    // Change this to getFormats to see if its one of those, and then return (as we update the types supported)
    let isSupported = supportedFormats.includes(value);
    logger.info(
      `Fragment - isSupportType - Value of ${value} ${isSupported ? 'is' : 'is not'} supported.`
    );
    return isSupported;
  }
}

module.exports.Fragment = Fragment;
