import React, { forwardRef } from "react";

type TextareaRootProps = React.HTMLAttributes<HTMLDivElement>;

const Root = forwardRef<HTMLDivElement, TextareaRootProps>(({ className = "", ...props }, ref) => (
  <div ref={ref} className={`space-y-2 ${className}`.trim()} {...props} />
));
Root.displayName = "Textarea.Root";

type TextareaLabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

const Label = forwardRef<HTMLLabelElement, TextareaLabelProps>(
  ({ className = "", ...props }, ref) => (
    <label
      ref={ref}
      className={`block text-sm font-medium text-black ${className}`.trim()}
      {...props}
    />
  ),
);
Label.displayName = "Textarea.Label";

type TextareaFieldProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: string;
};

const Field = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  ({ className = "", error, ...props }, ref) => {
    const hasError = Boolean(error);

    return (
      <textarea
        ref={ref}
        className={`min-h-[80px] w-full resize-y rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:outline-none ${
          hasError
            ? "border-red-500 bg-white text-black focus:border-red-600 focus:ring-red-600"
            : "bg-white text-black focus:border-blue-500 focus:ring-blue-500"
        } ${className}`.trim()}
        {...props}
      />
    );
  },
);
Field.displayName = "Textarea.Field";

type TextareaHintProps = React.HTMLAttributes<HTMLParagraphElement>;

const Hint = forwardRef<HTMLParagraphElement, TextareaHintProps>(
  ({ className = "", ...props }, ref) => (
    <p ref={ref} className={`text-xs text-gray-600 ${className}`.trim()} {...props} />
  ),
);
Hint.displayName = "Textarea.Hint";

type TextareaErrorProps = React.HTMLAttributes<HTMLParagraphElement> & {
  message?: string;
};

const Error = forwardRef<HTMLParagraphElement, TextareaErrorProps>(
  ({ message, className = "", ...props }, ref) => {
    if (!message) return null;

    return (
      <p ref={ref} className={`text-xs text-red-600 ${className}`.trim()} {...props}>
        • {message}
      </p>
    );
  },
);
Error.displayName = "Textarea.Error";

export const Textarea = {
  Root,
  Label,
  Field,
  Hint,
  Error,
};
