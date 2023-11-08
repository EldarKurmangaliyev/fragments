const path = require('path');
const logger = require('../../logger');
const { Fragment } = require('../../model/fragment');
const { createErrorResponse } = require('../../response');
module.exports = async (req, res) => {
  logger.debug(`owner id and id: ${req.user}, ${req.params.id}`);
  try {
    const fragment = await Fragment.byId(req.user, req.params.id.split('.')[0]);
    if (!fragment) {
      return res.status(404).json(createErrorResponse(404, 'No fragment with this id'));
    }
    const data = await fragment.getData();
    logger.debug('data: ' + data);
    const extension = path.extname(req.params.id);
    logger.debug('extension: ' + extension);
    if (extension) {
      const { resultdata, convertedType } = await fragment.convertType(data, extension);
      if (!resultdata) {
        return res
          .status(415)
          .json(
            createErrorResponse(
              415,
              'Fragment cant be converted to this type or extention is invalid'
            )
          );
      }

      res.set('Content-Type', convertedType);
      res.status(200).send(resultdata);
    } else {
      // if no conversion needed
      logger.debug('fragment type in get id: ' + fragment.type);
      res.set('Content-Type', fragment.type);
      res.status(200).send(data);
    }
  } catch (e) {
    logger.warn(e.message, 'Error getting fragment by id');
    res.status(500).json(createErrorResponse(500, e.message));
  }
};
