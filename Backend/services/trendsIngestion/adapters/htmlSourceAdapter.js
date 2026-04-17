async function fetchHtmlSource(_source) {
  const error = new Error('HTML trend ingestion is not implemented yet.');
  error.code = 'HTML_SOURCE_NOT_IMPLEMENTED';
  throw error;
}

module.exports = {
  fetchHtmlSource,
};
