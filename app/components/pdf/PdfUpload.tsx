'use client';

import { useState } from 'react';

/**
 * Submit button component that shows upload status and handles form submission.
 * Disabled when no file is selected or upload is in progress.
 *
 * @param file - The selected file object, null if no file selected
 * @param isUploading - Whether upload is currently in progress
 * @param onSubmit - Function to call when submit button is clicked
 */
function SubmitButton({
  file,
  isUploading,
  onSubmit,
}: {
  file: File | null;
  isUploading: boolean;
  onSubmit: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSubmit}
      className="w-full px-4 py-2 mt-6 text-sm font-medium text-white transition-colors duration-200 ease-in-out rounded-md bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300"
      disabled={isUploading || !file}
    >
      {isUploading ? 'Uploading...' : 'Upload'}
    </button>
  );
}

/**
 * PDF upload component that provides drag-and-drop file selection and upload functionality.
 * Uses REST API endpoint for handling large file uploads.
 *
 * @param onUploadSuccess - Callback function called when upload completes successfully
 */
export function PdfUpload({
  onUploadSuccess,
}: {
  onUploadSuccess: (file: File) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      onUploadSuccess(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-lg p-8 mx-auto bg-white border-2 border-dashed rounded-lg border-neutral-100 dark:bg-neutral-900 dark:border-neutral-800">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
          Upload your PDF
        </h2>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Drag and drop your file or click to browse.
        </p>
      </div>
      <div className="mt-6 w-full">
        <div className="flex items-center justify-center w-full">
          <label
            htmlFor="file-upload"
            className="relative w-full px-4 py-6 text-center transition-colors duration-200 ease-in-out border-2 border-dashed rounded-lg cursor-pointer border-neutral-300 bg-neutral-50 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
          >
            <input
              id="file-upload"
              name="file"
              type="file"
              className="sr-only"
              accept=".pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {file ? file.name : 'Select a PDF file'}
            </p>
          </label>
        </div>
        <SubmitButton
          file={file}
          isUploading={isUploading}
          onSubmit={handleSubmit}
        />
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
}
