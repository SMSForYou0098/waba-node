

export const ErrorExtractor = (error) => {
  if (error.response) {
    return error.response.data.message || error.response.data.error || 'An error occurred';
  } else if (error.request) {
    return 'No response received from the server';
  } else {
    return error.message || 'An unexpected error occurred';
  }
}
 