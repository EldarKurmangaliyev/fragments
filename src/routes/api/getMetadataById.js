// src/routes/api/get.js
// Our response handlers
const response = require('../../response');
const logger = require('../../logger');
const { getFragmentById } = require('./util/fragmentMethods');

module.exports = (req, res) => {
  logger.debug(`GET v1/fragments - getMetadataByID: Fragment ID detected: ${req.params.id}`);

  getFragmentById(req.user, req.params.id)
    .then((fragment) => {
      res.status(200).json(
        response.createSuccessResponse({
          status: 'ok',
          fragment: fragment,
        })
      );
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
