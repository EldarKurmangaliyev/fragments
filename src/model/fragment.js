// Use crypto.randomUUID() to create unique IDs, see:
// https://nodejs.org/api/crypto.html#cryptorandomuuidoptions
const { randomUUID } = require('crypto');
// Use https://www.npmjs.com/package/content-type to create/parse Content-Type headers
const contentType = require('content-type');
const md = require('markdown-it')({
  html: true,
});
const sharp = require('sharp');
var mime = require('mime-types');
// Functions for working with fragment metadata/data using our DB
const {
  readFragment,
  writeFragment,
  readFragmentData,
  writeFragmentData,
  listFragments,
  deleteFragment,
} = require('./data');

const logger = require('../logger');

const validTypes = [
  'text/plain',
  'text/markdown',
  'text/html',
  'application/json',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
];

class Fragment {
  constructor({ id, ownerId, type, size = 0 }) {
    if (!ownerId || !type) {
      throw new Error('owner id and type is required');
    } else if (typeof size !== 'number') {
      throw new Error('size must be a number');
    } else if (size < 0) {
      throw new Error('size cannot be negative');
    } else if (!Fragment.isSupportedType(type)) {
      throw new Error('invalid type');
    } else {
      this.id = id || randomUUID();
      this.ownerId = ownerId;
      this.created = new Date().toISOString();
      this.updated = new Date().toISOString();
      this.type = type;
      this.size = size;
    }
  }

  /**
   * Get all fragments (id or full) for the given user
   * @param {string} ownerId user's hashed email
   * @param {boolean} expand whether to expand ids to full fragments
   * @returns Promise<Array<Fragment>>
   */
  static async byUser(ownerId, expand = false) {
    try {
      return await listFragments(ownerId, expand);
    } catch (err) {
      throw new Error('Error getting frgaments');
    }
  }

  /**
   * Gets a fragment for the user by the given id.
   * @param {string} ownerId user's hashed email
   * @param {string} id fragment's id
   * @returns Promise<Fragment>
   */
  static async byId(ownerId, id) {
    try {
      const frag = await readFragment(ownerId, id);
      if (frag && frag instanceof Fragment === false) {
        return new Fragment(frag);
      } else {
        return frag;
      }
    } catch (err) {
      throw new Error('Error reading frgaments');
    }
  }

  /**
   * Delete the user's fragment data and metadata for the given id
   * @param {string} ownerId user's hashed email
   * @param {string} id fragment's id
   * @returns Promise
   */
  static async delete(ownerId, id) {
    try {
      return await deleteFragment(ownerId, id);
    } catch (err) {
      throw new Error('Error deleting fragments');
    }
  }

  /**
   * Saves the current fragment to the database
   * @returns Promise
   */
  save() {
    try {
      this.updated = new Date().toISOString();
      return writeFragment(this);
    } catch (err) {
      throw new Error('Error saving fragments');
    }
  }

  /**
   * Gets the fragment's data from the database
   * @returns Promise<Buffer>
   */
  async getData() {
    try {
      return await readFragmentData(this.ownerId, this.id);
    } catch (err) {
      throw new Error('Error readind fragments');
    }
  }

  /**
   * Set's the fragment's data in the database
   * @param {Buffer} data
   * @returns Promise
   */
  async setData(data) {
    if (!Buffer.isBuffer(data)) {
      throw new Error('data is not a Buffer');
    } else {
      this.size = Buffer.byteLength(data);
      this.save();
      try {
        return await writeFragmentData(this.ownerId, this.id, data);
      } catch (err) {
        throw new Error('Error setting fragments');
      }
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
   * Returns true if this fragment is a text/* mime type
   * @returns {boolean} true if fragment's type is text/*
   */
  get isText() {
    if (this.mimeType.match(/text\/+/)) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * Returns the formats into which this fragment type can be converted
   * @returns {Array<string>} list of supported mime types
   */
  get formats() {
    if (this.mimeType === 'text/plain') {
      return ['text/plain'];
    } else if (this.mimeType === 'text/markdown') {
      return ['text/plain', 'text/markdown', 'text/html'];
    } else if (this.mimeType === 'text/html') {
      return ['text/plain', 'text/html'];
    } else if (this.mimeType === 'application/json') {
      return ['text/plain', 'application/json'];
    } else {
      return ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    }
  }

  /**
   * Returns true if we know how to work with this content type
   * @param {string} value a Content-Type value (e.g., 'text/plain' or 'text/plain: charset=utf-8')
   * @returns {boolean} true if we support this Content-Type (i.e., type/subtype)
   */
  static isSupportedType(value) {
    logger.debug('isSupportedType: ' + value);
    let result = validTypes.some((element) => value.includes(element));
    return result;
  }
  /**
   * Returns the data converted to the desired type
   * @param {Buffer} data fragment data to be converted
   * @param {string} extension the type extension you want to convert to (desired type)
   * @returns {Buffer} converted fragment data
   */
  async convertType(data, extension) {
    let desiredType = mime.lookup(extension);
    const avail = this.formats;
    if (!avail.includes(desiredType)) {
      logger.warn('Cant covert to this  type');
      return false;
    }
    let resultdata = data;
    if (this.mimeType !== desiredType) {
      if (this.mimeType === 'text/markdown' && desiredType === 'text/html') {
        resultdata = md.render(data.toString());
        resultdata = Buffer.from(resultdata);
      } else if (desiredType === 'image/jpeg') {
        resultdata = await sharp(data).jpeg().toBuffer();
      } else if (desiredType === 'image/png') {
        resultdata = await sharp(data).png().toBuffer();
      } else if (desiredType === 'image/webp') {
        resultdata = await sharp(data).webp().toBuffer();
      } else if (desiredType === 'image/gif') {
        resultdata = await sharp(data).gif().toBuffer();
      }
    }
    return { resultdata, convertedType: desiredType };
  }
}

module.exports.Fragment = Fragment;
