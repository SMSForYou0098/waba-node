export const ErrorExtractor = (error) => {
  // Axios-style error
  if (error.response) {
    const { data, status } = error.response;
    return (
      data?.message ||
      data?.error ||
      `Request failed with status ${status}` ||
      'An unknown server response error occurred'
    );
  }

  // Network issue or request was made but no response
  if (error.request) {
    return 'No response received from the server';
  }

  // Something happened while setting up the request
  return error?.message || 'An unexpected error occurred';
};
