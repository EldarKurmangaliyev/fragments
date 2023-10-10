// Use crypto.randomUUID() to create unique IDs, see:
// https://nodejs.org/api/crypto.html#cryptorandomuuidoptions
const crypto = require('crypto');
const { Fragment } = require('../../model/fragment');

const createSuccessResponse = require('../../response').createSuccessResponse;
const createErrorResponse = require('../../response').createErrorResponse;

const generateUUID = () => {
  return crypto.randomUUID().toString('hex');
};

module.exports = async (req, res) => {
  console.log(Buffer.isBuffer(req.body) + ' | ' + req.headers['content-type']);
  console.log(Buffer.isBuffer(req.body) && Fragment.isSupportedType(req.headers['content-type']));
  if (Buffer.isBuffer(req.body) && Fragment.isSupportedType(req.headers['content-type'])) {
    const id = generateUUID();
    const location = req.protocol + '://' + req.hostname + ':8080/v1' + req.url + '/' + id;
    res.set({ Location: location });

    const newFragment = new Fragment({
      id: id,
      ownerId: crypto.createHash('sha256').update(req.user).digest('hex'),
      created: new Date().toString(),
      update: new Date().toString(),
      type: req.headers['content-type'],
      size: Number(req.headers['content-length']),
    });
    await newFragment.setData(req.body);

    createSuccessResponse(
      res.status(201).json({
        status: 'ok',
        fragments: newFragment,
      })
    );
  } else {
    createErrorResponse(
      res.status(415).json({
        status: 'error',
        message: 'Invalid file type',
      })
    );
  }
};
