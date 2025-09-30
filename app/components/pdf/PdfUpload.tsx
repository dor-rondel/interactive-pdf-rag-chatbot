'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { uploadPdfAction } from '@/app/actions/upload';
import { useState } from 'react';

const initialState = {
  error: null,
};

function SubmitButton({ file }: { file: File | null }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="w-full px-4 py-2 mt-6 text-sm font-medium text-white transition-colors duration-200 ease-in-out rounded-md bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300"
      disabled={pending || !file}
    >
      {pending ? 'Uploading...' : 'Upload'}
    </button>
  );
}

export function PdfUpload() {
  const [state, formAction] = useActionState(uploadPdfAction, initialState);
  const [file, setFile] = useState<File | null>(null);

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
      <form action={formAction} className="mt-6 w-full">
        <div className="flex items-center justify-center w-full">
          <label
            htmlFor="file-upload"
            className="relative w-full px-4 py-6 text-center transition-colors duration-200 ease-in-out border-2 border-dashed rounded-lg cursor-pointer border-neutral-300 bg-neutral-50 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
          >
            <input
              id="file-upload"
              name="file-upload"
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
        <SubmitButton file={file} />
        {state?.error && (
          <p className="mt-2 text-sm text-red-500">{state.error}</p>
        )}
      </form>
    </div>
  );
}
