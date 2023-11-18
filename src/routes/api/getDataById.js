// src/routes/api/get.js
// Our response handlers
const response = require('../../response');
const { Fragment } = require('../../model/fragment');
const logger = require('../../logger');
const path = require('path');
var md = require('markdown-it')();
// Remove markdown to text
const removeMd = require('remove-markdown');
// Remove html to text
const { convert } = require('html-to-text');

// convert images to common formats, is used for all accepted image types
// https://www.npmjs.com/package/sharp
const sharp = require('sharp');

module.exports = (req, res) => {
  logger.debug(`GET v1/fragments - Fragment ID detected: ${req.params.id}`);
  // Check for extension in id param
  // https://stackoverflow.com/questions/4250364/how-to-trim-a-file-extension-from-a-string-in-javascript
  // Need to use: https://nodejs.org/api/path.html#pathextnamepath, as .ext does not support .json
  // and nanoid does not produce id with '.'
  let ext = path.extname(req.params.id);
  const id = req.params.id.replace(ext, '');
  logger.debug(`GET v1/fragments - byId: received extension of ${ext} and id of ${id}`);
  getFragmentById(req.user, id)
    .then((fragment) => {
      const { metadata, data } = fragment;
      // If extension is provided, and is NOT supported, res415
      if (ext.length && !metadata.formats.includes(ext)) {
        logger.info(
          `GET v1/fragments - byId: Invalid extension ${ext}. This file type supports:`,
          metadata.formats
        );
        res.status(415).json(
          response.createErrorResponse({
            code: 415,
            message: `Requested extension of ${ext} is not supported for this fragment.`,
          })
        );
      } else {
        // If ext not included in request set it to the default for the type
        if (!ext) {
          ext = metadata.formats[0];
        }

        // Set header for the content-type in res
        res.setHeader('Content-Type', metadata.mimeTypeByExtension(ext));

        /** Variable will hold the fragment data in the requested type
         * This is returned in the response as the fragment data to display.
         */
        let convertedFragmentData;

        if (metadata.mimeTypeByExtension(ext) !== metadata.mimeType) {
          logger.debug(
            'The requested extension does not match the metadata extension. This fragment will be converted.'
          );

          // Time to figure out which conversion method we will be using:
          convertedFragmentData = convertToRequestedType(metadata, data, ext);

          logger.debug(`getDataById.js - Conversion received: ${convertedFragmentData}`);
        } else {
          // We don't need to convert the data return that.
          convertedFragmentData = data.toString();
        }

        res.status(200).json(
          response.createSuccessResponse({
            status: 'ok',
            code: 200,
            fragment: convertedFragmentData,
          })
        );
      }
    })
    .catch(() => {
      res.status(404).json(
        response.createErrorResponse({
          message: `The fragment with id: ${req.params.id} does not exist.`,
          code: 404,
        })
      );
    });
};

/**
 *
 * @param {string} metadata - metadata for the fragment we are converting
 * @param {any} data = Data to convert
 * @param {string} ext - Extension to convert data into
 * @returns desired converted Fragment data
 */
function convertToRequestedType(metadata, data, ext) {
  let convertedData;
  // .md converts to html or txt
  if (metadata.mimeType === 'text/markdown') {
    convertedData = ext === '.txt' ? removeMd(data.toString()) : md.render(data.toString());
  } else if (metadata.mimeType === 'text/html' && ext === '.txt') {
    // .html converts to text
    convertedData = convert(data.toString());
  } else if (metadata.mimeType === 'application/json' && ext === '.txt') {
    convertedData = JSON.stringify(data.toString());
  } else {
    convertedData = formatImage(data, ext.substring(1));
  }
  logger.debug(`getDataById.js - convertToRequestedType - converted data: ${convertedData}`);
  return convertedData;
}

/**
 *
 * @param {*} data
 * @param {*} ext
 * @returns {Buffer} with new extension
 */
const formatImage = (data, ext) => {
  return sharp(data).toFormat(ext).toBuffer();
};

async function getFragmentById(user, fragmentId) {
  logger.info(`API - get.js: Attempting to get fragment by fragment id: ${fragmentId}`);
  let metadata = new Fragment(await Fragment.byId(user, fragmentId));

  if (metadata) {
    logger.debug(`API - get.js: getFragmentById - Fragment is not null.`);
    const data = await metadata.getData();
    return { metadata, data };
  } else {
    logger.debug(`API - get.js: getFragmentById - Fragment is null.`);
    throw new Error(`Fragment not found.`);
  }
}
