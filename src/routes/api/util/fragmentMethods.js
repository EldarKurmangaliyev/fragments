// src/routes/api/util/fragmentMethods.js

const logger = require('../../../logger');
const { Fragment } = require('../../../model/fragment');

/**
 * Reusable method to save both metadata and data for a fragment.
 * @param {*} req - contains all content from request
 * @returns {Fragment} - Fragment Object with new Fragment details
 */
module.exports.saveFragment = async (req) => {
  const fragment = new Fragment({ ownerId: req.user, type: req.get('Content-Type') });
  logger.debug(`API - fragmentMethods.js: Received ${JSON.stringify(fragment)} `);

  await fragment.save();
  await fragment.setData(req.body);
  logger.debug(`size after save: ${fragment.size}`);
  return fragment;
};
/**
 *
 * @param {*} user
 * @param {*} fragmentId
 * @returns
 */
module.exports.getFragmentById = async (user, fragmentId) => {
  logger.info(`API - get.js: Attempting to get fragment by fragment id`);
  let fragment = Fragment;

  fragment = await Fragment.byId(user, fragmentId);
  if (fragment) {
    logger.debug(`API - fragmentMethods.js - getFragmentById - Fragment is not null.`);
    return new Fragment(fragment);
  } else {
    logger.debug(`API - fragmentMethods.js - getFragmentById - Fragment is null.`);
    throw new Error(`Fragment not found.`);
  }
};
