export async function uploadPdfAction() {
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const shouldError = Math.random() > 0.5;

  if (shouldError) {
    return {
      error: 'Failed to upload PDF. Please try again.',
    };
  }

  return {
    error: null,
  };
}
