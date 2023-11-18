// src/routes/api/post.js

// Our response handlers
const logger = require('../../logger');
const response = require('../../response');
const { saveFragment } = require('./util/fragmentMethods');

module.exports = (req, res) => {
  logger.info(`Received new request: ${req}`);

  // req.body is the data, and rawBody returns either Buffer or {}
  // Check if we have buffer, otherwise we can't save this, and create error response.
  if (!Buffer.isBuffer(req.body)) {
    res.status(415).json(
      response.createErrorResponse({
        status: 'error',
        error: {
          message: 'Body requires correct data that is supported.',
          code: 415,
        },
      })
    );
  }

  // Use saveFragment to create and save a new fragment and the data.
  saveFragment(req)
    .then((fragment) => {
      logger.info(`Received fragment saved request: ${fragment}`);

      // Set the appropriate headers in the response
      res.setHeader('Content-Type', fragment.type);
      res.setHeader('Location', `${process.env.API_URL}/v1/fragments/${fragment.id}`);

      // Attach the response
      console.log('FRAGMENT IS CREATED');
      console.log(fragment.id);
      res.status(201).json(
        response.createSuccessResponse({
          status: 'ok',
          fragment: fragment,
        })
      );
    })
    .catch((e) => console.log('error creating new fragment: ', e));
};
